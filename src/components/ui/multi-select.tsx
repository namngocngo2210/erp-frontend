import * as React from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { groupByKey, scrollOptionIntoView, useFloatingMenuStyle } from "./floating-menu";

export interface MultiSelectOption {
  value: string;
  label: string;
  code?: string;
  // `keywords`: chuỗi tìm-kiếm ẩn, tham gia filter nhưng KHÔNG hiển thị. Dùng khi
  // label cố tình rút gọn (vd chỉ hiện SKU) mà vẫn cần tìm được theo tên đầy đủ.
  keywords?: string;
  /** Tiêu đề nhóm — option cùng `group` được gom dưới một header trong menu. */
  group?: string;
}

interface MultiSelectProps {
  /** id của nút combobox — để `<label htmlFor>` trỏ vào. */
  id?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** `sm` cho thanh lọc ngang (min-h-8, chữ nhỏ). */
  size?: "sm" | "default";
  /** Chữ khi không có option khớp. */
  emptyText?: string;
  "aria-label"?: string;
  /**
   * Render dropdown vào document.body (position: fixed) thay vì absolute trong
   * block. Dùng khi component nằm trong ancestor có `overflow` (Dialog cuộn, thanh
   * lọc cuộn ngang) khiến dropdown absolute bị cắt/đẩy layout. Mặc định false để
   * giữ nguyên hành vi cho các nơi đang dùng (vd MultiSelect nằm trong Popover —
   * menu portal sẽ bị Popover coi là "bấm ra ngoài").
   */
  menuPortal?: boolean;
}

const optionText = (opt: MultiSelectOption) =>
  opt.code ? `${opt.code} - ${opt.label}` : opt.label;

/**
 * Ô chọn nhiều giá trị có tìm kiếm (combobox + listbox `aria-multiselectable`):
 * Enter/Space/↓ ở ô để mở, ↑/↓ + Enter trong ô tìm để bật/tắt, Esc đóng.
 */
export const MultiSelect: React.FC<MultiSelectProps> = ({
  id,
  options,
  selected,
  onChange,
  placeholder = "Chọn kênh bán hàng",
  className,
  disabled,
  size = "default",
  emptyText = "Không có dữ liệu",
  "aria-label": ariaLabel,
  menuPortal = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const listboxRef = React.useRef<HTMLDivElement>(null);
  const baseId = React.useId();
  const listboxId = `${baseId}-listbox`;
  const portalStyle = useFloatingMenuStyle(isOpen && menuPortal, triggerRef, dropdownRef);

  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.code ?? "").toLowerCase().includes(q) ||
        (o.keywords ?? "").toLowerCase().includes(q),
    );
  }, [options, search]);
  const sections = React.useMemo(() => groupByKey(filteredOptions), [filteredOptions]);
  // Thứ tự điều hướng bàn phím = thứ tự hiển thị (theo nhóm).
  const ordered = React.useMemo(() => sections.flatMap((s) => s.options), [sections]);
  const indexByOption = React.useMemo(
    () => new Map(ordered.map((opt, index) => [opt, index] as const)),
    [ordered],
  );
  const optionId = (index: number) => `${baseId}-opt-${index}`;
  const activeOption = isOpen ? ordered[activeIndex] : undefined;

  const allFilteredSelected =
    filteredOptions.length > 0 && filteredOptions.every((o) => selected.includes(o.value));
  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredValues = new Set(filteredOptions.map((o) => o.value));
      onChange(selected.filter((v) => !filteredValues.has(v)));
    } else {
      const merged = new Set([...selected, ...filteredOptions.map((o) => o.value)]);
      onChange(Array.from(merged));
    }
  };

  const close = React.useCallback((restoreFocus: boolean) => {
    setIsOpen(false);
    setSearch("");
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Close dropdown when clicking outside (account for portaled dropdown too).
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  const activeId = activeOption ? optionId(activeIndex) : undefined;
  React.useEffect(() => {
    if (isOpen) scrollOptionIntoView(listboxRef.current, activeId);
  }, [isOpen, activeId]);

  const toggleOpen = () => {
    if (disabled) return;
    if (isOpen) close(false);
    else {
      setActiveIndex(0);
      setIsOpen(true);
    }
  };

  const toggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const removeOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (ordered.length === 0) return;
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((i) => (i + step + ordered.length) % ordered.length);
        return;
      }
      case "Enter":
        event.preventDefault();
        if (activeOption) toggleOption(activeOption.value);
        return;
      case "Escape":
        // Chỉ đóng menu — không để Dialog/Sheet bên dưới đóng theo.
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case "Tab":
        close(false);
        return;
      default:
    }
  };

  const selectedOptions = options.filter((opt) => selected.includes(opt.value));
  const small = size === "sm";

  const dropdownInner = (
    <>
      <div className="sticky top-0 flex items-center gap-2 border-b bg-popover p-2">
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder="Tìm..."
          aria-label="Tìm"
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          autoComplete="off"
          className="h-8 w-full rounded border px-2 text-sm"
        />
        {filteredOptions.length > 0 && (
          <button
            type="button"
            onClick={toggleAllFiltered}
            className="rounded border px-2 py-1 text-xs whitespace-nowrap hover:bg-accent"
          >
            {allFilteredSelected ? "Bỏ chọn" : "Chọn tất cả"}
          </button>
        )}
      </div>
      <div
        ref={listboxRef}
        id={listboxId}
        role="listbox"
        aria-multiselectable="true"
        aria-label={ariaLabel ?? placeholder}
        className="max-h-60 overflow-auto"
      >
        {ordered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          sections.map((section, sectionIdx) => {
            const items = section.options.map((opt) => {
              const index = indexByOption.get(opt) ?? 0;
              const isSelected = selected.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    index === activeIndex && "bg-accent text-accent-foreground",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => toggleOption(opt.value)}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {isSelected && <Check className="size-3" />}
                  </span>
                  <span className="flex-1">
                    {opt.code ? (
                      <span>
                        <span className="font-medium">{opt.code}</span> - {opt.label}
                      </span>
                    ) : (
                      opt.label
                    )}
                  </span>
                </div>
              );
            });
            if (!section.group) return <React.Fragment key="_">{items}</React.Fragment>;
            const headerId = `${baseId}-group-${sectionIdx}`;
            return (
              <div key={section.group} role="group" aria-labelledby={headerId}>
                <div
                  id={headerId}
                  className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase"
                >
                  {section.group}
                </div>
                {items}
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        ref={triggerRef}
        aria-disabled={disabled || undefined}
        className={cn(
          "flex w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-3 py-1",
          small
            ? "min-h-8 text-xs pointer-coarse:min-h-10"
            : "min-h-9 text-sm pointer-coarse:min-h-11",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          isOpen && "border-ring ring-3 ring-ring/50",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        )}
        onClick={toggleOpen}
      >
        {selectedOptions.map((opt) => (
          <Badge
            key={opt.value}
            variant="secondary"
            className={cn("max-w-full gap-1 pr-1", small && "text-xs")}
          >
            <span className="truncate">{optionText(opt)}</span>
            {!disabled && (
              <button
                type="button"
                aria-label={`Bỏ ${optionText(opt)}`}
                onClick={(e) => removeOption(opt.value, e)}
                className="hover:text-foreground"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            )}
          </Badge>
        ))}
        <button
          ref={buttonRef}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-label={ariaLabel}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && !isOpen) {
              event.preventDefault();
              toggleOpen();
            }
          }}
          className={cn(
            "min-w-0 flex-1 text-left outline-none disabled:cursor-not-allowed",
            selectedOptions.length === 0
              ? "truncate text-muted-foreground"
              : "text-right text-xs text-muted-foreground",
          )}
        >
          {selectedOptions.length === 0 ? placeholder : `${selected.length} đã chọn`}
        </button>
      </div>

      {/* Dropdown */}
      {isOpen &&
        (menuPortal ? (
          createPortal(
            <div
              ref={dropdownRef}
              className="z-60 rounded-md border border-input bg-popover shadow-lg"
              style={portalStyle ?? { position: "fixed", visibility: "hidden" }}
            >
              {dropdownInner}
            </div>,
            document.body,
          )
        ) : (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-lg"
          >
            {dropdownInner}
          </div>
        ))}
    </div>
  );
};
