import { BadgeCheck } from "lucide-react";

import { PORTAL_GRADIENT, PORTAL_GRADIENT_EXPIRED } from "../portal-theme";
import type { PortalWarranty } from "../types";
import { formatDateVi } from "@/lib/format";

function fmtDate(value: string): string {
  return formatDateVi(value);
}

/**
 * Thẻ bảo hành điện tử — signature element của portal, thứ khách nhớ sau khi
 * kích hoạt. Render như thẻ vật lý: gradient thương hiệu, serial dập nổi kiểu
 * thẻ ngân hàng, huy hiệu chính hãng, dải số ngày còn lại cỡ lớn. Hết hạn thì
 * chuyển tông xám-đỏ trầm và badge đổi nội dung.
 */
export function WarrantyCard({ warranty }: { warranty: PortalWarranty }) {
  const valid = warranty.days_left > 0;

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden rounded-[20px] p-5 text-white shadow-lg duration-500 sm:p-6"
      style={{ background: valid ? PORTAL_GRADIENT : PORTAL_GRADIENT_EXPIRED }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-white/70">
            Thẻ bảo hành điện tử
          </p>
          <h2 className="mt-0.5 truncate text-lg font-semibold">
            {warranty.product_name || "Sản phẩm"}
          </h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
          <BadgeCheck className="size-3.5" aria-hidden />
          Chính hãng
        </span>
      </div>

      <p
        className="mt-6 font-mono text-2xl font-semibold break-all text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)] sm:text-3xl"
        style={{ letterSpacing: "0.25em" }}
      >
        {warranty.serial}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-white/75">
        <div className="flex items-center gap-1.5">
          <span>Mã sản phẩm</span>
          <span className="font-semibold text-white">{warranty.product_sku || "—"}</span>
        </div>
        <span>Kích hoạt {fmtDate(warranty.activated_at)}</span>
      </div>

      <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3.5 backdrop-blur-sm">
        {valid ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">
              Còn hạn bảo hành
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-6xl leading-none font-extrabold tabular-nums">
                {warranty.days_left}
              </span>
              <span className="text-sm font-medium text-white/85">ngày</span>
            </div>
            <p className="mt-1 text-xs text-white/70">
              Hết hạn {fmtDate(warranty.expires_at)} · gói {warranty.months} tháng
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">
              Trạng thái bảo hành
            </p>
            <p className="mt-1 text-2xl font-bold">Đã hết hạn</p>
            <p className="mt-1 text-xs text-white/70">
              Từ {fmtDate(warranty.expires_at)} · gói {warranty.months} tháng
            </p>
          </>
        )}
      </div>
    </div>
  );
}
