import type { components } from "@/api/typed";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  OPERATION_BUCKET_ORDER,
  OPERATION_BUCKETS,
  type OperationBucketKey,
} from "../operation-buckets";

type ActionCount = components["schemas"]["ContactActionCount"];

type OperationBucketChipsProps = {
  /** `operation_counts` từ response — key "all" luôn có mặt, các key khác theo OperationBucketKey. */
  operationCounts: Record<string, ActionCount> | undefined;
  /** operation_bucket đang chọn; `null` = chip "Tất cả". */
  selected: OperationBucketKey | null;
  onSelect: (key: OperationBucketKey | null) => void;
};

function ChipButton({
  active,
  activeClass,
  label,
  count,
  onClick,
}: {
  active: boolean;
  activeClass: string;
  label: string;
  count: ActionCount | undefined;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn("h-8 gap-1.5 px-2.5 text-xs font-medium", active && activeClass)}
      onClick={onClick}
    >
      <span>{label}</span>
      {count && (
        <span
          className={cn(
            "rounded-full px-1.5 text-2xs tabular-nums",
            active ? "bg-white/20" : "bg-muted text-muted-foreground",
          )}
        >
          {count.total}
        </span>
      )}
    </Button>
  );
}

/**
 * Hàng chip lọc theo bucket tác nghiệp (Task S2-3): "Tất cả" + 5 bucket
 * (overdue/today/upcoming/ended/none). Mirror `ContactActionChips` nhưng chỉ
 * hiện SỐ `total` — `operation_counts` mirror shape {pending,total} của
 * action_counts để tái dùng `_compute_operation_counts`, nhưng `pending` ở đây
 * là cờ "khách chờ tương tác" chung của toàn contact (row["pending"], xem
 * contact_list_service.py) chứ KHÔNG phải trạng thái riêng của bước tác
 * nghiệp — hiển thị x/y sẽ gây hiểu nhầm nên chỉ hiện `total`.
 */
export function OperationBucketChips({
  operationCounts,
  selected,
  onSelect,
}: OperationBucketChipsProps) {
  const allCount = operationCounts?.all;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChipButton
        active={selected === null}
        activeClass="bg-foreground text-background hover:bg-foreground/90"
        label="Tất cả"
        count={allCount}
        onClick={() => onSelect(null)}
      />
      {OPERATION_BUCKET_ORDER.map((key) => {
        const { label, badgeClass } = OPERATION_BUCKETS[key];
        return (
          <ChipButton
            key={key}
            active={selected === key}
            activeClass={badgeClass}
            label={label}
            count={operationCounts?.[key]}
            onClick={() => onSelect(selected === key ? null : key)}
          />
        );
      })}
    </div>
  );
}
