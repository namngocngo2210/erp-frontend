import { useQuery } from "@tanstack/react-query";

import { fetchJson } from "@/services/http";
import type {
  FlowPendingScans,
  FlowSummary,
  IssueOrdersHistory,
  IssueSkusHistory,
  IssueSkuOrders,
} from "@/lib/api/inventory-flow";

export type FlowFilters = {
  dateFrom: string;
  dateTo: string;
  // Lọc nhiều kho (MultiSelect). Mảng rỗng = tất cả kho.
  warehouseIds: string[];
  product: string;
  // Lọc nhiều sản phẩm theo id (MultiSelect kiểu trang Đơn hàng).
  productIds: string[];
  order: string;
  // Nhãn ĐVVC (mirror CARRIER_LABELS backend) hoặc "" = tất cả.
  carrier: string;
};

// Bộ lọc trạng thái khớp cho danh sách mã quét (chỉ ảnh hưởng dòng chờ khớp).
export type MatchFilter = "all" | "matched" | "unmatched";

export function buildFlowParams(filters: FlowFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.dateFrom) p.set("date_from", filters.dateFrom);
  if (filters.dateTo) p.set("date_to", filters.dateTo);
  if (filters.warehouseIds.length > 0) p.set("warehouse_ids", filters.warehouseIds.join(","));
  if (filters.product.trim()) p.set("product", filters.product.trim());
  if (filters.productIds.length > 0) p.set("product_ids", filters.productIds.join(","));
  if (filters.order.trim()) p.set("order", filters.order.trim());
  if (filters.carrier) p.set("carrier", filters.carrier);
  return p;
}

// Số tổng hợp đầu trang (tile) + phân loại ĐVVC — cùng bộ lọc với 2 tab.
export function useFlowSummary(filters: FlowFilters) {
  const params = buildFlowParams(filters);
  return useQuery({
    queryKey: ["inventory", "flow-summary", params.toString()],
    queryFn: () =>
      fetchJson(
        `/api/inventory/dispatch-history/summary?${params.toString()}`,
      ) as Promise<FlowSummary>,
    staleTime: 10_000,
  });
}

// Danh sách chính tab Xuất: theo đơn hàng. Lịch sử là các đơn đã xuất (đã khớp)
// nên khi lọc "Chưa khớp" thì tắt hẳn danh sách này (enabled=false).
export function useIssueOrders(
  filters: FlowFilters,
  page: { limit: number; offset: number },
  enabled = true,
) {
  const params = buildFlowParams(filters);
  params.set("limit", String(page.limit));
  params.set("offset", String(page.offset));
  return useQuery({
    queryKey: ["inventory", "issue-orders", params.toString()],
    queryFn: () =>
      fetchJson(
        `/api/inventory/dispatch-history/orders?${params.toString()}`,
      ) as Promise<IssueOrdersHistory>,
    staleTime: 10_000,
    enabled,
  });
}

// Mã vận đơn xuất giao đã quét — lọc theo trạng thái khớp.
export function useIssuePending(filters: FlowFilters, match: MatchFilter = "all", enabled = true) {
  const params = buildFlowParams(filters);
  params.set("match", match);
  return useQuery({
    queryKey: ["inventory", "issue-pending", params.toString()],
    queryFn: () =>
      fetchJson(
        `/api/inventory/dispatch-history/pending?${params.toString()}`,
      ) as Promise<FlowPendingScans>,
    staleTime: 10_000,
    enabled,
  });
}

// View Theo SKU tab Xuất: gộp theo SKU. Pending không áp dụng cho SKU view;
// view này luôn hiện dữ liệu đã ghi sổ.
export function useIssueSkus(
  filters: FlowFilters,
  page: { limit: number; offset: number },
  enabled = true,
) {
  const params = buildFlowParams(filters);
  params.set("limit", String(page.limit));
  params.set("offset", String(page.offset));
  return useQuery({
    queryKey: ["inventory", "issue-skus", params.toString()],
    queryFn: () =>
      fetchJson(
        `/api/inventory/dispatch-history/skus?${params.toString()}`,
      ) as Promise<IssueSkusHistory>,
    staleTime: 10_000,
    enabled,
  });
}

// Drill-down: các đơn chứa một SKU.
export function useIssueSkuOrders(
  productId: number | null,
  filters: FlowFilters,
  enabled: boolean,
) {
  const params = buildFlowParams(filters);
  if (productId) params.set("product_id", String(productId));
  return useQuery({
    queryKey: ["inventory", "issue-sku-orders", params.toString()],
    queryFn: () =>
      fetchJson(
        `/api/inventory/dispatch-history/skus/orders?${params.toString()}`,
      ) as Promise<IssueSkuOrders>,
    staleTime: 10_000,
    enabled,
  });
}

/**
 * Dựng params JSON gửi cho job export nền (`dispatch_history`/`return_history`,
 * Task 17) — mirror `buildFlowParams` (dùng cho query URL của 2 luồng đồng bộ cũ)
 * nhưng đổi tên field khớp `_common_filters` phía backend
 * (apps/inventory/exports_definitions.py). Khác biệt DUY NHẤT: `product_ids` và
 * `warehouse_ids` là CHUỖI phân tách dấu phẩy (backend tự parse lại), không phải
 * mảng — validate() đọc `raw_params.get(...)` rồi `.split(",")`, gửi sai kiểu sẽ
 * khiến bộ lọc bị bỏ qua âm thầm và file Excel rộng hơn màn hình đang xem.
 */
export function buildFlowExportParams(
  filters: FlowFilters,
  group: "order" | "sku" = "order",
): Record<string, unknown> {
  return {
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    warehouse_ids: filters.warehouseIds.join(","),
    product: filters.product.trim(),
    product_ids: filters.productIds.join(","),
    order: filters.order.trim(),
    carrier: filters.carrier,
    group: group === "sku" ? "sku" : "",
  };
}
