import { formatCurrency as formatCurrencyShared, formatDateVi, formatNumber } from "@/lib/format";

import { ResaleTrackingRow } from "@/lib/api/customers";

export const MAX_PAGE_SIZE = 100;
export const ALL = "__all__";
export const CONTACT_STATUS = {
  all: ALL,
  none: "none",
  contacted: "contacted",
  completed: "completed",
} as const;

export const CONTACT_CHANNELS = ["Gọi điện", "Zalo", "SMS", "Facebook"];
export const CUSTOMER_STATUSES = [
  "Quan tâm mua thêm",
  "Cần tư vấn thêm",
  "Hẹn gọi lại",
  "Chưa có nhu cầu",
  "Không nghe máy",
];
export const APPOINTMENT_PURPOSES = [
  "Hỏi thăm cảm nhận SP",
  "Tư vấn upsell",
  "Chốt đơn resale",
  "Xử lý phản hồi",
];

export function clampPageSize(value: number): number {
  return Number.isFinite(value) && value > 0
    ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.trunc(value)))
    : 50;
}

// Mỏng có chủ đích: chốt fallback "-" cho toàn trang resale, phần còn lại
// tái dùng formatCurrency dùng chung ở @/lib/format.
export function formatCurrency(value: string): string {
  return formatCurrencyShared(value, { fallback: "-" });
}

export function formatShortCurrency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}tr`;
  return formatNumber(value);
}

export function formatDate(value: string | null): string {
  return formatDateVi(value, { fallback: "-" });
}

export function toDateTimeLocalValue(value?: string | null): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function contactCount(row: ResaleTrackingRow): number {
  return [row.contact_1_at, row.contact_2_at, row.contact_3_at].filter(Boolean).length;
}

export function nextContactNo(row: ResaleTrackingRow): 1 | 2 | 3 | null {
  if (!row.contact_1_at) return 1;
  if (!row.contact_2_at) return 2;
  if (!row.contact_3_at) return 3;
  return null;
}

export function segmentBadgeClass(code: string): string {
  if (code === "S3") return "border-transparent bg-teal-50 text-teal-700";
  if (code === "S4") return "border-transparent bg-amber-50 text-amber-800";
  if (code === "S2") return "border-transparent bg-blue-50 text-blue-700";
  if (code === "S5") return "border-transparent bg-red-50 text-red-700";
  if (code === "S6") return "border-transparent bg-violet-50 text-violet-700";
  return "border-transparent bg-muted text-muted-foreground";
}

export function daysChipClass(days: number | null): string {
  if (days == null) return "bg-muted text-muted-foreground";
  if (days > 180) return "bg-red-50 text-red-700";
  if (days > 60) return "bg-amber-50 text-amber-800";
  return "bg-teal-50 text-teal-700";
}

export function saleInitial(name: string): string {
  const source = name.trim();
  if (!source) return "?";
  return source.slice(0, 1).toUpperCase();
}

export function contactStatusLabel(value: string): string {
  if (value === CONTACT_STATUS.none) return "Chưa liên hệ";
  if (value === CONTACT_STATUS.contacted) return "Đã liên hệ";
  if (value === CONTACT_STATUS.completed) return "Đủ 3 lần";
  return "Tất cả trạng thái";
}

export function daysFilterLabel(value: string): string {
  if (value === "30") return "Quá 30 ngày";
  if (value === "60") return "Quá 60 ngày";
  if (value === "180") return "Ngủ đông +180 ngày";
  return "Tất cả";
}
