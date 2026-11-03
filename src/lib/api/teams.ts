import { apiDelete, apiGet, type components } from "@/api/typed";
// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 2 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

/**
 * Đội nhóm trong phòng ban — gắn TÀI KHOẢN đăng nhập (`users.User`).
 *
 * Khác hẳn `@/lib/api/hr-departments`: bên đó đội nhóm gắn hồ sơ nhân sự
 * (`hr.Employee`) nên ô chọn thành viên bỏ sót phần lớn tài khoản. Xem
 * `docs/department-teams.md`. Tên schema là `DepartmentTeam*` chứ không phải
 * `Team*` vì `Team` đã bị module `hr` chiếm trong hợp đồng OpenAPI.
 */
export type TeamUser = components["schemas"]["TeamUser"];
export type DepartmentTeam = components["schemas"]["DepartmentTeam"];

export type TeamCreatePayload = {
  name: string;
  lead_user_id?: number | null;
  member_user_ids?: number[];
};

/** Mọi field optional; `member_user_ids` là replace-set khi có mặt. */
export type TeamUpdatePayload = Partial<TeamCreatePayload>;

const API_BASE = "/api/users";

/** GET /api/users/departments/:id/teams */
export async function listDepartmentTeams(departmentId: number): Promise<DepartmentTeam[]> {
  return apiGet(
    `${API_BASE}/departments/${departmentId}/teams` as "/api/users/departments/{department_id}/teams",
  );
}

/** GET /api/users/departments/:id/assignable-users — nguồn ô chọn lead/thành viên. */
export async function listAssignableUsers(departmentId: number): Promise<TeamUser[]> {
  return apiGet(
    `${API_BASE}/departments/${departmentId}/assignable-users` as "/api/users/departments/{department_id}/assignable-users",
  );
}

/** POST /api/users/departments/:id/teams — chỉ khai 201 nên giữ `fetchJson`. */
export async function createTeam(
  departmentId: number,
  payload: TeamCreatePayload,
): Promise<DepartmentTeam> {
  return fetchJson(`${API_BASE}/departments/${departmentId}/teams`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/users/teams/:id */
export async function updateTeam(
  teamId: number,
  payload: TeamUpdatePayload,
): Promise<DepartmentTeam> {
  return fetchJson(`${API_BASE}/teams/${teamId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/users/teams/:id — xoá mềm. */
export async function deleteTeam(teamId: number): Promise<void> {
  await apiDelete(`${API_BASE}/teams/${teamId}` as "/api/users/teams/{team_id}");
}

/** Tên hiển thị của một tài khoản; tài khoản chưa đặt tên thì dùng username. */
export function teamUserLabel(user: TeamUser): string {
  return user.display_name?.trim() ? user.display_name : user.username;
}
