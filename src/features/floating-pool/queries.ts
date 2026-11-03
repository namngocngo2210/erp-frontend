import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  claimFloatingPoolEntry,
  getFloatingPoolConfig,
  listFloatingPoolEntries,
  putFloatingPoolConfig,
  type FloatingPoolEntriesParams,
} from "@/lib/api/floating-pool";

export const floatingPoolKeys = {
  all: ["floating-pool"] as const,
  entries: (params: FloatingPoolEntriesParams) => ["floating-pool", "entries", params] as const,
  config: ["floating-pool", "config"] as const,
};

export function useFloatingPoolEntries(params: FloatingPoolEntriesParams) {
  return useQuery({
    queryKey: floatingPoolKeys.entries(params),
    queryFn: () => listFloatingPoolEntries(params),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000, // kho realtime nhẹ: refetch nền 30s
  });
}

export function useFloatingPoolConfig() {
  return useQuery({ queryKey: floatingPoolKeys.config, queryFn: getFloatingPoolConfig });
}

export function useClaimFloatingNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: claimFloatingPoolEntry,
    onSettled: () => qc.invalidateQueries({ queryKey: floatingPoolKeys.all }),
  });
}

export function useSaveFloatingPoolConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: putFloatingPoolConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: floatingPoolKeys.all }),
  });
}
