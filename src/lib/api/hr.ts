// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 13 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { apiDelete, apiGet } from "@/api/typed";
import type { CreateAdminUserPayload } from "@/lib/api/users";
import type {
  AssignableUser,
  Contract,
  ContractSignPayload,
  Employee,
  EmployeeCreatePayload,
  EmployeeListParams,
  EmployeeListResponse,
  EmployeeUpdatePayload,
  HrDepartment,
  LeaveCreatePayload,
  LeaveListParams,
  LeaveListResponse,
  LeaveRequest,
  SalaryRecord,
  SalarySetPayload,
} from "@/features/hr/hr-types";

const API_BASE = "/api/hr";

/** GET /api/hr/departments. */
export async function getDepartments(): Promise<HrDepartment[]> {
  const res = await apiGet(`${API_BASE}/departments`);
  return res.items;
}

/**
 * GET /api/hr/employees?... — danh sách nhân sự theo bộ lọc.
 *
 * Query params chưa được khai trong spec OpenAPI (`parameters.query` là
 * `never`) nên giữ `fetchJson`; response vẫn type theo schema
 * (`EmployeeListResponse` alias `HrEmployeeList`).
 */
export async function getEmployees(params: EmployeeListParams): Promise<EmployeeListResponse> {
  const q = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) });
  if (params.q) q.set("q", params.q);
  if (params.department) q.set("department", String(params.department));
  if (params.status) q.set("status", params.status);
  if (params.state) q.set("state", params.state);
  return fetchJson(`${API_BASE}/employees?${q.toString()}`);
}

/** GET /api/hr/employees/:id. */
export async function getEmployee(id: number): Promise<Employee> {
  return apiGet(`${API_BASE}/employees/${id}` as "/api/hr/employees/{employee_id}");
}

/** POST /api/hr/employees — response chỉ khai 201 trong spec nên giữ `fetchJson` (xem ghi chú ở hr-attendance.ts `checkIn`). */
export async function createEmployee(payload: EmployeeCreatePayload): Promise<Employee> {
  return fetchJson(`${API_BASE}/employees`, { method: "POST", body: JSON.stringify(payload) });
}

/**
 * PATCH /api/hr/employees/:id.
 *
 * Payload là union `Partial<EmployeeCreatePayload> | EmployeeUpdatePayload`
 * — vài field (vd `job_title: string`) rộng hơn `PatchedEmployeeUpdate` của
 * spec nên không khớp `apiPatch` trực tiếp; giữ `fetchJson`, return type vẫn
 * schema-derived (`Employee`).
 */
export async function updateEmployee(
  id: number,
  payload: Partial<EmployeeCreatePayload> | EmployeeUpdatePayload,
): Promise<Employee> {
  return fetchJson(`${API_BASE}/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function resignEmployee(id: number): Promise<Employee> {
  return fetchJson(`${API_BASE}/employees/${id}/resign`, { method: "POST" });
}

/** GET /api/hr/employees/:id/salaries. */
export async function getSalaries(employeeId: number): Promise<SalaryRecord[]> {
  const res = await apiGet(
    `${API_BASE}/employees/${employeeId}/salaries` as "/api/hr/employees/{employee_id}/salaries",
  );
  return res.items;
}

/** POST /api/hr/employees/:id/salaries — response chỉ khai 201 nên giữ `fetchJson`. */
export async function setSalary(
  employeeId: number,
  payload: SalarySetPayload,
): Promise<SalaryRecord> {
  return fetchJson(`${API_BASE}/employees/${employeeId}/salaries`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/hr/employees/:id/contracts. */
export async function getContracts(employeeId: number): Promise<Contract[]> {
  const res = await apiGet(
    `${API_BASE}/employees/${employeeId}/contracts` as "/api/hr/employees/{employee_id}/contracts",
  );
  return res.items;
}

/** POST /api/hr/employees/:id/contracts — response chỉ khai 201 nên giữ `fetchJson`. */
export async function signContract(
  employeeId: number,
  payload: ContractSignPayload,
): Promise<Contract> {
  return fetchJson(`${API_BASE}/employees/${employeeId}/contracts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/hr/leave-requests?... — query params chưa có trong spec nên giữ `fetchJson`. */
export async function getLeaveRequests(params: LeaveListParams): Promise<LeaveListResponse> {
  const q = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) });
  if (params.status) q.set("status", params.status);
  if (params.employee) q.set("employee", String(params.employee));
  return fetchJson(`${API_BASE}/leave-requests?${q.toString()}`);
}

/** POST /api/hr/leave-requests — response chỉ khai 201 nên giữ `fetchJson`. */
export async function createLeaveRequest(payload: LeaveCreatePayload): Promise<LeaveRequest> {
  return fetchJson(`${API_BASE}/leave-requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function approveLeave(id: number): Promise<LeaveRequest> {
  return fetchJson(`${API_BASE}/leave-requests/${id}/approve`, { method: "POST" });
}

export async function rejectLeave(id: number): Promise<LeaveRequest> {
  return fetchJson(`${API_BASE}/leave-requests/${id}/reject`, { method: "POST" });
}

/**
 * POST /api/hr/employees/:id/accounts.
 *
 * `CreateAdminUserPayload` (lib/api/users.ts) cố ý nới lỏng vài field so với
 * `AdminUserCreate` của spec (lark_open_id optional, kiotviet_mappings shape
 * cụ thể) nên không khớp `apiPost` trực tiếp; giữ `fetchJson`.
 */
export async function addEmployeeAccount(
  empId: number,
  payload: CreateAdminUserPayload,
): Promise<Employee> {
  return fetchJson(`${API_BASE}/employees/${empId}/accounts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/hr/employees/:id/accounts/:accountId. */
export async function unlinkEmployeeAccount(empId: number, accountId: number): Promise<void> {
  const path =
    `${API_BASE}/employees/${empId}/accounts/${accountId}` as "/api/hr/employees/{employee_id}/accounts/{account_id}";
  await apiDelete(path);
}

/** GET /api/hr/assignable-users?q= — query optional chưa có trong spec nên giữ `fetchJson`. */
export async function getAssignableUsers(q?: string): Promise<AssignableUser[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return fetchJson(`${API_BASE}/assignable-users${qs}`);
}

export async function linkEmployeeAccount(empId: number, userId: number): Promise<Employee> {
  return fetchJson(`${API_BASE}/employees/${empId}/accounts/link`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}
