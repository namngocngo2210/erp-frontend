import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginView } from "../login-view";

const LABELS: Record<string, string> = {
  "app.login.usernamePlaceholder": "Tên đăng nhập",
  "app.login.passwordPlaceholder": "Mật khẩu",
};

function renderLogin() {
  return render(
    <LoginView
      username=""
      password=""
      loading={false}
      loginFormRef={createRef<HTMLFormElement>()}
      t={(key, fallback) => LABELS[key] ?? fallback ?? key}
      onSubmit={vi.fn()}
      onInputKeyDown={vi.fn()}
      onUsernameChange={vi.fn()}
      onPasswordChange={vi.fn()}
    />,
  );
}

describe("LoginView", () => {
  it("ô nhập có label liên kết (không chỉ placeholder) và autocomplete cho trình quản lý mật khẩu", () => {
    renderLogin();

    const username = screen.getByLabelText("Tên đăng nhập");
    expect(username).toHaveAttribute("name", "username");
    expect(username).toHaveAttribute("autocomplete", "username");

    const password = screen.getByLabelText("Mật khẩu");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("name", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
  });
});
