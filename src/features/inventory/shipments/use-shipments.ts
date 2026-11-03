import { useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { type DateFilterValue, getDateRange } from "@/components/ui/date-filter";
import { inventoryKeys, type ShipmentsListParams } from "@/features/inventory/queries";
import { mergeOrderRowPatch } from "@/features/orders/order-realtime-merge";
import type { OrderRow } from "@/features/orders/order-types";
import { extractListPayload } from "@/lib/api/list-payload";
import { fetchJson } from "@/services/http";

export type WarehouseOption = { id: number; name: string };

type ShipmentsListResult = { rows: OrderRow[]; count: number };

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function clampPageSize(value: number): number {
  return Number.isFinite(value) && value > 0
    ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.trunc(value)))
    : DEFAULT_PAGE_SIZE;
}

function normalizeStringList(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => String(item).trim()).filter(Boolean))).sort();
}

function defaultDateFilter(): DateFilterValue {
  const range = getDateRange("this_month");
  return { option: "this_month", from: range.from, to: range.to };
}

async function fetchShipmentsList(params: ShipmentsListParams): Promise<ShipmentsListResult> {
  const safeLimit = clampPageSize(params.pageSize);
  const safeOffset = Math.max(0, params.page * safeLimit);

  const body: Record<string, unknown> = {
    limit: safeLimit,
    offset: safeOffset,
    sort: "newest",
  };
  if (params.dateFrom) body.date_from = params.dateFrom;
  if (params.dateTo) body.date_to = params.dateTo;
  if (params.status.length > 0) body.status = params.status;
  if (params.invoiceStatus.length > 0) body.invoice_status = params.invoiceStatus;
  if (params.deliveryBusinessStatus.length > 0)
    body.delivery_business_status = params.deliveryBusinessStatus;

  const data: unknown = await fetchJson("/api/orders/shipments", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const rows = extractListPayload<OrderRow>(data);
  const count =
    data &&
    typeof data === "object" &&
    "count" in data &&
    typeof (data as Record<string, unknown>).count === "number"
      ? ((data as Record<string, unknown>).count as number)
      : rows.length;
  return { rows, count };
}

async function fetchShipmentWarehouses(): Promise<WarehouseOption[]> {
  const data: unknown = await fetchJson("/api/warehouses/?limit=200&offset=0&is_active=true");
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as Record<string, unknown>).items;
    if (Array.isArray(items)) {
      return items.map((w: Record<string, unknown>) => ({
        id: w.id as number,
        name: w.name as string,
      }));
    }
  }
  return [];
}

/**
 * Hook dữ liệu cho trang Vận đơn (warehouse). Gọi POST /api/orders/shipments —
 * endpoint đã khóa cứng `has_shipping_code` + `sales_status` ở server nên hook
 * KHÔNG gửi 2 trường đó. Hỗ trợ inline PATCH một đơn (trạng thái vận chuyển thực).
 *
 * Data-fetching chạy qua react-query: mỗi tổ hợp filter là một queryKey riêng
 * (xem {@link inventoryKeys.shipmentsList}), `keepPreviousData` giữ trang cũ
 * hiển thị trong khi tải trang mới. Chữ ký trả về giữ nguyên cho consumer.
 */
export function useShipments() {
  const queryClient = useQueryClient();

  const [page, setPageState] = useState(0);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(defaultDateFilter);
  const [status, setStatus] = useState<string[]>([]);
  const [invoiceStatus, setInvoiceStatus] = useState<string[]>([]);
  const [deliveryBusinessStatus, setDeliveryBusinessStatus] = useState<string[]>([]);

  const listParams = useMemo<ShipmentsListParams>(
    () => ({
      page,
      pageSize,
      dateFrom: dateFilter.from || "",
      dateTo: dateFilter.to || "",
      // "6" bị loại từ trước (trạng thái server đã khóa cứng) — giữ nguyên luật cũ.
      status: normalizeStringList(status).filter((v) => v !== "6"),
      invoiceStatus: normalizeStringList(invoiceStatus),
      deliveryBusinessStatus: normalizeStringList(deliveryBusinessStatus),
    }),
    [page, pageSize, dateFilter, status, invoiceStatus, deliveryBusinessStatus],
  );

  const listQuery = useQuery({
    queryKey: inventoryKeys.shipmentsList(listParams),
    queryFn: () => fetchShipmentsList(listParams),
    placeholderData: keepPreviousData,
  });

  // Danh sách kho là reference data — cache lâu hơn mặc định, lỗi thì trả mảng rỗng.
  const warehousesQuery = useQuery({
    queryKey: inventoryKeys.shipmentWarehouses,
    queryFn: fetchShipmentWarehouses,
    staleTime: 5 * 60_000,
  });

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(0, Math.trunc(Number(next)) || 0));
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(clampPageSize(Number(next)));
    setPageState(0); // đổi pageSize thì về trang đầu để offset không vượt count
  }, []);

  /** Refetch danh sách (mọi trang/filter) — thay cho load() thủ công trước đây. */
  const load = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: inventoryKeys.shipmentsLists });
  }, [queryClient]);

  const patchMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<OrderRow> }) => {
      const response: unknown = await fetchJson(`/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      // Ưu tiên dữ liệu server (chứa field tự suy ra), fallback về payload đã gửi.
      return response && typeof response === "object" && "id" in response
        ? (response as Partial<OrderRow>)
        : payload;
    },
    onSuccess: (serverData, { id }) => {
      // Merge tại chỗ vào mọi trang đang cache thay vì refetch — giữ inline edit mượt.
      queryClient.setQueriesData<ShipmentsListResult>(
        { queryKey: inventoryKeys.shipmentsLists },
        (prev) =>
          prev
            ? {
                ...prev,
                rows: prev.rows.map((row) =>
                  row.id === id ? mergeOrderRowPatch(row, serverData) : row,
                ),
              }
            : prev,
      );
    },
  });
  const { mutateAsync: patchMutateAsync } = patchMutation;

  const patchOrder = useCallback(
    async (id: number, payload: Partial<OrderRow>) => {
      await patchMutateAsync({ id, payload });
    },
    [patchMutateAsync],
  );

  return {
    rows: listQuery.data?.rows ?? [],
    count: listQuery.data?.count ?? 0,
    loading: listQuery.isFetching,
    page,
    pageSize,
    setPage,
    setPageSize,
    dateFilter,
    setDateFilter,
    status,
    setStatus,
    invoiceStatus,
    setInvoiceStatus,
    deliveryBusinessStatus,
    setDeliveryBusinessStatus,
    load,
    patchOrder,
    warehouses: warehousesQuery.data ?? [],
  };
}
