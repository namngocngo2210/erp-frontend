import { fetchJson } from "@/services/http";
import type {
  CreateLeavePayload,
  MeAttendanceItem,
  MeLeaveItem,
  MeProfile,
} from "@/features/ess/ess-types";

export function getMyProfile(): Promise<MeProfile> {
  return fetchJson("/api/hr/me/profile");
}

export async function getMyAttendance(month: string): Promise<MeAttendanceItem[]> {
  const res: { items: MeAttendanceItem[] } = await fetchJson(
    `/api/hr/me/attendance?month=${month}`,
  );
  return res.items;
}

export async function getMyLeave(): Promise<MeLeaveItem[]> {
  const res: { items: MeLeaveItem[] } = await fetchJson("/api/hr/me/leave-requests");
  return res.items;
}

export function createMyLeave(payload: CreateLeavePayload): Promise<MeLeaveItem> {
  return fetchJson("/api/hr/me/leave-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
