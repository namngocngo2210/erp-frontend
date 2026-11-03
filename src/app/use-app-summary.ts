import { useRef, useState, type MutableRefObject } from "react";

import { fetchJson } from "@/services/http";
import type { DashboardSummary } from "@/features/dashboard/types";

export type SummaryFilters = {
  dateFrom: string;
  dateTo: string;
};

export type SummaryCache = {
  key: string;
  value: DashboardSummary;
  expiresAt: number;
} | null;

const FRONTEND_CACHE_TTL_MS = 30_000;

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const isCacheFresh = (expiresAt: number) => Date.now() < expiresAt;

export type UseAppSummaryResult = {
  summary: DashboardSummary | null;
  setSummary: (summary: DashboardSummary | null) => void;
  summaryLoading: boolean;
  summaryFilters: SummaryFilters;
  /** Cache summary chia sẻ với WS handler + logout (invalidate khi đơn đổi). */
  summaryCacheRef: MutableRefObject<SummaryCache>;
  /**
   * Xoá cache summary. Các mutation đơn (patch/bulk delete/KiotViet action) gọi
   * hàm này thay vì mutate `summaryCacheRef.current` trực tiếp — mutate hook
   * argument trong handler tạo lúc render bị react-compiler lint chặn.
   */
  invalidateSummaryCache: () => void;
  loadSummary: (options?: { force?: boolean; dateFrom?: string; dateTo?: string }) => Promise<void>;
};

/**
 * State + loader cho dashboard summary. Chỉ DI CHUYỂN từ App.tsx — logic giữ
 * nguyên. Summary vẫn dùng cache thủ công (không qua react-query) vì key phụ
 * thuộc filter ngày động và được drive imperative từ WS handler (loadSummary).
 */
export function useAppSummary(): UseAppSummaryResult {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryFilters, setSummaryFilters] = useState<SummaryFilters>(() => {
    const today = todayIsoDate();
    return { dateFrom: today, dateTo: today };
  });
  const summaryCacheRef = useRef<SummaryCache>(null);
  const summaryInFlightRef = useRef<{ key: string; promise: Promise<DashboardSummary> } | null>(
    null,
  );

  const invalidateSummaryCache = () => {
    summaryCacheRef.current = null;
  };

  const loadSummary = async (options?: { force?: boolean; dateFrom?: string; dateTo?: string }) => {
    const resolvedFilters: SummaryFilters = {
      dateFrom: options?.dateFrom ?? summaryFilters.dateFrom,
      dateTo: options?.dateTo ?? summaryFilters.dateTo,
    };
    const query = new URLSearchParams();
    if (resolvedFilters.dateFrom) query.set("date_from", resolvedFilters.dateFrom);
    if (resolvedFilters.dateTo) query.set("date_to", resolvedFilters.dateTo);
    const cacheKey = `from=${resolvedFilters.dateFrom}|to=${resolvedFilters.dateTo}`;
    if (
      !options?.force &&
      summaryCacheRef.current?.key === cacheKey &&
      isCacheFresh(summaryCacheRef.current.expiresAt)
    ) {
      setSummary(summaryCacheRef.current.value);
      return;
    }
    if (!options?.force && summaryInFlightRef.current?.key === cacheKey) {
      setSummary(await summaryInFlightRef.current.promise);
      return;
    }
    if (
      resolvedFilters.dateFrom !== summaryFilters.dateFrom ||
      resolvedFilters.dateTo !== summaryFilters.dateTo
    ) {
      setSummaryFilters(resolvedFilters);
    }
    const request = (async () => {
      const endpoint = query.toString()
        ? `/api/orders/dashboard/summary?${query.toString()}`
        : "/api/orders/dashboard/summary";
      const data = await fetchJson(endpoint);
      summaryCacheRef.current = {
        key: cacheKey,
        value: data,
        expiresAt: Date.now() + FRONTEND_CACHE_TTL_MS,
      };
      return data as DashboardSummary;
    })();
    summaryInFlightRef.current = { key: cacheKey, promise: request };
    setSummaryLoading(true);
    try {
      setSummary(await request);
    } finally {
      setSummaryLoading(false);
      summaryInFlightRef.current = null;
    }
  };

  return {
    summary,
    setSummary,
    summaryLoading,
    summaryFilters,
    summaryCacheRef,
    invalidateSummaryCache,
    loadSummary,
  };
}
