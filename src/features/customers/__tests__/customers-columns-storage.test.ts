/**
 * Lưu cấu hình nhóm cột của trang Khách hàng.
 *
 * Trước đây state này chỉ nằm trong useState nên mỗi lần F5 là user mất hết lựa
 * chọn — trang Đơn hàng và Bảo hành đều lưu, riêng trang này thì không.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  defaultGroupOrder,
  defaultVisibleGroupKeys,
  getStoredGroupOrder,
  getStoredVisibleGroups,
  setStoredGroupOrder,
  setStoredVisibleGroups,
} from "@/features/customers/customers-columns-storage";
import { COLUMN_GROUPS, type ColumnGroupKey } from "@/pages/customers/profile-columns";

const VISIBLE_KEY = "desi_customers_visible_column_groups";
const ORDER_KEY = "desi_customers_column_group_order";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("customers-columns-storage — mặc định", () => {
  it("chưa lưu gì thì trả về nhóm mặc định của code", () => {
    expect(getStoredVisibleGroups()).toEqual(defaultVisibleGroupKeys());
    expect(getStoredGroupOrder()).toEqual(defaultGroupOrder());
  });

  it("mặc định đúng bằng các nhóm có defaultVisible", () => {
    expect(defaultVisibleGroupKeys()).toEqual(
      COLUMN_GROUPS.filter((group) => group.defaultVisible).map((group) => group.key),
    );
  });
});

describe("customers-columns-storage — đọc lại sau khi ghi", () => {
  it("giữ nguyên lựa chọn qua một vòng ghi/đọc", () => {
    const picked: ColumnGroupKey[] = ["identity", "persona"];
    setStoredVisibleGroups(picked);
    setStoredGroupOrder(["identity", "persona", "purchase"]);

    expect(getStoredVisibleGroups()).toEqual(picked);
    expect(getStoredGroupOrder().slice(0, 3)).toEqual(["identity", "persona", "purchase"]);
  });

  it("nhóm mới thêm vào code được xếp sau phần thứ tự đã lưu", () => {
    setStoredGroupOrder(["identity"]);

    const order = getStoredGroupOrder();
    expect(order[0]).toBe("identity");
    // Không mất nhóm nào: thứ tự cũ + phần còn lại của COLUMN_GROUPS.
    expect([...order].sort()).toEqual([...COLUMN_GROUPS.map((group) => group.key)].sort());
  });
});

describe("customers-columns-storage — dữ liệu hỏng", () => {
  it("bỏ qua key lạ còn sót trong localStorage", () => {
    localStorage.setItem(VISIBLE_KEY, JSON.stringify(["identity", "nhom_da_bi_xoa"]));

    expect(getStoredVisibleGroups()).toEqual(["identity"]);
  });

  it("JSON hỏng hoặc mảng rỗng thì quay về mặc định", () => {
    localStorage.setItem(VISIBLE_KEY, "{khong-phai-json");
    expect(getStoredVisibleGroups()).toEqual(defaultVisibleGroupKeys());

    localStorage.setItem(ORDER_KEY, JSON.stringify([]));
    expect(getStoredGroupOrder()).toEqual(defaultGroupOrder());
  });
});
