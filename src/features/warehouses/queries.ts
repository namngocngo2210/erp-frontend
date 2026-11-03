import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type Warehouse,
  type WarehouseUpsert,
  createWarehouse,
  deleteWarehouse,
  getWarehouses,
  updateWarehouse,
} from "@/lib/api/warehouses";

export type WarehouseListParams = {
  search?: string;
  isActive?: boolean;
  limit: number;
  offset: number;
};

export const warehouseKeys = {
  all: ["warehouses"] as const,
  list: (params: WarehouseListParams) => ["warehouses", "list", params] as const,
};

/**
 * GET /api/warehouses — danh sách kho có phân trang/lọc.
 * keepPreviousData: giữ trang cũ hiển thị trong khi tải trang/bộ lọc mới.
 */
export function useWarehousesList(params: WarehouseListParams) {
  return useQuery({
    queryKey: warehouseKeys.list(params),
    queryFn: () => getWarehouses(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WarehouseUpsert) => createWarehouse(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.all });
    },
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WarehouseUpsert }): Promise<Warehouse> =>
      updateWarehouse(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.all });
    },
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteWarehouse(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.all });
    },
  });
}
