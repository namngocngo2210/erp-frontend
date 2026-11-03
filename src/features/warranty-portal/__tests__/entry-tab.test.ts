import { describe, expect, it } from "vitest";

import { portalTabParam, resolveEntryTab } from "@/features/warranty-portal/entry-tab";

describe("resolveEntryTab", () => {
  it("không có query thì mở tab Vận đơn (khách vào từ web)", () => {
    expect(resolveEntryTab("")).toBe("track");
    expect(resolveEntryTab("?")).toBe("track");
  });

  it("mở tab Bảo hành khi link Zalo OA truyền ?tab=kich-hoat", () => {
    expect(resolveEntryTab("?tab=kich-hoat")).toBe("activate");
    expect(resolveEntryTab("tab=kich-hoat")).toBe("activate");
  });

  it("nhận cả tên khoá tiếng Anh và không phân biệt hoa thường/khoảng trắng", () => {
    expect(resolveEntryTab("?tab=activate")).toBe("activate");
    expect(resolveEntryTab("?tab=%20KICH-HOAT%20")).toBe("activate");
    expect(resolveEntryTab("?tab=track")).toBe("track");
    expect(resolveEntryTab("?tab=van-don")).toBe("track");
  });

  it("giá trị lạ thì rơi về mặc định thay vì lỗi", () => {
    expect(resolveEntryTab("?tab=khong-ton-tai")).toBe("track");
    expect(resolveEntryTab("?tab=")).toBe("track");
  });

  it("bỏ qua các query khác trên link", () => {
    expect(resolveEntryTab("?utm_source=zalo&tab=kich-hoat&utm_medium=oa")).toBe("activate");
  });
});

describe("portalTabParam", () => {
  it("sinh đúng giá trị dùng trong link ngoài", () => {
    expect(portalTabParam("activate")).toBe("kich-hoat");
    expect(portalTabParam("track")).toBe("van-don");
  });

  it("khứ hồi với resolveEntryTab", () => {
    for (const tab of ["activate", "track"] as const) {
      expect(resolveEntryTab(`?tab=${portalTabParam(tab)}`)).toBe(tab);
    }
  });
});
