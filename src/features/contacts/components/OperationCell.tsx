import { Pencil } from "lucide-react";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import type { ContactOperation } from "@/lib/api/contacts";

/** `YYYY-MM-DDTHH:mm...` ISO → "HH:mm dd/MM" ngắn gọn cho ô cột (khác formatDateTime
 * của ContactsTable — cột này không cần năm). "—" khi rỗng/không hợp lệ. */
function formatDueShort(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

export type OperationStageOption = { value: string; label: string };

type OperationCellProps = {
  operation: ContactOperation;
  /** Bước tác nghiệp đang bật — options của ô chọn (value = stage id dạng chuỗi). */
  stageOptions: OperationStageOption[];
  /**
   * Sale chọn một bước trong danh sách. Nơi gọi mở dialog hỏi giờ hẹn rồi mới bắn
   * API — component này KHÔNG tự ghi gì (thuần presentational, mirror
   * ContactResultSelect của cột Kết quả).
   */
  onSelectStage?: (stageId: number) => void;
  /** Khoá ô chọn khi request đổi bước của ĐÚNG dòng này đang chạy. */
  selectDisabled?: boolean;
  /** Mở dialog sửa giờ hẹn — chỉ được gọi khi nút Pencil hiển thị (allow_edit_due && đã vào flow). */
  onEditDue?: () => void;
};

/**
 * Cell cột "Tác nghiệp": ô CHỌN bước (đặt bước tay, không qua transition), giờ đến
 * hạn ngắn gọn (đỏ khi bucket=overdue), icon Pencil mở dialog sửa giờ khi bước cho
 * phép. Khách chưa vào flow (bucket="none") vẫn chọn được — chọn xong là vào flow
 * luôn, nên không còn ô "—" chết như trước.
 *
 * KHÔNG hiển thị `stage_color`: bản đầu có một chấm tròn màu cạnh ô chọn, nhưng nó
 * đẩy ô chọn lệch sang phải đúng bằng chiều rộng chấm + gap, và chỉ ở những dòng CÓ
 * màu — nhìn dọc cả bảng thành so le. Ô chọn cao `h-8` + `text-xs` để thẳng hàng với
 * ô cột "Kết quả" (ContactResultSelect), `w-full` để vừa đúng bề rộng cột.
 */
export function OperationCell({
  operation,
  stageOptions,
  onSelectStage,
  selectDisabled,
  onEditDue,
}: OperationCellProps) {
  const inFlow = operation.bucket !== "none";
  const showEditDue = inFlow && operation.allow_edit_due;
  // Payload contact chỉ có TÊN bước (không có id) nên phải dò ngược qua options.
  // Bước bị tắt sau khi khách đã vào nó sẽ không khớp option nào → ô hiện
  // placeholder; tên bước cũ vẫn nằm ở tooltip để không mất thông tin.
  const currentValue =
    stageOptions.find((option) => option.label === operation.stage_name)?.value ?? "";

  return (
    <div className="flex flex-col gap-1" title={operation.stage_name || undefined}>
      <SearchableSelect
        options={stageOptions}
        value={currentValue}
        onChange={(value) => onSelectStage?.(Number(value))}
        placeholder="Chọn tác nghiệp"
        disabled={selectDisabled}
        aria-label="Chọn tác nghiệp"
        className="h-8 w-full text-xs"
      />
      {inFlow && (
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs",
              operation.bucket === "overdue"
                ? "font-semibold text-action-danger"
                : "text-muted-foreground",
            )}
          >
            {formatDueShort(operation.due_at)}
          </span>
          {showEditDue && (
            <button
              type="button"
              aria-label="Sửa giờ hẹn"
              title="Sửa giờ hẹn"
              className="text-muted-foreground hover:text-foreground"
              onClick={onEditDue}
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
