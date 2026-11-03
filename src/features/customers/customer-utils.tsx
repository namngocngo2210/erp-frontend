import React from "react";

import { formatCurrency as formatCurrencyShared, formatDateVi } from "@/lib/format";
import type { CustomerProfile } from "@/lib/api/customers";
import type { OrderRow } from "@/features/orders/order-types";

import { CUSTOMERS_MAX_PAGE_SIZE, type GenderOption } from "./customer-types";

export function clampCustomersPageSize(value: number): number {
  return Number.isFinite(value) && value > 0
    ? Math.max(1, Math.min(CUSTOMERS_MAX_PAGE_SIZE, Math.trunc(value)))
    : CUSTOMERS_MAX_PAGE_SIZE;
}

export function toGenderOption(gender: number | null | undefined): GenderOption {
  if (gender === 0) return "female";
  if (gender === 1) return "male";
  return "none";
}

export function toGenderNumber(option: GenderOption): number | null {
  if (option === "female") return 0;
  if (option === "male") return 1;
  return null;
}

export function formatDate(value: string | null): string {
  return formatDateVi(value, { fallback: "-" });
}

export function formatCurrency(value: string | null): string {
  return formatCurrencyShared(value, { fallback: "-" });
}

/** Hiển thị nhãn (ưu tiên label, fallback code, rồi dấu gạch). */
export function labelOrDash(
  label: string | null | undefined,
  code?: string | null,
): React.ReactNode {
  const text = label || code;
  return text ? text : <span className="text-muted-foreground">-</span>;
}

/**
 * Chuyển một đơn hàng về đúng shape CustomerProfile để tái dùng renderGroupCells,
 * giúp hàng đơn trong dropdown khớp y hệt lưới cột của hàng khách hàng.
 * Các nhóm thuần aggregate (first_purchase_at, total_orders, segment...) để trống.
 */
export function orderToProfileRow(order: OrderRow): CustomerProfile {
  const crm = order.crm ?? {};
  const needsItems = (crm.needs ?? []).map((n) => ({
    group_code: n.group_code,
    group_name: n.group_name ?? "",
    type_code: n.type_code,
    type_name: n.type_name ?? "",
  }));
  return {
    identity: {
      id: order.id,
      code: order.shipping_code || `#${order.id}`,
      full_name: "",
      phone: order.phone || order.customer_phone || "",
    },
    demographics: {
      gender: order.customer_gender ?? null,
      gender_label:
        order.customer_gender == null ? null : order.customer_gender === 1 ? "Nam" : "Nữ",
      province: order.province || "",
      address: order.address || "",
      age_text: crm.age_text || "",
      age_group_label: crm.age_text_label ?? null,
      occupation_code: crm.occupation_code ?? null,
      occupation_label: crm.occupation_label ?? null,
    },
    channel: { channel_id: null, channel_name: order.channel_name || "" },
    segment: { segment_code: "", segment_name: "" },
    needs: {
      need_group_code: needsItems[0]?.group_code ?? "",
      need_group_name: needsItems[0]?.group_name ?? "",
      items: needsItems,
    },
    purchase: {
      first_purchase_at: null,
      last_purchase_at: order.created_at ?? null,
      total_orders: 0,
      total_spent: order.total_after_discount ?? order.total_amount ?? "0",
      distinct_skus: order.sku ? [order.sku] : [],
    },
    latest_order: {
      sku: order.sku ?? null,
      product: order.product ?? "",
      last_order_amount: order.total_after_discount ?? order.total_amount ?? null,
      last_order_status: order.status ?? null,
      sales_status_code: crm.sales_status_code ?? null,
      sales_status_label: crm.sales_status_label ?? null,
      not_closed_reason_code: crm.not_closed_reason_code ?? null,
      not_closed_reason_label: crm.not_closed_reason_label ?? null,
    },
    persona: {
      customer_classification_code: crm.customer_classification_code ?? null,
      customer_classification_label: crm.customer_classification_label ?? null,
      pain_level_code: crm.pain_level_code ?? null,
      pain_level_label: crm.pain_level_label ?? null,
      pain_duration_code: crm.pain_duration_code ?? null,
      pain_duration_label: crm.pain_duration_label ?? null,
      lifestyle_habit_codes: crm.lifestyle_habit_codes ?? [],
      used_massage_before: crm.used_massage_before ?? null,
      relax_time_codes: crm.relax_time_codes ?? [],
      purchase_barrier_codes: crm.purchase_barrier_codes ?? [],
      delax_source_codes: crm.delax_source_codes ?? [],
      comparing_brand_text: crm.comparing_brand_text ?? "",
      call_duration_code: crm.call_duration_code ?? null,
      call_duration_label: crm.call_duration_label ?? null,
      post_purchase_feedback_text: crm.post_purchase_feedback_text ?? "",
      post_purchase_rating_code: crm.post_purchase_rating_code ?? null,
      post_purchase_rating_label: crm.post_purchase_rating_label ?? null,
    },
    resale: { last_resale_at: null, resale_status: "", resale_suggestion: "" },
  };
}
