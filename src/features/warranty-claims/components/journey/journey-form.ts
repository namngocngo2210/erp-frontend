import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useUpdateJourney } from "@/features/warranty-claims/queries";
import type {
  WarrantyJourney,
  WarrantyJourneyPayload,
} from "@/features/warranty-claims/warranty-claim-types";

/**
 * State cục bộ của form 1 hành trình — buffered, chỉ ghi khi bấm "Lưu".
 * Các field enum lấy type thẳng từ payload OpenAPI (union kèm BlankEnum "")
 * để buildJourneyPatch KHÔNG cần cast — TS bắt được typo tên field/giá trị.
 */
export type JourneyFormState = {
  receiver_name: string;
  receiver_phone: string;
  receiver_raw_address: string;
  product: number | null;
  send_reason: string;
  classification: NonNullable<WarrantyJourneyPayload["classification"]>;
  error_category: NonNullable<WarrantyJourneyPayload["error_category"]>;
  declared_value: string;
  cod_amount: string;
  shipping_form: NonNullable<WarrantyJourneyPayload["shipping_form"]>;
  carrier: NonNullable<WarrantyJourneyPayload["carrier"]>;
  shipping_fee: string;
  order_date: string;
  new_tracking_code: string;
  recall_code: string;
  note: string;
  warehouse_received_at: string;
  inspection_result: NonNullable<WarrantyJourneyPayload["inspection_result"]>;
  warehouse_check: NonNullable<WarrantyJourneyPayload["warehouse_check"]>;
  resolution: NonNullable<WarrantyJourneyPayload["resolution"]>;
  resolution_declared_value: string;
  resolution_cod: string;
  resolution_note: string;
  return_carrier: NonNullable<WarrantyJourneyPayload["return_carrier"]>;
  return_shipping_fee: string;
  return_order_date: string;
  return_tracking_code: string;
  feedback_agree_review: NonNullable<WarrantyJourneyPayload["feedback_agree_review"]>;
  feedback_rating: NonNullable<WarrantyJourneyPayload["feedback_rating"]>;
  feedback_note: string;
  claim_date: string;
  claim_note: string;
  carrier_response: NonNullable<WarrantyJourneyPayload["carrier_response"]>;
  compensation_status: NonNullable<WarrantyJourneyPayload["compensation_status"]>;
  compensation_amount: string;
};

export type SetJourneyField = <K extends keyof JourneyFormState>(
  key: K,
  value: JourneyFormState[K],
) => void;

/** Props chung cho các section §2-§7 của form hành trình. */
export type JourneySectionProps = {
  journey: WarrantyJourney;
  form: JourneyFormState;
  set: SetJourneyField;
  /** Đổ giá trị đã ghi xuống server vào bản nháp, không bật cờ "Chưa lưu". */
  setSynced: SetJourneyField;
};

export const journeyFieldId = (journeyId: number, name: string) => `journey-${journeyId}-${name}`;

export function initForm(j: WarrantyJourney): JourneyFormState {
  return {
    receiver_name: j.receiver_name,
    receiver_phone: j.receiver_phone,
    receiver_raw_address: j.receiver_raw_address,
    product: j.product,
    send_reason: j.send_reason,
    classification: j.classification,
    error_category: j.error_category,
    declared_value: j.declared_value,
    cod_amount: j.cod_amount,
    shipping_form: j.shipping_form,
    carrier: j.carrier,
    shipping_fee: j.shipping_fee,
    order_date: j.order_date ?? "",
    new_tracking_code: j.new_tracking_code,
    recall_code: j.recall_code,
    note: j.note,
    warehouse_received_at: j.warehouse_received_at ?? "",
    inspection_result: j.inspection_result,
    warehouse_check: j.warehouse_check,
    resolution: j.resolution,
    resolution_declared_value: j.resolution_declared_value,
    resolution_cod: j.resolution_cod,
    resolution_note: j.resolution_note,
    return_carrier: j.return_carrier,
    return_shipping_fee: j.return_shipping_fee,
    return_order_date: j.return_order_date ?? "",
    return_tracking_code: j.return_tracking_code,
    feedback_agree_review: j.feedback_agree_review,
    feedback_rating: j.feedback_rating,
    feedback_note: j.feedback_note,
    claim_date: j.claim_date ?? "",
    claim_note: j.claim_note,
    carrier_response: j.carrier_response,
    compensation_status: j.compensation_status,
    compensation_amount: j.compensation_amount,
  };
}

/** Field tiền tệ: chuỗi rỗng khiến DRF DecimalField 400 → coerce về "0". */
const money = (v: string): string => (v.trim() === "" ? "0" : v);

/**
 * Patch gửi khi bấm "Lưu hành trình": gửi mọi field editable. `status`/
 * `return_status` KHÔNG còn trong payload — trạng thái VC hiển thị tự động
 * theo Best, trạng thái nội bộ do quét kho/auto đặt.
 */
export function buildJourneyPatch(
  form: JourneyFormState,
  // Không còn dùng từ khi status/return_status rời khỏi payload, nhưng giữ tham số
  // để không phải sửa mọi caller (và để lại chỗ nếu cần đối chiếu bản gốc).
  _journey: WarrantyJourney,
): WarrantyJourneyPayload {
  const patch: WarrantyJourneyPayload = {
    receiver_name: form.receiver_name,
    receiver_phone: form.receiver_phone,
    receiver_raw_address: form.receiver_raw_address,
    product: form.product,
    send_reason: form.send_reason,
    classification: form.classification,
    error_category: form.error_category,
    declared_value: money(form.declared_value),
    cod_amount: money(form.cod_amount),
    shipping_form: form.shipping_form,
    carrier: form.carrier,
    shipping_fee: money(form.shipping_fee),
    order_date: form.order_date || null,
    new_tracking_code: form.new_tracking_code,
    recall_code: form.recall_code,
    note: form.note,
    warehouse_received_at: form.warehouse_received_at || null,
    inspection_result: form.inspection_result,
    warehouse_check: form.warehouse_check,
    resolution: form.resolution,
    resolution_declared_value: money(form.resolution_declared_value),
    resolution_cod: money(form.resolution_cod),
    resolution_note: form.resolution_note,
    return_carrier: form.return_carrier,
    return_shipping_fee: money(form.return_shipping_fee),
    return_order_date: form.return_order_date || null,
    return_tracking_code: form.return_tracking_code,
    feedback_agree_review: form.feedback_agree_review,
    feedback_rating: form.feedback_rating,
    feedback_note: form.feedback_note,
    claim_date: form.claim_date || null,
    claim_note: form.claim_note,
    carrier_response: form.carrier_response,
    compensation_status: form.compensation_status,
    compensation_amount: money(form.compensation_amount),
  };
  return patch;
}

/**
 * Form buffered của 1 hành trình: state + dirty + lưu/hoàn tác.
 * KHÔNG auto-save; người dùng bấm "Lưu hành trình" để ghi.
 */
export function useJourneyForm(journey: WarrantyJourney) {
  const update = useUpdateJourney();
  const [form, setForm] = useState<JourneyFormState>(() => initForm(journey));
  const [dirty, setDirty] = useState(false);

  // Đồng bộ lại form khi bản ghi server đổi (sau khi lưu chính hành trình này,
  // hoặc bị sửa nơi khác) — dựa vào updated_at để KHÔNG reset khi refetch do
  // hành trình khác thay đổi. Nếu ĐANG dirty thì giữ nguyên bản nháp (badge
  // "Chưa lưu"): lưu tên / cập nhật realtime làm updated_at đổi không được
  // phép wipe công sức nhập dở của người dùng.
  useEffect(() => {
    if (dirty) return;
    setForm(initForm(journey));
    // Thu hẹp deps là CÓ CHỦ ĐÍCH (xem comment trên) → react-compiler cảnh báo kèm.
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey.updated_at, journey.id]);

  const set: SetJourneyField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  /**
   * Đổ vào bản nháp một giá trị ĐÃ ghi xuống server (vd. mã Best vừa tạo) —
   * KHÔNG bật `dirty`. Cần thiết vì effect đồng bộ ở trên bỏ qua khi đang dirty:
   * không có hàm này thì ô mã vẫn rỗng sau khi tạo đơn, và cú "Lưu hành trình"
   * kế tiếp sẽ gửi chuỗi rỗng đè mất mã trên server.
   */
  const setSynced: SetJourneyField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = () => {
    update.mutate(
      { id: journey.id, patch: buildJourneyPatch(form, journey) },
      {
        onSuccess: () => {
          setDirty(false);
          toast.success("Đã lưu hành trình.");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Lưu hành trình thất bại"),
      },
    );
  };

  const reset = () => {
    setForm(initForm(journey));
    setDirty(false);
  };

  return { form, set, setSynced, dirty, save, reset, isSaving: update.isPending };
}
