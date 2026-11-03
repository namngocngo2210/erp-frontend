import { Pencil, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Input } from "@/components/ui/input";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import type { AdminUserRow } from "@/features/users/types";

type Props = {
  users: AdminUserRow[];
  currentUserId: number;
  selectedUserIds: number[];
  allChecked: boolean;
  onBulkDelete: () => void;
  onCreateClick: () => void;
  onToggleAll: () => void;
  onToggleOne: (id: number, shiftKey: boolean) => void;
  onEdit: (user: AdminUserRow) => void;
  onDelete: (user: AdminUserRow) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
};

export function UsersTable({
  users,
  currentUserId,
  selectedUserIds,
  allChecked,
  onBulkDelete,
  onCreateClick,
  onToggleAll,
  onToggleOne,
  onEdit,
  onDelete,
  searchValue,
  onSearchChange,
}: Props) {
  const { t } = useI18n();

  return (
    <DataTableShell
      toolbar={
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("users.search.placeholder")}
              className="h-8 pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="inline-flex items-center gap-1.5"
              onClick={onBulkDelete}
              disabled={selectedUserIds.length === 0}
              aria-label={t("common.deleteSelected", "Xóa đã chọn ({count})").replace(
                "{count}",
                String(selectedUserIds.length),
              )}
              title={t("common.deleteSelected", "Xóa đã chọn ({count})").replace(
                "{count}",
                String(selectedUserIds.length),
              )}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("common.deleteSelected", "Xóa đã chọn ({count})").replace(
                  "{count}",
                  String(selectedUserIds.length),
                )}
              </span>
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
              onClick={onCreateClick}
            >
              {t("users.management.create")}
            </Button>
          </div>
        </div>
      }
    >
      <ResponsiveList
        items={users}
        getKey={(user: AdminUserRow) => user.id}
        table={
          <Table className="min-w-[860px] [&_td]:px-3 [&_th]:px-3">
            <TableHeader>
              <TableRow>
                <TableHead className="h-11 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={onToggleAll}
                    aria-label={t("common.selectAll", "Select all")}
                  />
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  ID
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("users.fields.username")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("users.fields.displayName")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("users.fields.role")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("users.fields.department", "Phòng ban")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("users.fields.status")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      disabled={user.id === currentUserId}
                      onClick={(e) => onToggleOne(user.id, e.shiftKey)}
                      onChange={() => {}}
                      aria-label={t("users.actions.selectRow", "Select user {username}").replace(
                        "{username}",
                        user.username,
                      )}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell className="font-medium text-foreground">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.display_name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.role === "admin"
                          ? "border-0 bg-primary/15 text-primary"
                          : "border-0 bg-secondary text-secondary-foreground"
                      }
                    >
                      {user.role === "admin" ? t("users.roles.admin") : t("users.roles.staff")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.department?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.is_active
                          ? "border-0 bg-primary/15 text-primary"
                          : "border-0 bg-muted text-muted-foreground"
                      }
                    >
                      {user.is_active ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Button
                        aria-label={t("users.actions.edit")}
                        title={t("users.actions.edit")}
                        size="icon-sm"
                        variant="outline"
                        className="border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                        onClick={() => onEdit(user)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        aria-label={t("users.actions.delete")}
                        title={t("users.actions.delete")}
                        size="icon-sm"
                        variant="outline"
                        className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                        onClick={() => onDelete(user)}
                        disabled={user.id === currentUserId}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
        renderCard={(user: AdminUserRow) => (
          <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">#{user.id}</p>
                <p className="font-medium text-foreground">{user.username}</p>
                <p className="text-sm text-muted-foreground">{user.display_name || "-"}</p>
              </div>
              <input
                type="checkbox"
                checked={selectedUserIds.includes(user.id)}
                disabled={user.id === currentUserId}
                onClick={(e) => onToggleOne(user.id, e.shiftKey)}
                onChange={() => {}}
                aria-label={t("users.actions.selectRow", "Select user {username}").replace(
                  "{username}",
                  user.username,
                )}
              />
            </div>

            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">{t("users.fields.role")}: </span>
                <Badge
                  className={
                    user.role === "admin"
                      ? "border-0 bg-primary/15 text-primary"
                      : "border-0 bg-secondary text-secondary-foreground"
                  }
                >
                  {user.role === "admin" ? t("users.roles.admin") : t("users.roles.staff")}
                </Badge>
              </p>
              <p>
                <span className="text-muted-foreground">
                  {t("users.fields.department", "Phòng ban")}:{" "}
                </span>
                <span>{user.department?.name || "-"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">{t("users.fields.status")}: </span>
                <Badge
                  className={
                    user.is_active
                      ? "border-0 bg-primary/15 text-primary"
                      : "border-0 bg-muted text-muted-foreground"
                  }
                >
                  {user.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                onClick={() => onEdit(user)}
              >
                <Pencil className="mr-1 h-4 w-4" />
                {t("users.actions.edit")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={() => onDelete(user)}
                disabled={user.id === currentUserId}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {t("users.actions.delete")}
              </Button>
            </div>
          </div>
        )}
      />
    </DataTableShell>
  );
}
