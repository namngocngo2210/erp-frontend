import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_EMPLOYEE_FILTERS,
  getStoredEmployeeFilters,
  setStoredEmployeeFilters,
} from "../hr-employees-storage";

const KEY = "desi_hr_employees_filters";

describe("hr-employees-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("trả mặc định khi chưa có gì lưu", () => {
    expect(getStoredEmployeeFilters()).toEqual(DEFAULT_EMPLOYEE_FILTERS);
  });

  it("round-trip lưu rồi đọc lại", () => {
    setStoredEmployeeFilters({ department: "12", state: "resigned" });
    expect(getStoredEmployeeFilters()).toEqual({ department: "12", state: "resigned" });
  });

  it("bỏ qua state không hợp lệ, fallback về all", () => {
    localStorage.setItem(KEY, JSON.stringify({ department: "3", state: "bogus" }));
    expect(getStoredEmployeeFilters()).toEqual({ department: "3", state: "all" });
  });

  it("bỏ qua JSON hỏng, trả mặc định", () => {
    localStorage.setItem(KEY, "{not-json");
    expect(getStoredEmployeeFilters()).toEqual(DEFAULT_EMPLOYEE_FILTERS);
  });

  it("department không phải chuỗi thì fallback về all", () => {
    localStorage.setItem(KEY, JSON.stringify({ department: 5, state: "working" }));
    expect(getStoredEmployeeFilters()).toEqual({ department: "all", state: "working" });
  });
});
