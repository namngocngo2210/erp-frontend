/**
 * Order create/patch payload type + sanitisers. Extracted from use-orders-data.ts
 * so the payload shaping (trim, decimal-normalise, gender/source coercion, item +
 * CRM cleanup) is isolated. CreateOrderPayload is re-exported from use-orders-data
 * for backward-compatible imports.
 */

import { VALID_ORDER_SOURCES } from "@/features/orders/order-source";
import { ORDER_VATS } from "@/features/orders/vat";
import type {
  OrderCRMRow,
  OrderItemRow,
  OrderRow,
  OrderSource,
  OrderVat,
} from "@/features/orders/order-types";
import {
  type EditableOrderItem,
  formatAmountValue,
  isPercentDiscount,
  lineUnitDiscount,
  parseAmount,
} from "@/features/orders/order-form/order-form-helpers";
import {
  normalizeCustomerGenderForPatch,
  normalizeDecimalInput,
} from "@/features/orders/order-normalizers";

export type CreateOrderPayload = {
  channel_code: string;
  customer_code?: string;
  name: string;
  phone: string;
  raw_address?: string;
  address?: string;
  ward_code?: string;
  district_code?: string;
  province_code?: string;
  kiotviet_location?: string;
  kiotviet_ward?: string;
  product?: string;
  status?: number;
  kiotviet_channel_id?: number;
  // null = xoá nhân viên phụ trách (patch); undefined = không đụng tới.
  staff_id?: number | null;
  // Chỉ dùng ở luồng TẠO đơn: để backend chia sale theo trọng số (ngày, ca, sheet)
  // thay vì chọn tay. Không bao giờ đi kèm PATCH.
  auto_assign_staff?: boolean;
  customer_gender?: number | null;
  discount_amount?: string;
  booking_voucher_discount?: string;
  weight?: string;
  dimensions?: string;
  branch_id?: string;
  order_type?: string;
  recall_code?: string;
  order_source?: OrderSource | null;
  vat?: OrderVat | null;
  show_orders?: boolean;
  other_price?: string;
  customer_prepaid?: string | number;
  result?: string;
  invoice_code?: string;
  feedback?: string;
  total_after_discount?: string;
  total_amount?: string;
  shipping_fee?: string;
  payment_method?: string;
  shipping_code?: string;
  created_at_override?: string;
  sku?: string;
  quantity?: number;
  fulfillment_warehouse?: number | null;
  crm?: Partial<OrderCRMRow> | null;
  items?: Array<{
    product_id?: number;
    sku?: string;
    product_name?: string;
    quantity: number;
    unit_price?: string;
    discount?: string;
    discount_percent?: string | null;
  }>;
};

const CREATE_ORDER_DECIMAL_FIELDS: Array<keyof CreateOrderPayload> = [
  "discount_amount",
  "booking_voucher_discount",
  "weight",
  "other_price",
  "total_after_discount",
  "total_amount",
  "shipping_fee",
];

const CREATE_ORDER_STRING_FIELDS: Array<keyof CreateOrderPayload> = [
  "raw_address",
  "address",
  "ward_code",
  "district_code",
  "province_code",
  "kiotviet_location",
  "kiotviet_ward",
  "product",
  "dimensions",
  "branch_id",
  "order_type",
  "result",
  "invoice_code",
  "feedback",
  "payment_method",
  "shipping_code",
  "sku",
];

export function sanitizeCreateOrderPayload(payload: CreateOrderPayload): CreateOrderPayload {
  const sanitized: CreateOrderPayload = {
    channel_code: String(payload.channel_code || "").trim(),
    name: String(payload.name || "").trim(),
    phone: String(payload.phone || "").trim(),
  };
  const writableSanitized = sanitized as Record<string, unknown>;

  for (const field of CREATE_ORDER_STRING_FIELDS) {
    const value = payload[field];
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized) continue;
    writableSanitized[field] = normalized;
  }

  for (const field of CREATE_ORDER_DECIMAL_FIELDS) {
    const value = payload[field];
    if (typeof value === "number" && Number.isFinite(value)) {
      writableSanitized[field] = String(value);
      continue;
    }
    if (typeof value !== "string") continue;
    const normalized = normalizeDecimalInput(value);
    if (!normalized) continue;
    writableSanitized[field] = normalized;
  }

  if (typeof payload.quantity === "number" && Number.isFinite(payload.quantity)) {
    sanitized.quantity = Math.max(0, Math.trunc(payload.quantity));
  }
  if (
    typeof payload.kiotviet_channel_id === "number" &&
    Number.isFinite(payload.kiotviet_channel_id)
  ) {
    sanitized.kiotviet_channel_id = payload.kiotviet_channel_id;
  }
  if (typeof payload.staff_id === "number" && Number.isFinite(payload.staff_id)) {
    sanitized.staff_id = payload.staff_id;
  }
  // Chỉ gửi khi thực sự bật: BE default false nên bỏ key = giữ nguyên hành vi cũ.
  if (payload.auto_assign_staff === true) {
    sanitized.auto_assign_staff = true;
  }
  if (payload.customer_prepaid !== undefined && payload.customer_prepaid !== null) {
    if (typeof payload.customer_prepaid === "number" && Number.isFinite(payload.customer_prepaid)) {
      sanitized.customer_prepaid = String(payload.customer_prepaid);
    } else if (typeof payload.customer_prepaid === "string") {
      const normalized = normalizeDecimalInput(payload.customer_prepaid);
      if (normalized) sanitized.customer_prepaid = normalized;
    }
  }
  if (payload.customer_gender === 0 || payload.customer_gender === 1) {
    sanitized.customer_gender = payload.customer_gender;
  } else if (payload.customer_gender === null) {
    // Backend serializer chấp nhận null (allow_null=True) → pass-through để ngữ
    // nghĩa create/patch thống nhất: null = không xác định giới tính.
    sanitized.customer_gender = null;
  }
  if (typeof payload.status === "number" && Number.isFinite(payload.status)) {
    sanitized.status = Math.max(0, Math.trunc(payload.status));
  }
  if (payload.order_source != null && VALID_ORDER_SOURCES.includes(payload.order_source)) {
    sanitized.order_source = payload.order_source;
  } else if (payload.order_source === null) {
    sanitized.order_source = null;
  }
  if (payload.vat != null && ORDER_VATS.includes(payload.vat)) {
    sanitized.vat = payload.vat;
  }
  if (typeof payload.show_orders === "boolean") {
    sanitized.show_orders = payload.show_orders;
  }
  if (typeof payload.created_at_override === "string" && payload.created_at_override.trim()) {
    sanitized.created_at_override = payload.created_at_override.trim();
  }
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    sanitized.items = payload.items
      .map((item) => {
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) return null;
        const normalizedItem: {
          product_id?: number;
          sku?: string;
          quantity: number;
          unit_price?: string;
          discount?: string;
          discount_percent?: string | null;
        } = { quantity: Math.trunc(quantity) };
        if (typeof item.product_id === "number" && Number.isFinite(item.product_id)) {
          normalizedItem.product_id = item.product_id;
        }
        if (typeof item.sku === "string" && item.sku.trim()) {
          normalizedItem.sku = item.sku.trim();
        }
        if (typeof item.unit_price === "string" && item.unit_price.trim()) {
          normalizedItem.unit_price = item.unit_price.trim();
        }
        Object.assign(normalizedItem, lineDiscountPayload(item));
        if (!normalizedItem.product_id && !normalizedItem.sku) return null;
        return normalizedItem;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }
  if (payload.crm && typeof payload.crm === "object") {
    const crm = payload.crm as Record<string, unknown>;
    const sanitizedCrm: Record<string, unknown> = {};
    for (const field of [
      "customer_classification_code",
      "customer_attitude_raw",
      "sales_status_code",
      "not_closed_reason_code",
      "delivery_business_status_code",
      "bomb_reason_text",
      "internal_note",
      "next_followup_at",
    ]) {
      const value = crm[field];
      if (typeof value === "string") {
        sanitizedCrm[field] = value.trim();
      } else if (value === null) {
        sanitizedCrm[field] = null;
      }
    }
    if (typeof crm.potential_level === "number" && Number.isFinite(crm.potential_level)) {
      sanitizedCrm.potential_level = Math.trunc(crm.potential_level);
    } else if (crm.potential_level === null) {
      sanitizedCrm.potential_level = null;
    }
    if (Array.isArray(crm.needs)) {
      sanitizedCrm.needs = crm.needs
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const typeCode = String((item as Record<string, unknown>).type_code || "").trim();
          if (!typeCode) return null;
          const groupCode = String((item as Record<string, unknown>).group_code || "").trim();
          return {
            type_code: typeCode,
            group_code: groupCode || undefined,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }
    if (Object.keys(sanitizedCrm).length > 0) {
      sanitized.crm = sanitizedCrm as Partial<OrderCRMRow>;
    }
  }

  return sanitized;
}

/**
 * Phần giảm giá dòng của payload item. Luôn gửi tiền đã quy đổi (backend so
 * `discount` để biết items có đổi không); chế độ % gửi kèm %, chế độ tiền gửi
 * null để bỏ %. Không có giảm giá (hoặc ô rỗng) → không gửi gì: DRF DecimalField
 * từ chối chuỗi rỗng, còn "không gửi" backend hiểu là 0.
 */
function lineDiscountPayload(
  item: Pick<EditableOrderItem, "unit_price" | "discount" | "discount_percent">,
): { discount?: string; discount_percent?: string | null } {
  if (isPercentDiscount(item)) {
    const percent = parseAmount(item.discount_percent ?? "");
    if (percent <= 0) return {};
    return {
      discount: formatAmountValue(lineUnitDiscount(item)),
      discount_percent: formatAmountValue(percent),
    };
  }
  if (typeof item.discount === "string" && item.discount.trim()) {
    return { discount: formatAmountValue(lineUnitDiscount(item)), discount_percent: null };
  }
  return {};
}

export function sanitizePatchOrderPayload(payload: Partial<OrderRow>): Partial<OrderRow> {
  const sanitized = { ...payload } as Record<string, unknown>;
  if (Array.isArray(sanitized.items)) {
    // Trang chi tiết PATCH nguyên OrderItemRow (kể cả discount "" khi vừa bật %).
    sanitized.items = (sanitized.items as OrderItemRow[]).map((item) => {
      const { discount: _discount, discount_percent: _percent, ...rest } = item;
      return { ...rest, ...lineDiscountPayload(item) };
    });
  }
  if (Object.prototype.hasOwnProperty.call(sanitized, "customer_gender")) {
    const normalizedGender = normalizeCustomerGenderForPatch(sanitized.customer_gender);
    if (normalizedGender === undefined) {
      delete sanitized.customer_gender;
    } else {
      sanitized.customer_gender = normalizedGender;
    }
  }
  if (Object.prototype.hasOwnProperty.call(sanitized, "order_source")) {
    const source = sanitized.order_source;
    if (source === null || source === "") {
      sanitized.order_source = null;
    } else if (typeof source === "string" && VALID_ORDER_SOURCES.includes(source as OrderSource)) {
      sanitized.order_source = source;
    } else {
      delete sanitized.order_source;
    }
  }
  if (Object.prototype.hasOwnProperty.call(sanitized, "vat")) {
    const vat = sanitized.vat;
    // vat là field NOT NULL (default "no") ở backend → bỏ qua khi rỗng thay vì gửi null.
    if (typeof vat === "string" && ORDER_VATS.includes(vat as OrderVat)) {
      sanitized.vat = vat;
    } else {
      delete sanitized.vat;
    }
  }
  if (Object.prototype.hasOwnProperty.call(sanitized, "is_export_vat")) {
    sanitized.is_export_vat = Boolean(sanitized.is_export_vat);
  }
  if (Object.prototype.hasOwnProperty.call(sanitized, "vat_link")) {
    const link = sanitized.vat_link;
    sanitized.vat_link = typeof link === "string" ? link.trim() : "";
  }
  if (sanitized.crm && typeof sanitized.crm === "object") {
    const crmInput = sanitized.crm as Record<string, unknown>;
    const normalizedCrm = { ...crmInput } as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(normalizedCrm, "bomb_reason_text")) {
      const bombReasonValue = normalizedCrm.bomb_reason_text;
      if (bombReasonValue === null) {
        normalizedCrm.bomb_reason_text = null;
      } else if (typeof bombReasonValue === "string") {
        const trimmed = bombReasonValue.trim();
        normalizedCrm.bomb_reason_text = trimmed ? trimmed : null;
      } else {
        delete normalizedCrm.bomb_reason_text;
      }
    }
    sanitized.crm = normalizedCrm;
  }
  return sanitized as Partial<OrderRow>;
}
