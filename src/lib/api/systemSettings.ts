import { apiGet, apiPatch } from "@/api/typed";

/** Cấu hình hệ thống (apps.sysconfig). Secret không bao giờ có `value` — chỉ is_set + hint. */
export type SettingType = "bool" | "int" | "float" | "str" | "url" | "datetime";

export type SystemSettingOut = {
  key: string;
  label: string;
  help: string;
  type: SettingType;
  is_secret: boolean;
  is_set: boolean;
  value: string | null;
  hint: string | null;
  default: boolean | number | string;
  updated_at: string | null;
  updated_by: { id: number; name: string } | null;
};

export type SystemSettingsGroup = { key: string; label: string; settings: SystemSettingOut[] };
export type SystemSettingsResponse = { groups: SystemSettingsGroup[] };
export type SystemSettingChange = {
  key: string;
  old_value: string;
  new_value: string;
  changed_by: { id: number; name: string } | null;
  changed_at: string;
};

// Hợp đồng OpenAPI khai `type` là string và `default` là unknown (JSON tự do) —
// cast về các type hẹp hơn ở trên, cùng cách lib/api/orders.ts làm.

export async function getSystemSettings(): Promise<SystemSettingsResponse> {
  return (await apiGet("/api/system-settings/")) as SystemSettingsResponse;
}

/** `null` = xoá (secret) / về mặc định (khóa thường). Chỉ gửi khóa đã đổi. */
export async function updateSystemSettings(
  values: Record<string, string | null>,
): Promise<SystemSettingsResponse> {
  return (await apiPatch("/api/system-settings/", { values })) as SystemSettingsResponse;
}

export async function getSystemSettingHistory(key: string): Promise<SystemSettingChange[]> {
  return (await apiGet(
    `/api/system-settings/history/?key=${encodeURIComponent(key)}&limit=50` as "/api/system-settings/history/",
  )) as SystemSettingChange[];
}
