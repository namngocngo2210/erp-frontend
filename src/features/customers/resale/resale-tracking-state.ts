import type { ResaleTrackingRow } from "@/lib/api/customers";
import type { ResaleTrackingParams } from "@/features/customers/queries";
import { ALL, clampPageSize, contactCount, toDateTimeLocalValue } from "../resale-format";

export type ResaleListFilters = {
  query: string;
  sale: string;
  segment: string;
  status: string;
  days: string;
  dateFrom: string;
  dateTo: string;
};

export type ResaleContactForm = { channel: string; result: string; customer_status: string };
export type ResaleAppointmentForm = {
  appointment_at: string;
  channel: string;
  purpose: string;
  note: string;
};
export type ResaleOrderForm = {
  product: string;
  quantity: number;
  order_value: string;
  channel: string;
  note: string;
};

export const EMPTY_CONTACT_FORM: ResaleContactForm = {
  channel: "Gọi điện",
  result: "",
  customer_status: "Quan tâm mua thêm",
};

export const EMPTY_APPOINTMENT_FORM: ResaleAppointmentForm = {
  appointment_at: "",
  channel: "Gọi điện",
  purpose: "Hỏi thăm cảm nhận SP",
  note: "",
};

export const EMPTY_RESALE_FORM: ResaleOrderForm = {
  product: "",
  quantity: 1,
  order_value: "",
  channel: "Gọi điện",
  note: "",
};

/** Bộ lọc UI (giá trị ALL = không lọc) → params gửi backend. */
export function buildResaleListParams(
  filters: ResaleListFilters,
  currentPage: number,
  pageSize: number,
): ResaleTrackingParams {
  const safePageSize = clampPageSize(pageSize);
  return {
    query: filters.query,
    limit: safePageSize,
    offset: Math.max(0, (currentPage - 1) * safePageSize),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sale: filters.sale === ALL ? null : Number(filters.sale),
    contactStatus: filters.status === ALL ? "" : filters.status,
    segment: filters.segment === ALL ? "" : filters.segment,
    minDays: filters.days === ALL ? null : Number(filters.days),
  };
}

/** KPI trên các dòng của trang hiện tại (backend đã lọc sẵn). */
export function computeResaleKpis(rows: ResaleTrackingRow[]) {
  const needContact = rows.filter((row) => contactCount(row) === 0).length;
  const contacted = rows.filter((row) => contactCount(row) > 0).length;
  const revenue = rows.reduce((sum, row) => sum + (Number(row.order_value) || 0), 0);
  return { needContact, contacted, revenue };
}

export function appointmentFormFromRow(row: ResaleTrackingRow): ResaleAppointmentForm {
  return {
    appointment_at: row.appointment?.appointment_at
      ? toDateTimeLocalValue(row.appointment.appointment_at)
      : "",
    channel: row.appointment?.channel || "Gọi điện",
    purpose: row.appointment?.purpose || "Hỏi thăm cảm nhận SP",
    note: row.appointment?.note || "",
  };
}

export function resaleFormFromRow(row: ResaleTrackingRow): ResaleOrderForm {
  return { ...EMPTY_RESALE_FORM, product: row.products[0] || "" };
}
