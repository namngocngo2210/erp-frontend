import { ProductGroupEntry } from "@/lib/api/products";
import { formatCurrency } from "@/lib/format";

// Phân trang theo "entry" phía server (1 entry = 1 nhóm hoặc 1 sản phẩm rời).
// Biến thể của nhóm chỉ tải khi người dùng mở nhóm (lazy) nên limit đặt cao để
// nhóm lớn (>100 biến thể) vẫn về trong 1 request.
export const DEFAULT_ENTRY_PAGE_SIZE = 20;
export const GROUP_VARIANTS_FETCH_LIMIT = 10000;
export const SEARCH_DEBOUNCE_MS = 300;

// Nhận cả decimal-string từ BE (Product.price) lẫn number đã parse. "1.234 ₫".
export const formatPrice = (value: number | string) => formatCurrency(value, { style: "vnd" });

// Nhãn khoảng giá cho header nhóm (price_min/price_max là chuỗi Decimal từ server).
export const groupPriceLabel = (entry: ProductGroupEntry) => {
  if (entry.price_min === null || entry.price_max === null) return "—";
  const min = Number(entry.price_min);
  const max = Number(entry.price_max);
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
};
