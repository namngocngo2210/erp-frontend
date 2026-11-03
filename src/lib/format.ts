/**
 * Centralised number / currency / date formatting.
 *
 * Replaces the ~9 ad-hoc `formatCurrency` / `formatMoney` / `fmt` helpers that
 * were copy-pasted across pages and components. Each old variant differed only
 * in three knobs — empty fallback, output style, and locale — all expressed
 * here as options so behaviour is preserved at every call site.
 *
 * Note: blank/non-numeric input renders as `fallback` (default "-"), which is
 * the intended display for a missing monetary value (showing "0₫" for an empty
 * field is misleading).
 */

export type CurrencyStyle = "plain" | "suffix" | "symbol" | "vnd";

export interface FormatCurrencyOptions {
  /** Returned when the value is null/undefined/blank. Default "-". */
  fallback?: string;
  /**
   * - `plain`  → grouped number, no symbol (e.g. "1.234")
   * - `suffix` → grouped number + "đ" (e.g. "1.234đ")
   * - `symbol` → grouped number + " ₫" với dấu cách thường (e.g. "1.234 ₫") —
   *              khác `vnd` ở chỗ Intl chèn NBSP; giữ cho các màn bảo hành cũ
   * - `vnd`    → Intl currency style (e.g. "1.234 ₫")
   */
  style?: CurrencyStyle;
  /** Intl locale. Default "vi-VN". */
  locale?: string;
  /** Cap on fraction digits (e.g. 0 for whole VND). Default: locale default. */
  maximumFractionDigits?: number;
  /**
   * What to return when the value is present but not a finite number.
   * - `fallback` → the `fallback` string (default)
   * - `raw`      → the original value coerced to string
   */
  onInvalid?: "fallback" | "raw";
}

function parseNumeric(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return NaN;
  const cleaned = String(value).replace(/,/g, "").trim();
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

export type FormatNumberOptions = Intl.NumberFormatOptions & { locale?: string };

/**
 * Số nguyên/thập phân theo locale (mặc định vi-VN: "1.234,5"). Thay cho mọi
 * `n.toLocaleString("vi-VN")` inline (audit 2026-09-23 P2-2 — lint cấm ngoài lib/).
 * Giá trị không phải số → "" (không in "NaN").
 */
export function formatNumber(
  value: string | number | null | undefined,
  options: FormatNumberOptions = {},
): string {
  const { locale = "vi-VN", ...intl } = options;
  const num = parseNumeric(value);
  if (!Number.isFinite(num)) return "";
  return Object.keys(intl).length > 0
    ? num.toLocaleString(locale, intl)
    : num.toLocaleString(locale);
}

export function formatCurrency(
  value: string | number | null | undefined,
  options: FormatCurrencyOptions = {},
): string {
  const {
    fallback = "-",
    style = "plain",
    locale = "vi-VN",
    maximumFractionDigits,
    onInvalid = "fallback",
  } = options;

  if (value === null || value === undefined || value === "") return fallback;

  const num = parseNumeric(value);
  if (!Number.isFinite(num)) {
    return onInvalid === "raw" ? String(value) : fallback;
  }

  switch (style) {
    case "suffix":
      return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(num) + "đ";
    case "symbol":
      return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(num) + " ₫";
    case "vnd":
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(num);
    case "plain":
    default:
      return maximumFractionDigits === undefined
        ? num.toLocaleString(locale)
        : num.toLocaleString(locale, { maximumFractionDigits });
  }
}

export { formatDateTime } from "./utils";

// ─── Ngày giờ ────────────────────────────────────────────────────────────────
// Ba kiểu hiển thị đang dùng trong app, gom về đây để lint cấm gọi
// `toLocaleString("vi-VN")` rải rác (audit 2026-09-23 P2-2). Mỗi hàm giữ đúng
// output cũ của call site: `fallback` cho rỗng, `onInvalid` cho chuỗi không parse được.

export interface FormatDateOptions {
  /** Trả về khi giá trị rỗng (null/undefined/""). Mặc định "—". */
  fallback?: string;
  /** Chuỗi không parse được: trả `fallback` (mặc định) hay trả nguyên chuỗi gốc. */
  onInvalid?: "fallback" | "raw";
}

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveDate(
  value: DateInput,
  options: FormatDateOptions,
): { date: Date } | { text: string } {
  const { fallback = "—", onInvalid = "fallback" } = options;
  if (value === null || value === undefined || value === "") return { text: fallback };
  const date = toDate(value);
  if (date) return { date };
  return { text: onInvalid === "raw" ? String(value) : fallback };
}

/** `toLocaleString("vi-VN")` mặc định: "14:05:09 23/9/2026". */
export function formatDateTimeVi(value: DateInput, options: FormatDateOptions = {}): string {
  const r = resolveDate(value, options);
  return "date" in r ? r.date.toLocaleString("vi-VN") : r.text;
}

/** `toLocaleTimeString("vi-VN", { hour, minute })`: "14:05". */
export function formatTimeVi(value: DateInput, options: FormatDateOptions = {}): string {
  const r = resolveDate(value, options);
  return "date" in r
    ? r.date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : r.text;
}

/** `toLocaleDateString("vi-VN")`: "23/9/2026". */
export function formatDateVi(value: DateInput, options: FormatDateOptions = {}): string {
  const r = resolveDate(value, options);
  return "date" in r ? r.date.toLocaleDateString("vi-VN") : r.text;
}

/**
 * Định dạng theo mẫu cố định, giờ máy người dùng. Token: yyyy MM dd HH mm ss.
 * Ví dụ "dd/MM/yyyy HH:mm:ss", "HH:mm dd/MM/yyyy", "yyyy-MM-dd".
 */
export function formatDatePattern(
  value: DateInput,
  pattern: string,
  options: FormatDateOptions = {},
): string {
  const r = resolveDate(value, options);
  if ("text" in r) return r.text;
  const d = r.date;
  const pad = (n: number) => String(n).padStart(2, "0");
  const tokens: Record<string, string> = {
    yyyy: String(d.getFullYear()),
    MM: pad(d.getMonth() + 1),
    dd: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
  };
  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, (token) => tokens[token]);
}
