import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PaginationPages } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserCreateDialog } from "@/features/users/UserCreateDialog";
import { UserEditDialog } from "@/features/users/UserEditDialog";
import { UsersTable } from "@/features/users/UsersTable";
import { useAdminUsersQuery } from "@/features/users/queries";
import { useI18n } from "@/i18n";
import { useDebounce } from "@/hooks/useDebounce";
import { useRangeSelect } from "@/hooks/use-range-select";
import { listRoles, type Role } from "@/lib/api/roles";
import type { AdminUserRow, Department, UserKiotvietMapping } from "@/features/users/types";

export type { AdminUserRow };

const PAGE_SIZE = 20;
const EMPTY_USERS: AdminUserRow[] = [];

type Props = {
  currentUserId: number;
  departments: Department[];
  kiotvietChannels: { id: number; name: string }[];
  onCreate: (payload: {
    username: string;
    display_name: string;
    role: string;
    is_active: boolean;
    kiotviet_mappings: UserKiotvietMapping[];
    password: string;
    zenify_email?: string;
    foxia_id?: string;
    media_role?: string;
    media_api_key?: string | null;
    department_id?: number | null;
    department_ids?: number[];
    role_ids?: number[];
  }) => Promise<boolean>;
  onUpdate: (
    id: number,
    payload: {
      display_name?: string;
      role?: string;
      is_active?: boolean;
      kiotviet_mappings?: UserKiotvietMapping[];
      password?: string;
      zenify_email?: string;
      foxia_id?: string;
      media_role?: string;
      media_api_key?: string | null;
      department_id?: number | null;
      department_ids?: number[];
      role_ids?: number[];
    },
    silent?: boolean,
  ) => Promise<boolean>;
  onDelete: (id: number, silent?: boolean) => Promise<void>;
};

export function UserManagement({
  currentUserId,
  departments,
  kiotvietChannels,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const { t } = useI18n();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const applySearch = useDebounce((value: string) => {
    setQuery(value.trim());
    setPage(0);
  }, 300);
  const usersQuery = useAdminUsersQuery({
    q: query || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });
  const users = usersQuery.data?.items ?? EMPTY_USERS;
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Clamp trang khi total co lại (vd bulk delete ở trang cuối) — chỉ chạy trên
  // data thật, không chạy trên placeholder của trang cũ khi đang fetch.
  useEffect(() => {
    if (usersQuery.isPlaceholderData || !usersQuery.data) return;
    const pages = Math.max(1, Math.ceil(usersQuery.data.total / PAGE_SIZE));
    setPage((p) => Math.min(p, pages - 1));
  }, [usersQuery.data, usersQuery.isPlaceholderData]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [createForm, setCreateForm] = useState({
    username: "",
    displayName: "",
    role: "staff",
    active: "true",
    kiotvietMappings: [] as UserKiotvietMapping[],
    password: "",
    zenifyEmail: "",
    foxiaId: "",
    mediaRole: "",
    mediaApiKey: "",
    departmentId: "" as string,
    departmentIds: [] as number[],
    roleIds: [] as number[],
  });
  const [editForm, setEditForm] = useState({
    displayName: "",
    role: "staff",
    active: "true",
    kiotvietMappings: [] as UserKiotvietMapping[],
    // Mặc định TẮT: không bật thì payload không có `password`, dù ô có bị
    // trình duyệt tự điền cũng không thể ghi đè mật khẩu nhân viên.
    changePassword: false,
    password: "",
    zenifyEmail: "",
    foxiaId: "",
    mediaRole: "",
    mediaApiKey: "",
    clearMediaKey: false,
    departmentId: "" as string,
    departmentIds: [] as number[],
    roleIds: [] as number[],
  });
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUserRow | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  useEffect(() => {
    listRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  const selectableUsers = useMemo(
    () => users.filter((u) => u.id !== currentUserId),
    [users, currentUserId],
  );
  const allChecked =
    selectableUsers.length > 0 && selectableUsers.every((u) => selectedUserIds.includes(u.id));
  const handleToggleOneUser = useRangeSelect(selectableUsers, selectedUserIds, setSelectedUserIds);

  const cleanMappings = (mappings: UserKiotvietMapping[]) =>
    mappings
      .map((m) => ({ ...m, external_kiot_user_id: m.external_kiot_user_id.trim() }))
      .filter((m) => m.external_kiot_user_id);

  const submitCreate = async () => {
    if (!createForm.username.trim() || !createForm.password.trim()) {
      toast.error(t("users.toast.usernamePasswordRequired"));
      return;
    }

    const ok = await onCreate({
      username: createForm.username.trim(),
      display_name: createForm.displayName.trim(),
      role: createForm.role,
      is_active: createForm.active === "true",
      kiotviet_mappings: cleanMappings(createForm.kiotvietMappings),
      password: createForm.password,
      zenify_email: createForm.zenifyEmail.trim(),
      foxia_id: createForm.foxiaId.trim(),
      media_role: createForm.mediaRole,
      media_api_key: createForm.mediaApiKey.trim() || "",
      department_id: createForm.departmentId ? Number(createForm.departmentId) : null,
      department_ids: createForm.departmentIds,
      role_ids: createForm.roleIds,
    });

    if (!ok) return;
    setOpenCreate(false);
    setCreateForm({
      username: "",
      displayName: "",
      role: "staff",
      active: "true",
      kiotvietMappings: [],
      password: "",
      zenifyEmail: "",
      foxiaId: "",
      mediaRole: "",
      mediaApiKey: "",
      departmentId: "",
      departmentIds: [],
      roleIds: [],
    });
  };

  const startEdit = (user: AdminUserRow) => {
    setEditingUser(user);
    setEditForm({
      displayName: user.display_name ?? "",
      role: user.role ?? "staff",
      active: user.is_active ? "true" : "false",
      kiotvietMappings: (user.kiotviet_mappings ?? []).map((m) => ({ ...m })),
      changePassword: false,
      password: "",
      zenifyEmail: user.zenify_email ?? "",
      foxiaId: user.foxia_id ?? "",
      mediaRole: user.media_role ?? "",
      mediaApiKey: "",
      clearMediaKey: false,
      departmentId: user.department ? String(user.department.id) : "",
      departmentIds: user.department_ids ?? [],
      roleIds: user.role_ids ?? [],
    });
    setOpenEdit(true);
  };

  const submitEdit = async () => {
    if (!editingUser) return;
    const newPassword = editForm.password.trim();
    if (editForm.changePassword && !newPassword) {
      toast.error(
        t("users.toast.newPasswordRequired", 'Nhập mật khẩu mới hoặc tắt "Đổi mật khẩu".'),
      );
      return;
    }
    const ok = await onUpdate(editingUser.id, {
      display_name: editForm.displayName.trim(),
      role: editForm.role,
      is_active: editForm.active === "true",
      kiotviet_mappings: cleanMappings(editForm.kiotvietMappings),
      // Chỉ gửi `password` khi admin CHỦ ĐỘNG bật công tắc đổi mật khẩu.
      password: editForm.changePassword ? newPassword : undefined,
      zenify_email: editForm.zenifyEmail.trim(),
      foxia_id: editForm.foxiaId.trim(),
      media_role: editForm.mediaRole,
      media_api_key: editForm.clearMediaKey ? null : editForm.mediaApiKey.trim() || "",
      department_id: editForm.departmentId ? Number(editForm.departmentId) : null,
      department_ids: editForm.departmentIds,
      role_ids: editForm.roleIds,
    });
    // Lưu hỏng (400/500) thì GIỮ dialog lại: trước đây dialog vẫn đóng nên admin
    // tưởng đã lưu xong trong khi server đã từ chối cả request.
    if (!ok) return;
    setOpenEdit(false);
    setEditingUser(null);
  };

  const removeUser = async (user: AdminUserRow) => {
    if (user.id === currentUserId) {
      toast.error(t("users.toast.cannotDeleteSelf"));
      return;
    }
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      await onDelete(userToDelete.id);
      toast.success(
        t("users.toast.deleted", "Deleted user.").replace("{username}", userToDelete.username),
      );
    } catch {
      toast.error(t("users.toast.deleteFailed"));
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const executeBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      for (const id of selectedUserIds) await onDelete(id, true);
      toast.success(
        t("users.toast.bulkHandled", `Handled ${selectedUserIds.length} users.`).replace(
          "{count}",
          String(selectedUserIds.length),
        ),
      );
      setSelectedUserIds([]);
    } catch {
      toast.error(t("users.toast.bulkFailed"));
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t("users.management.title")}</h2>
          </div>
        </div>

        <UsersTable
          users={users}
          currentUserId={currentUserId}
          selectedUserIds={selectedUserIds}
          allChecked={allChecked}
          onBulkDelete={handleBulkDelete}
          onCreateClick={() => setOpenCreate(true)}
          onToggleAll={() =>
            setSelectedUserIds((prev) =>
              allChecked
                ? prev.filter((id) => !selectableUsers.some((u) => u.id === id))
                : Array.from(new Set([...prev, ...selectableUsers.map((u) => u.id)])),
            )
          }
          onToggleOne={handleToggleOneUser}
          onEdit={startEdit}
          onDelete={removeUser}
          searchValue={searchInput}
          onSearchChange={(value) => {
            setSearchInput(value);
            applySearch(value);
          }}
        />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t("users.pagination.info")
              .replace("{page}", String(page + 1))
              .replace("{pages}", String(totalPages))
              .replace("{total}", String(total))}
          </span>
          <PaginationPages
            page={page + 1}
            totalPages={totalPages}
            onPageChange={(next) => setPage(next - 1)}
          />
        </div>

        <UserCreateDialog
          open={openCreate}
          username={createForm.username}
          displayName={createForm.displayName}
          role={createForm.role}
          active={createForm.active}
          kiotvietMappings={createForm.kiotvietMappings}
          password={createForm.password}
          zenifyEmail={createForm.zenifyEmail}
          foxiaId={createForm.foxiaId}
          mediaRole={createForm.mediaRole}
          mediaApiKey={createForm.mediaApiKey}
          departmentId={createForm.departmentId}
          departmentIds={createForm.departmentIds}
          roleIds={createForm.roleIds}
          departments={departments}
          roles={roles}
          kiotvietChannels={kiotvietChannels}
          onOpenChange={setOpenCreate}
          onUsernameChange={(v) => setCreateForm((p) => ({ ...p, username: v }))}
          onDisplayNameChange={(v) => setCreateForm((p) => ({ ...p, displayName: v }))}
          onRoleChange={(v) => setCreateForm((p) => ({ ...p, role: v }))}
          onActiveChange={(v) => setCreateForm((p) => ({ ...p, active: v }))}
          onKiotvietMappingsChange={(v) => setCreateForm((p) => ({ ...p, kiotvietMappings: v }))}
          onPasswordChange={(v) => setCreateForm((p) => ({ ...p, password: v }))}
          onZenifyEmailChange={(v) => setCreateForm((p) => ({ ...p, zenifyEmail: v }))}
          onFoxiaIdChange={(v) => setCreateForm((p) => ({ ...p, foxiaId: v }))}
          onMediaRoleChange={(v) => setCreateForm((p) => ({ ...p, mediaRole: v }))}
          onMediaApiKeyChange={(v) => setCreateForm((p) => ({ ...p, mediaApiKey: v }))}
          onDepartmentIdChange={(v) => setCreateForm((p) => ({ ...p, departmentId: v }))}
          onDepartmentIdsChange={(v) => setCreateForm((p) => ({ ...p, departmentIds: v }))}
          onRoleIdsChange={(v) => setCreateForm((p) => ({ ...p, roleIds: v }))}
          onSubmit={submitCreate}
        />

        <UserEditDialog
          open={openEdit}
          displayName={editForm.displayName}
          role={editForm.role}
          active={editForm.active}
          kiotvietMappings={editForm.kiotvietMappings}
          changePassword={editForm.changePassword}
          password={editForm.password}
          zenifyEmail={editForm.zenifyEmail}
          foxiaId={editForm.foxiaId}
          mediaRole={editForm.mediaRole}
          mediaApiKey={editForm.mediaApiKey}
          mediaApiKeySet={editForm.clearMediaKey ? false : editingUser?.media_api_key_set}
          mediaApiKeyPrefix={editingUser?.media_api_key_prefix}
          onClearMediaApiKey={() =>
            setEditForm((p) => ({ ...p, clearMediaKey: true, mediaApiKey: "" }))
          }
          departmentId={editForm.departmentId}
          departmentIds={editForm.departmentIds}
          roleIds={editForm.roleIds}
          departments={departments}
          roles={roles}
          kiotvietChannels={kiotvietChannels}
          onOpenChange={setOpenEdit}
          onDisplayNameChange={(v) => setEditForm((p) => ({ ...p, displayName: v }))}
          onRoleChange={(v) => setEditForm((p) => ({ ...p, role: v }))}
          onActiveChange={(v) => setEditForm((p) => ({ ...p, active: v }))}
          onKiotvietMappingsChange={(v) => setEditForm((p) => ({ ...p, kiotvietMappings: v }))}
          onChangePasswordToggle={(v) =>
            setEditForm((p) => ({ ...p, changePassword: v, password: v ? p.password : "" }))
          }
          onPasswordChange={(v) => setEditForm((p) => ({ ...p, password: v }))}
          onZenifyEmailChange={(v) => setEditForm((p) => ({ ...p, zenifyEmail: v }))}
          onFoxiaIdChange={(v) => setEditForm((p) => ({ ...p, foxiaId: v }))}
          onMediaRoleChange={(v) => setEditForm((p) => ({ ...p, mediaRole: v }))}
          onMediaApiKeyChange={(v) =>
            setEditForm((p) => ({ ...p, mediaApiKey: v, clearMediaKey: false }))
          }
          onDepartmentIdChange={(v) => setEditForm((p) => ({ ...p, departmentId: v }))}
          onDepartmentIdsChange={(v) => setEditForm((p) => ({ ...p, departmentIds: v }))}
          onRoleIdsChange={(v) => setEditForm((p) => ({ ...p, roleIds: v }))}
          onSubmit={submitEdit}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("users.dialog.deleteConfirmTitle")}</DialogTitle>
              <DialogDescription>
                {t("users.dialog.deleteConfirmDesc")}
                {userToDelete && (
                  <div className="mt-2 p-2 bg-muted rounded">
                    <p className="font-medium">{userToDelete.username}</p>
                    <p className="text-sm text-muted-foreground">ID: {userToDelete.id}</p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" onClick={executeDelete}>
                {t("common.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("users.dialog.bulkDeleteConfirmTitle")}</DialogTitle>
              <DialogDescription>
                {t(
                  "users.dialog.bulkDeleteConfirmDesc",
                  `Are you sure you want to delete ${selectedUserIds.length} selected users? This action cannot be undone.`,
                ).replace("{count}", String(selectedUserIds.length))}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" onClick={executeBulkDelete}>
                {t("common.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
