import { describe, expect, it } from "vitest";

import type {
  InitialStockDiff,
  PancakePosInitialStockStatus,
  PancakePosStatus,
  PancakePosWarehouseRow,
} from "@/lib/api/pancakePos";
import {
  applyBlockReason,
  diffsToCsv,
  dryRunBlockReason,
  filterDiffs,
  minutesLeft,
} from "@/features/pancake-pos/initial-stock-logic";
import {
  draftsFromRows,
  parsePriority,
  setDefault,
  takenElsewhere,
  toPayload,
  validateDrafts,
} from "@/features/pancake-pos/warehouse-logic";

const ROWS: PancakePosWarehouseRow[] = [
  {
    warehouse_id: 1,
    code: "DM1",
    name: "Đại Mỗ 1",
    is_active: true,
    pancake_warehouse_id: "p-1",
    pancake_warehouse_name: "P ĐM1",
    is_default_for_push: true,
    priority: 1,
  },
  {
    warehouse_id: 2,
    code: "DM2",
    name: "Đại Mỗ 2",
    is_active: true,
    pancake_warehouse_id: null,
    pancake_warehouse_name: "",
    is_default_for_push: false,
    priority: null,
  },
];

describe("ghép kho", () => {
  it("dựng nháp từ API và ra payload chỉ gồm dòng đã ghép, tên theo danh sách Pancake", () => {
    const drafts = draftsFromRows(ROWS);
    expect(drafts[1]).toMatchObject({ pancakeId: "", priority: "", isDefault: false });
    const next = drafts.map((d) => (d.warehouseId === 2 ? { ...d, pancakeId: "p-2" } : d));
    expect(toPayload(next, { "p-2": "P ĐM2" })).toEqual([
      {
        warehouse_id: 1,
        pancake_warehouse_id: "p-1",
        pancake_warehouse_name: "P ĐM1",
        is_default_for_push: true,
        priority: 1,
      },
      {
        warehouse_id: 2,
        pancake_warehouse_id: "p-2",
        pancake_warehouse_name: "P ĐM2",
        is_default_for_push: false,
        priority: 0,
      },
    ]);
  });

  it("bắt trùng kho Pancake, mặc định chưa ghép, nhiều mặc định, ưu tiên sai", () => {
    const drafts = draftsFromRows(ROWS);
    expect(validateDrafts(drafts)).toBeNull();
    const dup = drafts.map((d) => ({ ...d, pancakeId: "p-1" }));
    expect(validateDrafts(dup)).toBe("pancakePos.warehouses.errorDuplicate");
    const unlinkedDefault = drafts.map((d) => (d.warehouseId === 1 ? { ...d, pancakeId: "" } : d));
    expect(validateDrafts(unlinkedDefault)).toBe("pancakePos.warehouses.errorDefaultUnlinked");
    const two = drafts.map((d) => ({ ...d, pancakeId: `p-${d.warehouseId}`, isDefault: true }));
    expect(validateDrafts(two)).toBe("pancakePos.warehouses.errorManyDefaults");
    const badPriority = drafts.map((d) => (d.warehouseId === 1 ? { ...d, priority: "-1" } : d));
    expect(validateDrafts(badPriority)).toBe("pancakePos.warehouses.errorPriority");
  });

  it("ưu tiên: rỗng = 0, số nguyên 0–32767", () => {
    expect(parsePriority("")).toBe(0);
    expect(parsePriority(" 3 ")).toBe(3);
    expect(parsePriority("40000")).toBeNull();
    expect(parsePriority("1.5")).toBeNull();
  });

  it("mặc định kiểu radio và kho Pancake đã bị dòng khác chọn", () => {
    const drafts = draftsFromRows(ROWS).map((d) => ({ ...d, pancakeId: `p-${d.warehouseId}` }));
    expect(setDefault(drafts, 2).map((d) => d.isDefault)).toEqual([false, true]);
    expect([...takenElsewhere(drafts, 2)]).toEqual(["p-1"]);
  });
});

const READY: PancakePosStatus = {
  enabled: true,
  api_key_set: true,
  shop_id: 42,
  dirty_count: 0,
  link_counts: {},
  active_run_id: null,
  push_orders_enabled: false,
  order_link_counts: {},
};
const NOW = new Date("2026-09-30T10:00:00Z");
const DRY = {
  id: 5,
  mode: "initial_stock_dry",
  started_at: "2026-09-30T09:49:00Z",
  finished_at: "2026-09-30T09:50:00Z",
  fatal: "",
  triggered_by: null,
} as unknown as NonNullable<PancakePosInitialStockStatus["latest_dry_run"]>;
const STOCK: PancakePosInitialStockStatus = {
  latest_dry_run: DRY,
  apply_allowed: true,
  apply_deadline: "2026-09-30T10:20:00Z",
  active_run_id: null,
  warehouse_links: 3,
};

describe("tồn đầu kỳ: điều kiện chạy", () => {
  it("chạy thử cần key, shop, kho đã ghép, không lượt nào đang chạy", () => {
    expect(dryRunBlockReason(READY, STOCK)).toBeNull();
    expect(dryRunBlockReason(undefined, STOCK)).toBe("pancakePos.block.loading");
    expect(dryRunBlockReason(READY, { ...STOCK, warehouse_links: 0 })).toBe(
      "pancakePos.stock.block.noWarehouses",
    );
    expect(dryRunBlockReason(READY, { ...STOCK, active_run_id: 9 })).toBe(
      "pancakePos.block.running",
    );
    // chạy thử không cần cờ ghi
    expect(dryRunBlockReason({ ...READY, enabled: false }, STOCK)).toBeNull();
  });

  it("ghi thật cần cờ bật + chạy thử gần nhất thành công, còn hạn 30 phút", () => {
    expect(applyBlockReason(READY, STOCK, NOW)).toBeNull();
    expect(applyBlockReason({ ...READY, enabled: false }, STOCK, NOW)).toBe(
      "pancakePos.block.disabled",
    );
    expect(applyBlockReason(READY, { ...STOCK, latest_dry_run: null }, NOW)).toBe(
      "pancakePos.stock.block.noDryRun",
    );
    expect(
      applyBlockReason(READY, { ...STOCK, latest_dry_run: { ...DRY, fatal: "HTTP 401" } }, NOW),
    ).toBe("pancakePos.stock.block.dryRunFailed");
    expect(
      applyBlockReason(READY, { ...STOCK, apply_allowed: false, apply_deadline: null }, NOW),
    ).toBe("pancakePos.stock.block.dryRunExpired");
    // BE còn cho nhưng đồng hồ máy đã qua hạn
    expect(applyBlockReason(READY, STOCK, new Date("2026-09-30T10:21:00Z"))).toBe(
      "pancakePos.stock.block.dryRunExpired",
    );
  });

  it("phút còn lại làm tròn lên, hết hạn = 0", () => {
    expect(minutesLeft("2026-09-30T10:20:00Z", NOW)).toBe(20);
    expect(minutesLeft("2026-09-30T10:00:30Z", NOW)).toBe(1);
    expect(minutesLeft("2026-09-30T09:00:00Z", NOW)).toBe(0);
    expect(minutesLeft(null, NOW)).toBe(0);
  });
});

const DIFFS: InitialStockDiff[] = [
  {
    sku: "OHI01-DEN",
    product_id: 1,
    variation_id: "v1",
    warehouse_id: 1,
    warehouse_name: "Đại Mỗ 1",
    crm_qty: -2,
    push_qty: 0,
    pancake_qty: 4,
    delta: -4,
  },
  {
    sku: "=HYPERLINK(1)",
    product_id: 2,
    variation_id: "v2",
    warehouse_id: 2,
    warehouse_name: 'Kho "B", 2',
    crm_qty: 3,
    push_qty: 3,
    pancake_qty: null,
    delta: null,
  },
];

describe("tồn đầu kỳ: bảng lệch", () => {
  it("CSV có BOM, escape dấu phẩy/ngoặc kép, chặn công thức, ô rỗng khi chưa rõ", () => {
    const csv = diffsToCsv(DIFFS);
    expect(
      csv.startsWith("\uFEFFsku,warehouse,crm_qty,push_qty,pancake_qty,delta,variation_id\r\n"),
    ).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[1]).toBe("OHI01-DEN,Đại Mỗ 1,-2,0,4,-4,v1");
    expect(lines[2]).toBe(`'=HYPERLINK(1),"Kho ""B"", 2",3,3,,,v2`);
  });

  it("lọc theo SKU hoặc kho, không phân biệt hoa thường", () => {
    expect(filterDiffs(DIFFS, "ohi").map((d) => d.product_id)).toEqual([1]);
    expect(filterDiffs(DIFFS, 'kho "b').map((d) => d.product_id)).toEqual([2]);
    expect(filterDiffs(DIFFS, "  ")).toHaveLength(2);
  });
});
