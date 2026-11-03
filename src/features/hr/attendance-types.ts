import type { components } from "@/api/typed";

/**
 * Type chấm công derive từ hợp đồng OpenAPI (WP6.2 T5). Giữ nguyên TÊN export.
 * Payload (CheckInPayload, LocationPayload, AttendanceEventParams) giữ local —
 * là shape form/query FE, không phải response.
 */

export type AttendanceLocation = components["schemas"]["Location"];

export type AttendanceConfig = components["schemas"]["HrAttendanceConfig"];

export interface CheckInPayload {
  latitude: number;
  longitude: number;
  photo: string;
}

/** `kind` narrow từ string của spec — BE chỉ trả "check_in" | "check_out". */
export type CheckInResult = Omit<components["schemas"]["HrAttendanceCheckinResult"], "kind"> & {
  kind: "check_in" | "check_out";
};

export interface LocationPayload {
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  is_active?: boolean;
}

export type AttendanceSub = components["schemas"]["HrAttendanceEventSubIn"];

export type AttendanceDayRow = components["schemas"]["HrAttendanceEventRow"];

export type AttendanceEventListResponse = components["schemas"]["HrAttendanceEventList"];

export interface AttendanceEventParams {
  limit: number;
  offset: number;
  department?: number;
  employee?: number;
  date_from?: string;
  date_to?: string;
}
