export const DEPARTMENT_ID = {
  SALES: 1,
  ADS: 2,
  BOOKING: 3,
} as const;

export type DepartmentIdValue = (typeof DEPARTMENT_ID)[keyof typeof DEPARTMENT_ID];
