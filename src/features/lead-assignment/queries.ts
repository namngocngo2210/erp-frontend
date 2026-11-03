import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type LeadAssignmentDay,
  type SaveRow,
  type SheetKey,
  type ShiftKey,
  type ShiftWindowsResponse,
  copyLeadAssignmentDay,
  deleteLeadAssignmentDay,
  getLeadAssignment,
  getLeadAssignmentStaff,
  getShiftWindows,
  getWorkload,
  putShiftWindows,
  saveLeadAssignment,
  transferOrders,
} from "@/lib/api/lead-assignment";
import { getFoxiaResaleStats } from "@/lib/api/foxia-resale";

export const leadAssignmentKeys = {
  all: ["lead-assignment"] as const,
  staff: ["lead-assignment", "staff"] as const,
  days: ["lead-assignment", "day"] as const,
  day: (date: string, shift: ShiftKey) => ["lead-assignment", "day", date, shift] as const,
  workloads: ["lead-assignment", "workload"] as const,
  workload: (sheet: SheetKey, date: string) =>
    ["lead-assignment", "workload", sheet, date] as const,
  shiftWindows: ["lead-assignment", "shift-windows"] as const,
  resaleStats: (date: string) => ["lead-assignment", "resale-stats", date] as const,
};

/** GET /lead-assignment/staff — NV phòng Sale (ít thay đổi). */
export function useLeadAssignmentStaff() {
  return useQuery({
    queryKey: leadAssignmentKeys.staff,
    queryFn: getLeadAssignmentStaff,
    staleTime: 5 * 60_000,
  });
}

/** GET /lead-assignment/shares — ma trận phân bổ của (ngày, ca). */
export function useLeadAssignmentDay(date: string, shift: ShiftKey) {
  return useQuery({
    queryKey: leadAssignmentKeys.day(date, shift),
    queryFn: () => getLeadAssignment(date, shift),
  });
}

/** GET /lead-assignment/workload — số đơn đang chờ theo NV của (sheet, ngày). */
export function useWorkload(sheet: SheetKey, date: string) {
  return useQuery({
    queryKey: leadAssignmentKeys.workload(sheet, date),
    queryFn: () => getWorkload(sheet, date),
  });
}

/**
 * GET /api/foxia/resale-stats — cơ hội resale đang chờ + đã chia trong ngày.
 * Job chạy mỗi phút nên làm mới theo cùng nhịp.
 */
export function useFoxiaResaleStats(date: string) {
  return useQuery({
    queryKey: leadAssignmentKeys.resaleStats(date),
    queryFn: () => getFoxiaResaleStats(date),
    refetchInterval: 60_000,
  });
}

/** GET /lead-assignment/shift-windows — khung giờ 3 ca + ca hiện tại. */
export function useShiftWindows() {
  return useQuery({
    queryKey: leadAssignmentKeys.shiftWindows,
    queryFn: getShiftWindows,
  });
}

/**
 * PUT /lead-assignment/shares — server trả lại ma trận đã lưu; ghi thẳng vào
 * cache để trang apply data mới (hành vi cũ: applyDay(response)).
 */
export function useSaveLeadAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { date: string; shift: ShiftKey; rows: SaveRow[] }) =>
      saveLeadAssignment(payload),
    onSuccess: (data: LeadAssignmentDay) => {
      qc.setQueryData(leadAssignmentKeys.day(data.date, data.shift), data);
    },
  });
}

/**
 * DELETE /lead-assignment/shares?date=… — xoá cấu hình cả ngày (3 ca).
 * Trả promise của invalidate để `mutateAsync` chỉ resolve sau khi ma trận
 * refetch xong (hành vi cũ: await loadDay trước khi toast).
 */
export function useDeleteLeadAssignmentDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => deleteLeadAssignmentDay(date),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadAssignmentKeys.days }),
  });
}

/**
 * POST /lead-assignment/shares/copy — copy cấu hình từ ngày gần nhất sang ngày
 * đích, rồi refetch ma trận (invalidate như delete-day).
 */
export function useCopyLeadAssignmentDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => copyLeadAssignmentDay(date),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadAssignmentKeys.days }),
  });
}

/** PUT /lead-assignment/shift-windows — ghi response vào cache (windows + current_shift). */
export function useSaveShiftWindows() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      windows: { shift: ShiftKey; start_time: string | null; end_time: string | null }[];
    }) => putShiftWindows(payload),
    onSuccess: (data: ShiftWindowsResponse) => {
      qc.setQueryData(leadAssignmentKeys.shiftWindows, data);
    },
  });
}

/** POST /lead-assignment/transfer — sau khi chuyển đơn, refetch workload nền. */
export function useTransferOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      sheet: SheetKey;
      from_user_id: number;
      to_user_id: number;
      count: number;
      date: string;
    }) => transferOrders(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadAssignmentKeys.workloads });
    },
  });
}
