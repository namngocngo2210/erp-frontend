import { describe, expect, it } from "vitest";

import { normalizePhone, normalizePhoneLoose, phoneDigits } from "@/lib/phone";

// Hành vi gốc của warranty-portal/phone.ts (gom về lib/phone, audit 2026-09-23 P2-2):
// mirror apps.customers.phone_utils.normalize_phone.
describe("normalizePhone — chuẩn hoá + validate số VN", () => {
  it("giữ nguyên số nội địa hợp lệ, bỏ ký tự lạ", () => {
    expect(normalizePhone("0912 345 678")).toBe("0912345678");
    expect(normalizePhone("(024) 3825-1234")).toBe("02438251234");
  });

  it("đổi mã quốc gia +84 / 0084 về 0", () => {
    expect(normalizePhone("+84912345678")).toBe("0912345678");
    expect(normalizePhone("0084912345678")).toBe("0912345678");
  });

  it("thêm 0 cho 9 số di động và 10 số cố định bắt đầu bằng 2", () => {
    expect(normalizePhone("912345678")).toBe("0912345678");
    expect(normalizePhone("2438251234")).toBe("02438251234");
  });

  it("KHÔNG cắt nhầm số nội địa 084… gõ thiếu 0", () => {
    // 10 số bắt đầu 84 → không phải quốc tế đầy đủ → thêm 0? không: 10 số, không bắt đầu 2 → giữ nguyên → trượt regex.
    expect(normalizePhone("8412345678")).toBe("");
  });

  it("trả rỗng khi không phải số VN hợp lệ", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("abc")).toBe("");
    expect(normalizePhone("12345")).toBe("");
    expect(normalizePhone("091234567890")).toBe("");
  });
});

describe("normalizePhoneLoose — dùng khi đang gõ, không validate", () => {
  it("chỉ bỏ ký tự lạ và đổi 84… → 0…", () => {
    expect(normalizePhoneLoose("+84 912 345 678")).toBe("0912345678");
    expect(normalizePhoneLoose("091")).toBe("091");
    expect(normalizePhoneLoose("")).toBe("");
  });
});

describe("phoneDigits — khoá so khớp", () => {
  it("chỉ giữ chữ số", () => {
    expect(phoneDigits("+84 (912) 345-678")).toBe("84912345678");
  });
});
