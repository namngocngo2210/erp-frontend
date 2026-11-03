import { describe, expect, it } from "vitest";

import { getCarrier, normalizePhoneDigits } from "@/lib/phone-carrier";

describe("normalizePhoneDigits", () => {
  it("bỏ ký tự không phải số", () => {
    expect(normalizePhoneDigits("098.765-4321")).toBe("0987654321");
    expect(normalizePhoneDigits("098 765 4321")).toBe("0987654321");
  });

  it("chuyển +84/84 về 0", () => {
    expect(normalizePhoneDigits("+84987654321")).toBe("0987654321");
    expect(normalizePhoneDigits("84987654321")).toBe("0987654321");
    expect(normalizePhoneDigits("+84 98 765-4321")).toBe("0987654321");
  });

  it("thêm lại số 0 đầu cho số 9 chữ số (mất 0 kiểu Excel)", () => {
    expect(normalizePhoneDigits("987654321")).toBe("0987654321");
    expect(normalizePhoneDigits("912345678")).toBe("0912345678");
  });

  it("không phá số bắt đầu bằng 0 hoặc chuỗi rỗng", () => {
    expect(normalizePhoneDigits("0841234567")).toBe("0841234567");
    expect(normalizePhoneDigits("")).toBe("");
  });
});

describe("getCarrier", () => {
  it.each([
    ["0987654321", "viettel"],
    ["0345678901", "viettel"],
    ["0912345678", "vinaphone"],
    ["0831234567", "vinaphone"],
    ["0905123456", "mobifone"],
    ["0771234567", "mobifone"],
    ["0921234567", "vietnamobile"],
    ["0991234567", "gmobile"],
    ["0871234567", "itel"],
    ["0551234567", "wintel"],
  ])("%s → %s", (phone, key) => {
    expect(getCarrier(phone)?.key).toBe(key);
  });

  it("nhận diện qua các dạng +84/84/mất số 0 đầu", () => {
    expect(getCarrier("+84987654321")?.key).toBe("viettel");
    expect(getCarrier("84912345678")?.key).toBe("vinaphone");
    expect(getCarrier("905123456")?.key).toBe("mobifone");
  });

  it("trả null cho số bàn, số rác, chuỗi rỗng", () => {
    expect(getCarrier("0241234567")).toBeNull(); // số bàn Hà Nội
    expect(getCarrier("12345")).toBeNull();
    expect(getCarrier("")).toBeNull();
    expect(getCarrier("abc")).toBeNull();
  });

  it("trả nhãn hiển thị ngắn in hoa", () => {
    expect(getCarrier("0987654321")?.shortLabel).toBe("VIETTEL");
    expect(getCarrier("0905123456")?.shortLabel).toBe("MOBI");
    expect(getCarrier("0912345678")?.shortLabel).toBe("VINA");
  });
});
