import type { PancakePosWebhookCount } from "@/lib/api/pancakePos";

/**
 * Logic thuần của thẻ "Webhook" và "Chờ khớp đơn" (two-way-sync §5.1, §6b, B1).
 */

export const WEBHOOK_EVENT_TYPES = ["orders", "variations_warehouses", "products"] as const;
const KNOWN_EVENT_TYPES = [...WEBHOOK_EVENT_TYPES, "customers", "unknown"] as const;
export type WebhookEventTypeKey = (typeof KNOWN_EVENT_TYPES)[number];

/** Loại sự kiện → khoá nhãn i18n (loại lạ gom về "unknown"). */
export function asEventTypeKey(value: string): WebhookEventTypeKey {
  return (KNOWN_EVENT_TYPES as readonly string[]).includes(value)
    ? (value as WebhookEventTypeKey)
    : "unknown";
}

export const WEBHOOK_EVENT_STATUSES = ["pending", "processed", "ignored", "error"] as const;
export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];

export type WebhookTypeSummary = {
  eventType: string;
  total: number;
  byStatus: Record<WebhookEventStatus, number>;
};

/** Gộp số sự kiện 24h (BE trả từng cặp loại × trạng thái) thành một dòng mỗi loại.
 * Loại chính luôn có dòng (0 khi chưa nhận); loại lạ (customers/unknown) nối sau nếu có. */
export function summarizeCounts(counts: PancakePosWebhookCount[]): WebhookTypeSummary[] {
  const rows = new Map<string, WebhookTypeSummary>();
  const ensure = (eventType: string) => {
    let row = rows.get(eventType);
    if (!row) {
      row = { eventType, total: 0, byStatus: { pending: 0, processed: 0, ignored: 0, error: 0 } };
      rows.set(eventType, row);
    }
    return row;
  };
  WEBHOOK_EVENT_TYPES.forEach(ensure);
  for (const c of counts) {
    const row = ensure(c.event_type);
    row.total += c.count;
    if ((WEBHOOK_EVENT_STATUSES as readonly string[]).includes(c.status)) {
      row.byStatus[c.status as WebhookEventStatus] += c.count;
    }
  }
  return [...rows.values()];
}

export const INBOUND_MATCH_STATUSES = ["unmatched", "waiting", "matched", "ignored"] as const;
export type InboundMatchStatus = (typeof INBOUND_MATCH_STATUSES)[number];

/** Bộ lọc mặc định của "Chờ khớp đơn": chưa khớp (cần người xử lý + đang chờ). */
export const INBOUND_ATTENTION_FILTER = "unmatched,waiting";

export const INBOUND_TONE: Record<
  InboundMatchStatus,
  "danger" | "warning" | "success" | "neutral"
> = {
  unmatched: "danger",
  waiting: "warning",
  matched: "success",
  ignored: "neutral",
};

export function asInboundStatus(value: string): InboundMatchStatus {
  return (INBOUND_MATCH_STATUSES as readonly string[]).includes(value)
    ? (value as InboundMatchStatus)
    : "waiting";
}

/** Mã đơn CRM người dùng gõ để khớp tay: số nguyên dương, cho phép tiền tố "#". */
export function parseOrderId(raw: string): number | null {
  const text = raw.trim().replace(/^#/, "");
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Khớp tay / bỏ qua chỉ hiện với đơn chưa khớp. */
export function canResolve(status: string): boolean {
  const s = asInboundStatus(status);
  return s === "unmatched" || s === "waiting";
}
