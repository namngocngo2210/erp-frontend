import { swallowError } from "@/lib/errors";
/**
 * localStorage cho bộ lọc trang nhân sự (phòng ban + tình trạng làm việc).
 * Tách riêng để logic đọc/ghi độc lập, có guard quota và unit-test được —
 * theo mẫu `features/orders/order-storage.ts`.
 */

const FILTERS_KEY = "desi_hr_employees_filters";

/** Giá trị "tất cả" (không lọc) — trùng sentinel dùng trên EmployeesPage. */
export const HR_FILTER_ALL = "all";

const VALID_STATES = new Set([HR_FILTER_ALL, "working", "resigned"]);

export type StoredEmployeeFilters = {
  /** ``"all"`` hoặc id phòng ban dạng chuỗi. */
  department: string;
  /** ``"all" | "working" | "resigned"``. */
  state: string;
};

export const DEFAULT_EMPLOYEE_FILTERS: StoredEmployeeFilters = {
  department: HR_FILTER_ALL,
  state: HR_FILTER_ALL,
};

export function getStoredEmployeeFilters(): StoredEmployeeFilters {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return { ...DEFAULT_EMPLOYEE_FILTERS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const department =
      typeof parsed?.department === "string" && parsed.department.trim()
        ? parsed.department
        : HR_FILTER_ALL;
    const stateRaw = typeof parsed?.state === "string" ? parsed.state : HR_FILTER_ALL;
    const state = VALID_STATES.has(stateRaw) ? stateRaw : HR_FILTER_ALL;
    return { department, state };
  } catch {
    return { ...DEFAULT_EMPLOYEE_FILTERS };
  }
}

export function setStoredEmployeeFilters(value: StoredEmployeeFilters): void {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(value));
  } catch (err) {
    // localStorage không khả dụng / hết quota — bỏ qua, không chặn render.
    swallowError(err, "hr.employees.filters.storage");
  }
}
