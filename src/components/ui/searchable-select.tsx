import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupByKey, scrollOptionIntoView, useFloatingMenuStyle } from "./floating-menu";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Tiêu đề nhóm — option cùng `group` được gom dưới một header trong menu. */
  group?: string;
}

interface Props<O extends SearchableSelectOption> {
  /** Danh sách option tĩnh (chế độ lọc client). Bỏ qua khi truyền `onSearch`. */
  options?: O[];
  value: string;
  onChange?: (value: string) => void;
  /** Nhận object option đã chọn (undefined khi xoá) — gọi kèm `onChange`. */
  onSelectOption?: (option: O | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** id của ô nhập (combobox) — để `<label htmlFor>` trỏ vào. */
  id?: string;
  /** `sm` cho ô trong bảng/lưới dày (h-8), mặc định h-9 như Input. */
  size?: "sm" | "default";
  /** Class cho khung ô (vd `h-10` cho khớp Input cùng hàng). */
  controlClassName?: string;
  /**
   * Chế độ tìm phía server (opt-in): khi truyền, component gọi `onSearch(query)`
   * (có debounce) khi mở menu / gõ từ khoá và hiển thị KẾT QUẢ trả về thay cho
   * lọc `options` phía client. Dùng cho danh mục lớn (vd sản phẩm) để tránh tải
   * toàn bộ về client.
   */
  onSearch?: (query: string) => Promise<O[]>;
  /** Nhãn hiển thị cho `value` khi option chưa nằm trong danh sách đã tải (async). */
  selectedLabel?: string;
  /** Debounce ms cho `onSearch` (mặc định 250). */
  debounceMs?: number;
  /** Hiện nút xoá lựa chọn → `onChange("")`. */
  clearable?: boolean;
  /**
   * Cho phép nhập giá trị ngoài danh sách: khi từ khoá không trùng option nào, menu
   * có thêm dòng "Thêm …" → `onChange(từ khoá)`. `value` ngoài danh sách vẫn hiển thị.
   */
  creatable?: boolean;
  formatCreateLabel?: (input: string) => string;
  /** Nội dung option trong menu (ô đã chọn vẫn hiện `label`). */
  renderOption?: (option: O) => React.ReactNode;
  /** Chữ khi không có kết quả; nhận từ khoá đang gõ. */
  emptyText?: (query: string) => string;
  /** Nhãn a11y cho ô chọn — cần khi không có `<label>` (vd mỗi dòng bảng). */
  "aria-label"?: string;
}

type Entry<O> = { kind: "option"; option: O; id: string } | { kind: "create"; id: string };

const defaultCreateLabel = (input: string) => `Thêm "${input}"`;
const defaultEmptyText = () => "Không có dữ liệu";

/**
 * Ô chọn một giá trị có tìm kiếm (combobox + listbox theo WAI-ARIA): gõ để lọc,
 * ↑/↓ chọn dòng, Enter xác nhận, Esc đóng. Menu render qua portal nên dùng được
 * trong Dialog/Sheet và ô bảng có `overflow`.
 */
export function SearchableSelect<O extends SearchableSelectOption = SearchableSelectOption>({
  options = [],
  value,
  onChange,
  onSelectOption,
  placeholder = "Chọn...",
  className,
  disabled,
  id,
  size = "default",
  controlClassName,
  onSearch,
  selectedLabel,
  debounceMs = 250,
  clearable,
  creatable,
  formatCreateLabel = defaultCreateLabel,
  renderOption,
  emptyText = defaultEmptyText,
  "aria-label": ariaLabel,
}: Props<O>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const controlRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const listboxRef = React.useRef<HTMLDivElement>(null);
  const baseId = React.useId();
  const listboxId = `${baseId}-listbox`;
  const menuStyle = useFloatingMenuStyle(open, controlRef, menuRef);

  // --- Chế độ async (chỉ khi có onSearch) ---
  const asyncMode = Boolean(onSearch);
  const [asyncOptions, setAsyncOptions] = React.useState<O[]>([]);
  const [loading, setLoading] = React.useState(false);
  // Lỗi tải (network/API) tách khỏi "không có kết quả" — hiển thị thông báo
  // lỗi thay vì "Không có dữ liệu" gây hiểu nhầm là danh mục rỗng.
  const [loadError, setLoadError] = React.useState(false);
  const reqIdRef = React.useRef(0);
  // Ghi nhớ option vừa chọn để nhãn ô không "nhảy" khi kết quả tìm sau đó
  // không còn chứa nó (menu đã fetch từ khoá khác).
  const [lastPicked, setLastPicked] = React.useState<O | null>(null);

  // Debounce từ khoá → onSearch. Chạy khi mở menu (kể cả từ khoá rỗng → nạp trang
  // đầu làm option mặc định) và mỗi lần đổi từ khoá. reqId chống race response cũ.
  React.useEffect(() => {
    if (!onSearch || !open) return;
    const reqId = ++reqIdRef.current;
    setLoading(true);
    // Từ khoá rỗng (vừa mở menu) nạp ngay — chỉ debounce khi đang gõ.
    const timer = setTimeout(
      () => {
        onSearch(search)
          .then((result) => {
            if (reqIdRef.current === reqId) {
              setAsyncOptions(result);
              setLoadError(false);
            }
          })
          .catch(() => {
            if (reqIdRef.current === reqId) {
              setAsyncOptions([]);
              setLoadError(true);
            }
          })
          .finally(() => {
            if (reqIdRef.current === reqId) setLoading(false);
          });
      },
      search === "" ? 0 : debounceMs,
    );
    return () => clearTimeout(timer);
  }, [onSearch, open, search, debounceMs]);

  const list = asyncMode ? asyncOptions : options;

  const selected: SearchableSelectOption | undefined =
    list.find((o) => o.value === value) ??
    (lastPicked?.value === value ? lastPicked : undefined) ??
    options.find((o) => o.value === value) ??
    (value && selectedLabel ? { value, label: selectedLabel } : undefined) ??
    (value && creatable ? { value, label: value } : undefined);

  const filtered = React.useMemo(() => {
    if (asyncMode) return asyncOptions; // server đã lọc sẵn
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [asyncMode, asyncOptions, options, search]);

  const createInput = search.trim();
  const canCreate =
    Boolean(creatable) &&
    createInput !== "" &&
    !list.some(
      (o) =>
        o.label.toLowerCase() === createInput.toLowerCase() ||
        o.value.toLowerCase() === createInput.toLowerCase(),
    );

  const sections = React.useMemo(() => groupByKey(filtered), [filtered]);
  // Thứ tự điều hướng bàn phím = thứ tự hiển thị (theo nhóm), dòng "Thêm" cuối cùng.
  const entries = React.useMemo<Entry<O>[]>(() => {
    const result: Entry<O>[] = [];
    sections.forEach((section) =>
      section.options.forEach((option) =>
        result.push({ kind: "option", option, id: `${baseId}-opt-${result.length}` }),
      ),
    );
    if (canCreate) result.push({ kind: "create", id: `${baseId}-create` });
    return result;
  }, [sections, canCreate, baseId]);

  const entryIndexByOption = React.useMemo(() => {
    const map = new Map<O, number>();
    entries.forEach((entry, index) => {
      if (entry.kind === "option") map.set(entry.option, index);
    });
    return map;
  }, [entries]);

  const showList = !(asyncMode && (loading || loadError));
  const activeEntry = open && showList ? entries[activeIndex] : undefined;

  React.useEffect(() => {
    if (open) scrollOptionIntoView(listboxRef.current, activeEntry?.id);
  }, [open, activeEntry?.id]);

  const openMenu = () => {
    // `:disabled` phủ cả trường hợp nằm trong `<fieldset disabled>` (prop vẫn false).
    if (disabled || inputRef.current?.matches(":disabled")) return;
    const selectedIdx = entries.findIndex((e) => e.kind === "option" && e.option.value === value);
    setActiveIndex(Math.max(0, selectedIdx));
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setSearch("");
  };

  const pick = (entry: Entry<O>) => {
    if (entry.kind === "create") {
      onChange?.(createInput);
      onSelectOption?.({ value: createInput, label: createInput } as O);
    } else {
      setLastPicked(entry.option);
      onChange?.(entry.option.value);
      onSelectOption?.(entry.option);
    }
    closeMenu();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          openMenu();
          return;
        }
        if (entries.length === 0) return;
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((i) => (i + step + entries.length) % entries.length);
        return;
      }
      case "Home":
      case "End":
        if (!open || entries.length === 0) return;
        event.preventDefault();
        setActiveIndex(event.key === "Home" ? 0 : entries.length - 1);
        return;
      case "Enter":
        if (!open) return;
        // Chặn submit form khi đang chọn trong menu.
        event.preventDefault();
        if (activeEntry) pick(activeEntry);
        return;
      case "Escape":
        if (!open) return;
        // Chỉ đóng menu — không để Dialog/Sheet bên dưới đóng theo.
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        return;
      case "Tab":
        if (open) closeMenu();
        return;
      default:
    }
  };

  const sizeClass = size === "sm" ? "h-8 pointer-coarse:h-10" : "h-9 pointer-coarse:h-11";

  return (
    <div className={cn("relative", className)}>
      <div
        ref={controlRef}
        aria-disabled={disabled || undefined}
        // Bấm vào vùng ô (ngoài input) cũng mở menu và giữ focus ở input.
        onMouseDown={(event) => {
          if (disabled) return;
          const onInput = event.target === inputRef.current;
          if (!onInput) event.preventDefault();
          inputRef.current?.focus();
          if (!open) openMenu();
          else if (!onInput) closeMenu();
        }}
        className={cn(
          "flex w-full items-center gap-1 rounded-lg border border-input bg-background pr-1.5 pl-3 text-sm",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          sizeClass,
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          controlClassName,
        )}
      >
        <div className="relative grid min-w-0 flex-1 items-center">
          {/* `truncate` + `min-w-0` là BẮT BUỘC, không phải chuyện thẩm mỹ: ô cao
              cố định nên nhãn dài (vd tên sản phẩm là cả đoạn mô tả kỹ thuật vài trăm
              ký tự) tràn hẳn ra NGOÀI ô, phủ lên các nút bên dưới và NUỐT click của
              chúng (ca thật: không bấm được "Thêm thành phần" ở dialog combo).
              `min-w-0` bắt buộc đi kèm: thiếu nó flex/grid item co theo nội dung và
              `truncate` vô hiệu. */}
          <span
            id={`${baseId}-value`}
            title={selected?.label}
            className={cn(
              "pointer-events-none col-start-1 row-start-1 min-w-0 truncate",
              !selected && "text-muted-foreground",
              // Đang gõ: ẩn nhãn nhưng giữ node (tên a11y qua aria-labelledby).
              search !== "" && "invisible",
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-label={ariaLabel}
            // Không có aria-label/label (id): tên = nhãn đang hiện hoặc placeholder.
            aria-labelledby={ariaLabel || id ? undefined : `${baseId}-value`}
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={activeEntry?.id}
            // Giá trị đang chọn (span hiển thị) cho trình đọc màn hình.
            aria-describedby={(ariaLabel || id) && selected ? `${baseId}-value` : undefined}
            autoComplete="off"
            disabled={disabled}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveIndex(0);
              if (!open) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onBlur={closeMenu}
            className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none disabled:cursor-not-allowed"
          />
        </div>
        {clearable && selected && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Xoá lựa chọn"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={() => {
              setLastPicked(null);
              onChange?.("");
              onSelectOption?.(undefined);
              closeMenu();
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
        <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </div>
      {open &&
        !disabled &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle ?? { position: "fixed", visibility: "hidden" }}
            // Giữ focus ở input khi bấm vào menu (không blur → không đóng trước khi chọn).
            onMouseDown={(event) => event.preventDefault()}
            className="z-60 min-w-48 rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
          >
            <div
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              className="max-h-60 overflow-auto py-1"
            >
              {asyncMode && loading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Đang tìm...
                </div>
              ) : asyncMode && loadError ? (
                <div className="px-3 py-2 text-sm text-destructive">
                  Không tải được dữ liệu. Gõ lại từ khoá để thử lại.
                </div>
              ) : entries.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">{emptyText(search)}</div>
              ) : (
                <>
                  {sections.map((section, sectionIdx) => {
                    const items = section.options.map((option) => {
                      const index = entryIndexByOption.get(option) ?? 0;
                      const entry = entries[index];
                      return (
                        <div
                          key={option.value}
                          id={entry.id}
                          role="option"
                          aria-selected={option.value === value}
                          title={option.label}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => pick(entry)}
                          className={cn(
                            "cursor-pointer truncate px-3 py-2 text-sm",
                            index === activeIndex && "bg-accent text-accent-foreground",
                            option.value === value && "font-medium",
                          )}
                        >
                          {renderOption ? renderOption(option) : option.label}
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
                  })}
                  {canCreate && (
                    <div
                      id={`${baseId}-create`}
                      role="option"
                      aria-selected={false}
                      onMouseEnter={() => setActiveIndex(entries.length - 1)}
                      onClick={() => pick({ kind: "create", id: `${baseId}-create` })}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                        activeIndex === entries.length - 1 && "bg-accent text-accent-foreground",
                      )}
                    >
                      <Plus className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{formatCreateLabel(createInput)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
