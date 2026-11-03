import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getQualityAgents,
  getQualityCallDetail,
  getQualityCalls,
  getQualityFilterOptions,
  getQualitySummary,
  getQualityTrend,
  postQualityReview,
  type QualityCallsParams,
  type QualityScope,
} from "@/lib/api/call-quality";

/** Điểm chấm mỗi 5 phút một lượt ở BE — refetch dày hơn là vô ích. */
const QUALITY_REFRESH_MS = 10 * 60 * 1000;

export const callQualityKeys = {
  all: ["call-quality"] as const,
  // `scope` gồm cả trạng thái sale: đổi trạng thái phải sinh key khác, nếu không
  // mọi khối vẫn hiển thị số của nhóm trước cho tới lần refetch tự động.
  summary: (scope: QualityScope) => ["call-quality", "summary", scope] as const,
  trend: (scope: QualityScope) => ["call-quality", "trend", scope] as const,
  calls: (params: QualityCallsParams) => ["call-quality", "calls", params] as const,
  agents: (scope: QualityScope) => ["call-quality", "agents", scope] as const,
  filters: (scope: QualityScope) => ["call-quality", "filters", scope] as const,
  detail: (scoreId: number) => ["call-quality", "detail", scoreId] as const,
};

export function useQualitySummary(scope: QualityScope) {
  return useQuery({
    queryKey: callQualityKeys.summary(scope),
    queryFn: ({ signal }) => getQualitySummary(scope, signal),
    placeholderData: keepPreviousData,
    refetchInterval: QUALITY_REFRESH_MS,
  });
}

export function useQualityTrend(scope: QualityScope) {
  return useQuery({
    queryKey: callQualityKeys.trend(scope),
    queryFn: ({ signal }) => getQualityTrend(scope, signal),
    placeholderData: keepPreviousData,
    refetchInterval: QUALITY_REFRESH_MS,
  });
}

export function useQualityAgents(scope: QualityScope) {
  return useQuery({
    queryKey: callQualityKeys.agents(scope),
    queryFn: ({ signal }) => getQualityAgents(scope, signal),
    placeholderData: keepPreviousData,
    refetchInterval: QUALITY_REFRESH_MS,
  });
}

export function useQualityFilterOptions(scope: QualityScope) {
  return useQuery({
    queryKey: callQualityKeys.filters(scope),
    queryFn: ({ signal }) => getQualityFilterOptions(scope, signal),
    placeholderData: keepPreviousData,
  });
}

export function useQualityCalls(params: QualityCallsParams) {
  return useQuery({
    queryKey: callQualityKeys.calls(params),
    queryFn: ({ signal }) => getQualityCalls(params, signal),
    placeholderData: keepPreviousData,
  });
}

/** `scoreId = null` khi sheet đóng — không gọi API cho tới lúc mở. */
export function useQualityCallDetail(scoreId: number | null) {
  return useQuery({
    queryKey: callQualityKeys.detail(scoreId ?? 0),
    queryFn: ({ signal }) => getQualityCallDetail(scoreId as number, signal),
    enabled: scoreId != null,
  });
}

export function useSubmitQualityReview(scoreId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { criterion?: string; human_score?: number | null; note?: string }) =>
      postQualityReview(scoreId as number, body),
    onSuccess: () => {
      if (scoreId != null) {
        void queryClient.invalidateQueries({ queryKey: callQualityKeys.detail(scoreId) });
      }
    },
  });
}
