import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  useBestAccounts,
  useCreateBestShipment,
  useUpdateJourney,
} from "@/features/warranty-claims/queries";
import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";
import type { BestAccount } from "@/lib/api/bestExpress";
import { parseAddress } from "@/lib/api/orders";
import { autoFilledFields } from "./best-order-autofill";
import {
  LEG_FIELD,
  applyParsedAddress,
  buildOrderAddPayload,
  customerSideOf,
  defaultFormForLeg,
  loadSenderAddress,
  saveSenderAddress,
  shopSideOf,
  type AddressBlock,
  type BestLeg,
  type BestOrderFormState,
} from "./best-order-form";

export type UseBestOrderFormArgs = {
  journey: WarrantyJourney;
  leg: BestLeg;
  /** Form đang sống (dialog mở / khối inline đang bung) — false thì không khởi tạo. */
  active: boolean;
  /**
   * Gọi SAU khi PATCH mã thành công. Nơi gọi tự quyết đóng dialog hay thu khối.
   * `patch` là CHÍNH payload vừa PATCH xuống server (mã + field tự điền nếu có)
   * — nơi gọi đọc lại từ đây thay vì tự tính riêng (vd. `todayIso()` lần nữa),
   * tránh lệch ngày nếu gọi qua nửa đêm giữa hai lần tính (review finding 7).
   */
  onCreated: (code: string, patch: Record<string, string>) => void;
};

export type UseBestOrderForm = {
  form: BestOrderFormState | null;
  setForm: React.Dispatch<React.SetStateAction<BestOrderFormState | null>>;
  /** Đã lọc `is_active` — nơi gọi chỉ việc render. */
  accounts: BestAccount[];
  /** Đã suy ra mặc định (account active đầu tiên) khi người dùng chưa chọn. */
  accountId: string;
  setAccountId: (id: string) => void;
  customReturn: boolean;
  setCustomReturn: (value: boolean) => void;
  submit: () => void;
  isPending: boolean;
};

/** Khối kho theo loại đơn: đơn thu hồi thì kho là bên NHẬN, còn lại là bên GIAO. */
function senderBlockOf(form: BestOrderFormState): AddressBlock {
  return shopSideOf(form.journeyType) === "to" ? form.to : form.from;
}

/**
 * State + nghiệp vụ tạo đơn Best cho 1 chặng, dùng chung cho dialog (chặng gửi
 * đi/thu hồi) và khối §7 bung inline (chặng gửi lại).
 *
 * KHÔNG biết gì về dialog: nơi gọi tự đóng/thu qua `onCreated`. Nhờ vậy §7 tái
 * dùng được mà không phải nhân bản toàn bộ logic.
 */
export function useBestOrderForm({
  journey,
  leg,
  active,
  onCreated,
}: UseBestOrderFormArgs): UseBestOrderForm {
  // Chỉ gọi API tài khoản Best khi form thật sự đang sống — §7 mount cùng
  // JourneyCard bất kể đã bung hay chưa, gọi vô điều kiện sẽ bắn 1 GET thừa
  // (và có thể 403 vô ích) mỗi lần mở trang chi tiết phiếu (review finding 4).
  const accountsQuery = useBestAccounts(active);
  const create = useCreateBestShipment();
  const updateJourney = useUpdateJourney();
  const [form, setForm] = useState<BestOrderFormState | null>(null);
  const [accountId, setAccountId] = useState<string>("");
  // Return mặc định = địa chỉ kho; mở khối riêng khi cần hoàn về nơi khác.
  const [customReturn, setCustomReturn] = useState(false);

  // Khởi tạo form mỗi lần form BẮT ĐẦU sống (prefill theo chặng + địa chỉ kho
  // đã nhớ), rồi parse địa chỉ thô của khách ở nền — không chặn thao tác.
  useEffect(() => {
    if (!active) {
      // Xoá form NGAY khi thu gọn (không đợi lần bung kế tiếp mới khởi tạo lại
      // trong effect, vì effect chạy SAU khi vẽ) — nếu không, bung lại sau khi
      // Hủy sẽ nhoáng lên form CŨ đã hủy trong đúng 1 khung hình (review finding 5).
      setForm(null);
      return;
    }
    const initial = defaultFormForLeg(journey, leg, loadSenderAddress());
    setForm(initial);
    setAccountId("");
    setCustomReturn(false);

    const raw = (journey.receiver_raw_address || "").trim();
    if (!raw) return;
    let cancelled = false;
    parseAddress(raw)
      .then((parsed) => {
        if (cancelled) return;
        // Tính "side" từ state HIỆN TẠI, không phải initial lúc mount — người
        // dùng có thể đã đổi Loại đơn hàng (swap 2 khối) trong lúc request bay.
        setForm((f) => {
          if (!f) return f;
          const side = customerSideOf(f.journeyType);
          return { ...f, [side]: applyParsedAddress(f[side], parsed) };
        });
      })
      .catch(() => {
        // Không parse được thì giữ nguyên prefill thô, người dùng tự điền.
      });
    return () => {
      cancelled = true;
    };
    // Thu hẹp deps là CÓ CHỦ ĐÍCH (xem comment đầu effect) → react-compiler cảnh báo kèm.
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, journey.id, leg]);

  const accounts = (accountsQuery.data ?? []).filter((a) => a.is_active);
  const effectiveAccountId = accountId || (accounts[0] ? String(accounts[0].id) : "");

  const submit = () => {
    if (!form) return;
    const sender = senderBlockOf(form);
    const payload = buildOrderAddPayload(customReturn ? form : { ...form, returnBlock: sender });
    create.mutate(
      {
        account_id: effectiveAccountId ? Number(effectiveAccountId) : null,
        payload,
      },
      {
        onSuccess: (shipment) => {
          saveSenderAddress(sender);
          const code = (shipment.code_best || shipment.merchant_order_code || "").trim();
          if (!code) {
            // Không có mã thì không PATCH (patch rỗng = 200 nhưng chẳng ghi gì).
            toast.error("Best không trả về mã vận đơn — kiểm tra lại trên trang Best.");
            return;
          }
          // ĐVVC + ngày lên đơn đi CÙNG patch với mã: chỉ ghi vào bản nháp thì
          // đóng trang là mất, và form hiển thị dữ liệu server không hề có.
          const patch = { [LEG_FIELD[form.leg]]: code, ...autoFilledFields(form.leg) };
          updateJourney.mutate(
            { id: journey.id, patch },
            {
              onSuccess: () => {
                // Truyền lại CHÍNH patch vừa gửi — nơi gọi không tự tính ngày
                // lần nữa (vd. `todayIso()` thứ 2), tránh lệch ngày qua nửa đêm.
                onCreated(code, patch);
                toast.success(`Đã tạo vận đơn Best: ${code}`);
              },
              // Vận đơn ĐÃ tạo thật phía Best — hiện mã để người dùng chép tay,
              // tuyệt đối không nuốt lỗi này.
              onError: () =>
                toast.error(
                  `Đã tạo vận đơn Best ${code} nhưng LƯU MÃ VÀO HÀNH TRÌNH THẤT BẠI — ` +
                    "hãy chép mã này và điền tay vào ô mã vận đơn.",
                  { duration: 30_000 },
                ),
            },
          );
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Tạo vận đơn Best thất bại"),
      },
    );
  };

  return {
    form,
    setForm,
    accounts,
    accountId: effectiveAccountId,
    setAccountId,
    customReturn,
    setCustomReturn,
    submit,
    isPending: create.isPending || updateJourney.isPending,
  };
}
