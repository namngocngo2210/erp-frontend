import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getSystemSettingHistory,
  getSystemSettings,
  updateSystemSettings,
} from "@/lib/api/systemSettings";

export const systemSettingsKeys = {
  all: ["system-settings"] as const,
  history: (key: string) => ["system-settings", "history", key] as const,
};

export function useSystemSettings() {
  return useQuery({ queryKey: systemSettingsKeys.all, queryFn: getSystemSettings });
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient();
  return useMutation({
    // Bọc lambda thay vì truyền thẳng `updateSystemSettings`: TanStack Query v5
    // gọi mutationFn(variables, mutationFnContext) — tham số 2 (context nội bộ,
    // vd { client }) lọt vào nếu truyền thẳng hàm API, phá vỡ mọi assertion
    // `toHaveBeenCalledWith(values)` trong test (bắt được qua TDD khi viết trang
    // này — xem cùng pattern ở contacts/queries.ts).
    mutationFn: (values: Record<string, string | null>) => updateSystemSettings(values),
    onSuccess: (data) => {
      qc.setQueryData(systemSettingsKeys.all, data);
      void qc.invalidateQueries({ queryKey: ["system-settings", "history"] });
    },
  });
}

export function useSystemSettingHistory(key: string | null) {
  return useQuery({
    queryKey: systemSettingsKeys.history(key ?? ""),
    queryFn: () => getSystemSettingHistory(key as string),
    enabled: Boolean(key),
  });
}
