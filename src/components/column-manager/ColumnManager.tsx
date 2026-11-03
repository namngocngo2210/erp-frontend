import { useCallback, useMemo, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ColumnManagerGroupSection } from "@/components/column-manager/ColumnManagerGroupSection";
import { ColumnManagerVisibleItem } from "@/components/column-manager/ColumnManagerVisibleItem";
import { useColumnSearch } from "@/components/column-manager/use-column-search";
import type {
  ColumnManagerGroup,
  ColumnManagerOption,
  ColumnManagerPreset,
  ColumnManagerTranslate,
} from "@/components/column-manager/types";

type Props<K extends string> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Danh sách cột chọn được (đã lọc theo ngữ cảnh trang, vd bỏ cột KOC). */
  options: Array<ColumnManagerOption<K>>;
  groups: ColumnManagerGroup[];
  /** Cột đang hiện, THEO ĐÚNG thứ tự hiển thị trên bảng. */
  visible: K[];
  locked?: K[];
  presets?: Array<ColumnManagerPreset<K>>;
  /** Tắt khi thứ tự cột do code quyết định (vd dialog xuất Excel). */
  enableReorder?: boolean;
  enableLock?: boolean;
  translate?: ColumnManagerTranslate;
  /** Bật/tắt một cột — giữ nguyên ràng buộc riêng của từng trang. */
  onToggle: (key: K) => void;
  /** Ghi đè cả danh sách cột (kéo thứ tự, bật/tắt cả nhóm, áp preset). */
  onSetColumns: (next: K[]) => void;
  onToggleLock?: (key: K) => void;
  onReset?: () => void;
  /**
   * Khi hộp thoại là một bước trong luồng khác (vd chọn cột rồi mới xuất
   * Excel): footer đổi thành cặp Huỷ / <confirmLabel> thay vì nút "Xong".
   */
  confirmLabel?: string;
  onConfirm?: () => void;
};

/**
 * Hộp thoại quản lý cột dùng chung: trái là kho cột (tìm kiếm + gom nhóm),
 * phải là các cột đang hiện (kéo sắp xếp, ghim, gỡ).
 *
 * Thay cho dropdown phẳng cũ — với hơn 60 cột thì danh sách phẳng không tìm
 * nổi cột nào, và cột vừa tắt lại bị đẩy xuống cuối nên user tưởng bị mất.
 */
export function ColumnManager<K extends string>({
  open,
  onOpenChange,
  title,
  options,
  groups,
  visible,
  locked = [],
  presets = [],
  enableReorder = true,
  enableLock = true,
  translate,
  onToggle,
  onSetColumns,
  onToggleLock,
  onReset,
  confirmLabel,
  onConfirm,
}: Props<K>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="panel"
        aria-label={title ?? translate?.("columnManager.title", "Tuỳ chỉnh cột") ?? "Tuỳ chỉnh cột"}
      >
        {/*
         * `key` đổi theo `open` để panel remount mỗi lần mở: từ khoá tìm kiếm và
         * trạng thái thu gọn nhóm được tính lại ngay trong initializer của
         * useState. Cách này thay cho một useEffect "reset khi mở" vốn phải tắt
         * rule react-hooks/exhaustive-deps — mà tắt rule là React Compiler bỏ
         * qua tối ưu cả component.
         */}
        <ColumnManagerPanel
          key={String(open)}
          title={title}
          options={options}
          groups={groups}
          visible={visible}
          locked={locked}
          presets={presets}
          enableReorder={enableReorder}
          enableLock={enableLock}
          translate={translate}
          onOpenChange={onOpenChange}
          onToggle={onToggle}
          onSetColumns={onSetColumns}
          onToggleLock={onToggleLock}
          onReset={onReset}
          confirmLabel={confirmLabel}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function ColumnManagerPanel<K extends string>({
  title,
  options,
  groups,
  visible,
  locked = [],
  presets = [],
  enableReorder = true,
  enableLock = true,
  translate,
  onOpenChange,
  onToggle,
  onSetColumns,
  onToggleLock,
  onReset,
  confirmLabel,
  onConfirm,
}: Omit<Props<K>, "open">) {
  const t = useCallback(
    (key: string, fallback: string) => translate?.(key, fallback) ?? fallback,
    [translate],
  );

  const [query, setQuery] = useState("");

  // Chỉ mở sẵn những nhóm đang có cột hiện — nếu bung hết 8 nhóm thì danh sách
  // lại dài dằng dặc đúng như dropdown cũ.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const visibleSet = new Set<K>(visible);
    const groupsWithVisible = new Set(
      options.filter((option) => visibleSet.has(option.key)).map((option) => option.group),
    );
    return new Set(
      groups.filter((group) => !groupsWithVisible.has(group.key)).map((group) => group.key),
    );
  });

  const { sections, matchCount } = useColumnSearch({
    options,
    groups,
    visible,
    query,
    translate,
  });

  const optionByKey = useMemo(
    () => new Map(options.map((option) => [option.key, option])),
    [options],
  );

  const visibleRows = useMemo(
    () =>
      visible
        .map((key) => optionByKey.get(key))
        .filter((option): option is ColumnManagerOption<K> => Boolean(option))
        .map((option) => ({
          key: option.key,
          label: translate?.(option.label, option.label) ?? option.label,
          hideable: option.hideable !== false,
        })),
    [visible, optionByKey, translate],
  );

  const removableCount = visibleRows.filter((row) => row.hideable).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = visible.indexOf(active.id as K);
      const newIndex = visible.indexOf(over.id as K);
      if (oldIndex === -1 || newIndex === -1) return;
      onSetColumns(arrayMove(visible, oldIndex, newIndex));
    },
    [visible, onSetColumns],
  );

  const handleToggleGroup = useCallback(
    (keys: K[], nextVisible: boolean) => {
      const current = new Set(visible);
      if (nextVisible) {
        // Thêm theo thứ tự khai báo trong `options` để cột mới bật lên nằm cạnh
        // nhau đúng thứ tự nhóm, thay vì theo thứ tự click.
        const added = options
          .map((option) => option.key)
          .filter((key) => keys.includes(key) && !current.has(key));
        if (added.length === 0) return;
        onSetColumns([...visible, ...added]);
        return;
      }
      const removing = new Set(keys);
      const next = visible.filter((key) => !removing.has(key));
      // Bảng không còn cột nào thì không hiển thị được gì — giữ nguyên.
      if (next.length === 0) return;
      onSetColumns(next);
    },
    [visible, options, onSetColumns],
  );

  const handleApplyPreset = useCallback(
    (preset: ColumnManagerPreset<K>) => {
      // Preset khai trong code có thể chứa cột không khả dụng ở ngữ cảnh hiện
      // tại (vd cột KOC khi đang xem đơn thường) — lọc bỏ, giữ thứ tự preset.
      const next = preset.columns.filter((key) => optionByKey.has(key));
      if (next.length === 0) return;
      onSetColumns(next);
    },
    [optionByKey, onSetColumns],
  );

  const searching = query.trim().length > 0;

  return (
    <>
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 pr-12">
        <h2 className="text-base font-semibold text-foreground">
          {title ?? t("columnManager.title", "Tuỳ chỉnh cột")}
        </h2>
        <span
          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary"
          data-testid="column-manager-counter"
        >
          {t("columnManager.showing", "Đang hiện")} {visibleRows.length}/{options.length}
        </span>
        {onReset && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto h-8"
            onClick={onReset}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t("columnManager.reset", "Khôi phục mặc định")}
          </Button>
        )}
      </header>

      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-4 py-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("columnManager.presets", "Bộ cột")}
          </span>
          {presets.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 bg-background text-xs"
              onClick={() => handleApplyPreset(preset)}
            >
              {translate?.(preset.label, preset.label) ?? preset.label}
            </Button>
          ))}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 divide-border sm:grid-cols-2 sm:divide-x">
        {/* Trái: kho cột — tìm kiếm + gom nhóm */}
        <div className="flex min-h-0 flex-col" data-testid="column-manager-available">
          <div className="relative px-3 py-2">
            <Search className="pointer-events-none absolute top-1/2 left-5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("columnManager.searchPlaceholder", "Tìm cột…")}
              aria-label={t("columnManager.searchPlaceholder", "Tìm cột…")}
              className="h-8 pl-7 text-sm"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {matchCount === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                {t("columnManager.noMatch", "Không có cột nào khớp")}
              </p>
            ) : (
              sections
                .filter((section) => section.options.length > 0)
                .map((section) => (
                  <ColumnManagerGroupSection
                    key={section.group.key}
                    section={section}
                    collapsed={!searching && collapsedGroups.has(section.group.key)}
                    onToggleCollapsed={() =>
                      setCollapsedGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(section.group.key)) next.delete(section.group.key);
                        else next.add(section.group.key);
                        return next;
                      })
                    }
                    onToggleColumn={onToggle}
                    onToggleGroup={handleToggleGroup}
                  />
                ))
            )}
          </div>
        </div>

        {/* Phải: cột đang hiện — kéo thứ tự, ghim, gỡ */}
        <div
          className="flex min-h-0 flex-col border-t border-border sm:border-t-0"
          data-testid="column-manager-visible"
        >
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {enableReorder
              ? t("columnManager.visibleReorder", "Đang hiện — kéo để sắp xếp")
              : t("columnManager.visible", "Đang hiện")}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {visibleRows.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                {t("columnManager.emptyVisible", "Chưa chọn cột nào")}
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleRows.map((row) => row.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className={cn("space-y-0.5")}>
                    {visibleRows.map((row, index) => (
                      <ColumnManagerVisibleItem
                        key={row.key}
                        columnKey={row.key}
                        label={row.label}
                        index={index}
                        isLocked={locked.includes(row.key)}
                        canRemove={row.hideable && removableCount > 1}
                        enableReorder={enableReorder}
                        enableLock={enableLock && Boolean(onToggleLock)}
                        lockLabel={t("columnManager.lock", "Ghim")}
                        unlockLabel={t("columnManager.unlock", "Bỏ ghim")}
                        removeLabel={t("columnManager.remove", "Ẩn cột")}
                        onToggleLock={() => onToggleLock?.(row.key)}
                        onRemove={() => onToggle(row.key)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      <footer className="flex justify-end gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
        {onConfirm ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Huỷ")}
            </Button>
            <Button type="button" size="sm" disabled={visibleRows.length === 0} onClick={onConfirm}>
              {confirmLabel ?? t("columnManager.done", "Xong")}
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            {t("columnManager.done", "Xong")}
          </Button>
        )}
      </footer>
    </>
  );
}
