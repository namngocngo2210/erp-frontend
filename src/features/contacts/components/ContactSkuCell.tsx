import { Badge } from "@/components/ui/badge";
import type { ContactOrderItem } from "@/lib/api/contacts";

/**
 * Ô "SKU" của bảng contact: hiện SKU đầu tiên + badge đếm phần còn lại, tooltip
 * ra danh sách đầy đủ. Bảng đã 14 cột nên không đổ hết SKU ra ô — đơn import cũ
 * / đơn tạo trước khi có OrderItem có thể có cả chục dòng hàng, mỗi dòng bảng
 * sẽ cao khác nhau.
 *
 * `quantity = 0` là đơn không có OrderItem, SKU suy từ chuỗi gộp Order.sku —
 * không có số lượng thật để hiện. `sku` có thể rỗng (blank=True) nên fallback
 * sang `product_name` trước khi tới "—", ở cả hiển thị lẫn tooltip.
 */
function skuLabel(item: ContactOrderItem): string {
  return item.sku || item.product_name || "—";
}

export function ContactSkuCell({ items }: { items: ContactOrderItem[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;

  const [first, ...rest] = items;
  const title = items
    .map((item) => (item.quantity > 0 ? `${skuLabel(item)} ×${item.quantity}` : skuLabel(item)))
    .join("\n");

  return (
    <div className="flex items-center gap-1" title={title}>
      <span className="min-w-0 truncate text-xs text-foreground">{skuLabel(first)}</span>
      {rest.length > 0 ? (
        <Badge className="shrink-0 border-0 bg-slate-100 px-1.5 text-xs text-slate-600">
          +{rest.length}
        </Badge>
      ) : null}
    </div>
  );
}
