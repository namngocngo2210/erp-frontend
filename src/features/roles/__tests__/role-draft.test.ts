import { describe, expect, it } from "vitest";

import type { PermissionRow, Role } from "@/lib/api/roles";
import {
  buildRoleUpdateBody,
  buildSectionMap,
  countGroupCodes,
  groupSectionsByModule,
  isRoleDraftDirty,
  setCodes,
  sortAndFilterRoles,
  type RoleDraft,
} from "@/features/roles/role-draft";

const perm = (section: string, action: string) =>
  ({ section, action, code: `${section}:${action}` }) as PermissionRow;

const role = (patch: Partial<Role>) =>
  ({
    id: 1,
    name: "Sale",
    is_system: false,
    permission_codes: [],
    section_scopes: {},
    field_rules: [],
    field_grants: [],
    ...patch,
  }) as Role;

const draftOf = (r: Role): RoleDraft => ({
  codes: new Set(r.permission_codes ?? []),
  scopes: { ...(r.section_scopes ?? {}) },
  fieldRules: (r.field_rules ?? []).map((x) => ({ ...x })),
  fieldGrants: [...(r.field_grants ?? [])],
});

describe("buildSectionMap + groupSectionsByModule", () => {
  it("sắp action theo ACTION_ORDER và dồn section lạ vào nhóm Khác", () => {
    const map = buildSectionMap([
      perm("orders", "edit"),
      perm("orders", "view"),
      perm("mystery", "view"),
      perm("customers", "view"),
    ]);
    expect(map.get("orders")!.map((p) => p.action)).toEqual(["view", "edit"]);

    const groups = groupSectionsByModule(map);
    expect(groups.map((g) => g.label)).toEqual(["Đơn hàng", "Khách hàng", "Khác"]);
    expect(groups[2].rows.map((r) => r.section)).toEqual(["mystery"]);
  });
});

describe("sortAndFilterRoles", () => {
  it("role hệ thống lên đầu, sau đó theo tên; lọc không phân biệt hoa thường", () => {
    const roles = [
      role({ id: 1, name: "Kho" }),
      role({ id: 2, name: "Admin", is_system: true }),
      role({ id: 3, name: "CSKH" }),
    ];
    expect(sortAndFilterRoles(roles, "").map((r) => r.id)).toEqual([2, 3, 1]);
    expect(sortAndFilterRoles(roles, "  kh ").map((r) => r.id)).toEqual([3, 1]);
  });
});

describe("countGroupCodes / setCodes", () => {
  it("đếm bật/tổng và bật/tắt hàng loạt không đụng Set gốc", () => {
    const rows = [{ section: "orders", actions: [perm("orders", "view"), perm("orders", "edit")] }];
    const base = new Set(["orders:view"]);
    expect(countGroupCodes(rows, base)).toEqual({ total: 2, on: 1 });
    const on = setCodes(base, ["orders:view", "orders:edit"], true);
    expect([...on].sort()).toEqual(["orders:edit", "orders:view"]);
    expect(setCodes(on, ["orders:view"], false).has("orders:view")).toBe(false);
    expect(base.size).toBe(1);
  });
});

describe("isRoleDraftDirty", () => {
  const saved = role({
    permission_codes: ["orders:view"],
    section_scopes: { orders: "all" },
    field_rules: [{ section: "orders", field: "phone", rule: "hidden" }],
    field_grants: ["note", "phone"],
  } as Partial<Role>);

  it("bản nháp giống hệt → không bẩn (bỏ qua thứ tự grants)", () => {
    const draft = draftOf(saved);
    draft.fieldGrants = ["phone", "note"];
    expect(isRoleDraftDirty(saved, draft)).toBe(false);
  });

  it("quy tắc field rỗng bị bỏ qua khi so sánh", () => {
    const draft = draftOf(saved);
    draft.fieldRules.push({ section: "orders", field: "  ", rule: "hidden" });
    expect(isRoleDraftDirty(saved, draft)).toBe(false);
  });

  it("đổi quyền / phạm vi / quy tắc / grants → bẩn", () => {
    expect(isRoleDraftDirty(saved, { ...draftOf(saved), codes: new Set(["orders:edit"]) })).toBe(
      true,
    );
    expect(isRoleDraftDirty(saved, { ...draftOf(saved), scopes: {} })).toBe(true);
    expect(isRoleDraftDirty(saved, { ...draftOf(saved), fieldRules: [] })).toBe(true);
    expect(isRoleDraftDirty(saved, { ...draftOf(saved), fieldGrants: ["note"] })).toBe(true);
  });
});

describe("buildRoleUpdateBody", () => {
  it("chuẩn hoá scopes thành mảng và trim/bỏ field rule rỗng", () => {
    expect(
      buildRoleUpdateBody({
        codes: new Set(["orders:view"]),
        scopes: { orders: "own" },
        fieldRules: [
          { section: "orders", field: " phone ", rule: "hidden" },
          { section: "orders", field: "", rule: "hidden" },
        ],
        fieldGrants: ["note"],
      }),
    ).toEqual({
      permission_codes: ["orders:view"],
      section_scopes: [{ section: "orders", scope: "own" }],
      field_rules: [{ section: "orders", field: "phone", rule: "hidden" }],
      field_grants: ["note"],
    });
  });
});
