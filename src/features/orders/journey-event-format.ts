/**
 * Diễn giải một dòng `order_journey_events` sang văn bản tiếng Việt cho timeline
 * "Lịch sử thao tác".
 *
 * Backend chỉ map sẵn nhãn cho `event_type` (EVENT_TYPE_LABELS); còn `from_code`
 * / `to_code` được ghi nguyên mã nghiệp vụ (`no_answer_1`, `easy_close`, ...).
 * Trang chi tiết đơn vốn đã fetch `crmCatalog` cho các ô select nên đổi mã sang
 * nhãn ngay tại FE, không cần thêm round-trip.
 */
import type { CrmCatalogPayload } from "@/features/orders/BlockCrmRating";
import type { OrderJourneyEventRow } from "@/features/orders/order-types";

/**
 * `payload_json.field` → danh sách option tương ứng trong `crmCatalog`.
 * Khớp với `event_mappings` ở backend (order_service_helpers._sync_assessment).
 */
const CATALOG_BY_FIELD: Record<string, keyof CrmCatalogPayload> = {
  customer_classification_code: "customer_classification_options",
  sales_status_code: "sales_status_options",
  not_closed_reason_code: "not_closed_reason_options",
  delivery_business_status_code: "delivery_business_status_options",
};

/**
 * Event mà `note` đã tự dựng câu đầy đủ (kèm tên field / tên sale) — lặp lại
 * "from → to" chỉ gây nhiễu, và mã ở đây là id/giá trị thô không có nhãn.
 */
const EVENTS_WITH_SELF_DESCRIBING_NOTE = new Set([
  "order_field_changed",
  "staff_assigned",
  "staff_changed",
  "staff_ingest_designated",
]);

function payloadString(payload: Record<string, unknown> | undefined, key: string): string | null {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Field nghiệp vụ mà event đang nói tới, để biết tra nhãn ở danh mục nào.
 * `assessment_created` không có `payload.field`: nó chỉ chép giá trị đầu tiên
 * khác rỗng vào `to_code`, nên suy ngược bằng cách dò trong payload.
 */
function inferField(event: OrderJourneyEventRow): string | undefined {
  const payload = event.payload_json;
  const explicit = payloadString(payload, "field");
  if (explicit) return explicit;

  const to = String(event.to_code ?? "").trim();
  if (!to) return undefined;
  return Object.keys(CATALOG_BY_FIELD).find((field) => payloadString(payload, field) === to);
}

function labelForCode(
  code: string,
  field: string | undefined,
  catalog: CrmCatalogPayload | null | undefined,
): string {
  if (!code) return "—";
  const catalogKey = field ? CATALOG_BY_FIELD[field] : undefined;
  const options = catalogKey ? catalog?.[catalogKey] : undefined;
  if (!Array.isArray(options)) return code;
  // Mã cũ đã bị gỡ khỏi catalog vẫn phải đọc được → fallback về mã raw.
  const found = (options as Array<{ code?: string; label?: string }>).find(
    (option) => option?.code === code,
  );
  return found?.label || code;
}

export type JourneyEventDescription = {
  /** Nhãn loại thao tác, ví dụ "Đổi trạng thái chốt sale". */
  title: string;
  /** Diễn giải thay đổi "cũ → mới"; rỗng khi event không mang from/to. */
  change: string;
};

export function describeJourneyEvent(
  event: OrderJourneyEventRow,
  catalog?: CrmCatalogPayload | null,
): JourneyEventDescription {
  const title = event.event_type_label || event.event_type;

  const from = String(event.from_code ?? "").trim();
  const to = String(event.to_code ?? "").trim();
  if (!from && !to) return { title, change: "" };
  if (EVENTS_WITH_SELF_DESCRIBING_NOTE.has(event.event_type)) return { title, change: "" };

  const field = inferField(event);
  return {
    title,
    change: `${labelForCode(from, field, catalog)} → ${labelForCode(to, field, catalog)}`,
  };
}

/**
 * `payload_json.source` (backend `StatusChangeSource`) → nguồn hiển thị khi event không
 * có actor, để phân biệt KiotViet/ĐVVC đẩy về với cron nội bộ.
 */
const SOURCE_LABELS: Record<string, string> = {
  kiotviet_webhook: "KiotViet",
  kiotviet_sync: "KiotViet (đồng bộ)",
  kiotviet_action: "KiotViet",
  stock_return: "Kho",
  // Pancake POS KHÔNG đổi `status` đơn; nguồn này xuất hiện ở event
  // `delivery_business_status_changed` (trạng thái vận chuyển thực từ webhook Pancake).
  pancake_pos: "Pancake POS",
  landing_ingest: "Landing page",
  pancake: "Pancake",
  lark: "Lark",
  excel_import: "Import Excel",
  // Đơn tạo trước khi có event "Tạo đơn": người tạo không được lưu.
  legacy: "Không rõ",
};

/** Tên người thực hiện; không có actor thì hiện nguồn, cuối cùng là "Hệ thống". */
export function journeyActorName(event: OrderJourneyEventRow): string {
  const actor = event.actor_name?.trim();
  if (actor) return actor;
  const source = payloadString(event.payload_json, "source");
  return (source && SOURCE_LABELS[source]) || "Hệ thống";
}
