import { beforeEach, describe, expect, it } from "vitest";

import { getDateRange } from "@/components/ui/date-filter";
import {
  createDefaultStoredFilters,
  getFilterStorageKey,
  getStoredLockedOrderColumns,
  getStoredOrderColumns,
  getStoredOrderFilters,
  ORDER_COLUMNS_STORAGE_KEY,
  ORDER_LOCKED_COLUMNS_STORAGE_KEY,
  type StoredOrderFilters,
} from "@/features/orders/order-storage";

/**
 * Bộ lọc được LƯU nhưng không được ĐỌC lại thì user mất lọc sau mỗi lần F5 mà
 * không có dấu hiệu gì. Phần parse từng liệt kê tay từng trường nên mỗi filter mới
 * là một lần rủi ro bỏ sót — test này khoá lại hợp đồng "ghi gì đọc lại được nấy".
 */

const SCOPE = "orders" as const;

/** Giá trị KHÁC mặc định cho mọi trục, để trường nào không được parse sẽ lộ ra. */
function makeNonDefaultPayload(): StoredOrderFilters {
  const defaults = createDefaultStoredFilters();
  const payload = { ...defaults } as Record<string, unknown>;
  for (const [key, value] of Object.entries(defaults)) {
    if (Array.isArray(value)) payload[key] = ["x"];
    else if (typeof value === "string") payload[key] = "yes";
  }
  payload.dateFilter = { option: "custom", from: "2020-01-01", to: "2020-01-31" };
  payload.returnDateFilter = { option: "custom", from: "2020-02-01", to: "2020-02-02" };
  payload.kiotvietPurchaseDateFilter = { option: "custom", from: "2020-03-01", to: "2020-03-02" };
  return payload as StoredOrderFilters;
}

beforeEach(() => {
  localStorage.clear();
});

describe("getStoredOrderFilters", () => {
  it("đọc lại được MỌI trục đã lưu — không trục nào rơi về mặc định", () => {
    const payload = makeNonDefaultPayload();
    localStorage.setItem(getFilterStorageKey(SCOPE), JSON.stringify(payload));

    const loaded = getStoredOrderFilters(SCOPE);
    const defaults = createDefaultStoredFilters();

    const droppedToDefault = (Object.keys(defaults) as Array<keyof StoredOrderFilters>).filter(
      (key) => JSON.stringify(loaded[key]) === JSON.stringify(defaults[key]),
    );
    expect(droppedToDefault).toEqual([]);
    expect(loaded).toEqual(payload);
  });

  it("tính lại khoảng ngày của preset theo hôm nay, bỏ from/to đã lưu", () => {
    localStorage.setItem(
      getFilterStorageKey(SCOPE),
      JSON.stringify({
        ...createDefaultStoredFilters(),
        dateFilter: { option: "this_month", from: "2001-01-01", to: "2001-01-31" },
      }),
    );

    const range = getDateRange("this_month");
    expect(getStoredOrderFilters(SCOPE).dateFilter).toEqual({
      option: "this_month",
      from: range.from,
      to: range.to,
    });
  });

  it("payload thiếu dateFilter → không áp biên ngày (from/to rỗng)", () => {
    localStorage.setItem(getFilterStorageKey(SCOPE), JSON.stringify({ status: ["1"] }));

    const loaded = getStoredOrderFilters(SCOPE);
    expect(loaded.dateFilter).toEqual({ option: "this_month", from: "", to: "" });
    expect(loaded.status).toEqual(["1"]);
  });

  it("chưa lưu gì hoặc JSON hỏng → về mặc định", () => {
    expect(getStoredOrderFilters(SCOPE)).toEqual(createDefaultStoredFilters());

    localStorage.setItem(getFilterStorageKey(SCOPE), "{not-json");
    expect(getStoredOrderFilters(SCOPE)).toEqual(createDefaultStoredFilters());
  });

  it("chuẩn hoá mảng: bỏ rỗng/'all', trim và khử trùng lặp", () => {
    localStorage.setItem(
      getFilterStorageKey(SCOPE),
      JSON.stringify({ status: [" 1 ", "1", "all", ""], channel: "fb" }),
    );

    const loaded = getStoredOrderFilters(SCOPE);
    expect(loaded.status).toEqual(["1"]);
    expect(loaded.channel).toEqual(["fb"]);
  });
});

/**
 * Ba cột thu hồi rời đã gộp thành một cột `recall_entries` trên lưới. Cấu hình
 * cột nằm ở localStorage của từng client nên KHÔNG deploy nào dọn hộ được — đọc
 * lên phải tự đổi, không thì trang KOC của người dùng cũ mất sạch cột thu hồi.
 */
describe("gộp cột thu hồi cũ khi đọc cấu hình cột", () => {
  it("đổi 3 key cũ thành một cột gộp, giữ đúng vị trí cột đầu tiên", () => {
    localStorage.setItem(
      ORDER_COLUMNS_STORAGE_KEY,
      JSON.stringify([
        "invoice_code",
        "recall_code",
        "recall_created_date",
        "recall_received_date",
        "status",
      ]),
    );

    const columns = getStoredOrderColumns();
    // Không assert cả mảng: FORCED_COLUMN_MIGRATIONS còn chèn thêm cột ở đầu.
    expect(columns.filter((key) => key.startsWith("recall"))).toEqual(["recall_entries"]);
    expect(columns.indexOf("recall_entries")).toBe(columns.indexOf("invoice_code") + 1);
    expect(columns[columns.length - 1]).toBe("status");
  });

  it("không nhân đôi khi cấu hình đã có sẵn cột gộp", () => {
    localStorage.setItem(
      ORDER_LOCKED_COLUMNS_STORAGE_KEY,
      JSON.stringify(["recall_entries", "recall_code", "recall_received_date"]),
    );

    expect(getStoredLockedOrderColumns()).toEqual(["recall_entries"]);
  });
});
