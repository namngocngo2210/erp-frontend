import { describe, it, expect } from "vitest";

import {
  normalizeDecimalInput,
  parseDimensions,
  normalizeCustomerGenderForPatch,
} from "@/features/orders/order-normalizers";

describe("normalizeDecimalInput", () => {
  it("bỏ dấu phẩy phân cách hàng nghìn (kiểu US, như cũ)", () => {
    expect(normalizeDecimalInput("1,234,567")).toBe("1234567");
    expect(normalizeDecimalInput("1,234.56")).toBe("1234.56");
    // Phẩy đơn lẻ không phải nhóm-3 vẫn là thousand-separator.
    expect(normalizeDecimalInput("2,500")).toBe("2500");
  });

  it("dấu chấm nhóm-3 kiểu VN là phân cách nghìn", () => {
    expect(normalizeDecimalInput("2.500.000")).toBe("2500000");
    expect(normalizeDecimalInput("2.500")).toBe("2500");
    expect(normalizeDecimalInput("12.345.678")).toBe("12345678");
    // Nhóm đầu >3 chữ số vẫn hợp lệ — chỉ yêu cầu mọi nhóm SAU dấu chấm đúng 3 chữ số.
    expect(normalizeDecimalInput("2500.000")).toBe("2500000");
  });

  it("hỗn hợp chấm-nghìn + phẩy-thập-phân kiểu VN", () => {
    expect(normalizeDecimalInput("2.500.000,5")).toBe("2500000.5");
    expect(normalizeDecimalInput("1.234,56")).toBe("1234.56");
  });

  it("dấu chấm không theo nhóm-3 vẫn là thập phân", () => {
    expect(normalizeDecimalInput("2.5")).toBe("2.5");
    expect(normalizeDecimalInput("2.50")).toBe("2.50");
    expect(normalizeDecimalInput("1.2345")).toBe("1.2345");
  });

  it("phần nguyên 0 / rỗng luôn là thập phân, kể cả khi nhóm sau có 3 chữ số", () => {
    // "0.500" là 0.5 (vd cân nặng kg), không phải 500.
    expect(normalizeDecimalInput("0.500")).toBe("0.500");
    expect(normalizeDecimalInput(".500")).toBe(".500");
  });

  it("có dấu phẩy kiểu US thì dấu chấm là thập phân, không áp nhóm-3", () => {
    // "1,234.567" kiểu US = 1234.567, KHÔNG phải 1234567.
    expect(normalizeDecimalInput("1,234.567")).toBe("1234.567");
  });

  it("bỏ ký tự rác, giữ chữ số", () => {
    expect(normalizeDecimalInput("12abc3")).toBe("123");
    expect(normalizeDecimalInput("₫ 50000")).toBe("50000");
    expect(normalizeDecimalInput("₫ 2.500.000")).toBe("2500000");
  });

  it("nhiều dấu chấm không hợp lệ nhóm-3 → gộp thành một phần thập phân như cũ", () => {
    // Characterization: "1.2.3" → integer "1", fraction "23".
    expect(normalizeDecimalInput("1.2.3")).toBe("1.23");
    expect(normalizeDecimalInput("1.234.56")).toBe("1.23456");
  });

  it("giữ dấu âm chỉ khi đứng đầu, bỏ dấu trừ giữa chuỗi", () => {
    expect(normalizeDecimalInput("-1,000.5")).toBe("-1000.5");
    expect(normalizeDecimalInput("-2.500.000")).toBe("-2500000");
    expect(normalizeDecimalInput("-2.500.000,5")).toBe("-2500000.5");
    expect(normalizeDecimalInput("1-2")).toBe("12");
  });

  it("chuỗi rỗng / toàn khoảng trắng / không có số → rỗng", () => {
    expect(normalizeDecimalInput("")).toBe("");
    expect(normalizeDecimalInput("   ")).toBe("");
    expect(normalizeDecimalInput("abc")).toBe("");
    expect(normalizeDecimalInput(".")).toBe("");
  });

  it("phần thập phân không có phần nguyên vẫn giữ", () => {
    expect(normalizeDecimalInput(".5")).toBe(".5");
  });

  it("characterization: chuỗi chỉ có dấu '-' trả về '-'", () => {
    // Hành vi hiện tại — caller chịu trách nhiệm validate số hợp lệ.
    expect(normalizeDecimalInput("-")).toBe("-");
  });
});

describe("parseDimensions", () => {
  it("tách LxWxH với các separator x / X / × / *", () => {
    expect(parseDimensions("10x20x30")).toEqual(["10", "20", "30"]);
    expect(parseDimensions("10 X 20 × 30")).toEqual(["10", "20", "30"]);
    expect(parseDimensions("10*20*30")).toEqual(["10", "20", "30"]);
  });

  it("thiếu token → điền chuỗi rỗng", () => {
    expect(parseDimensions("10x20")).toEqual(["10", "20", ""]);
    expect(parseDimensions("10")).toEqual(["10", "", ""]);
  });

  it("rỗng / undefined → 3 chuỗi rỗng", () => {
    expect(parseDimensions("")).toEqual(["", "", ""]);
    expect(parseDimensions(undefined)).toEqual(["", "", ""]);
    expect(parseDimensions("   ")).toEqual(["", "", ""]);
  });

  it("token thừa bị cắt còn 3", () => {
    expect(parseDimensions("1x2x3x4")).toEqual(["1", "2", "3"]);
  });

  it("token rỗng bị dồn lại (filter Boolean) trước khi gán vị trí", () => {
    // Characterization: "x20x" → ["20", "", ""] chứ không phải ["", "20", ""].
    expect(parseDimensions("x20x")).toEqual(["20", "", ""]);
  });
});

describe("normalizeCustomerGenderForPatch", () => {
  it("null / undefined / chuỗi rỗng → null (clear)", () => {
    expect(normalizeCustomerGenderForPatch(null)).toBeNull();
    expect(normalizeCustomerGenderForPatch(undefined)).toBeNull();
    expect(normalizeCustomerGenderForPatch("")).toBeNull();
  });

  it("0 / '0' → 0 (nữ); 1 / '1' → 1 (nam)", () => {
    expect(normalizeCustomerGenderForPatch(0)).toBe(0);
    expect(normalizeCustomerGenderForPatch("0")).toBe(0);
    expect(normalizeCustomerGenderForPatch(1)).toBe(1);
    expect(normalizeCustomerGenderForPatch("1")).toBe(1);
  });

  it("chuỗi female/male không phân biệt hoa thường, có khoảng trắng", () => {
    expect(normalizeCustomerGenderForPatch("female")).toBe(0);
    expect(normalizeCustomerGenderForPatch(" MALE ")).toBe(1);
    expect(normalizeCustomerGenderForPatch("Female")).toBe(0);
  });

  it("giá trị không hợp lệ → undefined (giữ nguyên, không patch)", () => {
    expect(normalizeCustomerGenderForPatch(2)).toBeUndefined();
    expect(normalizeCustomerGenderForPatch("other")).toBeUndefined();
    expect(normalizeCustomerGenderForPatch(true)).toBeUndefined();
    expect(normalizeCustomerGenderForPatch({})).toBeUndefined();
  });
});
