import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppShellContext, type AppShellContextValue } from "@/app/AppShellContext";
import { DefaultRedirect, Guard } from "@/app/route-guards";
import { LAST_MODULE_STORAGE_KEY } from "@/app/modules";
import { renderWithI18n } from "@/test/render-with-i18n";

/**
 * Regression: đăng nhập tài khoản ít quyền hơn trên URL của trang chỉ admin vào
 * được (admin → logout → staff) làm guard đẩy về "/", còn "/" lại đẩy ngược về
 * đúng trang đó ⇒ nhảy trang vô hạn giữa trang thiếu quyền và trang mặc định.
 * Mọi đích redirect vì thiếu quyền phải là trang user THỰC SỰ vào được.
 */

type TestUser = {
  allowed_sections: string[];
  is_superuser?: boolean;
  department?: { id: number } | null;
};

function renderAt(path: string, user: TestUser) {
  return renderWithI18n(
    <AppShellContext.Provider value={{ user } as unknown as AppShellContextValue}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<DefaultRedirect />} />
          <Route
            path="/settings/users"
            element={
              <Guard section="users">
                <div>users page</div>
              </Guard>
            }
          />
          <Route path="/sales/orders" element={<div>orders page</div>} />
          <Route path="/settings/channels" element={<div>channels page</div>} />
        </Routes>
      </MemoryRouter>
    </AppShellContext.Provider>,
  );
}

describe("redirect khi thiếu quyền không được lặp vô hạn", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("trang thiếu quyền → dừng ở section mặc định của user", () => {
    // Module dùng gần nhất là của admin vừa thoát: section mặc định (users) chỉ admin vào được.
    window.localStorage.setItem(LAST_MODULE_STORAGE_KEY, "settings");
    renderAt("/settings/users", { allowed_sections: ["orders", "channels"] });

    expect(screen.queryByText("users page")).not.toBeInTheDocument();
    expect(screen.getByText("orders page")).toBeInTheDocument();
  });

  it("user không có cả quyền orders vẫn dừng ở trang mình vào được", () => {
    window.localStorage.setItem(LAST_MODULE_STORAGE_KEY, "settings");
    renderAt("/settings/users", { allowed_sections: ["channels"] });

    expect(screen.getByText("channels page")).toBeInTheDocument();
  });

  it('"/" chọn section CÓ QUYỀN trong module dùng gần nhất, không phải section đầu tiên', () => {
    window.localStorage.setItem(LAST_MODULE_STORAGE_KEY, "settings");
    renderAt("/", { allowed_sections: ["channels"] });

    expect(screen.getByText("channels page")).toBeInTheDocument();
  });

  it("tài khoản chưa được cấp quyền nào → màn hình dừng, không redirect vòng", () => {
    renderAt("/settings/users", { allowed_sections: [] });

    expect(screen.getByText("Tài khoản chưa được cấp quyền vào trang nào")).toBeInTheDocument();
  });
});
