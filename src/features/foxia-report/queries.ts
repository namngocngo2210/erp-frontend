import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getFoxiaReport,
  getFoxiaSyncStatus,
  type FoxiaReportParams,
  type FoxiaReportResponse,
  type FoxiaSyncStatus,
} from "@/lib/api/foxia-report";

/** Dữ liệu Foxia được kéo về mỗi 20 phút — refetch dày hơn thế là vô ích. */
const FOXIA_REFRESH_MS = 10 * 60 * 1000;

export const foxiaKeys = {
  all: ["foxia"] as const,
  report: (params: FoxiaReportParams) => ["foxia", "report", params] as const,
  syncStatus: ["foxia", "sync-status"] as const,
  channelMaps: ["foxia", "channel-maps"] as const,
};

export function useFoxiaReport(params: FoxiaReportParams) {
  return useQuery<FoxiaReportResponse>({
    queryKey: foxiaKeys.report(params),
    queryFn: ({ signal }) => getFoxiaReport(params, signal),
    placeholderData: keepPreviousData,
    refetchInterval: FOXIA_REFRESH_MS,
  });
}

export function useFoxiaSyncStatus() {
  return useQuery<FoxiaSyncStatus>({
    queryKey: foxiaKeys.syncStatus,
    queryFn: ({ signal }) => getFoxiaSyncStatus(signal),
    refetchInterval: FOXIA_REFRESH_MS,
  });
}
