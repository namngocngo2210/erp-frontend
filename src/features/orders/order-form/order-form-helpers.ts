import { normalizeDecimalInput as normalizeNumericInput } from "@/features/orders/order-normalizers";
import { type OrderRow, type ProductRow } from "@/features/orders/order-types";
import { type CreateOrderPayload } from "@/features/orders/use-orders-data";
import { formatDatePattern } from "@/lib/format";

/** Tooltip cho ô nhập bị khoá vì thiếu quyền sửa-theo-field — dùng chung các section của form đơn. */
export const NO_FIELD_PERMISSION_TITLE = "Bạn không có quyền sửa trường này";

export type ChannelOption = {
  code: string;
  name: string;
  department_ids?: number[] | null;
  // Bảng giá gán cho kênh (null = chưa gán, dùng bảng mặc định) — form đơn dùng
  // `price_book.code` để tải giá sản phẩm đúng nền tảng của kênh (Task 11).
  price_book?: { id: number; code: string; name: string } | null;
};

export type EditableOrderItem = {
  product_id?: number;
  sku?: string;
  // Tên sản phẩm lưu sẵn từ đơn để hiển thị nhãn ô chọn khi sửa, không cần tải catalog.
  product_name?: string;
  quantity: number;
  unit_price?: string;
  // Giảm giá dòng: tiền giảm cho MỖI sản phẩm. Có discount_percent (khác null)
  // = đang ở chế độ %, tiền giảm suy từ đơn giá — xem `lineUnitDiscount`.
  discount?: string;
  discount_percent?: string | null;
};

/** Option của các ô chọn trong form đơn. */
export type OrderSelectOption = { value: string; label: string };

// Option cho ô chọn sản phẩm async: mang theo cả ProductRow để onChange dùng trực tiếp.
export type ProductOption = OrderSelectOption & { product?: ProductRow; group?: string };

export function productToOption(product: ProductRow): ProductOption {
  return { value: String(product.id), label: product.sku || "", product };
}

// Khoá nhóm dùng để sắp xếp; nhóm rỗng ("Khác") luôn xếp cuối nhờ ký tự cao nhất.
const UNGROUPED_SORT_KEY = "￿";

// Gom danh sách option phẳng thành các nhóm theo product.group.
// Header nhóm = "<code> — <name>"; sản phẩm không có nhóm gom vào nhóm cuối ("Khác").
// Sắp xếp: nhóm theo code (A→Z), "Khác" cuối; trong nhóm theo sku.
export function groupProductOptions(
  options: ProductOption[],
  ungroupedLabel: string,
): Array<{ label: string; options: ProductOption[] }> {
  const byKey = new Map<string, { sortKey: string; label: string; options: ProductOption[] }>();
  for (const option of options) {
    const group = option.product?.group ?? null;
    const sortKey = group ? group.code : UNGROUPED_SORT_KEY;
    const label = group ? `${group.code} — ${group.name}` : ungroupedLabel;
    const bucket = byKey.get(sortKey);
    if (bucket) {
      bucket.options.push(option);
    } else {
      byKey.set(sortKey, { sortKey, label, options: [option] });
    }
  }
  return Array.from(byKey.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((bucket) => ({
      label: bucket.label,
      options: bucket.options
        .slice()
        .sort((a, b) => (a.product?.sku ?? "").localeCompare(b.product?.sku ?? "")),
    }));
}

export function toEditableItems(order: OrderRow | null): EditableOrderItem[] {
  if (!order) return [];
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item) => ({
      product_id: item.product_id,
      sku: item.sku,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      discount_percent: item.discount_percent ?? null,
    }));
  }
  if (order.sku || order.quantity) {
    return [
      {
        sku: order.sku || "",
        quantity: Number(order.quantity || 1) || 1,
      },
    ];
  }
  return [];
}

export const DEFAULT_FORM_VALUES: CreateOrderPayload = {
  channel_code: "",
  customer_code: "",
  name: "",
  phone: "",
  raw_address: "",
  address: "",
  province_code: "",
  district_code: "",
  ward_code: "",
  kiotviet_location: "",
  kiotviet_ward: "",
  product: "",
  created_at_override: "",
  status: 0,
  customer_gender: 1, // Default Male
  discount_amount: "",
  booking_voucher_discount: "",
  weight: "",
  dimensions: "",
  branch_id: "",
  order_type: "normal",
  recall_code: "",
  order_source: null,
  vat: "no",
  // Đơn tạo mới mặc định để hệ thống chia sale theo trọng số đã cấu hình. Người
  // tạo bỏ tích nếu muốn tự chọn (hoặc để trống) nhân viên phụ trách.
  auto_assign_staff: true,
  fulfillment_warehouse: null,
  other_price: "",
  customer_prepaid: "0",
  result: "",
  invoice_code: "",
  feedback: "",
  total_after_discount: "",
  total_amount: "",
  shipping_fee: "",
  payment_method: "",
  shipping_code: "",
  sku: "",
  quantity: 0,
  items: [],
  crm: {
    customer_classification_code: null,
    customer_attitude_raw: "",
    sales_status_code: null,
    not_closed_reason_code: null,
    delivery_business_status_code: null,
    bomb_reason_text: "",
    internal_note: "",
    potential_level: null,
    needs: [],
  },
};

export const ORDER_TYPE_VALUES = ["normal", "no_return", "has_return"];

export function mapOrderToForm(order: OrderRow | null): CreateOrderPayload {
  if (!order) return { ...DEFAULT_FORM_VALUES };
  return {
    ...DEFAULT_FORM_VALUES,
    channel_code: order.channel_code || "",
    customer_code: order.customer_code || "",
    name: order.name || "",
    phone: order.phone || order.customer_phone || "",
    raw_address: order.raw_address || "",
    address: order.address || "",
    province_code: order.province_code || "",
    district_code: order.district_code || "",
    ward_code: order.ward_code || "",
    kiotviet_location: order.kiotviet_location || "",
    kiotviet_ward: order.kiotviet_ward || "",
    product: order.product || "",
    status: typeof order.status === "number" ? order.status : 0,
    kiotviet_channel_id: order.kiotviet_channel_id ?? undefined,
    staff_id: order.staff_id ?? undefined,
    customer_gender: order.customer_gender ?? null,
    discount_amount: order.discount_amount || "",
    booking_voucher_discount: order.booking_voucher_discount || "",
    weight: order.weight || "",
    dimensions: order.dimensions || "",
    branch_id: order.branch_id || "",
    order_type: order.order_type || "normal",
    // Mã thu hồi giờ là danh sách nhiều nhóm (`recall_entries`); ô đơn lẻ này chỉ
    // còn tác dụng seed giá trị nhóm ĐẦU TIÊN cho form — sửa nhiều nhóm phải qua
    // cột lưới, không qua dialog này.
    recall_code: order.recall_entries?.[0]?.recall_code ?? "",
    order_source: order.order_source ?? null,
    vat: order.vat ?? "no",
    // Sửa đơn đã tồn tại thì không có khái niệm chia lại — đơn đã có chủ, và cờ
    // này cũng không đi kèm PATCH (xem buildPatchPayload).
    auto_assign_staff: false,
    fulfillment_warehouse: order.fulfillment_warehouse ?? null,
    other_price: order.other_price || "",
    customer_prepaid: String(order.customer_prepaid ?? ""),
    result: order.result || "",
    invoice_code: order.invoice_code || "",
    feedback: order.feedback || "",
    total_after_discount: order.total_after_discount || "",
    total_amount: order.total_amount || "",
    shipping_fee: order.shipping_fee || "",
    payment_method: order.payment_method || "",
    shipping_code: order.shipping_code || "",
    sku: order.sku || "",
    quantity: order.quantity ?? 0,
    items: toEditableItems(order),
    crm: {
      customer_classification_code: order.crm?.customer_classification_code ?? null,
      customer_attitude_raw: order.crm?.customer_attitude_raw || "",
      sales_status_code: order.crm?.sales_status_code ?? null,
      not_closed_reason_code: order.crm?.not_closed_reason_code ?? null,
      delivery_business_status_code: order.crm?.delivery_business_status_code ?? null,
      bomb_reason_text: order.crm?.bomb_reason_text || "",
      internal_note: order.crm?.internal_note || "",
      potential_level: order.crm?.potential_level ?? null,
      needs: Array.isArray(order.crm?.needs)
        ? order.crm?.needs.map((item) => ({
            group_code: item.group_code,
            group_name: item.group_name,
            type_code: item.type_code,
            type_name: item.type_name,
          }))
        : [],
    },
  };
}

// normalizePhone (không validate, 84→0) đã gom về @/lib/phone: `normalizePhoneLoose`.
export { normalizePhoneLoose as normalizePhone } from "@/lib/phone";

export function parseAmount(value: string | number | undefined): number {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatAmountValue(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  const fixed = rounded.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

export function formatNumericDisplay(value: string | number | undefined): string {
  const normalized = normalizeNumericInput(String(value ?? ""));
  if (!normalized) return "";
  const negative = normalized.startsWith("-") ? "-" : "";
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart = "", fractionPart] = unsigned.split(".");
  const groupedInteger = (integerPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmedFraction = (fractionPart || "").replace(/0+$/, "");
  if (fractionPart !== undefined && trimmedFraction !== "") {
    return `${negative}${groupedInteger}.${trimmedFraction}`;
  }
  return `${negative}${groupedInteger}`;
}

/**
 * Dòng đang nhập giảm giá theo % hay theo tiền. Chế độ % = `discount_percent`
 * khác null (kể cả chuỗi rỗng khi vừa chuyển sang % chưa gõ gì — xoá trắng ô
 * không được làm rớt về chế độ tiền); null = chế độ tiền.
 */
export function isPercentDiscount(item: Pick<EditableOrderItem, "discount_percent">): boolean {
  return item.discount_percent != null;
}

/**
 * Tiền giảm cho MỖI sản phẩm của một dòng. Chế độ % thì tính từ đơn giá (làm tròn
 * 2 số lẻ, cùng quy tắc backend), chế độ tiền thì lấy số đã nhập; luôn kẹp trong
 * [0, đơn giá] để thành tiền không âm.
 */
export function lineUnitDiscount(
  item: Pick<EditableOrderItem, "unit_price" | "discount" | "discount_percent">,
): number {
  const unitPrice = Math.max(0, parseAmount(item.unit_price));
  const raw = isPercentDiscount(item)
    ? (unitPrice * parseAmount(item.discount_percent ?? "")) / 100
    : parseAmount(item.discount);
  const rounded = Math.round((raw + Number.EPSILON) * 100) / 100;
  return Math.min(Math.max(rounded, 0), unitPrice);
}

/** Dòng hàng mua đúng 2 sản phẩm luôn được giảm 200k cho cả dòng — trùng backend
 * `TWO_UNIT_LINE_UNIT_DISCOUNT`. `discount` là tiền giảm MỖI sản phẩm nên lưu 100k. */
export const TWO_UNIT_LINE_QUANTITY = 2;
export const TWO_UNIT_LINE_UNIT_DISCOUNT = 100000;

/**
 * Áp luật "SL 2 → giảm 200k cho dòng" khi đổi số lượng của một dòng. Chuyển sang
 * SL 2 thì ghi đè giảm giá bằng mức cố định; rời SL 2 mà giảm giá vẫn đúng mức tự
 * điền thì gỡ đi (dòng SL 1/3 không được mang nhầm ưu đãi). Giảm giá sale tự sửa
 * sau đó được giữ nguyên.
 */
export function applyTwoUnitLineDiscount<
  T extends Pick<EditableOrderItem, "discount" | "discount_percent">,
>(item: T, prevQuantity: number, nextQuantity: number): T {
  if (nextQuantity === TWO_UNIT_LINE_QUANTITY) {
    if (prevQuantity === TWO_UNIT_LINE_QUANTITY) return item;
    return {
      ...item,
      discount: formatAmountValue(TWO_UNIT_LINE_UNIT_DISCOUNT),
      discount_percent: null,
    };
  }
  const isAutoDiscount =
    !isPercentDiscount(item) && parseAmount(item.discount) === TWO_UNIT_LINE_UNIT_DISCOUNT;
  if (prevQuantity === TWO_UNIT_LINE_QUANTITY && isAutoDiscount) {
    return { ...item, discount: "", discount_percent: null };
  }
  return item;
}

export function calculateItemsTotal(items: EditableOrderItem[]): number {
  return items.reduce((sum, item) => {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const unitPrice = parseAmount(item.unit_price);
    return sum + quantity * (unitPrice - lineUnitDiscount(item));
  }, 0);
}

/** "dd-MM-yyyy HH:mm:ss"; rỗng → "-", chuỗi hỏng → giữ nguyên. */
export function formatDateTime(value?: string): string {
  return formatDatePattern(value, "dd-MM-yyyy HH:mm:ss", { fallback: "-", onInvalid: "raw" });
}

export function toDateTimeLocalInputValue(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function normalizeDimensionPart(value: string): string {
  return String(value || "").replace(/[^\d.,]/g, "");
}

export function buildDimensions(parts: [string, string, string]): string {
  return parts
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("x")
    .toLowerCase();
}

export function positiveDimPart(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

type ProductPackageLike = NonNullable<ProductRow["packages"]>[number];

export function findPackageForQuantity(
  product: ProductRow | undefined,
  quantity: number,
): ProductPackageLike | undefined {
  if (!product || !Array.isArray(product.packages)) return undefined;
  const qty = Math.max(1, Math.trunc(Number(quantity) || 1));
  return product.packages.find((pkg) => Number(pkg.quantity) === qty);
}

export function packageUnitPrice(pkg: ProductPackageLike): string {
  const totalPrice = Number(pkg.price ?? 0);
  const qty = Math.max(1, Number(pkg.quantity ?? 1));
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) return "";
  const unit = totalPrice / qty;
  return formatAmountValue(unit);
}

export function packageDimensions(pkg: ProductPackageLike): string {
  return buildDimensions([
    positiveDimPart(pkg.length),
    positiveDimPart(pkg.width),
    positiveDimPart(pkg.height),
  ]);
}
