import { useState } from "react";

import { portalErrorMessage } from "../../error-message";
import { normalizePhone } from "@/lib/phone";
import { activate } from "../../portal-api";
import type { PortalWarranty } from "../../types";
import { WarrantyCard } from "../WarrantyCard";

import { Section } from "./Section";

/**
 * Khối bảo hành gộp thẳng vào trang sản phẩm.
 *
 * Đặt giữa trang (sau thông số, trước tài liệu tra cứu) chứ không ở cuối: đây là
 * việc khách CẦN LÀM và có hạn hiệu lực, còn phần dưới là thứ tra dần. Ở mobile,
 * đẩy xuống cuối nghĩa là khách phải cuộn qua cả bảng xử lý sự cố mới thấy.
 *
 * SĐT ở đây KHÔNG xác thực quyền sở hữu — mã dưới lớp cào đã đủ — mà là đăng ký
 * bảo hành điện tử cho CSKH, giống hệt `ActivateForm` ở portal 2 tab. Dùng chung
 * `portalErrorMessage`/`normalizePhone` với component đó để không đẻ ra một bảng
 * thông báo lỗi thứ hai.
 *
 * Kích hoạt thành công chỉ đổi state tại chỗ, KHÔNG reload/navigate — reload sẽ
 * gọi lại endpoint trang sản phẩm và cộng thêm 1 lượt quét hiển thị công khai
 * ngay trên trang này.
 */
export function InlineActivateBlock({
  code,
  warranty,
}: {
  code: string;
  warranty: PortalWarranty | null;
}) {
  const [current, setCurrent] = useState<PortalWarranty | null>(warranty);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (current) {
    return (
      <Section title="Bảo hành">
        <WarrantyCard warranty={current} />
      </Section>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Số điện thoại không hợp lệ.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const response = await activate({ keyword: code, phone: normalized });
      setCurrent(response.warranty);
    } catch (err) {
      setError(portalErrorMessage(err, "activate"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Section title="Kích hoạt bảo hành">
      <form onSubmit={submit} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <label htmlFor="sp-phone" className="text-sm font-medium text-slate-800">
          Số điện thoại
        </label>
        <input
          id="sp-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="09xx xxx xxx"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Vui lòng nhập đúng số điện thoại để được bảo hành, Delax sẽ bảo hành điện tử theo số điện
          thoại đăng ký của quý khách.
        </p>
        {error ? (
          <p role="alert" className="mt-2 text-sm font-medium text-rose-600">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Đang kích hoạt…" : "Kích hoạt bảo hành"}
        </button>
      </form>
    </Section>
  );
}
