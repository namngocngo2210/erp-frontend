import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addEmployeeAccount,
  approveLeave,
  createEmployee,
  createLeaveRequest,
  getAssignableUsers,
  getContracts,
  getDepartments,
  getEmployee,
  getEmployees,
  getLeaveRequests,
  getSalaries,
  linkEmployeeAccount,
  rejectLeave,
  resignEmployee,
  setSalary,
  signContract,
  unlinkEmployeeAccount,
  updateEmployee,
} from "@/lib/api/hr";
import type {
  ContractSignPayload,
  EmployeeCreatePayload,
  EmployeeListParams,
  EmployeeUpdatePayload,
  LeaveCreatePayload,
  LeaveListParams,
  SalarySetPayload,
} from "@/features/hr/hr-types";
import {
  checkIn,
  createLocation,
  deleteLocation,
  getAttendanceConfig,
  getAttendanceEvents,
  getLocations,
  updateLocation,
} from "@/lib/api/hr-attendance";
import type {
  AttendanceEventParams,
  CheckInPayload,
  LocationPayload,
} from "@/features/hr/attendance-types";
import {
  getCompensations,
  updateCompensation,
  type CompensationUpdatePayload,
} from "@/lib/api/hr-compensation";
import { getDepartmentOrg, setDepartmentHead } from "@/lib/api/hr-departments";

export const employeeKeys = {
  all: ["hr", "employees"] as const,
  list: (params: EmployeeListParams) => ["hr", "employees", params] as const,
  detail: (id: number) => ["hr", "employees", "detail", id] as const,
  salaries: (id: number) => ["hr", "employees", id, "salaries"] as const,
  contracts: (id: number) => ["hr", "employees", id, "contracts"] as const,
};

export function useEmployees(params: EmployeeListParams) {
  return useQuery({ queryKey: employeeKeys.list(params), queryFn: () => getEmployees(params) });
}

export function useHrDepartments(enabled = true) {
  return useQuery({ queryKey: ["hr", "departments"], queryFn: getDepartments, enabled });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmployeeCreatePayload) => createEmployee(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<EmployeeCreatePayload> | EmployeeUpdatePayload;
    }) => updateEmployee(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

export function useAddEmployeeAccount(empId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import("@/lib/api/users").CreateAdminUserPayload) =>
      addEmployeeAccount(empId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.invalidateQueries({ queryKey: employeeKeys.detail(empId) });
    },
  });
}

export function useUnlinkEmployeeAccount(empId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: number) => unlinkEmployeeAccount(empId, accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.invalidateQueries({ queryKey: employeeKeys.detail(empId) });
    },
  });
}

export function useAssignableUsers(q: string, enabled = true) {
  return useQuery({
    queryKey: ["hr", "assignable-users", q] as const,
    queryFn: () => getAssignableUsers(q),
    enabled,
  });
}

export function useLinkEmployeeAccount(empId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => linkEmployeeAccount(empId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.invalidateQueries({ queryKey: employeeKeys.detail(empId) });
    },
  });
}

export function useResignEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => resignEmployee(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => getEmployee(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useSalaries(employeeId: number) {
  return useQuery({
    queryKey: employeeKeys.salaries(employeeId),
    queryFn: () => getSalaries(employeeId),
    enabled: Number.isFinite(employeeId) && employeeId > 0,
  });
}

export function useSetSalary(employeeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SalarySetPayload) => setSalary(employeeId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.salaries(employeeId) }),
  });
}

export function useContracts(employeeId: number) {
  return useQuery({
    queryKey: employeeKeys.contracts(employeeId),
    queryFn: () => getContracts(employeeId),
    enabled: Number.isFinite(employeeId) && employeeId > 0,
  });
}

export function useSignContract(employeeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ContractSignPayload) => signContract(employeeId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.contracts(employeeId) }),
  });
}

export const leaveKeys = {
  all: ["hr", "leave-requests"] as const,
  list: (params: LeaveListParams) => ["hr", "leave-requests", params] as const,
};

export function useLeaveRequests(params: LeaveListParams) {
  return useQuery({ queryKey: leaveKeys.list(params), queryFn: () => getLeaveRequests(params) });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LeaveCreatePayload) => createLeaveRequest(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveLeave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rejectLeave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

export const attendanceKeys = {
  config: ["hr", "attendance", "config"] as const,
  locations: ["hr", "attendance", "locations"] as const,
  events: (p: AttendanceEventParams) => ["hr", "attendance", "events", p] as const,
};

export function useAttendanceEvents(params: AttendanceEventParams) {
  return useQuery({
    queryKey: attendanceKeys.events(params),
    queryFn: () => getAttendanceEvents(params),
  });
}

export function useAttendanceConfig(enabled = true) {
  return useQuery({ queryKey: attendanceKeys.config, queryFn: getAttendanceConfig, enabled });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CheckInPayload) => checkIn(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.config }),
  });
}

export function useLocations(enabled = true) {
  return useQuery({ queryKey: attendanceKeys.locations, queryFn: getLocations, enabled });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: LocationPayload) => createLocation(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.locations }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, p }: { id: number; p: Partial<LocationPayload> }) => updateLocation(id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.locations }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.locations }),
  });
}

export const departmentOrgKeys = {
  all: ["hr", "department-org"] as const,
};

export function useDepartmentOrg(enabled = true) {
  return useQuery({
    queryKey: departmentOrgKeys.all,
    queryFn: getDepartmentOrg,
    enabled,
  });
}

export function useSetDepartmentHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      departmentId,
      employeeId,
    }: {
      departmentId: number;
      employeeId: number | null;
    }) => setDepartmentHead(departmentId, employeeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentOrgKeys.all }),
  });
}

export const compensationKeys = {
  list: ["hr", "compensations"] as const,
};

export function useCompensations() {
  return useQuery({ queryKey: compensationKeys.list, queryFn: getCompensations });
}

export function useUpdateCompensation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      payload,
    }: {
      employeeId: number;
      payload: CompensationUpdatePayload;
    }) => updateCompensation(employeeId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: compensationKeys.list }),
  });
}
