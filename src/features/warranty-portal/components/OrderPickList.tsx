import { PORTAL_COLOR } from "../portal-theme";
import type { TrackOrder } from "../types";
import { formatDateVi } from "@/lib/format";

/** apps.warranty_codes.domain.order_labels: status 6 = "Đã hủy". */
const CANCELLED_STATUS = 6;

function fmtDate(value: string): string {
  return formatDateVi(value);
}

/**
 * Danh sách đơn khi khách tra bằng số điện thoại và có nhiều hơn một đơn khớp
 * (bản sửa đổi 24/08 — xem `docs/warranty-portal-design.md` §4.2).
 *
 * Mỗi thẻ chỉ hiện đủ để khách nhận ra đơn của mình (mã đơn, ngày, trạng thái,
 * mã vận đơn, tên sản phẩm); hành trình chỉ tải khi bấm vào một đơn — backend
 * cố ý không kèm hành trình trong response danh sách.
 */
export function OrderPickList({
  orders,
  truncated,
  pendingOrderCode,
  onSelect,
}: {
  orders: TrackOrder[];
  truncated: boolean;
  /** Mã đơn đang tải hành trình — khoá thẻ đó lại để khách không bấm chồng. */
  pendingOrderCode: string | null;
  onSelect: (order: TrackOrder) => void;
}) {
  return (
    <div className="animate-in fade-in space-y-3 duration-500">
      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
        <p className="text-sm font-semibold" style={{ color: PORTAL_COLOR.tealDeep }}>
          Tìm thấy {orders.length} đơn hàng
        </p>
        <p className="mt-0.5 text-xs" style={{ color: PORTAL_COLOR.grayText }}>
          Chọn một đơn để xem hành trình vận chuyển.
          {truncated ? " Chỉ hiển thị các đơn gần đây nhất." : ""}
        </p>
      </div>

      <ul className="space-y-2.5">
        {orders.map((order, index) => {
          const pending = pendingOrderCode !== null && pendingOrderCode === order.order_code;
          const cancelled = order.status === CANCELLED_STATUS;
          return (
            <li key={`${order.order_code}-${order.shipping_code}-${index}`}>
              <button
                type="button"
                onClick={() => onSelect(order)}
                disabled={pendingOrderCode !== null}
                className="w-full rounded-2xl border border-border/70 bg-white p-4 text-left shadow-sm transition-colors hover:border-transparent disabled:opacity-60"
                style={pending ? { borderColor: PORTAL_COLOR.tealDeep } : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: PORTAL_COLOR.tealDeep }}
                  >
                    {order.order_code || order.shipping_code || "—"}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={
                      cancelled
                        ? { backgroundColor: "#EDEDEB", color: PORTAL_COLOR.grayText }
                        : { backgroundColor: PORTAL_COLOR.mint, color: PORTAL_COLOR.tealDeep }
                    }
                  >
                    {order.status_label}
                  </span>
                </div>

                <p className="mt-1.5 text-xs" style={{ color: PORTAL_COLOR.grayText }}>
                  Ngày đặt {fmtDate(order.created_at)}
                  {order.shipping_code ? ` · Vận đơn ${order.shipping_code}` : ""}
                </p>

                <p className="mt-1.5 line-clamp-2 text-sm text-foreground">
                  {order.items.length > 0
                    ? order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")
                    : "Chưa có sản phẩm"}
                </p>

                {pending ? (
                  <p
                    className="mt-1.5 text-xs font-medium"
                    style={{ color: PORTAL_COLOR.tealDeep }}
                  >
                    Đang tải hành trình...
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
