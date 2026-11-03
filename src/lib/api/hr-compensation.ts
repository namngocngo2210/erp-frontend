import { fetchBlob } from "@/services/http";
import { apiGet, apiPut } from "@/api/typed";
import type { components } from "@/api/typed";

export type CompensationRow = components["schemas"]["CompensationRow"];
export type CompensationUpdatePayload = components["schemas"]["CompensationUpdate"];

const BASE = "/api/hr";

/** GET /api/hr/compensations — cơ chế lương mọi nhân sự đang làm việc. */
export async function getCompensations(): Promise<CompensationRow[]> {
  const res = await apiGet("/api/hr/compensations");
  return res.items;
}

/** PUT /api/hr/compensations/:employee_id — upsert cơ chế lương một nhân sự. */
export async function updateCompensation(
  employeeId: number,
  payload: CompensationUpdatePayload,
): Promise<CompensationRow> {
  return apiPut(
    `${BASE}/compensations/${employeeId}` as "/api/hr/compensations/{employee_id}",
    payload,
  );
}

/** GET /api/hr/payroll/export — tải Excel bảng lương tháng (YYYY-MM). */
export async function downloadPayrollExport(month: string): Promise<Blob> {
  return fetchBlob(`${BASE}/payroll/export?month=${encodeURIComponent(month)}`);
}
