import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { portalErrorMessage } from "../error-message";
import { normalizePhone } from "@/lib/phone";
import { track } from "../portal-api";
import { PORTAL_COLOR, PORTAL_GRADIENT } from "../portal-theme";
import type { TrackResponse } from "../types";

/**
 * Kết quả tra cứu KHÔNG render tại đây mà đẩy lên `WarrantyPortalPage` qua
 * `onResult` — chỉ trang mới đặt được kết quả sang cột phải ở desktop. Gọi
 * `onResult(null)` khi lỗi để cột phải không giữ lại kết quả của lượt trước.
 *
 * Bản sửa đổi 24/08: hai ô đều KHÔNG bắt buộc, chỉ cần điền một. Khách nhớ mã
 * vận đơn thì tra thẳng; chỉ nhớ số điện thoại thì nhận về danh sách đơn để
 * chọn (xem `OrderPickList`).
 */
export function TrackForm({ onResult }: { onResult: (data: TrackResponse | null) => void }) {
  const [shippingCode, setShippingCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedCode = shippingCode.trim().toUpperCase();
    const rawPhone = phone.trim();
    const normalizedPhone = normalizePhone(rawPhone);
    if (!normalizedCode && !rawPhone) {
      setError("Vui lòng nhập mã vận đơn hoặc số điện thoại.");
      return;
    }
    // Chỉ bắt lỗi định dạng khi khách CÓ gõ số — ô trống là hợp lệ nếu đã có mã
    // vận đơn.
    if (rawPhone && !normalizedPhone) {
      setError("Số điện thoại không hợp lệ.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const data = await track({ shipping_code: normalizedCode, phone: normalizedPhone });
      onResult(data);
    } catch (err) {
      onResult(null);
      setError(portalErrorMessage(err, "track"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="animate-in fade-in w-full rounded-t-3xl bg-white px-5 pt-6 pb-8 shadow-sm duration-500 sm:rounded-3xl sm:px-6">
      <h1 className="text-lg font-semibold" style={{ color: PORTAL_COLOR.tealDeep }}>
        Tra cứu vận đơn
      </h1>
      <p className="mt-1 text-sm" style={{ color: PORTAL_COLOR.grayText }}>
        Nhập mã vận đơn <strong>hoặc</strong> số điện thoại đặt hàng — chỉ cần một trong hai.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="shipping_code" className="text-sm font-medium text-foreground">
            Mã vận đơn
          </label>
          <Input
            id="shipping_code"
            value={shippingCode}
            onChange={(e) => setShippingCode(e.target.value)}
            placeholder="SC00001"
            autoComplete="off"
            inputMode="text"
            autoCapitalize="characters"
            className="h-13 font-mono text-base uppercase tracking-wider placeholder:tracking-normal placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="track_phone" className="text-sm font-medium text-foreground">
            Số điện thoại
          </label>
          <Input
            id="track_phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Số điện thoại đặt hàng"
            inputMode="tel"
            className="h-13 text-base"
          />
          <p className="text-xs" style={{ color: PORTAL_COLOR.grayText }}>
            Vui lòng nhập đúng số điện thoại để tra cứu, Delax cũng sẽ hỗ trợ chăm sóc khách hàng
            trọn đời theo số điện thoại đăng ký của quý khách.
          </p>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium" style={{ color: PORTAL_COLOR.redAlert }}>
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={pending}
          className="h-13 w-full border-0 text-base font-bold text-white shadow-md disabled:opacity-60"
          style={{ background: PORTAL_GRADIENT }}
        >
          {pending ? "Đang tra cứu..." : "Tra cứu vận đơn"}
        </Button>
      </form>
    </div>
  );
}
