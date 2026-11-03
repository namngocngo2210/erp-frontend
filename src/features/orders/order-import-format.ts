/**
 * Pure helpers extracted from the OrdersPage god-component: display formatters,
 * import-paste normalisation, and the create→patch payload mapper. No React,
 * no component state — safe to unit-test in isolation.
 */

import { formatCurrency } from "@/lib/format";
import { ORDER_TYPE_VALUES } from "@/features/orders/order-form/order-form-helpers";
import type { CreateOrderPayload } from "@/features/orders/use-orders-data";
import type { OrderColumnKey, OrderRow } from "@/features/orders/order-types";

export function buildPatchPayload(values: CreateOrderPayload): Partial<OrderRow> {
  // order_type ChoiceField ở backend đã thu hẹp còn 3 giá trị (normal/no_return/
  // has_return). Đơn cũ trong DB vẫn có thể mang 1 trong 4 giá trị đã gỡ
  // (same_product/different_product/purchase/warranty_return) — form đọc nguyên
  // giá trị đó vào object rồi gửi lại y nguyên trong PATCH. Nếu cứ gửi, DRF
  // ChoiceField trả 400 "not a valid choice" và đơn đó vĩnh viễn không sửa được
  // field nào khác qua dialog. Chỉ đưa order_type vào payload khi nó là 1 trong
  // 3 giá trị hợp lệ; giá trị legacy thì BỎ HẲN key — không gửi = BE giữ nguyên
  // giá trị cũ.
  const orderType = values.order_type || "normal";
  return {
    channel_code: values.channel_code || "",
    customer_code: values.customer_code || "",
    kiotviet_channel_id: values.kiotviet_channel_id ?? null,
    branch_id: values.branch_id || "",
    // `staff_id` CHỈ đi kèm khi form thực sự có ý kiến về nhân viên: `undefined` =
    // "không đụng tới" (bỏ hẳn khỏi payload để BE giữ nguyên), `null` = người dùng
    // chủ động xoá. Trước đây ép `?? null` nên mọi lần lưu form mà ô nhân viên đang
    // trống đều XOÁ sale của đơn — kể cả khi ô trống chỉ vì thiếu option để hiển thị.
    ...(values.staff_id !== undefined ? { staff_id: values.staff_id } : {}),
    status: values.status ?? 0,
    ...(ORDER_TYPE_VALUES.includes(orderType) ? { order_type: orderType } : {}),
    // `recall_code` KHÔNG còn map vào patch: backend đã bỏ field này khỏi `recall`
    // (chỉ còn `return_slip_code`) — sửa mã thu hồi giờ đi qua cột lưới nhiều nhóm
    // (`recall_entries`, xem cell-renderers.tsx), không qua dialog sửa đơn này nữa.
    name: values.name || "",
    phone: values.phone || "",
    customer_gender: values.customer_gender ?? null,
    raw_address: values.raw_address || "",
    address: values.address || "",
    province_code: values.province_code || "",
    district_code: values.district_code || "",
    ward_code: values.ward_code || "",
    kiotviet_location: values.kiotviet_location || "",
    kiotviet_ward: values.kiotviet_ward || "",
    sku: values.sku || "",
    quantity: values.quantity ?? 0,
    weight: values.weight || "",
    dimensions: values.dimensions || "",
    total_amount: values.total_amount || "",
    shipping_fee: values.shipping_fee || "",
    discount_amount: values.discount_amount || "",
    booking_voucher_discount: values.booking_voucher_discount || "",
    total_after_discount: values.total_after_discount || "",
    other_price: values.other_price || "",
    customer_prepaid: values.customer_prepaid ? String(values.customer_prepaid) : "",
    payment_method: values.payment_method || "",
    shipping_code: values.shipping_code || "",
    invoice_code: values.invoice_code || "",
    result: values.result || "",
    feedback: values.feedback || "",
    items: Array.isArray(values.items) ? (values.items as OrderRow["items"]) : [],
    crm: values.crm ?? null,
    fulfillment_warehouse: values.fulfillment_warehouse ?? null,
  };
}

/**
 * Chuẩn bị việc bấm Lưu trên nhánh SỬA đơn của `OrderFormDialog`: guard tiền
 * điều kiện (kênh + SĐT) trên `values` ĐẦY ĐỦ, rồi loại field chưa được cấp
 * quyền sửa-theo-field khỏi ĐẦU RA của `buildPatchPayload`.
 *
 * `values` PHẢI là form đầy đủ — `OrderFormDialog` không tự strip field thiếu
 * quyền trước khi gọi `onSubmit`. Lý do: `buildPatchPayload` set MỌI field
 * bằng fallback rỗng/null/0 bất kể `values` có key đó hay không, nên nếu strip
 * ở `values` (input của `buildPatchPayload`) thì field bị strip sẽ bị hàm đó
 * dựng lại thành giá trị rỗng TƯỜNG MINH thay vì biến mất khỏi payload —
 * backend coi đó là "đổi thật" trên field chưa cấp quyền → 403 gần như mọi
 * lần Lưu (bug đã xảy ra thật trong review Task 8, xem task-8-report.md phần
 * "CRITICAL fix"). Vì vậy phải strip trên ĐẦU RA `Partial<OrderRow>`, và guard
 * tiền điều kiện phải đọc `values` gốc — không phải payload đã strip.
 */
export function prepareOrderEditSubmit(
  values: CreateOrderPayload,
  canEditField: (field: string) => boolean,
): { blocked: true } | { blocked: false; payload: Partial<OrderRow> } {
  if (!values.channel_code || !(values.phone ?? "").trim()) {
    return { blocked: true };
  }
  const patchPayload = buildPatchPayload(values);
  const payload = Object.fromEntries(
    Object.entries(patchPayload).filter(([key]) => canEditField(key)),
  ) as Partial<OrderRow>;
  return { blocked: false, payload };
}

export function formatMoneyDisplay(value: string | number | null | undefined): string {
  return formatCurrency(value, {
    fallback: "-",
    locale: "en-US",
    maximumFractionDigits: 0,
    onInvalid: "raw",
  });
}

export function formatWeightDisplay(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed)) return String(value);
  const normalized = Number.isInteger(parsed)
    ? String(parsed)
    : String(parsed).replace(/\.?0+$/, "");
  return `${normalized}g`;
}

export function formatDimensionsDisplay(value: string | null | undefined): string {
  if (!value) return "-";
  const parts = String(value)
    .split(/x|×/i)
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length !== 3) return String(value);
  return `${parts[1]}x${parts[2]}x${parts[0]}cm`;
}

export const RECALL_COLUMN_KEYS: OrderColumnKey[] = [
  "koc_order_type",
  "recall_entries",
  "recall_code",
  "recall_created_date",
  "recall_received_date",
  "return_slip_code",
];

export const IMPORT_HEADERS = [
  "Kênh Kiot",
  "Mã NV",
  "Kênh Bán",
  "Tên KH",
  "Giới Tính",
  "SĐT",
  "Địa chỉ",
  "Mã SP",
  "SL",
  "Giá",
  "Giảm Giá",
  "Giảm Giá PĐ",
  "Trọng Lượng",
  "Kích Thước",
  "Kho",
  "Loại Đơn",
  "Khách TT Trước",
] as const;

// Layout 19 cột riêng cho import đơn KOC (khác IMPORT_HEADERS: thêm Mã KH, Khu vực,
// Phường/Xã; đảo Giảm Giá PĐ/Giảm Giá; bỏ Khách TT Trước). Backend parse positional
// theo KOC_IMPORT_PAYLOAD_FIELDS qua endpoint /api/orders/import-koc-text.
export const KOC_IMPORT_HEADERS = [
  "Kênh Kiot",
  "Mã KH",
  "Người tạo",
  "Kênh Bán",
  "Tên KH",
  "Giới Tính",
  "SĐT",
  "Địa chỉ",
  "Khu vực",
  "Phường/Xã",
  "Mã SP",
  "SL",
  "Giá",
  "Giảm Giá PĐ",
  "Giảm Giá",
  "Trọng Lượng",
  "Kích Thước",
  "BRANCH_ID",
  "Loại Đơn",
] as const;

// Format pasted spreadsheet text (from Google Sheets / Excel) into pipe-delimited rows.
// Two failure modes are handled:
//   (a) Quoted cells with embedded line breaks — spreadsheet exports wrap cells
//       containing `\n` in "..." and we must collapse those internal newlines
//       BEFORE splitting rows, otherwise one logical row becomes two.
//   (b) Some clipboard sources (observed with Google Sheets for long rows with
//       trailing empty cells) drop a raw `\n` at a field boundary WITHOUT
//       quoting. The quote-walk above can't see that, so after normalizing
//       we also merge any line whose field count is short of the header count
//       into its successor.
export function formatImportText(
  raw: string,
  targetHeaderCount: number = IMPORT_HEADERS.length,
): string {
  // 1) Walk the text tracking quoted regions. Inside quotes, replace CR/LF with
  //    a space and handle escaped double-quotes ("" → "). Outside, keep as-is.
  //    Drop the surrounding quote characters themselves.
  let unquoted = "";
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        unquoted += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && raw[i + 1] === "\n") i += 1;
      unquoted += " ";
      continue;
    }
    unquoted += ch;
  }

  // 2) Normalize line endings, convert tabs to pipes, trim each field, drop empty rows.
  const rawLines = unquoted
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/\t/g, "|")
        .split("|")
        .map((field) => field.trim())
        .join("|"),
    )
    .filter((line) => line.replace(/\|/g, "").trim() !== "");

  // 3) Merge continuation lines. A complete row has IMPORT_HEADERS.length fields
  //    (= length - 1 pipes). If a buffered line has fewer pipes than that,
  //    append the next line directly — the buffered line's trailing `|` (if any)
  //    naturally serves as the separator; if it has no trailing `|`, the paste
  //    was mid-cell and the user can fix the seam manually, which is still a
  //    far better UX than silently dropping the row.
  const targetPipes = targetHeaderCount - 1;
  const merged: string[] = [];
  let buffer = "";
  for (const line of rawLines) {
    buffer = buffer ? buffer + line : line;
    const pipes = (buffer.match(/\|/g) || []).length;
    if (pipes >= targetPipes) {
      merged.push(buffer);
      buffer = "";
    }
  }
  if (buffer) merged.push(buffer);

  return merged.join("\n");
}
