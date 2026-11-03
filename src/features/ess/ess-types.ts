export type MeProfile = {
  id: number;
  employee_code: string;
  full_name: string;
  department_name: string;
  manager_name: string;
  job_title: string;
  job_title_display: string;
  employment_status: string;
  employment_status_display: string;
  hire_date: string | null;
  phone: string;
  personal_email: string;
  username: string;
};

export type MeAttendanceItem = {
  id: number;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  note: string;
  source: string;
  created_at: string;
};

export type LeaveType = "annual" | "sick" | "unpaid" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type MeLeaveItem = {
  id: number;
  employee: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: string;
  reason: string;
  status: LeaveStatus;
  decided_at: string | null;
  created_at: string;
};

export type CreateLeavePayload = {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string;
};
