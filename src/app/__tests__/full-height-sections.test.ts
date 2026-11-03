import { describe, expect, it } from "vitest";

import { isFullHeightSection, sectionFromPath } from "@/lib/routes";

/**
 * Khung layout của `<main>` trong RootLayout có HAI chế độ:
 *  - full-height: `overflow-hidden flex flex-col` — trang tự quản lý cuộn nội bộ.
 *  - luồng thường: `overflow-y-auto` + bọc `<div>` cao auto — trang cuộn cả khối.
 *
 * Trang mở đầu bằng `flex h-full min-h-0 flex-col` BẮT BUỘC phải ở chế độ đầu:
 * `height: 100%` đặt trong cha cao `auto` không phân giải được, nó rơi về `auto`
 * và mọi `flex-1` / `min-h-0` / `overflow-y-auto` bên dưới mất tác dụng — panel
 * thôi tự cuộn, nở theo nội dung, để lại vùng trống lớn dưới thẻ.
 *
 * Trang Phân quyền đã dính đúng lỗi này: nó dùng `h-full` nhưng `/settings/roles`
 * khớp chính xác trong SECTION_TO_PATH nên trả về section "roles", KHÔNG rơi vào
 * fallback "orders" như các trang h-full khác vẫn ngầm dựa vào.
 */
describe("isFullHeightSection", () => {
  it("trang Phân quyền phải ở chế độ full-height", () => {
    expect(isFullHeightSection("roles")).toBe(true);
  });

  it("giữ nguyên ba section đơn hàng", () => {
    expect(isFullHeightSection("orders")).toBe(true);
    expect(isFullHeightSection("landing-orders")).toBe(true);
    expect(isFullHeightSection("koc-orders")).toBe(true);
  });

  it("trang luồng thường KHÔNG bị ép full-height", () => {
    expect(isFullHeightSection("dashboard")).toBe(false);
    expect(isFullHeightSection("products")).toBe(false);
    expect(isFullHeightSection("employees")).toBe(false);
  });
});

describe("sectionFromPath — lý do trang Phân quyền cần khai riêng", () => {
  it("/settings/roles trả về 'roles', không rơi vào fallback 'orders'", () => {
    expect(sectionFromPath("/settings/roles")).toBe("roles");
  });

  it("route con của warranty vẫn rơi vào fallback nên tự có khung đúng", () => {
    expect(sectionFromPath("/aftersales/warranty/123")).toBe("orders");
  });
});
