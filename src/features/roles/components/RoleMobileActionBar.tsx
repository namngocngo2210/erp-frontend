import { Ellipsis, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  isDirty: boolean;
  saving: boolean;
  canDelete: boolean;
  onSave: () => void;
  onDelete: () => void;
};

/**
 * Thanh hành động dính đáy của chi tiết role ở màn < lg: "Lưu thay đổi" luôn trong
 * tầm ngón cái khi cuộn danh sách quyền; Xoá thu vào menu ⋯ để khó bấm nhầm.
 */
export function RoleMobileActionBar({ isDirty, saving, canDelete, onSave, onDelete }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <Button
        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={!isDirty || saving}
        onClick={onSave}
      >
        <Save className="mr-1 h-4 w-4" />
        {saving ? "Đang lưu..." : "Lưu thay đổi"}
      </Button>
      {canDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Thao tác khác">
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa vai trò
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
