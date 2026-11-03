/**
 * Pure formatting/parsing helpers dùng chung cho trang chi tiết đơn.
 * Tách khỏi order-detail-shared.tsx (file component) để file đó chỉ export
 * component — điều kiện để React Fast Refresh hoạt động.
 */
import { formatCurrency, formatDateTime } from "@/lib/format";

export function fmt(value: string | number | null | undefined): string {
  return formatCurrency(value, { fallback: "—", style: "vnd", onInvalid: "raw" });
}

export function normalizeNumericInput(val: string) {
  return val.replace(/\D/g, "");
}

export function parseAmount(val: unknown) {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return Number(String(val).replace(/,/g, ""));
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return formatDateTime(d);
}
