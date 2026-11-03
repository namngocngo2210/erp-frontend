import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listAdminUsers, listDepartments, type AdminUserListParams } from "@/lib/api/users";
import {
  createTeam,
  deleteTeam,
  listAssignableUsers,
  listDepartmentTeams,
  updateTeam,
  type TeamCreatePayload,
  type TeamUpdatePayload,
} from "@/lib/api/teams";

/**
 * Shell-level user / department data hooks. queryFn delegates to lib/api/users;
 * gating is driven by `enabled` from App (admin users are superuser-gated).
 *
 * staleTime = 30s mirrors the old manual ref-cache TTL (FRONTEND_CACHE_TTL_MS).
 * Departments had no manual cache before; staleTime keeps refetch cadence
 * comparable while avoiding redundant fetches within a section visit.
 */

const SHELL_STALE_TIME_MS = 30_000;

export type AdminUsersQueryParams = Required<Pick<AdminUserListParams, "limit" | "offset">> &
  Pick<AdminUserListParams, "q">;

export const userKeys = {
  adminUsers: ["users", "admin"] as const,
  adminUsersList: (params: AdminUsersQueryParams) => ["users", "admin", "list", params] as const,
  departments: ["users", "departments"] as const,
};

/**
 * GET /api/users/admin — phân trang server-side. Key lồng dưới prefix
 * ["users","admin"] nên các invalidateQueries/removeQueries hiện có ở App.tsx
 * vẫn áp lên mọi trang/bộ lọc. keepPreviousData: giữ trang cũ khi tải trang mới.
 */
export function useAdminUsersQuery(params: AdminUsersQueryParams) {
  return useQuery({
    queryKey: userKeys.adminUsersList(params),
    queryFn: ({ signal }) => listAdminUsers(params, signal),
    staleTime: SHELL_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

/** GET /api/users/departments — departments. */
export function useDepartmentsQuery(enabled: boolean) {
  return useQuery({
    queryKey: userKeys.departments,
    queryFn: listDepartments,
    enabled,
    staleTime: SHELL_STALE_TIME_MS,
  });
}

export const teamKeys = {
  all: ["users", "teams"] as const,
  byDepartment: (departmentId: number) => ["users", "teams", departmentId] as const,
  assignable: (departmentId: number) => ["users", "teams", "assignable", departmentId] as const,
};

/** GET /api/users/departments/:id/teams */
export function useDepartmentTeams(departmentId: number | null) {
  return useQuery({
    queryKey: teamKeys.byDepartment(departmentId ?? 0),
    queryFn: () => listDepartmentTeams(departmentId as number),
    enabled: departmentId != null,
  });
}

/** Tài khoản gán được vào đội nhóm của phòng ban — nguồn ô chọn lead/thành viên. */
export function useAssignableUsers(departmentId: number | null) {
  return useQuery({
    queryKey: teamKeys.assignable(departmentId ?? 0),
    queryFn: () => listAssignableUsers(departmentId as number),
    enabled: departmentId != null,
  });
}

/**
 * Ba mutation dưới đây đều invalidate `teamKeys.all` VÀ `userKeys.departments`:
 * bảng phòng ban có cột "Số nhóm" nên đổi nhóm là số đó phải đổi theo, nếu không
 * người dùng tạo nhóm xong nhìn bảng vẫn thấy số cũ.
 */
function useTeamMutationInvalidation() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: teamKeys.all });
    void qc.invalidateQueries({ queryKey: userKeys.departments });
  };
}

export function useCreateTeam() {
  const invalidate = useTeamMutationInvalidation();
  return useMutation({
    mutationFn: ({ departmentId, payload }: { departmentId: number; payload: TeamCreatePayload }) =>
      createTeam(departmentId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTeam() {
  const invalidate = useTeamMutationInvalidation();
  return useMutation({
    mutationFn: ({ teamId, payload }: { teamId: number; payload: TeamUpdatePayload }) =>
      updateTeam(teamId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteTeam() {
  const invalidate = useTeamMutationInvalidation();
  return useMutation({
    mutationFn: (teamId: number) => deleteTeam(teamId),
    onSuccess: invalidate,
  });
}
