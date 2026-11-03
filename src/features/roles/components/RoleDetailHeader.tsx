import { ChevronLeft, Lock, Save, Trash2 } from "lucide-react";

import type { Role } from "@/lib/api/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  role: Role;
  codeCount: number;
  isDirty: boolean;
  readOnly: boolean;
  saving: boolean;
  onDelete: () => void;
  onSave: () => void;
  /** Màn < lg (master→detail): nút "‹ Vai trò" quay về danh sách; Xoá/Lưu chuyển xuống thanh đáy. */
  onBack?: () => void;
};

/** Tên role + trạng thái + nút Xoá/Lưu, kèm dải cảnh báo khi là role hệ thống. */
export function RoleDetailHeader({
  role,
  codeCount,
  isDirty,
  readOnly,
  saving,
  onDelete,
  onSave,
  onBack,
}: Props) {
  const compact = onBack != null;
  return (
    <>
      <div
        className={
          compact
            ? "border-b border-border px-3 pt-1 pb-2"
            : "flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"
        }
      >
        {compact && (
          <Button variant="ghost" size="sm" className="-ml-2 text-primary" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            Vai trò
          </Button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-foreground">{role.name}</h3>
            {role.is_system ? (
              <Badge className="shrink-0 border-0 bg-amber-100 text-amber-700">
                <Lock className="mr-1 h-3 w-3" /> Hệ thống
              </Badge>
            ) : (
              <Badge className="shrink-0 border-0 bg-primary/15 text-primary">Tùy biến</Badge>
            )}
            {isDirty && !readOnly && (
              <span className="flex items-center gap-1 text-xs font-medium text-action-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-action-warning" />
                Chưa lưu
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {role.description || "Không có mô tả"} · {codeCount} quyền
          </p>
        </div>
        {!compact && (
          <div className="flex items-center gap-2">
            {!role.is_system && (
              <Button
                size="icon-sm"
                variant="outline"
                className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={onDelete}
                title="Xóa vai trò"
              >
                <Trash2 />
              </Button>
            )}
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={readOnly || !isDirty || saving}
              onClick={onSave}
            >
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        )}
      </div>

      {readOnly && (
        <div className="flex items-center gap-2 border-b border-action-warning/30 bg-action-warning/10 px-4 py-2 text-xs text-action-warning">
          <Lock className="h-3.5 w-3.5" />
          Vai trò hệ thống — toàn quyền, không thể chỉnh sửa.
        </div>
      )}
    </>
  );
}
