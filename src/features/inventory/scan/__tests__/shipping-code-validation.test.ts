import { describe, expect, it } from "vitest";

import { isValidShippingCode, validateShippingCode } from "../shipping-code-validation";

describe("validateShippingCode", () => {
  // Mẫu thật rút từ prod (mọi DVVC đang chạy) — validator PHẢI nhận hết.
  const REAL_CODES = [
    "SPXVN04812345678", // Shopee Express (SPX, 17)
    "SPEVN048123456789", // Shopee Express (SPE, 18)
    "81212345678", // BEST 12 số
    "848123456789012", // 14 số
    "G8PABCDE", // GHN đời mới 8 ký tự
    "GAV12345", // GHN đời mới
    "5EG9K8", // GHN cổ 6 ký tự
    "JNT1234567890ABC", // J&T
    "LMP1234567890XYZ", // 16 ký tự
    "VN2123456789012", // 15 ký tự
    "CY6ABCDEF1234", // 13 ký tự
    "IN-20250101-000123456", // mã nội bộ có gạch, 21 ký tự
  ];

  it.each(REAL_CODES)("nhận mã hợp lệ: %s", (code) => {
    expect(isValidShippingCode(code)).toBe(true);
  });

  it("trim khoảng trắng thừa và trả mã đã chuẩn hoá", () => {
    const res = validateShippingCode("  SPXVN04812345678  ");
    expect(res).toEqual({ ok: true, code: "SPXVN04812345678" });
  });

  it("từ chối mã rỗng", () => {
    expect(validateShippingCode("").ok).toBe(false);
    expect(validateShippingCode("   ").ok).toBe(false);
  });

  it("từ chối mã quá ngắn (< 6)", () => {
    expect(isValidShippingCode("G8P")).toBe(false);
    expect(isValidShippingCode("ABCDE")).toBe(false);
  });

  it("từ chối mã quá dài (> 30) — thường là payload QR", () => {
    expect(isValidShippingCode("A".repeat(31))).toBe(false);
  });

  it("từ chối mã chứa khoảng trắng", () => {
    expect(isValidShippingCode("SPX VN 048")).toBe(false);
  });

  it("từ chối quét nhầm QR chứa URL", () => {
    expect(isValidShippingCode("https://spx.vn/track?id=SPXVN048")).toBe(false);
  });

  it("từ chối ký tự đặc biệt ngoài gạch ngang / gạch dưới", () => {
    expect(isValidShippingCode("SPX_048#12")).toBe(false);
    expect(isValidShippingCode("SPX.048.12")).toBe(false);
  });

  // GHN: tem hoàn in mã kèm "_" ở đằng sau ("_PR", "_..." hay "_" cụt cuối mã)
  // — phải PASS validate, giữ NGUYÊN mã (không cắt hậu tố) khi tra/ghi nhận.
  it("nhận mã GHN tem hoàn có _ ở đằng sau (_PR, _..., _ cụt)", () => {
    expect(validateShippingCode("G8PABCDE_PR")).toEqual({ ok: true, code: "G8PABCDE_PR" });
    expect(validateShippingCode("5EG9K8_PR")).toEqual({ ok: true, code: "5EG9K8_PR" });
    expect(validateShippingCode("  L8XYZ1234_PR  ")).toEqual({ ok: true, code: "L8XYZ1234_PR" });
    expect(validateShippingCode("G8PABCDE_")).toEqual({ ok: true, code: "G8PABCDE_" });
    expect(isValidShippingCode("G8PABCDE_R_1")).toBe(true);
  });

  it("từ chối gạch dưới ở đầu mã hoặc mã quanh gạch dưới vẫn phải hợp lệ", () => {
    expect(isValidShippingCode("_G8PABCDE")).toBe(false);
    expect(isValidShippingCode("_PR")).toBe(false);
    expect(isValidShippingCode("SPX VN048_PR")).toBe(false);
  });

  it("từ chối gạch ngang ở biên hoặc chuỗi toàn gạch", () => {
    expect(isValidShippingCode("-SPXVN048123")).toBe(false);
    expect(isValidShippingCode("SPXVN048123-")).toBe(false);
    expect(isValidShippingCode("------")).toBe(false);
  });

  it("trả message khi không hợp lệ", () => {
    const res = validateShippingCode("G8");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain("không hợp lệ");
  });
});
