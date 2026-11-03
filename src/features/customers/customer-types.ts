export interface CustomersPageProps {
  canManageUsers?: boolean;
}

export type GenderOption = "none" | "male" | "female";

export const CUSTOMERS_MAX_PAGE_SIZE = 100;
export const ALL_SEGMENTS = "__all__";
export const ALL_CHANNELS = "__all__";
export const ALL_SALES_STATUS = "__all__";

// Bề rộng cố định cho các cột sticky bên trái (px). Phải khớp với class w-[..] đặt trên ô,
// để bù trừ left offset chính xác cho cả header và body.
export const CHECKBOX_COL_WIDTH = 32; // w-8
export const CODE_COL_WIDTH = 120;
export const NAME_COL_WIDTH = 200;

/** Hàng lịch sử đơn (nền muted/20) — ô sticky phủ lại đúng sắc đó, xem `.sticky-col` (styles.css). */
export const ORDER_ROW_STICKY_TINT =
  "[--sticky-tint:color-mix(in_oklch,var(--muted)_20%,transparent)]";

export type ResaleField = "resale_status" | "resale_suggestion";

export interface EditingResale {
  id: number;
  field: ResaleField;
}

export interface CustomerFormData {
  full_name: string;
  phone_raw: string;
  gender: GenderOption;
}

export interface StickyOffsets {
  chevron: number;
  checkbox: number;
  code: number;
  name: number;
}
