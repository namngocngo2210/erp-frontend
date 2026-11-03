import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import { Sidebar, MobileNavDrawer } from "@/components/Sidebar";
import { APP_MODULES } from "@/app/modules";

afterEach(cleanup);

const FULL_PERMISSIONS = [
  ...new Set(
    APP_MODULES.flatMap((m) => m.sections.flatMap((s) => s.requiresAny ?? [s.requires ?? s.key])),
  ),
];

function renderSidebar(allowedSections: string[], collapsed = false) {
  return render(
    <I18nProvider>
      <Sidebar
        active="orders"
        allowedSections={allowedSections}
        collapsed={collapsed}
        onChange={() => {}}
      />
    </I18nProvider>,
  );
}

describe("Sidebar accordion (desktop mở rộng)", () => {
  it("hiện item phẳng báo cáo và header 7 zone khi đủ quyền", () => {
    const { container } = renderSidebar(FULL_PERMISSIONS);
    expect(screen.getByRole("link", { name: "Báo cáo Sale" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Báo cáo Ads" })).toBeTruthy();
    // Header zone là <p> chữ hoa; nhóm module "Kho"/"Marketing"/"Media" là <button>
    // cùng tên nên phải lọc theo thẻ để không nhầm.
    const zoneLabels = [...container.querySelectorAll("nav p")].map((el) => el.textContent);
    expect(zoneLabels).toEqual([
      "Vận hành, quản lý",
      "Kho",
      "Marketing",
      "Media",
      "Tiện ích",
      "Hành chính nhân sự",
      "Cài đặt, thiết lập",
    ]);
  });

  it("mỗi zone có cấu hình riêng hiện một nút dropdown 'Cài đặt' (ops, marketing, HR, settings)", () => {
    renderSidebar(FULL_PERMISSIONS);
    // 4 dropdown Cài đặt theo zone (ops/marketing/hr/settings — settings chứa
    // "Cấu hình hệ thống", xem nav-layout.ts) + nhóm "Quản trị" của zone cuối
    // (module settings gốc: users/roles/media-settings/audit) là nút riêng.
    expect(screen.getAllByRole("button", { name: "Cài đặt" })).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Quản trị" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nhân sự" })).toBeTruthy();
    expect(screen.queryByText("sidebar.group.settings")).toBeNull();
  });

  it("sidebar mở rộng dùng w-72 để nhãn dài không bị cắt", () => {
    const { container } = renderSidebar(FULL_PERMISSIONS);
    expect(container.querySelector("aside")?.className).toContain("w-72");
  });

  it("nhãn nhóm module sales/cskh dịch đúng, không rơi về khóa i18n thô", () => {
    renderSidebar(FULL_PERMISSIONS);
    // t() trả nguyên khóa khi tra hụt (xem src/i18n.tsx), nên nếu labelKey của
    // module sai/thiếu bản dịch, sidebar sẽ hiện chuỗi "sidebar.group.orders"
    // hoặc "sidebar.group.cskh" thay vì nhãn tiếng Việt — assertion dưới bắt lỗi đó.
    expect(screen.getByRole("button", { name: "Đơn hàng" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "CSKH" })).toBeTruthy();
    expect(screen.queryByText("sidebar.group.orders")).toBeNull();
    expect(screen.queryByText("sidebar.group.cskh")).toBeNull();
  });

  it("ẩn block phẳng khi không có quyền báo cáo", () => {
    renderSidebar(["orders"]);
    expect(screen.queryByRole("link", { name: "Báo cáo Sale" })).toBeNull();
    expect(screen.getByText("Vận hành, quản lý")).toBeTruthy();
  });

  it("ẩn header zone khi cả zone không có quyền", () => {
    renderSidebar(["orders"]);
    expect(screen.queryByText("Cài đặt, thiết lập")).toBeNull();
  });
});

describe("SidebarRail (thu gọn)", () => {
  it("hiện icon phẳng điều hướng thẳng (title = tên trang) và không hiện header text", () => {
    renderSidebar(FULL_PERMISSIONS, true);
    expect(screen.getByTitle("Báo cáo Sale")).toBeTruthy();
    expect(screen.getByTitle("Báo cáo Ads")).toBeTruthy();
    // Rail không render label zone dạng text, chỉ divider.
    expect(screen.queryByText("Vận hành, quản lý")).toBeNull();
  });

  it("ẩn icon phẳng khi không có quyền báo cáo", () => {
    renderSidebar(["orders"], true);
    expect(screen.queryByTitle("Báo cáo Sale")).toBeNull();
  });

  it("không render divider phía trên zone đầu khi không có item phẳng", () => {
    const { container } = renderSidebar(["orders"], true);
    expect(
      container.querySelectorAll('[aria-hidden].border-t, [aria-hidden][class*="border-t"]').length,
    ).toBe(0);
  });
});

describe("MobileNavDrawer", () => {
  it("hiện item phẳng và header zone khi mở", () => {
    render(
      <I18nProvider>
        <MobileNavDrawer
          active="orders"
          allowedSections={FULL_PERMISSIONS}
          open
          onChange={() => {}}
          onClose={() => {}}
        />
      </I18nProvider>,
    );
    expect(screen.getByRole("link", { name: "Báo cáo Sale" })).toBeTruthy();
    expect(screen.getByText("Vận hành, quản lý")).toBeTruthy();
    expect(screen.getByText("Cài đặt, thiết lập")).toBeTruthy();
  });
});
