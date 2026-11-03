import { describe, expect, it } from "vitest";

import type { PancakePosStatus } from "@/lib/api/pancakePos";
import {
  blockReason,
  hasRunningRun,
  parseLimit,
  parseSkuList,
  runState,
  sortedReasons,
} from "@/features/pancake-pos/sync-logic";

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

describe("parseSkuList", () => {
  it("tách theo phẩy/khoảng trắng/xuống dòng, bỏ trống, khử trùng không phân biệt hoa thường", () => {
    expect(parseSkuList(" OHI01-DEN, ohi01-den\nGOI01;;  MDD01 ")).toEqual([
      "OHI01-DEN",
      "GOI01",
      "MDD01",
    ]);
    expect(parseSkuList("   ")).toEqual([]);
  });
});

describe("parseLimit", () => {
  it("rỗng = không giới hạn, số nguyên dương = giới hạn, còn lại = lỗi", () => {
    expect(parseLimit("")).toBeUndefined();
    expect(parseLimit(" 20 ")).toBe(20);
    expect(parseLimit("0")).toBeNull();
    expect(parseLimit("-3")).toBeNull();
    expect(parseLimit("2.5")).toBeNull();
    expect(parseLimit("abc")).toBeNull();
  });
});

describe("runState", () => {
  it("đang chạy / lỗi chặn cả lượt / có xung đột-lỗi / xong", () => {
    expect(runState({ finished_at: null, fatal: "", conflicts: 0, errors: 0 })).toBe("running");
    expect(runState({ finished_at: "t", fatal: "HTTP 401", conflicts: 0, errors: 0 })).toBe(
      "failed",
    );
    expect(runState({ finished_at: "t", fatal: "", conflicts: 2, errors: 0 })).toBe("warning");
    expect(runState({ finished_at: "t", fatal: "", errors: 1 })).toBe("warning");
    expect(runState({ finished_at: "t", fatal: "" })).toBe("done");
  });
});

describe("blockReason", () => {
  it("dry-run chỉ cần key + shop; đồng bộ ghi cần thêm cờ bật", () => {
    expect(blockReason(READY, "dry_run")).toBeNull();
    expect(blockReason(READY, "full")).toBeNull();
    const off = { ...READY, enabled: false };
    expect(blockReason(off, "dry_run")).toBeNull();
    expect(blockReason(off, "full")).toBe("pancakePos.block.disabled");
  });

  it("thiếu key/shop, đang chạy, chưa tải", () => {
    expect(blockReason(undefined, "dry_run")).toBe("pancakePos.block.loading");
    expect(blockReason({ ...READY, active_run_id: 7 }, "dry_run")).toBe("pancakePos.block.running");
    expect(blockReason({ ...READY, api_key_set: false }, "dry_run")).toBe("pancakePos.block.noKey");
    expect(blockReason({ ...READY, shop_id: 0 }, "full")).toBe("pancakePos.block.noShop");
  });
});

describe("hasRunningRun / sortedReasons", () => {
  it("poll khi có lượt chưa xong hoặc BE báo đang chạy", () => {
    expect(hasRunningRun([{ finished_at: "t" }], READY)).toBe(false);
    expect(hasRunningRun([{ finished_at: null }], READY)).toBe(true);
    expect(hasRunningRun(undefined, { ...READY, active_run_id: 3 })).toBe(true);
  });

  it("lý do loại sắp giảm dần theo số lượng", () => {
    expect(sortedReasons({ combo: 2, inactive: 9, mode_never: 2 })).toEqual([
      ["inactive", 9],
      ["combo", 2],
      ["mode_never", 2],
    ]);
    expect(sortedReasons(undefined)).toEqual([]);
  });
});
