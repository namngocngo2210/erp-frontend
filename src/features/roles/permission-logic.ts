// ── Logic tick nhóm quyền sửa field (thuần, test trực tiếp) ────────
// Tách khỏi RolesPage.tsx: file component chỉ export component nên không cần
// eslint-disable react-refresh/only-export-components cho 2 hàm này nữa.
export type GroupState = "all" | "partial" | "none";

/** Trạng thái checkbox 3 nấc của một nhóm field: đủ / một phần / trống. */
export function groupState(granted: string[], groupFields: string[]): GroupState {
  const hit = groupFields.filter((f) => granted.includes(f)).length;
  if (hit === 0) return "none";
  return hit === groupFields.length ? "all" : "partial";
}

/** Tick nhóm: đủ → bỏ hết; trống hoặc một phần → cấp hết. Không đụng field nhóm khác. */
export function toggleGroup(granted: string[], groupFields: string[]): string[] {
  if (groupState(granted, groupFields) === "all") {
    return granted.filter((f) => !groupFields.includes(f));
  }
  return Array.from(new Set([...granted, ...groupFields]));
}
