import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n";
import { UserEditDialog } from "@/features/users/UserEditDialog";

function renderDialog(overrides: Partial<Parameters<typeof UserEditDialog>[0]> = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
  );
  const props = {
    open: true,
    displayName: "Hiền",
    role: "staff",
    active: "true",
    kiotvietMappings: [],
    changePassword: false,
    password: "",
    zenifyEmail: "agent-01@congty.vn",
    foxiaId: "1234",
    mediaRole: "",
    mediaApiKey: "",
    departmentId: "",
    departmentIds: [],
    roleIds: [],
    departments: [],
    roles: [],
    kiotvietChannels: [],
    onOpenChange: vi.fn(),
    onDisplayNameChange: vi.fn(),
    onRoleChange: vi.fn(),
    onActiveChange: vi.fn(),
    onKiotvietMappingsChange: vi.fn(),
    onChangePasswordToggle: vi.fn(),
    onPasswordChange: vi.fn(),
    onZenifyEmailChange: vi.fn(),
    onFoxiaIdChange: vi.fn(),
    onMediaRoleChange: vi.fn(),
    onMediaApiKeyChange: vi.fn(),
    onDepartmentIdChange: vi.fn(),
    onDepartmentIdsChange: vi.fn(),
    onRoleIdsChange: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<UserEditDialog {...props} />, { wrapper }) };
}

afterEach(cleanup);

describe("UserEditDialog", () => {
  it("không render ô mật khẩu khi chưa bật công tắc đổi mật khẩu", () => {
    // Ô mật khẩu luôn hiển thị chính là thứ để trình duyệt autofill mật khẩu của
    // admin vào, khiến mọi lần sửa thông tin khác đều ghi đè mật khẩu nhân viên.
    renderDialog();

    expect(document.querySelector("#user-edit-password")).toBeNull();
  });

  it("bật công tắc thì hiện ô mật khẩu và chặn autofill bằng autocomplete=new-password", () => {
    const { props } = renderDialog();

    fireEvent.click(screen.getByLabelText("Đổi mật khẩu"));
    expect(props.onChangePasswordToggle).toHaveBeenCalledWith(true);

    cleanup();
    renderDialog({ changePassword: true });
    const input = document.querySelector("#user-edit-password");
    expect(input).not.toBeNull();
    expect(input?.getAttribute("autocomplete")).toBe("new-password");
  });

  it("ô Email Zenify không phải type=email để Chrome không coi là ô username", () => {
    renderDialog();

    expect(document.querySelector("#user-edit-zenify-email")?.getAttribute("type")).toBe("text");
  });

  it("hiện ô Foxia ID với giá trị đang có và báo thay đổi lên cha", () => {
    const { props } = renderDialog();

    const input = screen.getByLabelText("Foxia ID") as HTMLInputElement;
    expect(input.value).toBe("1234");
    fireEvent.change(input, { target: { value: "5678" } });
    expect(props.onFoxiaIdChange).toHaveBeenCalledWith("5678");
  });
});
