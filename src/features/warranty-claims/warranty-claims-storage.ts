import {
  DEFAULT_WARRANTY_COLUMNS,
  WARRANTY_COLUMN_OPTIONS,
  type WarrantyColumnKey,
} from "@/features/warranty-claims/warranty-claim-columns";
import { swallowError } from "@/lib/errors";

// Bump _v2: thêm 3 cột bảo hành (kích hoạt / hết hạn / số ngày còn lại) vào mặc định.
// Key cũ bị bỏ để cấu hình cột của mọi người reset một lần và thấy ngay cột mới.
const VISIBLE_KEY = "desi_warranty_visible_columns_v2";
const LOCKED_KEY = "desi_warranty_locked_columns_v2";
const ORDER_KEY = "desi_warranty_column_order_v2";

const ALL_KEYS = new Set<string>(WARRANTY_COLUMN_OPTIONS.map((o) => o.key));

function readKeys(storageKey: string): WarrantyColumnKey[] | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((k): k is WarrantyColumnKey => typeof k === "string" && ALL_KEYS.has(k));
  } catch {
    return null;
  }
}

function writeKeys(storageKey: string, keys: WarrantyColumnKey[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch (err) {
    // ignore quota/availability errors
    swallowError(err, "warranty.columns.storage");
  }
}

export function getStoredColumns(): WarrantyColumnKey[] {
  return readKeys(VISIBLE_KEY) ?? [...DEFAULT_WARRANTY_COLUMNS];
}
export function setStoredColumns(v: WarrantyColumnKey[]): void {
  writeKeys(VISIBLE_KEY, v);
}
export function getStoredLocked(): WarrantyColumnKey[] {
  return readKeys(LOCKED_KEY) ?? [];
}
export function setStoredLocked(v: WarrantyColumnKey[]): void {
  writeKeys(LOCKED_KEY, v);
}
export function getStoredOrder(): WarrantyColumnKey[] {
  return readKeys(ORDER_KEY) ?? [];
}
export function setStoredOrder(v: WarrantyColumnKey[]): void {
  writeKeys(ORDER_KEY, v);
}
