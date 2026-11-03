/**
 * Lưu cấu hình nhóm cột của trang Khách hàng vào localStorage.
 *
 * Trước đây state này chỉ nằm trong `useState` nên mỗi lần F5 là user mất hết
 * lựa chọn — khác hẳn trang Đơn hàng và Bảo hành vốn đều lưu lại.
 */

import { COLUMN_GROUPS, type ColumnGroupKey } from "@/pages/customers/profile-columns";
import { swallowError } from "@/lib/errors";

const VISIBLE_KEY = "desi_customers_visible_column_groups";
const ORDER_KEY = "desi_customers_column_group_order";

const ALL_GROUP_KEYS = COLUMN_GROUPS.map((group) => group.key);
const KNOWN_GROUP_KEYS = new Set<string>(ALL_GROUP_KEYS);

export function defaultVisibleGroupKeys(): ColumnGroupKey[] {
  return COLUMN_GROUPS.filter((group) => group.defaultVisible).map((group) => group.key);
}

export function defaultGroupOrder(): ColumnGroupKey[] {
  return [...ALL_GROUP_KEYS];
}

function readKeys(storageKey: string): ColumnGroupKey[] | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    // Lọc key lạ (nhóm đã bị xoá khỏi code) để không sinh cột ma.
    const valid = parsed.filter((key): key is ColumnGroupKey =>
      KNOWN_GROUP_KEYS.has(key as string),
    );
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

function writeKeys(storageKey: string, keys: ColumnGroupKey[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch (err) {
    // localStorage không khả dụng — bỏ qua, không chặn render.
    swallowError(err, "customers.columns.storage");
  }
}

export function getStoredVisibleGroups(): ColumnGroupKey[] {
  return readKeys(VISIBLE_KEY) ?? defaultVisibleGroupKeys();
}

/** Thứ tự nhóm: phần đã lưu trước, nhóm mới thêm vào code xếp sau. */
export function getStoredGroupOrder(): ColumnGroupKey[] {
  const stored = readKeys(ORDER_KEY);
  if (!stored) return defaultGroupOrder();
  const seen = new Set(stored);
  return [...stored, ...ALL_GROUP_KEYS.filter((key) => !seen.has(key))];
}

export function setStoredVisibleGroups(keys: ColumnGroupKey[]): void {
  writeKeys(VISIBLE_KEY, keys);
}

export function setStoredGroupOrder(keys: ColumnGroupKey[]): void {
  writeKeys(ORDER_KEY, keys);
}
