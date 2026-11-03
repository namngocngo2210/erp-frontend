import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createMyLeave, getMyAttendance, getMyLeave, getMyProfile } from "@/features/ess/lib/api";

export function useMyProfile() {
  return useQuery({ queryKey: ["ess", "profile"], queryFn: getMyProfile });
}

export function useMyAttendance(month: string) {
  return useQuery({
    queryKey: ["ess", "attendance", month],
    queryFn: () => getMyAttendance(month),
  });
}

export function useMyLeave() {
  return useQuery({ queryKey: ["ess", "leave"], queryFn: getMyLeave });
}

export function useCreateMyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMyLeave,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ess", "leave"] }),
  });
}
