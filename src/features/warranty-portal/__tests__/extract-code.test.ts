import { describe, expect, it } from "vitest";

import { extractWarrantyCode } from "@/features/warranty-portal/extract-code";

describe("extractWarrantyCode", () => {
  it("lấy mã từ URL http", () => {
    expect(extractWarrantyCode("http://qcheck.vn/A8K2M4P9QX")).toBe("A8K2M4P9QX");
  });

  it("lấy mã từ URL https có dấu / cuối", () => {
    expect(extractWarrantyCode("https://qcheck.vn/A8K2M4P9QX/")).toBe("A8K2M4P9QX");
  });

  it("chuỗi thuần chữ thường -> viết hoa", () => {
    expect(extractWarrantyCode("a8k2m4p9qx")).toBe("A8K2M4P9QX");
  });

  it("loại khoảng trắng và gạch nối", () => {
    expect(extractWarrantyCode(" A8K2-M4P9 QX ")).toBe("A8K2M4P9QX");
  });

  it("chuỗi rỗng -> trả rỗng", () => {
    expect(extractWarrantyCode("")).toBe("");
  });

  it("URL không có path -> trả rỗng", () => {
    expect(extractWarrantyCode("http://qcheck.vn")).toBe("");
    expect(extractWarrantyCode("http://qcheck.vn/")).toBe("");
  });
});
