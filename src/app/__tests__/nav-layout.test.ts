import { describe, it, expect } from "vitest";

import { APP_MODULES } from "@/app/modules";
import { SIDEBAR_PINNED, SIDEBAR_ZONES, buildNavModel } from "@/app/nav-layout";

const ALL_SECTION_KEYS = APP_MODULES.flatMap((m) => m.sections.map((s) => s.key));
/** Toàn bộ permission key để mô phỏng user full quyền (gồm cả requires/requiresAny). */
const FULL_PERMISSIONS = [
  ...new Set(
    APP_MODULES.flatMap((m) => m.sections.flatMap((s) => s.requiresAny ?? [s.requires ?? s.key])),
  ),
];

describe("sidebar layout config", () => {
  it("pinned sections tồn tại trong APP_MODULES và không trùng", () => {
    for (const key of SIDEBAR_PINNED) {
      expect(ALL_SECTION_KEYS).toContain(key);
    }
    expect(new Set(SIDEBAR_PINNED).size).toBe(SIDEBAR_PINNED.length);
  });

  it("moduleKeys trong zone tồn tại trong APP_MODULES và không trùng giữa các zone", () => {
    const allZoneModuleKeys = SIDEBAR_ZONES.flatMap((z) => z.moduleKeys);
    const moduleKeys = APP_MODULES.map((m) => m.key);
    for (const key of allZoneModuleKeys) {
      expect(moduleKeys).toContain(key);
    }
    expect(new Set(allZoneModuleKeys).size).toBe(allZoneModuleKeys.length);
  });

  it("mọi section đều reachable: pinned, thuộc module nằm trong zone, hoặc nằm trong dropdown Cài đặt của zone", () => {
    const zoneModules = new Set(SIDEBAR_ZONES.flatMap((z) => z.moduleKeys));
    const zoneSettings = new Set(SIDEBAR_ZONES.flatMap((z) => z.settings ?? []));
    const pinned = new Set<string>(SIDEBAR_PINNED);
    for (const m of APP_MODULES) {
      for (const s of m.sections) {
        const reachable = pinned.has(s.key) || zoneModules.has(m.key) || zoneSettings.has(s.key);
        expect(reachable, `section ${s.key} không reachable`).toBe(true);
      }
    }
  });

  it("section trong dropdown Cài đặt tồn tại, không trùng nhau và không trùng pinned", () => {
    const all = SIDEBAR_ZONES.flatMap((z) => z.settings ?? []);
    for (const key of all) {
      expect(ALL_SECTION_KEYS).toContain(key);
      expect(SIDEBAR_PINNED).not.toContain(key);
    }
    expect(new Set(all).size).toBe(all.length);
  });

  it("key của các zone không trùng nhau", () => {
    const keys = SIDEBAR_ZONES.map((z) => z.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("module reports đã rút hết section lên phẳng, không nằm trong zone nào", () => {
    const reports = APP_MODULES.find((m) => m.key === "reports")!;
    for (const s of reports.sections) {
      expect(SIDEBAR_PINNED).toContain(s.key);
    }
    expect(SIDEBAR_ZONES.flatMap((z) => z.moduleKeys)).not.toContain("reports");
  });

  it("labelKey của các zone không trùng nhau", () => {
    const labels = SIDEBAR_ZONES.map((z) => z.labelKey);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("buildNavModel", () => {
  it("full quyền: 5 item phẳng (foxia-report đang ẩn tạm), 7 zone, reports không thành group", () => {
    const model = buildNavModel("orders", FULL_PERMISSIONS);
    expect(model.pinned.map((s) => s.key)).toEqual([
      "overview-report",
      "dashboard",
      "ads-report",
      "customer-explorer",
      "call-quality",
    ]);
    expect(model.zones.map((z) => z.labelKey)).toEqual([
      "sidebar.zone.ops",
      "sidebar.zone.warehouse",
      "sidebar.zone.marketing",
      "sidebar.zone.media",
      "sidebar.zone.utilities",
      "sidebar.zone.hr",
      "sidebar.zone.settings",
    ]);
    expect(model.zones.map((z) => z.groups.map((g) => g.key))).toEqual([
      ["sales", "cskh", "crm", "aftersales", "settings:ops"],
      ["inventory", "catalog"],
      ["marketing", "settings:marketing"],
      ["media"],
      ["utilities"],
      ["hr", "settings:hr"],
      ["settings", "settings:settings"],
    ]);
    const groupKeys = model.zones.flatMap((z) => z.groups.map((g) => g.key));
    expect(groupKeys).not.toContain("reports");
  });

  it("không có quyền báo cáo → block phẳng rỗng", () => {
    const model = buildNavModel("orders", ["orders"]);
    expect(model.pinned).toEqual([]);
    expect(model.zones).toHaveLength(1);
    expect(model.zones[0].labelKey).toBe("sidebar.zone.ops");
    expect(model.zones[0].groups.map((g) => g.key)).toEqual(["sales"]);
  });

  it("chỉ quyền HR → chỉ còn zone Hành chính nhân sự: nhóm hr + dropdown Cài đặt (Vị trí chấm công)", () => {
    const model = buildNavModel("employees", ["employees"]);
    expect(model.zones.map((z) => z.labelKey)).toEqual(["sidebar.zone.hr"]);
    // employees kéo theo leave / attendance-history (requires: employees)
    // và attendance-locations (module settings, requires: employees) — cái sau
    // nằm trong dropdown Cài đặt của zone HR chứ không còn ở nhóm Quản trị.
    expect(model.zones[0].groups.map((g) => g.key)).toEqual(["hr", "settings:hr"]);
    expect(model.zones[0].groups[1].items.map((i) => i.key)).toEqual(["attendance-locations"]);
  });

  it("dropdown Cài đặt theo zone: đúng section, đúng thứ tự, và không còn lặp ở nhóm Quản trị", () => {
    const model = buildNavModel("orders", FULL_PERMISSIONS);
    const groups = model.zones.flatMap((z) => z.groups);
    const byKey = (k: string) => groups.find((g) => g.key === k)!;
    expect(byKey("settings:ops").items.map((i) => i.key)).toEqual([
      "lead-assignment",
      "foxia-link",
      "pancake",
      "pancake-pos",
      "contact_flow",
    ]);
    expect(byKey("settings:marketing").items.map((i) => i.key)).toEqual(["channels", "kiotviet"]);
    expect(byKey("settings:hr").items.map((i) => i.key)).toEqual(["attendance-locations"]);
    expect(byKey("settings:settings").items.map((i) => i.key)).toEqual(["system-settings"]);
    expect(byKey("settings").items.map((i) => i.key)).toEqual([
      "users",
      "roles",
      "media-settings",
      "audit",
    ]);
    for (const k of ["settings:ops", "settings:marketing", "settings:hr", "settings:settings"]) {
      expect(byKey(k).labelKey).toBe("sidebar.group.settings");
    }
  });

  it("dropdown Cài đặt ẩn khi không có quyền section nào bên trong; activeGroupKey trỏ về dropdown", () => {
    const noSettings = buildNavModel("orders", ["orders", "facebook-ads"]);
    const keys = noSettings.zones.flatMap((z) => z.groups.map((g) => g.key));
    expect(keys).toEqual(["sales", "marketing"]);

    const withChannels = buildNavModel("channels", ["orders", "channels"]);
    expect(withChannels.zones.map((z) => z.groups.map((g) => g.key))).toEqual([
      ["sales"],
      ["settings:marketing"],
    ]);
    expect(withChannels.activeGroupKey).toBe("settings:marketing");
    expect(buildNavModel("lead-assignment", FULL_PERMISSIONS).activeGroupKey).toBe("settings:ops");
  });

  it("activeGroupKey = null khi đứng ở trang pinned, = module khi đứng trong accordion", () => {
    expect(buildNavModel("dashboard", FULL_PERMISSIONS).activeGroupKey).toBeNull();
    expect(buildNavModel("stock", FULL_PERMISSIONS).activeGroupKey).toBe("inventory");
    expect(buildNavModel("roles", FULL_PERMISSIONS).activeGroupKey).toBe("settings");
  });

  it("nhóm CSKH đứng ngay sau nhóm Đơn hàng và lọc độc lập theo quyền", () => {
    const onlyCskh = buildNavModel("contacts", ["contacts", "resale-tracking"]);
    expect(onlyCskh.zones[0].groups.map((g) => g.key)).toEqual(["cskh"]);
    expect(onlyCskh.zones[0].groups[0].items.map((i) => i.key)).toEqual([
      "contacts",
      "resale-tracking",
    ]);
    expect(onlyCskh.activeGroupKey).toBe("cskh");

    const onlyOrders = buildNavModel("orders", ["orders", "landing-orders"]);
    expect(onlyOrders.zones[0].groups.map((g) => g.key)).toEqual(["sales"]);
    expect(onlyOrders.activeGroupKey).toBe("sales");
  });

  it("nhóm media chỉ xuất hiện khi có quyền một section media-*", () => {
    const noMedia = buildNavModel("orders", ["orders", "marketing"]);
    expect(noMedia.zones.flatMap((z) => z.groups.map((g) => g.key))).not.toContain("media");

    const withMedia = buildNavModel("orders", ["orders", "marketing", "media-contents"]);
    const mediaGroup = withMedia.zones.flatMap((z) => z.groups).find((g) => g.key === "media");
    expect(mediaGroup?.items.map((i) => i.key)).toEqual(["media-contents"]);
  });
});
