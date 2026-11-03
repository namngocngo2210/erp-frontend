import type {
  PancakePosOrderLink,
  PancakePosRoutePart,
  PancakePosRoutingContext,
} from "@/lib/api/pancakePos";

/**
 * Logic thuần của thẻ "Đẩy đơn" và dialog "Chọn cách xuất" (two-way-sync §4.1, §6b, A2).
 * Luật hợp lệ khớp `domain/order_push.validate_parts` ở BE (BE vẫn kiểm lại).
 */

export const ORDER_LINK_STATUSES = [
  "needs_routing",
  "error",
  "skipped_duplicate",
  "pending",
  "pushing",
  "pushed",
  "updated",
  "cancelled",
  "linked",
] as const;
export type OrderLinkStatus = (typeof ORDER_LINK_STATUSES)[number];

/** Bộ lọc mặc định: các dòng cần người xử lý. */
export const ATTENTION_FILTER = "needs_routing,error,skipped_duplicate";
export const ALL_FILTER = "all";

export const ORDER_LINK_TONE: Record<
  OrderLinkStatus,
  "danger" | "warning" | "info" | "neutral" | "success"
> = {
  needs_routing: "warning",
  error: "danger",
  skipped_duplicate: "warning",
  pending: "info",
  pushing: "info",
  pushed: "success",
  updated: "success",
  cancelled: "neutral",
  linked: "success",
};

export function asOrderLinkStatus(value: string): OrderLinkStatus {
  return (ORDER_LINK_STATUSES as readonly string[]).includes(value)
    ? (value as OrderLinkStatus)
    : "error";
}

export type OrderLinkActions = { retry: boolean; force: boolean; route: boolean };

/** Nút nào hiện cho một dòng (BE `order_link_admin.retry_link` / `route_order`). */
export function actionsFor(
  link: Pick<PancakePosOrderLink, "status" | "pancake_order_id" | "last_error">,
): OrderLinkActions {
  const status = asOrderLinkStatus(link.status);
  if (status === "pushing") return { retry: false, force: false, route: false };
  const hasRemote = Boolean(link.pancake_order_id);
  const needsPerson =
    status === "error" || status === "needs_routing" || status === "skipped_duplicate";
  return {
    // Đã có đơn Pancake mà sửa/huỷ lỗi → đối chiếu lại; chưa có → đẩy / đánh giá lại.
    retry: hasRemote ? Boolean(link.last_error) : needsPerson,
    force: status === "skipped_duplicate",
    route: !hasRemote && (status === "needs_routing" || status === "error"),
  };
}

// ── dialog "Chọn cách xuất" ──────────────────────────────────────────────────

/** Một kiện đang soạn: kho + SL theo product_id (chuỗi của ô nhập). */
export type PartDraft = { warehouseId: number | null; quantities: Record<string, string> };

export type RouteResult =
  | { ok: true; parts: PancakePosRoutePart[] }
  | { ok: false; error: RouteError; productId?: number };

export type RouteError =
  | "noWarehouse"
  | "badQuantity"
  | "emptyPart"
  | "sumMismatch"
  | "tooManyParts";

export const MAX_PARTS = 10;

/** Một kho: gửi cả đơn từ kho đó. */
export function singleWarehouseParts(warehouseId: number | null): RouteResult {
  if (!warehouseId) return { ok: false, error: "noWarehouse" };
  return { ok: true, parts: [{ warehouse_id: warehouseId }] };
}

function parseQty(text: string | undefined): number | null {
  const value = (text ?? "").trim();
  if (value === "") return 0;
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

/** Tách kiện: mỗi kiện có kho + ít nhất một dòng; tổng SL mỗi sản phẩm = SL trên đơn. */
export function splitParts(
  lines: PancakePosRoutingContext["lines"],
  drafts: PartDraft[],
): RouteResult {
  if (drafts.length === 0) return { ok: false, error: "emptyPart" };
  if (drafts.length > MAX_PARTS) return { ok: false, error: "tooManyParts" };
  const sums = new Map<number, number>();
  const parts: PancakePosRoutePart[] = [];
  for (const draft of drafts) {
    if (!draft.warehouseId) return { ok: false, error: "noWarehouse" };
    const items: { product_id: number; quantity: number }[] = [];
    for (const line of lines) {
      const qty = parseQty(draft.quantities[String(line.product_id)]);
      if (qty === null) return { ok: false, error: "badQuantity", productId: line.product_id };
      if (qty > 0) {
        items.push({ product_id: line.product_id, quantity: qty });
        sums.set(line.product_id, (sums.get(line.product_id) ?? 0) + qty);
      }
    }
    if (items.length === 0) return { ok: false, error: "emptyPart" };
    parts.push({ warehouse_id: draft.warehouseId, items });
  }
  for (const line of lines) {
    if ((sums.get(line.product_id) ?? 0) !== line.quantity) {
      return { ok: false, error: "sumMismatch", productId: line.product_id };
    }
  }
  return { ok: true, parts };
}

/** SL còn phải chia của từng sản phẩm (âm = chia thừa). */
export function remainingByProduct(
  lines: PancakePosRoutingContext["lines"],
  drafts: PartDraft[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of lines) {
    const used = drafts.reduce(
      (sum, d) => sum + (parseQty(d.quantities[String(line.product_id)]) ?? 0),
      0,
    );
    out[String(line.product_id)] = line.quantity - used;
  }
  return out;
}

/**
 * Gợi ý tách: lần lượt theo thứ tự kho (BE đã sắp theo ưu tiên), mỗi kho lấy tối đa
 * phần tồn còn lại; kho không lấy được gì thì bỏ. Thiếu hàng ở mọi kho → phần thiếu
 * dồn vào kiện đầu (người điều phối sửa tay / chuyển kho trước).
 */
export function suggestSplit(ctx: PancakePosRoutingContext): PartDraft[] {
  const remaining = new Map(ctx.lines.map((l) => [l.product_id, l.quantity]));
  const drafts: PartDraft[] = [];
  for (const wh of ctx.warehouses) {
    const quantities: Record<string, string> = {};
    let any = false;
    for (const line of ctx.lines) {
      const left = remaining.get(line.product_id) ?? 0;
      const take = Math.min(left, Math.max(0, wh.stock[String(line.product_id)] ?? 0));
      if (take > 0) {
        quantities[String(line.product_id)] = String(take);
        remaining.set(line.product_id, left - take);
        any = true;
      }
    }
    if (any) drafts.push({ warehouseId: wh.warehouse_id, quantities });
  }
  const short = ctx.lines.filter((l) => (remaining.get(l.product_id) ?? 0) > 0);
  if (short.length > 0) {
    if (drafts.length === 0) {
      drafts.push({ warehouseId: ctx.warehouses[0]?.warehouse_id ?? null, quantities: {} });
    }
    for (const line of short) {
      const key = String(line.product_id);
      const current = Number(drafts[0].quantities[key] ?? 0);
      drafts[0].quantities[key] = String(current + (remaining.get(line.product_id) ?? 0));
    }
  }
  return drafts;
}

/** Kho mặc định cho chế độ một kho: kho đủ hàng đầu tiên, không có thì kho đầu. */
export function defaultWarehouse(ctx: PancakePosRoutingContext | undefined): number | null {
  if (!ctx || ctx.warehouses.length === 0) return null;
  return (ctx.warehouses.find((w) => w.enough) ?? ctx.warehouses[0]).warehouse_id;
}
