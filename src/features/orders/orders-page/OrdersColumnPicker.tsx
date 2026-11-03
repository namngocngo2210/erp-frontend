import { useMemo, useState } from "react";
import { Columns3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ColumnManager } from "@/components/column-manager/ColumnManager";
import { ORDER_COLUMN_PRESETS } from "@/features/orders/order-column-presets";
import {
  EXPORT_ONLY_COLUMN_KEYS,
  ORDER_COLUMN_GROUPS,
  ORDER_COLUMN_GROUP_BY_KEY,
  ORDER_COLUMN_OPTIONS,
  type OrderColumnKey,
} from "@/features/orders/order-types";
import { RECALL_COLUMN_KEYS } from "@/features/orders/order-import-format";
import { useI18n } from "@/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Nút mở hộp thoại tuỳ chỉnh cột của trang đơn.
 *
 * Toàn bộ phần trình bày nằm ở <ColumnManager> dùng chung; ở đây chỉ còn việc
 * lọc cột theo ngữ cảnh trang (ẩn nhóm cột thu hồi khi không phải trang KOC).
 */
export function OrdersColumnPicker({
  t,
  visibleOrderColumns,
  lockedOrderColumns,
  isKoc,
  onToggleOrderColumn,
  onToggleLockOrderColumn,
  onSetOrderColumns,
  onResetOrderColumns,
}: {
  t: Translate;
  visibleOrderColumns: OrderColumnKey[];
  lockedOrderColumns: OrderColumnKey[];
  isKoc: boolean;
  onToggleOrderColumn: (key: OrderColumnKey) => void;
  onToggleLockOrderColumn: (key: OrderColumnKey) => void;
  /** Ghi đè cả danh sách cột: kéo đổi thứ tự, bật/tắt cả nhóm, áp preset. */
  onSetOrderColumns: (next: OrderColumnKey[]) => void;
  onResetOrderColumns: () => void;
}) {
  const [open, setOpen] = useState(false);

  // Cột thu hồi/KOC chỉ tồn tại ở trang KOC — giữ nguyên hành vi cũ. Ba cột thu
  // hồi rời thì ẩn ở MỌI trang: trên lưới chúng đã gộp vào `recall_entries`,
  // chỉ còn sống trong hộp thoại chọn cột xuất Excel.
  const options = useMemo(
    () =>
      ORDER_COLUMN_OPTIONS.filter(
        (option) =>
          !EXPORT_ONLY_COLUMN_KEYS.includes(option.key) &&
          (isKoc || !RECALL_COLUMN_KEYS.includes(option.key)),
      ).map((option) => ({
        key: option.key,
        label: option.label,
        group: ORDER_COLUMN_GROUP_BY_KEY[option.key],
      })),
    [isKoc],
  );

  const presets = useMemo(
    () => ORDER_COLUMN_PRESETS.filter((preset) => isKoc || preset.key !== "koc"),
    [isKoc],
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={t("columnManager.title", "Tuỳ chỉnh cột")}
        title={t("columnManager.title", "Tuỳ chỉnh cột")}
        className="h-8 w-8 border-border bg-background text-primary hover:bg-accent"
        onClick={() => setOpen(true)}
      >
        <Columns3 className="h-4 w-4" />
      </Button>
      <ColumnManager
        open={open}
        onOpenChange={setOpen}
        options={options}
        groups={ORDER_COLUMN_GROUPS}
        visible={visibleOrderColumns}
        locked={lockedOrderColumns}
        presets={presets}
        translate={t}
        onToggle={onToggleOrderColumn}
        onSetColumns={onSetOrderColumns}
        onToggleLock={onToggleLockOrderColumn}
        onReset={onResetOrderColumns}
      />
    </>
  );
}
