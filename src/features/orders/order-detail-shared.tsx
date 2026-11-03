import {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type OrderRow } from "@/features/orders/order-types";
import { datetimeLocalToIso, isoToDatetimeLocal } from "@/lib/datetime-local";
import { getKiotVietLocationData } from "@/lib/api/orders";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { swallowError } from "@/lib/errors";

// ─────────────────────────────────────────────────────────────
// Address cascade dropdown
// ─────────────────────────────────────────────────────────────

interface AddressFieldsProps {
  order: OrderRow;
  onSave: (payload: Partial<OrderRow>) => void;
  stacked?: boolean;
}

// Shared KiotViet location data cache
let _kvLocationDataCache: Record<string, string[]> | null = null;
let _kvLocationDataPromise: Promise<Record<string, string[]>> | null = null;

function loadKvLocationData(): Promise<Record<string, string[]>> {
  if (_kvLocationDataCache) return Promise.resolve(_kvLocationDataCache);
  if (_kvLocationDataPromise) return _kvLocationDataPromise;
  _kvLocationDataPromise = (async () => {
    try {
      _kvLocationDataCache = await getKiotVietLocationData();
      return _kvLocationDataCache;
    } catch (err) {
      /* ignore */
      swallowError(err, "orders.kiotvietLocationData");
    }
    return {};
  })();
  return _kvLocationDataPromise;
}

export function AddressFields({ order, onSave, stacked }: AddressFieldsProps) {
  const [kvData, setKvData] = useState<Record<string, string[]>>(_kvLocationDataCache ?? {});
  const [location, setLocation] = useState(order.kiotviet_location ?? "");
  const [ward, setWard] = useState(order.kiotviet_ward ?? "");

  useEffect(() => {
    loadKvLocationData().then(setKvData);
  }, []);

  useEffect(() => {
    setLocation(order.kiotviet_location ?? "");
    setWard(order.kiotviet_ward ?? "");
  }, [order.kiotviet_location, order.kiotviet_ward]);

  const locationOptions = useMemo(() => {
    return Object.keys(kvData).map((loc) => ({ value: loc, label: loc }));
  }, [kvData]);

  const wardOptions = useMemo(() => {
    if (!location) return [];
    const wards = kvData[location] ?? [];
    return wards.map((w: string) => ({ value: w, label: w }));
  }, [kvData, location]);

  const handleLocationChange = useCallback(
    (v: string) => {
      setLocation(v);
      setWard("");
      onSave({ kiotviet_location: v, kiotviet_ward: "" });
    },
    [onSave],
  );

  const handleWardChange = useCallback(
    (v: string) => {
      setWard(v);
      onSave({ kiotviet_ward: v });
    },
    [onSave],
  );

  const renderDropdown = (
    label: string,
    value: string,
    options: Array<{ value: string; label: string }>,
    onChange: (value: string) => void,
    disabled?: boolean,
  ) => {
    if (stacked) {
      return (
        <div className="flex flex-col gap-1 py-2 border-b border-white/5 last:border-0 min-h-[50px] justify-center">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className="min-w-0 w-full">
            <SearchableSelect
              size="sm"
              creatable
              clearable
              aria-label={label}
              options={options}
              value={value}
              onChange={onChange}
              disabled={disabled}
              placeholder="—"
            />
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 py-2 border-b border-border/40 min-h-[42px] last:border-0">
        <span className="w-[155px] shrink-0 text-sm text-muted-foreground">{label}</span>
        <div className="flex-1 min-w-0">
          <SearchableSelect
            size="sm"
            creatable
            clearable
            aria-label={label}
            options={options}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder="—"
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {stacked ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 py-2 border-b border-white/5 last:border-0 w-full">
          <div className="flex flex-col gap-1 sm:col-span-6">
            <span className="text-xs text-muted-foreground">Khu vực</span>
            <SearchableSelect
              size="sm"
              creatable
              clearable
              aria-label="Khu vực"
              options={locationOptions}
              value={location}
              onChange={handleLocationChange}
              placeholder="—"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-6">
            <span className="text-xs text-muted-foreground">Phường/Xã</span>
            <SearchableSelect
              size="sm"
              creatable
              clearable
              aria-label="Phường/Xã"
              options={wardOptions}
              value={ward}
              onChange={handleWardChange}
              disabled={!location}
              placeholder="—"
            />
          </div>
        </div>
      ) : (
        <>
          {renderDropdown("Khu vực", location, locationOptions, handleLocationChange)}
          {renderDropdown("Phường/Xã", ward, wardOptions, handleWardChange, !location)}
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Inline editable cell
// ─────────────────────────────────────────────────────────────

export type EditType = "text" | "number" | "select" | "toggle" | "datetime" | "date";

// `<input type="datetime-local">` works in local time without a TZ suffix. We
// convert the stored ISO (UTC or +07:00) to the user's local clock for editing
// and back to ISO on save so the backend keeps storing UTC.

interface EditableCellProps {
  rawValue: string | number | boolean | null | undefined;
  display?: ReactNode; // custom display when not editing
  type?: EditType;
  options?: { label: string; value: string }[];
  onSave: (v: string | boolean) => void;
  placeholder?: string;
  multiline?: boolean;
  immediate?: boolean; // if false, use onChange instead of auto-saving
  onChange?: (v: string | boolean) => void; // called when value changes (not saved yet)
  toggleLabels?: { on: string; off: string }; // nhãn cho type="toggle"
  /**
   * Chỉ đọc: render giá trị trần, KHÔNG mở được ô nhập. `fieldset disabled` của cha
   * không chặn được ô này vì phần lớn kiểu render bằng `<span role="button">`.
   */
  disabled?: boolean;
  /** Tooltip giải thích vì sao ô bị khoá (hiện khi `disabled`). */
  disabledHint?: string;
}

/** Giá trị hiển thị khi ô chỉ đọc — mỗi `EditType` có cách hiển thị riêng. */
function readOnlyContent({
  rawValue,
  display,
  type,
  options,
  placeholder,
  toggleLabels,
}: Pick<EditableCellProps, "rawValue" | "display" | "options"> & {
  type: EditType;
  placeholder: string;
  toggleLabels: { on: string; off: string };
}): ReactNode {
  if (display !== undefined && display !== null) return display;
  if (type === "toggle") return rawValue ? toggleLabels.on : toggleLabels.off;
  if (type === "select") {
    const matched = options?.find((option) => String(option.value) === String(rawValue ?? ""));
    return matched?.label || placeholder;
  }
  const text = type === "date" ? String(rawValue ?? "").slice(0, 10) : String(rawValue ?? "");
  return text.trim() || placeholder;
}

function EditableCell({
  rawValue,
  display,
  type = "text",
  options,
  onSave,
  placeholder = "—",
  multiline,
  immediate = true,
  onChange,
  toggleLabels = { on: "Đã ứng", off: "Chưa ứng" },
  disabled,
  disabledHint,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const saveRef = useRef(false);
  const [localValue, setLocalValue] = useState<string | boolean | null>(null);

  // For non-immediate mode: check if there's a pending local change
  const currentValue = !immediate && localValue !== null ? localValue : rawValue;
  const hasPendingChange = !immediate && localValue !== null && localValue !== rawValue;

  // Chỉ đọc: chặn TRƯỚC mọi nhánh render để không nhánh nào lọt cửa mở input.
  if (disabled) {
    return (
      <span
        title={disabledHint}
        className="cursor-not-allowed px-1 -mx-1 text-sm text-muted-foreground"
      >
        {readOnlyContent({ rawValue, display, type, options, placeholder, toggleLabels })}
      </span>
    );
  }

  // Toggle — render inline button, no edit mode needed
  if (type === "toggle") {
    const on = Boolean(currentValue);
    const handleClick = () => {
      const newValue = !on;
      if (immediate) {
        onSave(newValue);
      } else {
        setLocalValue(newValue);
        onChange?.(newValue);
      }
    };
    return (
      <button
        type="button"
        onClick={handleClick}
        className={[
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors cursor-pointer",
          on
            ? "bg-action-success/10 text-action-success border-action-success/30 hover:bg-action-success/15"
            : "bg-muted text-muted-foreground border-border hover:bg-accent",
          hasPendingChange ? "ring-2 ring-action-warning/70" : "",
        ].join(" ")}
      >
        {on ? toggleLabels.on : toggleLabels.off}
      </button>
    );
  }

  // Select — display read-only content when provided, then edit inline on click.
  if (type === "select" && options) {
    const strVal = String(currentValue ?? "");
    const beginSelectEdit = () => {
      setEditing(true);
      saveRef.current = false;
    };
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newValue = e.target.value;
      setEditing(false);
      if (immediate) {
        onSave(newValue);
      } else {
        setLocalValue(newValue);
        onChange?.(newValue);
      }
    };
    if (display && !editing) {
      return (
        <span
          role="button"
          tabIndex={0}
          onClick={beginSelectEdit}
          onKeyDown={(e) => e.key === "Enter" && beginSelectEdit()}
          title="Nhấn để chỉnh sửa"
          className={[
            "inline-flex cursor-pointer rounded px-1 -mx-1 hover:bg-accent/50 focus:outline-hidden focus:ring-1 focus:ring-primary/40 transition-colors",
            hasPendingChange ? "ring-2 ring-action-warning/70 ring-offset-1" : "",
          ].join(" ")}
        >
          {isValidElement(display) ? (
            display
          ) : (
            <span className="text-sm font-medium text-foreground">{display}</span>
          )}
        </span>
      );
    }
    return (
      <select
        autoFocus={!!display}
        value={strVal}
        onChange={handleChange}
        onBlur={() => {
          if (display) setEditing(false);
        }}
        className={[
          "w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer",
          hasPendingChange ? "ring-2 ring-action-warning/70" : "",
        ].join(" ")}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  // Datetime — uses native datetime-local input. We round-trip via ISO so the
  // backend keeps a single canonical timestamp format.
  if (type === "datetime") {
    const localStr = isoToDatetimeLocal(currentValue);
    if (editing) {
      const commit = () => {
        if (saveRef.current) return;
        saveRef.current = true;
        setEditing(false);
        const iso = datetimeLocalToIso(draft);
        if (!iso) return;
        if (iso === String(rawValue ?? "")) return;
        if (immediate) onSave(iso);
        else {
          setLocalValue(iso);
          onChange?.(iso);
        }
      };
      return (
        <input
          autoFocus
          type="datetime-local"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              setEditing(false);
            }
          }}
          className="w-full rounded-md border border-primary bg-background px-2 py-0.5 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      );
    }
    const beginDatetimeEdit = () => {
      setDraft(localStr);
      setEditing(true);
      saveRef.current = false;
    };
    const shownDatetime =
      display ??
      (currentValue ? (
        <span className="text-sm font-medium text-foreground">{String(rawValue)}</span>
      ) : (
        <span className="text-muted-foreground/30">{placeholder}</span>
      ));
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={beginDatetimeEdit}
        onKeyDown={(e) => e.key === "Enter" && beginDatetimeEdit()}
        title="Nhấn để chỉnh sửa"
        className={[
          "cursor-text rounded px-1 -mx-1 hover:bg-accent/50 focus:outline-hidden focus:ring-1 focus:ring-primary/40 transition-colors",
          hasPendingChange ? "ring-2 ring-action-warning/70 ring-offset-1" : "",
        ].join(" ")}
      >
        {isValidElement(shownDatetime) ? (
          shownDatetime
        ) : (
          <span className="text-sm font-medium text-foreground">{shownDatetime}</span>
        )}
      </span>
    );
  }

  // Date — native date input, value dạng YYYY-MM-DD (không kèm giờ/TZ).
  if (type === "date") {
    const dateStr = currentValue ? String(currentValue).slice(0, 10) : "";
    if (editing) {
      const commit = () => {
        if (saveRef.current) return;
        saveRef.current = true;
        setEditing(false);
        const next = draft.trim();
        if (next === dateStr) return;
        if (immediate) onSave(next);
        else {
          setLocalValue(next);
          onChange?.(next);
        }
      };
      return (
        <input
          autoFocus
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full rounded-md border border-primary bg-background px-2 py-0.5 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      );
    }
    const beginDateEdit = () => {
      setDraft(dateStr);
      setEditing(true);
      saveRef.current = false;
    };
    const shownDate =
      display ??
      (dateStr ? (
        <span className="text-sm font-medium text-foreground">{dateStr}</span>
      ) : (
        <span className="text-muted-foreground/30">{placeholder}</span>
      ));
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={beginDateEdit}
        onKeyDown={(e) => e.key === "Enter" && beginDateEdit()}
        title="Nhấn để chỉnh sửa"
        className={[
          "cursor-text rounded px-1 -mx-1 hover:bg-accent/50 focus:outline-hidden focus:ring-1 focus:ring-primary/40 transition-colors",
          hasPendingChange ? "ring-2 ring-action-warning/70 ring-offset-1" : "",
        ].join(" ")}
      >
        {isValidElement(shownDate) ? (
          shownDate
        ) : (
          <span className="text-sm font-medium text-foreground">{shownDate}</span>
        )}
      </span>
    );
  }

  // Text / Number
  function beginEdit() {
    setDraft(String(localValue !== null ? localValue : (rawValue ?? "")));
    setEditing(true);
    saveRef.current = false;
  }

  function commitSave() {
    if (saveRef.current) return;
    saveRef.current = true;
    setEditing(false);
    const trimmed = draft.trim();
    const originalValue = localValue !== null ? String(localValue) : String(rawValue ?? "");
    if (trimmed !== originalValue.trim()) {
      if (immediate) {
        onSave(trimmed);
      } else {
        setLocalValue(trimmed);
        onChange?.(trimmed);
      }
    }
  }

  if (editing) {
    const cls =
      "w-full rounded-md border border-primary bg-background px-2 py-0.5 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary";
    const onKD = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        commitSave();
      }
      if (e.key === "Escape") {
        setEditing(false);
      }
    };
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitSave}
          onKeyDown={onKD}
          className={cls}
        />
      );
    }
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitSave}
        onKeyDown={onKD}
        className={cls}
      />
    );
  }

  const shown =
    display ??
    (currentValue !== null && currentValue !== undefined && currentValue !== "" ? (
      String(rawValue)
    ) : (
      <span className="text-muted-foreground/30">{placeholder}</span>
    ));

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={beginEdit}
      onKeyDown={(e) => e.key === "Enter" && beginEdit()}
      title="Nhấn để chỉnh sửa"
      className={[
        "cursor-text rounded px-1 -mx-1 hover:bg-accent/50 focus:outline-hidden focus:ring-1 focus:ring-primary/40 transition-colors",
        hasPendingChange ? "ring-2 ring-action-warning/70 ring-offset-1" : "",
      ].join(" ")}
    >
      {isValidElement(shown) ? (
        shown
      ) : (
        <span className="text-sm font-medium text-foreground">{shown}</span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Row components
// ─────────────────────────────────────────────────────────────

export function InfoRow({
  label,
  value,
  stacked,
}: {
  label: string;
  value?: string | number | boolean | null | ReactNode;
  stacked?: boolean;
}) {
  const content = isValidElement(value) ? (
    value
  ) : value !== null && value !== undefined && value !== "" ? (
    String(value)
  ) : (
    <span className="text-muted-foreground/30">—</span>
  );
  if (stacked) {
    return (
      <div className="flex flex-col gap-1 py-2 border-b border-border/40 last:border-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="min-w-0 text-sm font-medium text-foreground wrap-break-word">
          {content}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <span className="w-[155px] shrink-0 text-sm text-muted-foreground pt-0.5">{label}</span>
      <span className="flex-1 min-w-0 text-sm font-medium text-foreground wrap-break-word">
        {content}
      </span>
    </div>
  );
}

export function ERow({
  label,
  labelAdornment,
  rawValue,
  display,
  type = "text",
  options,
  onSave,
  multiline,
  stacked,
  onChange,
  toggleLabels,
  disabled,
  disabledHint,
}: {
  label: string;
  // Nội dung nhỏ chèn ngay sau label (vd: badge "AI điền từ transcript").
  // Optional nên các call site cũ không cần đổi gì.
  labelAdornment?: ReactNode;
  rawValue?: string | number | boolean | null;
  display?: ReactNode;
  type?: EditType;
  options?: { label: string; value: string }[];
  onSave: (v: string | boolean) => void;
  multiline?: boolean;
  stacked?: boolean;
  immediate?: boolean;
  onChange?: (v: string | boolean) => void;
  toggleLabels?: { on: string; off: string };
  /** Ô chỉ đọc (vd đơn đã có mã vận đơn khoá nhóm field nội dung). */
  disabled?: boolean;
  disabledHint?: string;
}) {
  if (stacked) {
    return (
      <div className="flex flex-col gap-1 py-2 border-b border-border/40 last:border-0 min-h-[50px] justify-center">
        <span className="text-xs text-muted-foreground">
          {label}
          {labelAdornment}
        </span>
        <div className="min-w-0 w-full flex-1">
          <EditableCell
            rawValue={rawValue}
            display={display}
            type={type}
            options={options}
            onSave={onSave}
            multiline={multiline}
            onChange={onChange}
            toggleLabels={toggleLabels}
            disabled={disabled}
            disabledHint={disabledHint}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0 min-h-[42px]">
      <span className="w-[155px] shrink-0 text-sm text-muted-foreground">
        {label}
        {labelAdornment}
      </span>
      <div className="flex-1 min-w-0 w-full">
        <EditableCell
          rawValue={rawValue}
          display={display}
          type={type}
          options={options}
          onSave={onSave}
          multiline={multiline}
          onChange={onChange}
          disabled={disabled}
          disabledHint={disabledHint}
        />
      </div>
    </div>
  );
}

/**
 * `card` — khung độc lập (mặc định, dùng ở mọi nơi đang có sẵn).
 * `plain` — bỏ khung để nhiều mục nằm chung một khung cha (khối tab cuối trang
 * chi tiết đơn): chỉ còn heading + nội dung, không border/bg/padding ngang.
 */
export type SectionVariant = "card" | "plain";

export function SectionCard({
  icon,
  title,
  children,
  className,
  variant = "card",
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
  variant?: SectionVariant;
}) {
  const isPlain = variant === "plain";
  return (
    <div
      className={[
        "flex flex-col",
        isPlain ? "" : "rounded-xl border border-border bg-card shadow-xs",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={
          isPlain
            ? "flex items-center gap-2 pb-2"
            : "flex items-center gap-2 border-b border-border px-4 py-3"
        }
      >
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">{title}</h3>
      </div>
      <div className={isPlain ? "min-h-0 flex-1" : "min-h-0 flex-1 px-4 py-3"}>{children}</div>
    </div>
  );
}
