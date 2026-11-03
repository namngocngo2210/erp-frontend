import { describe, expect, it } from "vitest";
import { MESSAGES_VI } from "./messages";
import { MESSAGES_EN } from "./messages-en";

const vi = MESSAGES_VI as Record<string, string>;
const en = MESSAGES_EN as Record<string, string>;

// 7.2 — `orders.filters.salesStatusAll` was referenced via t() with an inline fallback
// but never defined in MESSAGES, so English users silently saw the Vietnamese fallback
// text instead of a real translation. Guard both languages going forward.
describe("i18n key completeness — orders.filters.salesStatusAll (7.2)", () => {
  it("is defined for vi", () => {
    expect(vi["orders.filters.salesStatusAll"]).toBe("Tất cả trạng thái");
  });

  it("is defined for en", () => {
    expect(en["orders.filters.salesStatusAll"]).toBe("All statuses");
  });
});

// Chip labels on OrdersPage were switched to reuse `status.all`, which must stay
// translated in both languages (regression guard against key removal / typo).
describe("i18n key completeness — status.all", () => {
  it("is defined for vi and en", () => {
    expect(vi["status.all"]).toBe("Tất cả");
    expect(en["status.all"]).toBe("All");
  });
});

// Hai bảng tách file để lazy-load en (audit 2026-09-23 P2-4): mọi key vi phải có
// bản en tương ứng và ngược lại, nếu không user tiếng Anh thấy key thô.
describe("i18n vi/en cùng tập key", () => {
  it("không lệch key giữa hai ngôn ngữ", () => {
    const viKeys = Object.keys(vi).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(viKeys);
  });
});
