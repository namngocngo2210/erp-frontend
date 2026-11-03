import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";

describe("can()", () => {
  it("returns true for superuser regardless of list", () => {
    expect(can({ is_superuser: true, permissions: [] }, "orders:edit")).toBe(true);
  });
  it("returns true when code present", () => {
    expect(can({ permissions: ["orders:view"] }, "orders:view")).toBe(true);
  });
  it("returns false when code absent", () => {
    expect(can({ permissions: ["orders:view"] }, "orders:edit")).toBe(false);
  });
  it("returns false for null user", () => {
    expect(can(null, "orders:view")).toBe(false);
  });
});
