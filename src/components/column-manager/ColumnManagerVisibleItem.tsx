import { GripVertical, Pin, PinOff, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Một dòng ở cột PHẢI ("Đang hiện"): kéo đổi thứ tự, ghim, gỡ khỏi bảng.
 *
 * Khác bản cũ (SortableColumnItem): danh sách này chỉ chứa cột đang hiện nên
 * không còn trường hợp "hàng bị disable kéo" — nguyên nhân của lỗi cũ là muốn
 * đưa một cột ẩn lên đầu thì phải bật nó lên rồi mới kéo được.
 */
export function ColumnManagerVisibleItem({
  columnKey,
  label,
  index,
  isLocked,
  canRemove,
  enableReorder,
  enableLock,
  lockLabel,
  unlockLabel,
  removeLabel,
  onToggleLock,
  onRemove,
}: {
  columnKey: string;
  label: string;
  index: number;
  isLocked: boolean;
  canRemove: boolean;
  enableReorder: boolean;
  enableLock: boolean;
  lockLabel: string;
  unlockLabel: string;
  removeLabel: string;
  onToggleLock: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnKey,
    disabled: !enableReorder,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-transparent bg-background px-1.5 py-1 hover:border-border hover:bg-accent/50",
        isDragging && "border-border shadow-sm",
      )}
      data-testid={`column-manager-visible-${columnKey}`}
    >
      {enableReorder ? (
        <button
          type="button"
          className="cursor-grab touch-none p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={`${label} — kéo để đổi thứ tự`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="inline-block w-[18px]" />
      )}

      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={label}>
        {label}
      </span>

      {enableLock && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", isLocked ? "text-primary" : "text-muted-foreground")}
          title={isLocked ? unlockLabel : lockLabel}
          aria-label={`${isLocked ? unlockLabel : lockLabel}: ${label}`}
          aria-pressed={isLocked}
          onClick={onToggleLock}
        >
          {isLocked ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        title={removeLabel}
        aria-label={`${removeLabel}: ${label}`}
        // Không cho gỡ cột cuối cùng: bảng trống không hiển thị được gì.
        disabled={!canRemove}
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
