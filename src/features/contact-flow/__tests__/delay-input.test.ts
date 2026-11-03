import { describe, expect, it } from "vitest";

import { minutesToParts, partsToMinutes } from "../delay-utils";

describe("minutesToParts / partsToMinutes round-trip", () => {
  it("30 phút → {value: 30, unit: phut} → 30", () => {
    const parts = minutesToParts(30);
    expect(parts).toEqual({ value: 30, unit: "phut" });
    expect(partsToMinutes(parts.value, parts.unit)).toBe(30);
  });

  it("60 phút → {value: 1, unit: gio} → 60", () => {
    const parts = minutesToParts(60);
    expect(parts).toEqual({ value: 1, unit: "gio" });
    expect(partsToMinutes(parts.value, parts.unit)).toBe(60);
  });

  it("14400 phút → {value: 10, unit: ngay} → 14400", () => {
    const parts = minutesToParts(14400);
    expect(parts).toEqual({ value: 10, unit: "ngay" });
    expect(partsToMinutes(parts.value, parts.unit)).toBe(14400);
  });

  it("null/0 → mặc định {value: 0, unit: phut}", () => {
    expect(minutesToParts(null)).toEqual({ value: 0, unit: "phut" });
    expect(minutesToParts(0)).toEqual({ value: 0, unit: "phut" });
  });

  it("số phút lẻ (không chia hết 60/1440) giữ nguyên đơn vị phút", () => {
    const parts = minutesToParts(90);
    expect(parts).toEqual({ value: 90, unit: "phut" });
    expect(partsToMinutes(parts.value, parts.unit)).toBe(90);
  });

  it("partsToMinutes quy đổi đúng theo đơn vị", () => {
    expect(partsToMinutes(2, "gio")).toBe(120);
    expect(partsToMinutes(3, "ngay")).toBe(4320);
    expect(partsToMinutes(45, "phut")).toBe(45);
  });
});
