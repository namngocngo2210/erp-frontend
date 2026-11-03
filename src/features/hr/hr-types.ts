import type { components } from "@/api/typed";

/**
 * Type HR derive từ hợp đồng OpenAPI (WP6.2 T5). Giữ nguyên TÊN export —
 * nhiều component/page đang import.
 *
 * Ghi chú:
 * - Các type response (Employee, SalaryRecord, Contract, LeaveRequest, list
 *   responses) alias thẳng từ schema; field optional (`?`) là artefact của
 *   default/blank chiều ghi — call site tự fallback khi cần.
 * - Các payload (EmployeeCreatePayload, SalarySetPayload, …) giữ local vì spec
 *   Write đánh optional/required lệch nhu cầu form FE.
 * - Decimal (SalaryRecord.amount, Contract.base_salary, LeaveRequest.days) theo
 *   schema là CHUỖI — đúng response thật (DRF COERCE_DECIMAL_TO_STRING);
 *   formatCurrency/JSX render nhận cả string nên hiển thị không đổi.
 */

export type EmploymentStatus = components["schemas"]["EmploymentStatusEnum"];

export type PositionKey = components["schemas"]["JobTitleEnum"];

export const POSITION_LABELS: Record<PositionKey, string> = {
  staff: "Nhân viên",
  manager: "Trưởng phòng",
  intern: "Thực tập sinh",
};

export const POSITION_OPTIONS: PositionKey[] = ["staff", "manager", "intern"];

export type HrDepartment = components["schemas"]["HrDepartmentItem"];

export type PositionLevel = components["schemas"]["PositionLevelEnum"];

export const POSITION_LEVEL_LABELS: Record<PositionLevel, string> = {
  director: "Ban giám đốc",
  team_lead: "Trưởng nhóm",
  specialist: "Chuyên viên",
  staff: "Nhân viên",
  collaborator: "Cộng tác viên",
};

export type WorkType = components["schemas"]["WorkTypeEnum"];

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  fulltime: "Toàn thời gian",
  parttime: "Bán thời gian",
  remote: "Remote",
};

export type MaritalStatus = components["schemas"]["MaritalStatusEnum"];

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  single: "Độc thân",
  married: "Đã kết hôn",
  divorced: "Đã ly hôn",
  other: "Khác",
};

export type EmployeeChild = components["schemas"]["EmployeeChild"];

export type EmployeeAccount = components["schemas"]["EmployeeAccountItem"];

/** Tài khoản có sẵn (chưa gắn nhân sự) — dùng cho chức năng "Gán tài khoản". */
export type AssignableUser = components["schemas"]["HrAssignableUser"];

export type Employee = components["schemas"]["Employee"];

export type EmployeeListResponse = components["schemas"]["HrEmployeeList"];

/** Lọc theo tình trạng làm việc: đang làm (mọi trạng thái trừ đã nghỉ) hoặc đã nghỉ. */
export type EmploymentState = "working" | "resigned";

export interface EmployeeListParams {
  limit: number;
  offset: number;
  q?: string;
  department?: number;
  status?: EmploymentStatus;
  state?: EmploymentState;
}

export interface EmployeeCreatePayload {
  full_name: string;
  username: string;
  employee_code?: string;
  department_id?: number | null;
  create_login?: boolean;
  password?: string;
  job_title?: string;
  manager_id?: number | null;
  phone?: string;
  personal_email?: string;
}

/** Payload PATCH hồ sơ nhân viên (tất cả field đều optional). */
export interface EmployeeUpdatePayload {
  full_name?: string;
  department_id?: number | null;
  manager_id?: number | null;
  position_level?: PositionLevel | "";
  position_title?: string;
  work_type?: WorkType | "";
  lark_account?: string;
  employment_status?: EmploymentStatus;
  hire_date?: string | null;
  official_date?: string | null;
  resign_date?: string | null;
  resign_reason?: string;
  phone?: string;
  personal_email?: string;
  dob?: string | null;
  gender?: string;
  marital_status?: MaritalStatus | "";
  id_number?: string;
  id_issued_date?: string | null;
  id_issued_place?: string;
  permanent_address?: string;
  address?: string;
  education_level?: string;
  major?: string;
  school?: string;
  tax_code?: string;
  social_insurance_no?: string;
  bank_account_no?: string;
  bank_name?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  emergency_contact_address?: string;
  facebook_url?: string;
  vehicle_info?: string;
}

export type ContractTypeKey = components["schemas"]["ContractTypeEnum"];

export type SalaryRecord = components["schemas"]["SalaryRecord"];

export type Contract = components["schemas"]["Contract"];

export interface SalarySetPayload {
  amount: number;
  effective_from: string;
  reason?: string;
}

export interface ContractSignPayload {
  contract_type: ContractTypeKey;
  start_date: string;
  end_date?: string | null;
  base_salary?: number;
  contract_no?: string;
  file_url?: string;
  note?: string;
}

export type LeaveTypeKey = components["schemas"]["LeaveTypeEnum"];
export type LeaveStatusKey = components["schemas"]["LeaveRequestStatusEnum"];

export type LeaveRequest = components["schemas"]["LeaveRequest"];

export type LeaveListResponse = components["schemas"]["HrLeaveRequestList"];

export interface LeaveListParams {
  limit: number;
  offset: number;
  status?: LeaveStatusKey;
  employee?: number;
}

export interface LeaveCreatePayload {
  employee_id: number;
  leave_type: LeaveTypeKey;
  start_date: string;
  end_date: string;
  reason?: string;
}
