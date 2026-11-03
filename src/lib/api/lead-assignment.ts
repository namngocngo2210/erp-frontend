// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 9 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { components } from "@/api/typed";

const BASE = "/api/orders/lead-assignment";

/**
 * Enum key derive từ hợp đồng OpenAPI (D9). Response ma trận ngày
 * (`LeadAssignmentDayResponse`) spec mô tả rows/sheets generic nên
 * `LeadAssignmentDay` vẫn viết tay; các response còn lại derive từ schema
 * (override `shift`/`sheet` từ string → enum key cho page).
 */
export type SheetKey = components["schemas"]["SheetEnum"];
/**
 * Cột của ma trận phân bổ = 3 sheet Landing + `resale` (chia sale resale cho cơ
 * hội Foxia từ đơn giao thành công). `resale` KHÔNG là sheet của workload/chuyển
 * đơn nên không có trong `SheetEnum`.
 */
export type MatrixSheetKey = SheetKey | "resale";
export type ShiftKey = components["schemas"]["ShiftEnum"];

export type ShiftWindow = Omit<components["schemas"]["ShiftWindowRowOut"], "shift"> & {
  shift: ShiftKey;
};
export type ShiftWindowsResponse = Omit<
  components["schemas"]["LeadAssignmentShiftWindowsResponse"],
  "windows" | "current_shift"
> & {
  windows: ShiftWindow[];
  current_shift: ShiftKey | null; // null = ngoài giờ làm việc
};

export interface SheetMeta {
  key: MatrixSheetKey;
  label: string;
  total_weight: number;
}
export interface Cell {
  weight: number;
  assigned_count: number;
  target_pct: number;
  actual_pct: number;
}
export interface MatrixRow {
  user_id: number;
  username: string;
  display_name: string;
  cells: Record<MatrixSheetKey, Cell>;
}
export interface LeadAssignmentDay {
  date: string;
  shift: ShiftKey;
  current_shift: ShiftKey | null;
  sheets: SheetMeta[];
  rows: MatrixRow[];
}
export interface SaveRow {
  user_id: number;
  weights: Partial<Record<MatrixSheetKey, number>>;
}
export type WorkloadItem = components["schemas"]["LeadAssignmentWorkloadItem"];
export type LeadAssignmentStaff = components["schemas"]["LeadAssignmentStaffItem"];

export async function getLeadAssignment(date: string, shift: ShiftKey): Promise<LeadAssignmentDay> {
  return fetchJson(`${BASE}/shares?date=${encodeURIComponent(date)}&shift=${shift}`);
}
export async function saveLeadAssignment(payload: {
  date: string;
  shift: ShiftKey;
  rows: SaveRow[];
}): Promise<LeadAssignmentDay> {
  return fetchJson(`${BASE}/shares`, { method: "PUT", body: JSON.stringify(payload) });
}
/**
 * POST /shares/copy — copy nguyên ma trận (3 ca × 4 cột) từ ngày gần nhất có
 * cấu hình sang `date`. BE trả 400 nếu ngày đích đã có cấu hình hoặc chưa có
 * ngày nguồn nào.
 */
export async function copyLeadAssignmentDay(
  date: string,
): Promise<components["schemas"]["LeadAssignmentCopyResponse"]> {
  return fetchJson(`${BASE}/shares/copy`, { method: "POST", body: JSON.stringify({ date }) });
}
export async function deleteLeadAssignmentDay(
  date: string,
): Promise<{ deleted: number; date: string }> {
  return fetchJson(`${BASE}/shares?date=${encodeURIComponent(date)}`, { method: "DELETE" });
}
export async function getShiftWindows(): Promise<ShiftWindowsResponse> {
  return fetchJson(`${BASE}/shift-windows`);
}
export async function putShiftWindows(payload: {
  windows: { shift: ShiftKey; start_time: string | null; end_time: string | null }[];
}): Promise<ShiftWindowsResponse> {
  return fetchJson(`${BASE}/shift-windows`, { method: "PUT", body: JSON.stringify(payload) });
}
export async function getLeadAssignmentStaff(): Promise<LeadAssignmentStaff[]> {
  return fetchJson(`${BASE}/staff`);
}
export async function getWorkload(
  sheet: SheetKey,
  date: string,
): Promise<{ sheet: SheetKey; items: WorkloadItem[] }> {
  return fetchJson(`${BASE}/workload?sheet=${sheet}&date=${encodeURIComponent(date)}`);
}
export async function transferOrders(payload: {
  sheet: SheetKey;
  from_user_id: number;
  to_user_id: number;
  count: number;
  date: string;
}): Promise<components["schemas"]["LeadAssignmentTransferResponse"]> {
  return fetchJson(`${BASE}/transfer`, { method: "POST", body: JSON.stringify(payload) });
}
