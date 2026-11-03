import { useQuery } from "@tanstack/react-query";

import {
  getInitialStockRun,
  getPancakePosOrderRefs,
  getPancakePosOrderRouting,
  getInitialStockStatus,
  getPancakePosRun,
  getPancakePosStatus,
  getWarehouseLinks,
  listPancakeWarehouses,
  listPancakePosLinks,
  listPancakePosOrderLinks,
  listPancakePosRuns,
  getPancakePosWebhookStatus,
  listPancakePosInboundOrders,
  getPancakeOrderDelivery,
  getPancakeStuckReport,
  getPancakeMismatchReport,
  type PancakePosInboundParams,
  type PancakePosLinksParams,
  type PancakePosOrderLinksParams,
} from "@/lib/api/pancakePos";

export const pancakePosKeys = {
  all: ["pancake-pos"] as const,
  status: ["pancake-pos", "status"] as const,
  runs: (offset: number, mode = "") => ["pancake-pos", "runs", mode, offset] as const,
  run: (id: number) => ["pancake-pos", "run", id] as const,
  warehouseLinks: ["pancake-pos", "warehouse-links"] as const,
  pancakeWarehouses: ["pancake-pos", "pancake-warehouses"] as const,
  initialStock: ["pancake-pos", "initial-stock"] as const,
  links: (params: PancakePosLinksParams) => ["pancake-pos", "links", params] as const,
  orderLinks: (params: PancakePosOrderLinksParams) =>
    ["pancake-pos", "order-links", params] as const,
  orderRouting: (orderId: number) => ["pancake-pos", "order-routing", orderId] as const,
  orderRefs: (orderId: number) => ["pancake-pos", "order-refs", orderId] as const,
  webhook: ["pancake-pos", "webhook"] as const,
  inbound: (params: PancakePosInboundParams) => ["pancake-pos", "inbound", params] as const,
  orderDelivery: (orderId: number) => ["pancake-pos", "order-delivery", orderId] as const,
  stuck: ["pancake-pos", "delivery-stuck"] as const,
  mismatches: ["pancake-pos", "delivery-mismatches"] as const,
};

/** Lượt đang chạy → poll 5s để bảng lượt chạy/trạng thái tự cập nhật. */
const POLL_MS = 5000;

export function usePancakePosStatus(polling: boolean) {
  return useQuery({
    queryKey: pancakePosKeys.status,
    queryFn: getPancakePosStatus,
    refetchInterval: polling ? POLL_MS : false,
  });
}

/** Mode của lượt đồng bộ sản phẩm / tồn đầu kỳ — hai bảng lượt chạy tách nhau. */
export const PRODUCT_RUN_MODES = "full,dry_run,incremental";
export const INITIAL_STOCK_RUN_MODES = "initial_stock_dry,initial_stock";

export function usePancakePosRuns(
  offset: number,
  limit: number,
  polling: boolean,
  mode: string = PRODUCT_RUN_MODES,
) {
  return useQuery({
    queryKey: pancakePosKeys.runs(offset, mode),
    queryFn: () => listPancakePosRuns({ offset, limit, mode }),
    refetchInterval: polling ? POLL_MS : false,
  });
}

export function useWarehouseLinks() {
  return useQuery({ queryKey: pancakePosKeys.warehouseLinks, queryFn: getWarehouseLinks });
}

/** Kho Pancake — gọi đối tác, chỉ chạy khi đã có key + shop. */
export function usePancakeWarehouses(enabled: boolean) {
  return useQuery({
    queryKey: pancakePosKeys.pancakeWarehouses,
    queryFn: listPancakeWarehouses,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useInitialStockStatus(polling: boolean) {
  return useQuery({
    queryKey: pancakePosKeys.initialStock,
    queryFn: getInitialStockStatus,
    refetchInterval: polling ? POLL_MS : false,
  });
}

export function useInitialStockRun(id: number | null) {
  return useQuery({
    queryKey: [...pancakePosKeys.run(id ?? 0), "initial-stock"] as const,
    queryFn: () => getInitialStockRun(id as number),
    enabled: id !== null,
  });
}

export function usePancakePosRun(id: number | null) {
  return useQuery({
    queryKey: pancakePosKeys.run(id ?? 0),
    queryFn: () => getPancakePosRun(id as number),
    enabled: id !== null,
  });
}

export function usePancakePosLinks(params: PancakePosLinksParams) {
  return useQuery({
    queryKey: pancakePosKeys.links(params),
    queryFn: () => listPancakePosLinks(params),
  });
}

export function usePancakePosOrderLinks(params: PancakePosOrderLinksParams) {
  return useQuery({
    queryKey: pancakePosKeys.orderLinks(params),
    queryFn: () => listPancakePosOrderLinks(params),
  });
}

/** Ngữ cảnh "Chọn cách xuất" — chỉ tải khi dialog mở; tồn đổi liên tục nên không cache. */
export function usePancakePosOrderRouting(orderId: number | null) {
  return useQuery({
    queryKey: pancakePosKeys.orderRouting(orderId ?? 0),
    queryFn: () => getPancakePosOrderRouting(orderId as number),
    enabled: orderId !== null,
    staleTime: 0,
  });
}

/** Mã đơn Pancake ở trang chi tiết đơn — lỗi (403, mạng) thì ẩn, không thử lại. */
export function usePancakePosOrderRefs(orderId: number) {
  return useQuery({
    queryKey: pancakePosKeys.orderRefs(orderId),
    queryFn: () => getPancakePosOrderRefs(orderId),
    enabled: orderId > 0,
    retry: false,
    staleTime: 60_000,
  });
}

/** Thẻ Webhook: làm mới mỗi phút (số sự kiện 24h thay đổi liên tục khi đã bật). */
export function usePancakePosWebhookStatus() {
  return useQuery({
    queryKey: pancakePosKeys.webhook,
    queryFn: getPancakePosWebhookStatus,
    refetchInterval: 60_000,
  });
}

export function usePancakePosInboundOrders(params: PancakePosInboundParams) {
  return useQuery({
    queryKey: pancakePosKeys.inbound(params),
    queryFn: () => listPancakePosInboundOrders(params),
  });
}

/** Vận chuyển Pancake ở chi tiết đơn — lỗi (403, mạng) thì ẩn, không thử lại. */
export function usePancakeOrderDelivery(orderId: number) {
  return useQuery({
    queryKey: pancakePosKeys.orderDelivery(orderId),
    queryFn: () => getPancakeOrderDelivery(orderId),
    enabled: orderId > 0,
    retry: false,
    staleTime: 60_000,
  });
}

/** Báo cáo đơn treo: tính trên DB, làm mới 5 phút. */
export function usePancakeStuckReport() {
  return useQuery({
    queryKey: pancakePosKeys.stuck,
    queryFn: getPancakeStuckReport,
    refetchInterval: 300_000,
  });
}

export function usePancakeMismatchReport() {
  return useQuery({
    queryKey: pancakePosKeys.mismatches,
    queryFn: getPancakeMismatchReport,
    refetchInterval: 300_000,
  });
}
