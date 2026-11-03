import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type Role,
  type RoleWrite,
  createRole,
  deleteRole,
  fetchOrderFieldCatalog,
  listPermissions,
  listRoles,
  updateRole,
} from "@/lib/api/roles";

export const roleKeys = {
  all: ["roles"] as const,
  list: ["roles", "list"] as const,
  permissions: ["roles", "permissions"] as const,
  orderFieldCatalog: ["roles", "order-field-catalog"] as const,
};

/** GET /api/users/roles — danh sách vai trò kèm quyền/scope/field rules. */
export function useRolesQuery() {
  return useQuery({ queryKey: roleKeys.list, queryFn: listRoles });
}

/** GET /api/users/permissions — catalog quyền (ít thay đổi). */
export function usePermissionsQuery() {
  return useQuery({
    queryKey: roleKeys.permissions,
    queryFn: listPermissions,
    staleTime: 5 * 60_000,
  });
}

/** GET /api/users/order-field-catalog — nhóm field đơn dùng để cấu hình quyền sửa (ít thay đổi). */
export function useOrderFieldCatalogQuery() {
  return useQuery({
    queryKey: roleKeys.orderFieldCatalog,
    queryFn: fetchOrderFieldCatalog,
    staleTime: 5 * 60_000,
  });
}

/**
 * Các mutation trả về promise của invalidateQueries trong onSuccess để
 * `mutateAsync` chỉ resolve sau khi list roles đã refetch xong — giữ đúng
 * thứ tự cũ (`await refresh()` trước khi toast / chọn role mới).
 */
export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RoleWrite): Promise<Role> => createRole(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.list }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: RoleWrite }): Promise<Role> =>
      updateRole(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.list }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.list }),
  });
}
