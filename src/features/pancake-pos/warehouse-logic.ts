import type { PancakePosWarehouseLinkIn, PancakePosWarehouseRow } from "@/lib/api/pancakePos";

/** Logic thuần của bảng ghép kho CRM ↔ Pancake (test bằng vitest, không cần render). */

/** Một dòng đang sửa: `pancakeId` rỗng = không ghép; `priority` giữ dạng chuỗi của ô nhập. */
export type WarehouseDraft = {
  warehouseId: number;
  code: string;
  name: string;
  pancakeId: string;
  pancakeName: string;
  isDefault: boolean;
  priority: string;
};

export function draftsFromRows(rows: PancakePosWarehouseRow[]): WarehouseDraft[] {
  return rows.map((row) => ({
    warehouseId: row.warehouse_id,
    code: row.code,
    name: row.name,
    pancakeId: row.pancake_warehouse_id ?? "",
    pancakeName: row.pancake_warehouse_name ?? "",
    isDefault: row.is_default_for_push,
    priority: row.priority === null || row.priority === undefined ? "" : String(row.priority),
  }));
}

/** "" → 0; số nguyên 0–32767 → số; còn lại → null (lỗi). */
export function parsePriority(text: string): number | null {
  const value = text.trim();
  if (!value) return 0;
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n <= 32767 ? n : null;
}

/** Khoá i18n của lỗi đầu tiên, `null` = hợp lệ. */
export function validateDrafts(drafts: WarehouseDraft[]): string | null {
  const linked = drafts.filter((d) => d.pancakeId);
  const ids = linked.map((d) => d.pancakeId);
  if (new Set(ids).size !== ids.length) return "pancakePos.warehouses.errorDuplicate";
  if (drafts.some((d) => d.isDefault && !d.pancakeId))
    return "pancakePos.warehouses.errorDefaultUnlinked";
  if (linked.filter((d) => d.isDefault).length > 1)
    return "pancakePos.warehouses.errorManyDefaults";
  if (linked.some((d) => parsePriority(d.priority) === null))
    return "pancakePos.warehouses.errorPriority";
  return null;
}

/** Body PUT: chỉ dòng đã chọn kho Pancake; tên lấy theo danh sách kho Pancake nếu có. */
export function toPayload(
  drafts: WarehouseDraft[],
  pancakeNames: Record<string, string> = {},
): PancakePosWarehouseLinkIn[] {
  return drafts
    .filter((d) => d.pancakeId)
    .map((d) => ({
      warehouse_id: d.warehouseId,
      pancake_warehouse_id: d.pancakeId,
      pancake_warehouse_name: pancakeNames[d.pancakeId] ?? d.pancakeName,
      is_default_for_push: d.isDefault,
      priority: parsePriority(d.priority) ?? 0,
    }));
}

/** Chọn mặc định cho một kho = bỏ mặc định ở mọi kho khác (radio). */
export function setDefault(drafts: WarehouseDraft[], warehouseId: number): WarehouseDraft[] {
  return drafts.map((d) => ({ ...d, isDefault: d.warehouseId === warehouseId }));
}

/** Kho Pancake đã được dòng KHÁC chọn (ẩn khỏi select của dòng này). */
export function takenElsewhere(drafts: WarehouseDraft[], warehouseId: number): Set<string> {
  return new Set(
    drafts.filter((d) => d.warehouseId !== warehouseId && d.pancakeId).map((d) => d.pancakeId),
  );
}
