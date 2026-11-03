// Logic thuần của trang Vai trò & Phân quyền (test trực tiếp, không phụ thuộc React).
import type { PermissionRow, Role, RoleWrite } from "@/lib/api/roles";
import { ACTION_ORDER, MODULE_GROUPS } from "./constants";

export type FieldRuleDraft = { section: string; field: string; rule: string };
export type GroupedSection = { section: string; actions: PermissionRow[] };
export type ModuleGroup = { label: string; rows: GroupedSection[] };

export type RoleDraft = {
  codes: Set<string>;
  scopes: Record<string, string>;
  fieldRules: FieldRuleDraft[];
  fieldGrants: string[];
};

/** Section có trong catalog, gom action + sắp theo ACTION_ORDER. */
export function buildSectionMap(perms: PermissionRow[]): Map<string, PermissionRow[]> {
  const map = new Map<string, PermissionRow[]>();
  for (const row of perms) {
    const list = map.get(row.section) ?? [];
    list.push(row);
    map.set(row.section, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action));
  }
  return map;
}

/** Nhóm section theo module để render; section không thuộc module nào dồn vào "Khác". */
export function groupSectionsByModule(sectionMap: Map<string, PermissionRow[]>): ModuleGroup[] {
  const used = new Set<string>();
  const groups: ModuleGroup[] = [];
  for (const group of MODULE_GROUPS) {
    const rows: GroupedSection[] = [];
    for (const section of group.sections) {
      const actions = sectionMap.get(section);
      if (actions) {
        rows.push({ section, actions });
        used.add(section);
      }
    }
    if (rows.length) groups.push({ label: group.label, rows });
  }
  const leftovers = [...sectionMap.keys()].filter((s) => !used.has(s));
  if (leftovers.length) {
    groups.push({
      label: "Khác",
      rows: leftovers.map((section) => ({ section, actions: sectionMap.get(section)! })),
    });
  }
  return groups;
}

/** Role hệ thống lên đầu, rồi theo tên; lọc theo tên (không phân biệt hoa thường). */
export function sortAndFilterRoles(roles: Role[], query: string): Role[] {
  const q = query.trim().toLowerCase();
  const sorted = [...roles].sort((a, b) => {
    if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  if (!q) return sorted;
  return sorted.filter((r) => r.name.toLowerCase().includes(q));
}

/** Đếm action đang bật / tổng trong một nhóm module. */
export function countGroupCodes(rows: GroupedSection[], codes: Set<string>) {
  let total = 0;
  let on = 0;
  for (const r of rows)
    for (const a of r.actions) {
      total += 1;
      if (codes.has(a.code)) on += 1;
    }
  return { total, on };
}

/** Bật/tắt một loạt mã quyền, trả Set mới. */
export function setCodes(prev: Set<string>, codes: string[], on: boolean): Set<string> {
  const next = new Set(prev);
  for (const code of codes) {
    if (on) next.add(code);
    else next.delete(code);
  }
  return next;
}

const validFieldRules = (rules: FieldRuleDraft[]) =>
  rules.filter((r) => r.section && r.field.trim());

export function isRoleDraftDirty(selected: Role, draft: RoleDraft): boolean {
  const baseCodes = new Set(selected.permission_codes ?? []);
  if (baseCodes.size !== draft.codes.size) return true;
  for (const c of draft.codes) if (!baseCodes.has(c)) return true;

  const baseScopes = selected.section_scopes ?? {};
  const baseKeys = Object.keys(baseScopes);
  const draftKeys = Object.keys(draft.scopes);
  if (baseKeys.length !== draftKeys.length) return true;
  for (const k of draftKeys) if (baseScopes[k] !== draft.scopes[k]) return true;

  const norm = (rs: FieldRuleDraft[]) =>
    validFieldRules(rs)
      .map((r) => `${r.section}|${r.field.trim()}|${r.rule}`)
      .sort()
      .join(",");
  if (norm(draft.fieldRules) !== norm((selected.field_rules ?? []) as FieldRuleDraft[]))
    return true;

  const baseGrants = [...(selected.field_grants ?? [])].sort();
  const draftGrants = [...draft.fieldGrants].sort();
  if (baseGrants.length !== draftGrants.length) return true;
  for (let i = 0; i < baseGrants.length; i += 1) {
    if (baseGrants[i] !== draftGrants[i]) return true;
  }
  return false;
}

export function buildRoleUpdateBody(draft: RoleDraft): RoleWrite {
  return {
    permission_codes: [...draft.codes],
    section_scopes: Object.entries(draft.scopes).map(([section, scope]) => ({
      section,
      scope,
    })),
    field_rules: validFieldRules(draft.fieldRules).map((r) => ({
      section: r.section,
      field: r.field.trim(),
      rule: r.rule,
    })),
    field_grants: draft.fieldGrants,
  };
}
