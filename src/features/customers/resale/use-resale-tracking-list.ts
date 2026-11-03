import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDebouncedValue } from "@/hooks/useDebounce";
import type {
  ResaleTrackingFacets,
  ResaleTrackingListResult,
  ResaleTrackingRow,
} from "@/lib/api/customers";
import { customerKeys, useResaleTracking } from "@/features/customers/queries";
import { ALL, clampPageSize } from "../resale-format";
import { buildResaleListParams, computeResaleKpis } from "./resale-tracking-state";

const getScrollableContainer = (): HTMLElement | null =>
  document.querySelector("main.overflow-y-auto");

/** Bộ lọc + phân trang + dữ liệu bảng theo dõi resale. */
export function useResaleTrackingList() {
  const queryClient = useQueryClient();
  const [facets, setFacets] = useState<ResaleTrackingFacets>({ sales: [], segments: [] });
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [saleFilter, setSaleFilter] = useState(ALL);
  const [segmentFilter, setSegmentFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [daysFilter, setDaysFilter] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const pendingScrollTopRef = useRef<number | null>(null);

  const rememberScrollPosition = () => {
    const container = getScrollableContainer();
    if (container) pendingScrollTopRef.current = container.scrollTop;
  };

  const listParams = useMemo(
    () =>
      buildResaleListParams(
        {
          query: debouncedQuery,
          sale: saleFilter,
          segment: segmentFilter,
          status: statusFilter,
          days: daysFilter,
          dateFrom,
          dateTo,
        },
        currentPage,
        pageSize,
      ),
    [
      debouncedQuery,
      saleFilter,
      segmentFilter,
      statusFilter,
      daysFilter,
      dateFrom,
      dateTo,
      currentPage,
      pageSize,
    ],
  );
  const listKey = customerKeys.resaleTracking(listParams);
  const listQuery = useResaleTracking(listParams);
  const listData = listQuery.data;
  // useMemo giữ identity ổn định — rows là dep của useLayoutEffect/useMemo bên dưới.
  const rows = useMemo(() => listData?.results ?? [], [listData]);
  const total = listData?.total ?? 0;
  const loading = listQuery.isPending;

  /** Vá 1 row trong cache của trang hiện tại (không refetch bảng nặng). */
  const patchRow = (orderId: number, patch: (row: ResaleTrackingRow) => ResaleTrackingRow) => {
    queryClient.setQueryData<ResaleTrackingListResult>(listKey, (prev) =>
      prev
        ? {
            ...prev,
            results: prev.results.map((item) => (item.order_id === orderId ? patch(item) : item)),
          }
        : prev,
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, saleFilter, segmentFilter, statusFilter, daysFilter, dateFrom, dateTo]);

  // Facets đủ trên toàn phạm vi ngày; giữ facets cũ nếu response không kèm.
  useEffect(() => {
    const nextFacets = listQuery.data?.facets;
    if (nextFacets) setFacets(nextFacets);
  }, [listQuery.data]);

  useEffect(() => {
    if (!listQuery.isError) return;
    console.error("Error loading resale tracking:", listQuery.error);
    toast.error("Tải bảng theo dõi resale thất bại.");
  }, [listQuery.isError, listQuery.error]);

  useLayoutEffect(() => {
    if (loading) return;
    const pendingScrollTop = pendingScrollTopRef.current;
    if (pendingScrollTop === null) return;
    const container = getScrollableContainer();
    if (container) container.scrollTop = pendingScrollTop;
    pendingScrollTopRef.current = null;
  }, [loading, rows]);

  // rows đã được backend lọc sẵn — KPI tính trên trang hiện tại.
  const kpis = useMemo(() => computeResaleKpis(rows), [rows]);

  const safePageSize = clampPageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  const changePage = (page: number) => {
    rememberScrollPosition();
    setCurrentPage(page);
  };

  const changePageSize = (value: string) => {
    rememberScrollPosition();
    setPageSize(clampPageSize(Number(value)));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSaleFilter(ALL);
    setSegmentFilter(ALL);
    setStatusFilter(ALL);
    setDaysFilter(ALL);
    setDateFrom("");
    setDateTo("");
    setQuery("");
  };

  return {
    filters: {
      query,
      setQuery,
      saleFilter,
      setSaleFilter,
      segmentFilter,
      setSegmentFilter,
      statusFilter,
      setStatusFilter,
      daysFilter,
      setDaysFilter,
      dateFrom,
      setDateFrom,
      dateTo,
      setDateTo,
    },
    facets,
    rows,
    total,
    loading,
    kpis,
    currentPage,
    pageSize,
    totalPages,
    changePage,
    changePageSize,
    resetFilters,
    patchRow,
  };
}

export type ResaleTrackingFilters = ReturnType<typeof useResaleTrackingList>["filters"];
