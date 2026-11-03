import { describe, expect, it } from "vitest";
import { groupState, toggleGroup } from "@/features/roles/permission-logic";

const MONEY = ["total_amount", "discount_amount", "shipping_fee"];

describe("toggleGroup", () => {
  it("nhóm trống → tick là cấp cả nhóm", () => {
    expect(toggleGroup([], MONEY).sort()).toEqual([...MONEY].sort());
  });

  it("nhóm đủ → tick là bỏ cả nhóm", () => {
    expect(toggleGroup(MONEY, MONEY)).toEqual([]);
  });

  it("nhóm một phần → tick là cấp nốt phần còn lại", () => {
    expect(toggleGroup(["total_amount"], MONEY).sort()).toEqual([...MONEY].sort());
  });

  it("không đụng field của nhóm khác", () => {
    expect(toggleGroup(["phone"], MONEY).sort()).toEqual([...MONEY, "phone"].sort());
  });
});

describe("groupState", () => {
  it("phân biệt đủ / một phần / trống", () => {
    expect(groupState(MONEY, MONEY)).toBe("all");
    expect(groupState(["total_amount"], MONEY)).toBe("partial");
    expect(groupState([], MONEY)).toBe("none");
  });
});
