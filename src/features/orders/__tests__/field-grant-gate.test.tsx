import { describe, expect, it } from "vitest";

import { canEditOrderField } from "@/hooks/useOrderFieldGrants";

describe("canEditOrderField", () => {
  it("cho sửa field được cấp", () => {
    expect(canEditOrderField(["phone", "total_amount"], "phone")).toBe(true);
  });

  it("chặn field không được cấp", () => {
    expect(canEditOrderField(["phone"], "total_amount")).toBe(false);
  });

  it("chặn hết khi chưa có grant nào", () => {
    expect(canEditOrderField([], "phone")).toBe(false);
  });

  it("field ngoài catalog thì không bị quản lý", () => {
    // backend chỉ gác đúng field trong catalog; FE siết hơn backend sẽ khoá nhầm
    // những ô mà API vẫn cho ghi.
    expect(canEditOrderField([], "shipping_type")).toBe(true);
  });

  it("payload user chưa nạp xong thì không khoá nhầm", () => {
    expect(canEditOrderField(undefined, "phone")).toBe(true);
  });
});
