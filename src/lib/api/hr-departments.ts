import { apiGet, type components } from "@/api/typed";
// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 1 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

/** Tóm tắt nhân sự (không PII) — dùng cho trưởng phòng / lead / thành viên team. */
export type EmployeeSummary = components["schemas"]["EmployeeSummary"];
export type Team = components["schemas"]["Team"];
export type DepartmentOrgItem = components["schemas"]["DepartmentOrgItem"];

export type TeamCreatePayload = {
  name: string;
  lead_employee_id?: number | null;
  member_employee_ids?: number[];
};

export type TeamUpdatePayload = {
  name?: string;
  lead_employee_id?: number | null;
  member_employee_ids?: number[];
};

const API_BASE = "/api/hr";

/** GET /api/hr/department-org — trưởng phòng + team của mọi phòng ban. */
export async function getDepartmentOrg(): Promise<DepartmentOrgItem[]> {
  const res = await apiGet("/api/hr/department-org");
  return res.items;
}

/** PUT /api/hr/departments/:id/head — gán/gỡ trưởng phòng (204, không body). */
export async function setDepartmentHead(
  departmentId: number,
  employeeId: number | null,
): Promise<void> {
  await fetchJson(`${API_BASE}/departments/${departmentId}/head`, {
    method: "PUT",
    body: JSON.stringify({ employee_id: employeeId }),
  });
}
