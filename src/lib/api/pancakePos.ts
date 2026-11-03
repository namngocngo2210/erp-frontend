import { apiGet, apiPost, apiPut, type components } from "@/api/typed";
import { updateSystemSettings } from "@/lib/api/systemSettings";

/**
 * Đồng bộ sản phẩm CRM → Pancake POS (docs/pancake-pos-product-sync.md). Chỉ gọi
 * mạng; điều phối ở call site. API key KHÔNG đi qua đây — nhập ở Cấu hình hệ thống.
 */

type Schemas = components["schemas"];

export type PancakePosStatus = Schemas["PancakePosStatus"];
export type PancakePosHealth = Schemas["PancakePosHealth"];
export type PancakePosSyncRun = Schemas["PancakePosSyncRun"];
export type PancakePosLink = Schemas["PancakePosLink"];
export type PancakePosLinkStatus = Schemas["PancakePosLinkStatusEnum"];
export type PancakePosSyncMode = Schemas["ModeEnum"];

/** `report` BE khai JSON tự do — đây là phần UI đọc (xem SyncReport.as_json ở BE). */
export type PancakePosSyncReport = {
  dry_run?: boolean;
  candidates?: number;
  eligible?: number;
  groups?: number;
  pancake_variations?: number;
  requested?: number;
  ineligible?: Record<string, number>;
  samples?: Array<{
    group_key: string;
    action: string;
    pancake_product_id: string | null;
    request?: unknown;
    variation_ids?: string[];
  }>;
  conflicts?: Array<{ group_key: string; sku: string; message: string }>;
  errors?: Array<{ group_key: string; skus: string[]; message: string }>;
  fatal?: string;
};

export type PancakePosSyncRunDetail = Omit<Schemas["PancakePosSyncRunDetail"], "report"> & {
  report: PancakePosSyncReport;
};

export type PancakePosWarehouseRow = Schemas["PancakePosWarehouseRow"];
export type PancakePosWarehouseLinkIn = Schemas["PancakePosWarehouseLinkIn"];
export type PancakePosRemoteWarehouses = Schemas["PancakePosRemoteWarehouses"];
export type PancakePosInitialStockStatus = Schemas["PancakePosInitialStockStatus"];

/** Một dòng (kho, SKU) lệch giữa CRM và Pancake (`pancake_qty` null = chưa đọc được trên Pancake). */
export type InitialStockDiff = {
  sku: string;
  product_id: number;
  variation_id: string;
  warehouse_id: number;
  warehouse_name: string;
  crm_qty: number;
  push_qty: number;
  pancake_qty: number | null;
  delta: number | null;
};

/** `report` của lượt tồn đầu kỳ (xem InitialStockReport.as_json ở BE). */
export type InitialStockReport = {
  kind?: "initial_stock";
  dry_run?: boolean;
  scope?: { warehouse_ids: number[] | null; skus: string[] | null };
  warehouses?: Array<{
    warehouse_id: number;
    warehouse_name: string;
    pancake_warehouse_id: string;
    pancake_warehouse_name: string;
  }>;
  totals?: Partial<
    Record<
      | "lines"
      | "skus"
      | "to_write"
      | "unchanged"
      | "unknown_on_pancake"
      | "negative"
      | "missing_link"
      | "crm_total"
      | "pancake_total"
      | "batches"
      | "batch_size"
      | "split_batches"
      | "written"
      | "failed",
      number
    >
  >;
  diffs?: InitialStockDiff[];
  negatives?: Array<{ sku: string; warehouse_id: number; warehouse_name: string; crm_qty: number }>;
  missing_links?: Array<{
    product_id: number;
    sku: string;
    quantity: number;
    warehouses: Record<string, number>;
  }>;
  errors?: Array<{ batch: number; size: number; skus: string[]; message: string }>;
  line_errors?: Array<{
    sku: string;
    warehouse_name: string;
    variation_id: string;
    push_qty: number;
    message: string;
  }>;
  fatal?: string;
};

export type InitialStockRequest =
  | { mode: "dry_run"; warehouse_ids?: number[]; skus?: string[] }
  | { mode: "apply"; dry_run_id: number };

export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

export type PancakePosSyncRequest = {
  mode: PancakePosSyncMode;
  limit?: number | null;
  skus?: string[];
};

export type PancakePosLinksParams = {
  status?: PancakePosLinkStatus | "";
  q?: string;
  limit?: number;
  offset?: number;
};

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export async function getPancakePosStatus(): Promise<PancakePosStatus> {
  return apiGet("/api/pancake-pos/status");
}

/** Gọi `GET /shops` phía Pancake để kiểm tra API key; trả danh sách shop. */
export async function checkPancakePosHealth(): Promise<PancakePosHealth> {
  return apiGet("/api/pancake-pos/health");
}

/** Xếp lượt chạy (Celery) — trả id nhật ký ngay; 409 nếu đang có lượt khác. */
export async function startPancakePosSync(
  body: PancakePosSyncRequest,
): Promise<{ run_id: number }> {
  // BE trả 202 → typed client không suy ra được kiểu (chỉ đọc nhánh 200/201).
  return (await apiPost("/api/pancake-pos/sync", body)) as { run_id: number };
}

export async function listPancakePosRuns(
  params: { limit?: number; offset?: number; mode?: string } = {},
): Promise<Page<PancakePosSyncRun>> {
  return apiGet(withQuery("/api/pancake-pos/sync-runs", params) as "/api/pancake-pos/sync-runs");
}

export async function getPancakePosRun(id: number): Promise<PancakePosSyncRunDetail> {
  return (await apiGet(
    `/api/pancake-pos/sync-runs/${id}` as "/api/pancake-pos/sync-runs/{id}",
  )) as PancakePosSyncRunDetail;
}

export async function listPancakePosLinks(
  params: PancakePosLinksParams = {},
): Promise<Page<PancakePosLink>> {
  return apiGet(
    withQuery("/api/pancake-pos/links", {
      status: params.status,
      q: params.q?.trim(),
      limit: params.limit,
      offset: params.offset,
    }) as "/api/pancake-pos/links",
  );
}

export async function retryPancakePosLink(id: number): Promise<PancakePosLink> {
  return (await apiPost(
    `/api/pancake-pos/links/${id}/retry` as "/api/pancake-pos/links/{id}/retry",
    undefined as never,
  )) as PancakePosLink;
}

/** Chọn shop = ghi sysconfig PANCAKE_POS_SHOP_ID (API cấu hình hệ thống, superuser). */
export async function setPancakePosShop(shopId: number): Promise<void> {
  await updateSystemSettings({ PANCAKE_POS_SHOP_ID: String(shopId) });
}

// ── ghép kho + tồn đầu kỳ (docs/pancake-pos-two-way-sync.md §3, §7 A1) ─────────

export async function getWarehouseLinks(): Promise<PancakePosWarehouseRow[]> {
  return (await apiGet("/api/pancake-pos/warehouse-links")).items;
}

/** Thay TOÀN BỘ danh sách ghép (kho không có trong `links` = bỏ ghép). */
export async function saveWarehouseLinks(
  links: PancakePosWarehouseLinkIn[],
): Promise<PancakePosWarehouseRow[]> {
  return (await apiPut("/api/pancake-pos/warehouse-links", { links })).items;
}

/** Kho trên shop Pancake (BE gọi `GET /shops/{id}/warehouses`). */
export async function listPancakeWarehouses(): Promise<PancakePosRemoteWarehouses> {
  return apiGet("/api/pancake-pos/pancake-warehouses");
}

export async function getInitialStockStatus(): Promise<PancakePosInitialStockStatus> {
  return apiGet("/api/pancake-pos/initial-stock/status");
}

/** Xếp lượt tồn đầu kỳ; ghi thật cần id lượt chạy thử gần nhất (≤ 30 phút). */
export async function startInitialStock(body: InitialStockRequest): Promise<{ run_id: number }> {
  return (await apiPost("/api/pancake-pos/initial-stock", body)) as { run_id: number };
}

export async function getInitialStockRun(
  id: number,
): Promise<Omit<PancakePosSyncRunDetail, "report"> & { report: InitialStockReport }> {
  return (await getPancakePosRun(id)) as unknown as Omit<PancakePosSyncRunDetail, "report"> & {
    report: InitialStockReport;
  };
}

// ── đẩy đơn CRM → Pancake (docs/pancake-pos-two-way-sync.md §4.1, §6b, §7 A2) ──

export type PancakePosOrderLink = Schemas["PancakePosOrderLink"];
export type PancakePosOrderRef = Schemas["PancakePosOrderRef"];
export type PancakePosRoutingContext = Schemas["PancakePosRoutingContext"];
export type PancakePosRoutePart = Schemas["PancakePosRoutePart"];

export type PancakePosOrderLinksParams = {
  /** Một hoặc nhiều trạng thái, cách dấu phẩy ("" = tất cả). */
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export async function listPancakePosOrderLinks(
  params: PancakePosOrderLinksParams = {},
): Promise<Page<PancakePosOrderLink>> {
  return apiGet(
    withQuery("/api/pancake-pos/order-links", {
      status: params.status,
      q: params.q?.trim(),
      limit: params.limit,
      offset: params.offset,
    }) as "/api/pancake-pos/order-links",
  );
}

/** Thử lại một liên kết đơn; `force` = "Vẫn đẩy" đơn bị luật chống trùng chặn. */
export async function retryPancakePosOrderLink(
  id: number,
  force = false,
): Promise<{ order_id: number }> {
  return (await apiPost(
    `/api/pancake-pos/order-links/${id}/retry` as "/api/pancake-pos/order-links/{id}/retry",
    { force },
  )) as { order_id: number };
}

/** Mã đơn Pancake của một đơn CRM (trang chi tiết đơn). */
export async function getPancakePosOrderRefs(orderId: number): Promise<PancakePosOrderRef[]> {
  return (
    await apiGet(
      `/api/pancake-pos/orders/${orderId}/refs` as "/api/pancake-pos/orders/{order_id}/refs",
    )
  ).items;
}

/** Dòng hàng + tồn Hàng hoá CRM từng kho đã ghép — cho dialog "Chọn cách xuất". */
export async function getPancakePosOrderRouting(
  orderId: number,
): Promise<PancakePosRoutingContext> {
  return apiGet(
    `/api/pancake-pos/orders/${orderId}/routing` as "/api/pancake-pos/orders/{order_id}/routing",
  );
}

/** Một kho: `[{warehouse_id}]`; tách kiện: mỗi part `{warehouse_id, items}`. */
export async function routePancakePosOrder(
  orderId: number,
  parts: PancakePosRoutePart[],
): Promise<{ link_ids: number[] }> {
  return (await apiPost(
    `/api/pancake-pos/orders/${orderId}/routing` as "/api/pancake-pos/orders/{order_id}/routing",
    { parts },
  )) as { link_ids: number[] };
}

// ── webhook Pancake → CRM (docs/pancake-pos-two-way-sync.md §5.1, §6b, §7 B1) ──

export type PancakePosWebhookStatus = Schemas["PancakePosWebhookStatus"];
export type PancakePosWebhookCount = Schemas["PancakePosWebhookCount"];
export type PancakePosWebhookConfigureResult = Schemas["PancakePosWebhookConfigureResult"];
export type PancakePosInboundOrder = Schemas["PancakePosInboundOrder"];

export type PancakePosInboundParams = {
  /** Một hoặc nhiều trạng thái khớp, cách dấu phẩy (mặc định BE: waiting,unmatched). */
  match_status?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export async function getPancakePosWebhookStatus(): Promise<PancakePosWebhookStatus> {
  return apiGet("/api/pancake-pos/webhook/status");
}

/** Đặt webhook trên shop Pancake; `dry_run` (mặc định) chỉ trả body đã che secret. */
export async function configurePancakePosWebhook(
  dryRun: boolean,
): Promise<PancakePosWebhookConfigureResult> {
  return (await apiPost("/api/pancake-pos/webhook/configure", {
    dry_run: dryRun,
  })) as PancakePosWebhookConfigureResult;
}

export async function retryPancakePosWebhookErrors(): Promise<{ count: number }> {
  return (await apiPost("/api/pancake-pos/webhook/retry-errors", {})) as { count: number };
}

export async function listPancakePosInboundOrders(
  params: PancakePosInboundParams = {},
): Promise<Page<PancakePosInboundOrder>> {
  return apiGet(
    withQuery("/api/pancake-pos/inbound-orders", {
      match_status: params.match_status,
      q: params.q?.trim(),
      limit: params.limit,
      offset: params.offset,
    }) as "/api/pancake-pos/inbound-orders",
  );
}

/** Khớp tay đơn Pancake với đơn CRM, hoặc bỏ qua. */
export async function resolvePancakePosInboundOrder(
  id: number,
  body: { action: "match"; order_id: number } | { action: "ignore" },
): Promise<PancakePosInboundOrder> {
  return (await apiPost(
    `/api/pancake-pos/inbound-orders/${id}/resolve` as "/api/pancake-pos/inbound-orders/{id}/resolve",
    body,
  )) as PancakePosInboundOrder;
}

// ── trạng thái vận chuyển thực từ Pancake (two-way-sync §5, MR D) ──

export type PancakeDeliveryPart = Schemas["PancakePosDeliveryPart"];
export type PancakeOrderDelivery = Schemas["PancakePosOrderDelivery"];
export type PancakeStuckItem = Schemas["PancakePosStuckItem"];
export type PancakeStuckGroup = Schemas["PancakePosStuckBucket"];
export type PancakeStuckReport = Schemas["PancakePosStuckReport"];
export type PancakeMismatchItem = Schemas["PancakePosDeliveryMismatch"];
export type PancakeMismatchReport = Schemas["PancakePosDeliveryMismatchReport"];

export async function getPancakeOrderDelivery(orderId: number): Promise<PancakeOrderDelivery> {
  return apiGet(
    `/api/pancake-pos/orders/${orderId}/delivery` as "/api/pancake-pos/orders/{order_id}/delivery",
  );
}

export async function getPancakeStuckReport(): Promise<PancakeStuckReport> {
  return apiGet("/api/pancake-pos/delivery/stuck");
}

export async function getPancakeMismatchReport(): Promise<PancakeMismatchReport> {
  return apiGet("/api/pancake-pos/delivery/mismatches");
}
