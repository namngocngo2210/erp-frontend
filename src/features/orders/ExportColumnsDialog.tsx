import { memo, useCallback, useMemo } from "react";

import { ColumnManager } from "@/components/column-manager/ColumnManager";
import { useI18n } from "@/i18n";
import {
  DEFAULT_ORDER_COLUMNS,
  ORDER_COLUMN_GROUPS,
  ORDER_COLUMN_GROUP_BY_KEY,
  ORDER_COLUMN_OPTIONS,
  TABLE_ONLY_COLUMN_KEYS,
  type OrderColumnKey,
} from "@/features/orders/order-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportColumns: OrderColumnKey[];
  setExportColumns: React.Dispatch<React.SetStateAction<OrderColumnKey[]>>;
  onConfirm: () => void;
  /** Mô tả phạm vi sẽ xuất (đơn đã chọn vs toàn bộ theo bộ lọc). */
  modeLabel?: string;
};

// Cột gộp của lưới (`recall_entries`) không có trong bộ cột export của backend —
// tick được thì file Excel sẽ có một cột trống không ai giải thích nổi.
const EXPORTABLE_COLUMN_OPTIONS = ORDER_COLUMN_OPTIONS.filter(
  (option) => !TABLE_ONLY_COLUMN_KEYS.includes(option.key),
);

const EXPORT_COLUMN_OPTIONS = EXPORTABLE_COLUMN_OPTIONS.map((option) => ({
  key: option.key,
  label: option.label,
  group: ORDER_COLUMN_GROUP_BY_KEY[option.key],
}));

const EXPORT_COLUMN_ORDER = new Map(
  EXPORTABLE_COLUMN_OPTIONS.map((option, index) => [option.key, index]),
);

/**
 * Chọn cột xuất Excel. Dùng chung <ColumnManager> để có tìm kiếm + gom nhóm —
 * trước đây là lưới 60+ ô checkbox phẳng, không tìm nổi cột nào.
 *
 * Cố ý KHÔNG cho kéo đổi thứ tự: thứ tự cột trong file Excel bám theo
 * `ORDER_COLUMN_OPTIONS`, đổi được ở đây thì file xuất ra sẽ lệch so với các
 * bản đã phát cho người dùng.
 */
function ExportColumnsDialogImpl({
  open,
  onOpenChange,
  exportColumns,
  setExportColumns,
  onConfirm,
  modeLabel,
}: Props) {
  const { t } = useI18n();

  // Luôn hiển thị theo thứ tự cột của file Excel, bất kể user tick theo thứ tự nào.
  const orderedSelection = useMemo(
    () =>
      [...exportColumns].sort(
        (a, b) => (EXPORT_COLUMN_ORDER.get(a) ?? 0) - (EXPORT_COLUMN_ORDER.get(b) ?? 0),
      ),
    [exportColumns],
  );

  const handleToggle = useCallback(
    (key: OrderColumnKey) => {
      setExportColumns((prev) =>
        prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
      );
    },
    [setExportColumns],
  );

  const handleSetColumns = useCallback(
    (next: OrderColumnKey[]) => setExportColumns(next),
    [setExportColumns],
  );

  const handleReset = useCallback(
    () => setExportColumns(DEFAULT_ORDER_COLUMNS),
    [setExportColumns],
  );

  return (
    <ColumnManager
      open={open}
      onOpenChange={onOpenChange}
      title={modeLabel ? `Chọn cột xuất Excel — ${modeLabel}` : "Chọn cột xuất Excel"}
      options={EXPORT_COLUMN_OPTIONS}
      groups={ORDER_COLUMN_GROUPS}
      visible={orderedSelection}
      enableReorder={false}
      enableLock={false}
      translate={t}
      onToggle={handleToggle}
      onSetColumns={handleSetColumns}
      onReset={handleReset}
      confirmLabel="Xuất Excel"
      onConfirm={onConfirm}
    />
  );
}

export const ExportColumnsDialog = memo(ExportColumnsDialogImpl);
