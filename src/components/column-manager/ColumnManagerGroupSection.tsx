import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ColumnManagerSection } from "@/components/column-manager/use-column-search";

/**
 * Một nhóm cột ở cột TRÁI ("Kho cột"): header thu gọn được + checkbox 3 trạng
 * thái để bật/tắt cả nhóm, bên dưới là từng cột.
 */
export function ColumnManagerGroupSection<K extends string>({
  section,
  collapsed,
  onToggleCollapsed,
  onToggleColumn,
  onToggleGroup,
}: {
  section: ColumnManagerSection<K>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleColumn: (key: K) => void;
  onToggleGroup: (keys: K[], nextVisible: boolean) => void;
}) {
  const groupCheckboxRef = useRef<HTMLInputElement | null>(null);
  const allVisible = section.visibleCount === section.totalCount;
  const someVisible = section.visibleCount > 0 && !allVisible;

  useEffect(() => {
    if (groupCheckboxRef.current) groupCheckboxRef.current.indeterminate = someVisible;
  }, [someVisible]);

  return (
    <section className="mb-1">
      <div className="flex items-center gap-1.5 rounded-md px-1 py-1 hover:bg-accent/50">
        {section.hideableKeys.length > 0 ? (
          <input
            ref={groupCheckboxRef}
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={allVisible}
            aria-label={`Bật/tắt nhóm ${section.groupLabel}`}
            onChange={() => onToggleGroup(section.hideableKeys, !allVisible)}
          />
        ) : (
          <span className="inline-block w-4" />
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              !collapsed && "rotate-90",
            )}
          />
          <span className="truncate text-sm font-medium text-foreground">{section.groupLabel}</span>
        </button>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-2xs tabular-nums",
            section.visibleCount > 0
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {section.visibleCount}/{section.totalCount}
        </span>
      </div>

      {!collapsed && (
        <ul className="ml-5 border-l border-border pl-2">
          {section.options.map((option) => {
            const fixed = option.hideable === false;
            return (
              <li key={option.key}>
                <label
                  className={cn(
                    "flex items-center gap-2 rounded-md px-1 py-1",
                    fixed ? "cursor-default opacity-70" : "cursor-pointer hover:bg-accent/50",
                  )}
                  title={fixed ? "Cột cố định, không tắt được" : option.label}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={option.visible}
                    disabled={fixed}
                    onChange={() => onToggleColumn(option.key)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {option.label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
