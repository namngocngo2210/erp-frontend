import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/services/http";
import {
  type ReclassifyPayload,
  type StockListResponse,
  type StockMovementListResponse,
} from "@/features/inventory/types";

/** Tham số danh sách Vận đơn — nằm TRONG queryKey để mỗi tổ hợp filter có cache riêng. */
export type ShipmentsListParams = {
  page: number;
  pageSize: number;
  dateFrom: string;
  dateTo: string;
  status: string[];
  invoiceStatus: string[];
  deliveryBusinessStatus: string[];
};

export const inventoryKeys = {
  // `asOf` NẰM TRONG key: thiếu nó thì đổi mốc sẽ trả về cache của mốc cũ.
  stock: (warehouseId: number | null, search: string, asOf: string) =>
    ["inventory", "stock", warehouseId, search, asOf] as const,
  movements: (warehouseId: number | null, productId: number | null, asOf: string) =>
    ["inventory", "movements", warehouseId, productId, asOf] as const,
  // Prefix chung cho mọi trang/filter của danh sách Vận đơn — dùng để invalidate.
  shipmentsLists: ["inventory", "shipments", "list"] as const,
  shipmentsList: (params: ShipmentsListParams) =>
    ["inventory", "shipments", "list", params] as const,
  shipmentWarehouses: ["inventory", "shipments", "warehouses"] as const,
};

export function useStockList(warehouseId: number | null, search: string, asOf = "") {
  const params = new URLSearchParams({ limit: "200", offset: "0" });
  if (warehouseId) params.set("warehouse_id", String(warehouseId));
  if (search.trim()) params.set("search", search.trim());
  if (asOf) params.set("as_of", asOf);
  return useQuery({
    queryKey: inventoryKeys.stock(warehouseId, search, asOf),
    queryFn: () =>
      fetchJson(`/api/inventory/stock?${params.toString()}`) as Promise<StockListResponse>,
  });
}

export function useStockMovements(
  warehouseId: number | null,
  productId: number | null,
  enabled: boolean,
  asOf = "",
) {
  const params = new URLSearchParams({ limit: "10", offset: "0" });
  if (warehouseId) params.set("warehouse_id", String(warehouseId));
  if (productId) params.set("product_id", String(productId));
  if (asOf) params.set("as_of", asOf);
  return useQuery({
    queryKey: inventoryKeys.movements(warehouseId, productId, asOf),
    queryFn: () =>
      fetchJson(
        `/api/inventory/stock/movements?${params.toString()}`,
      ) as Promise<StockMovementListResponse>,
    enabled: enabled && warehouseId != null && productId != null,
  });
}

export function useReclassifyStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReclassifyPayload) =>
      fetchJson("/api/inventory/stock/reclassify", {
        method: "POST",
        body: JSON.stringify(payload),
      }) as Promise<{ detail: string }>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory", "stock"] });
    },
  });
}
