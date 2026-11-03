import { PORTAL_COLOR } from "../portal-theme";
import type { TrackOrder } from "../types";
import { formatDateTimeVi } from "@/lib/format";

/** apps.warranty_codes.domain.order_labels: status 6 = "Đã hủy". */
const CANCELLED_STATUS = 6;

function fmtDateTime(value: string): string {
  return formatDateTimeVi(value);
}

function StatusBadge({ order }: { order: TrackOrder }) {
  const cancelled = order.status === CANCELLED_STATUS;
  return (
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
  );
}

/**
 * Một dòng thông tin. `mono` cho các mã (vận đơn, hoá đơn, SKU, SĐT) để khách dễ
 * đối chiếu từng ký tự với tin nhắn/tem dán trên kiện.
 */
function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-xs" style={{ color: PORTAL_COLOR.grayText }}>
        {label}
      </dt>
      <dd
        className={
          mono
            ? "min-w-0 text-right font-mono text-sm break-all text-foreground"
            : "min-w-0 text-right text-sm text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Tóm tắt đơn cho tab "Vận đơn". Dữ liệu do backend giới hạn cố ý (không `id`,
 * không `total_amount`, không địa chỉ đầy đủ — xem `docs/warranty-portal-design.md`
 * §4.2); bản sửa đổi 10/08 mở thêm tên khách, SĐT và mã hoá đơn để khách xác
 * nhận "đúng đơn của mình" trước khi đọc hành trình.
 *
 * Dòng nào backend trả rỗng thì ẩn hẳn thay vì hiện "—": đơn chưa lên hoá đơn là
 * chuyện bình thường, một gạch ngang trống chỉ làm khách tưởng hệ thống lỗi.
 */
export function OrderSummary({ order }: { order: TrackOrder }) {
  return (
    <div className="animate-in fade-in rounded-2xl border border-border/70 bg-white p-4 shadow-sm duration-500 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold" style={{ color: PORTAL_COLOR.tealDeep }}>
          {order.order_code || "—"}
        </span>
        <StatusBadge order={order} />
      </div>

      <dl className="mt-3 divide-y divide-border/60 border-y border-border/60">
        {order.customer_name ? <Row label="Khách hàng" value={order.customer_name} /> : null}
        {order.phone ? <Row label="Số điện thoại" value={order.phone} mono /> : null}
        {order.shipping_code ? <Row label="Mã vận đơn" value={order.shipping_code} mono /> : null}
        {order.invoice_code ? <Row label="Mã hoá đơn" value={order.invoice_code} mono /> : null}
        <Row label="Ngày đặt" value={fmtDateTime(order.created_at)} />
        {order.province ? <Row label="Tỉnh/thành" value={order.province} /> : null}
      </dl>

      <div className="mt-3">
        <p className="text-xs font-semibold" style={{ color: PORTAL_COLOR.grayText }}>
          Sản phẩm
        </p>
        <ul className="mt-1.5 space-y-2">
          {order.items.map((item, index) => (
            <li key={`${item.sku}-${index}`} className="text-sm text-foreground">
              <span>
                {item.name} × {item.quantity}
              </span>
              {item.sku ? (
                <span
                  className="mt-0.5 block font-mono text-xs"
                  style={{ color: PORTAL_COLOR.grayText }}
                >
                  SKU: {item.sku}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
