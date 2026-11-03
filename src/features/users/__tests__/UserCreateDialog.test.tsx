import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";

import { renderWithI18n } from "@/test/render-with-i18n";
import { UserCreateDialog } from "@/features/users/UserCreateDialog";

/**
 * Regression: form tạo user phải truyền đúng vai trò Media + API key riêng
 * lên payload tạo user (qua các callback onMediaRoleChange/onMediaApiKeyChange)
 * — round-trip qua props vì UserManagement (nơi build payload thật) quá nặng
 * để render trong 1 test nhỏ.
 */
function renderDialog(onMediaRoleChange = vi.fn(), onMediaApiKeyChange = vi.fn()) {
  return renderWithI18n(
    <UserCreateDialog
      open
      username=""
      displayName=""
      role="staff"
      active="true"
      kiotvietMappings={[]}
      password=""
      zenifyEmail=""
      foxiaId=""
      mediaRole=""
      mediaApiKey=""
      departmentId=""
      departmentIds={[]}
      roleIds={[]}
      departments={[]}
      roles={[]}
      kiotvietChannels={[]}
      onOpenChange={vi.fn()}
      onUsernameChange={vi.fn()}
      onDisplayNameChange={vi.fn()}
      onRoleChange={vi.fn()}
      onActiveChange={vi.fn()}
      onKiotvietMappingsChange={vi.fn()}
      onPasswordChange={vi.fn()}
      onZenifyEmailChange={vi.fn()}
      onFoxiaIdChange={vi.fn()}
      onMediaRoleChange={onMediaRoleChange}
      onMediaApiKeyChange={onMediaApiKeyChange}
      onDepartmentIdChange={vi.fn()}
      onDepartmentIdsChange={vi.fn()}
      onRoleIdsChange={vi.fn()}
      onSubmit={vi.fn()}
    />,
  );
}

describe("UserCreateDialog", () => {
  it("chọn vai trò Media Uploader + nhập API key riêng gọi đúng callback", () => {
    const onMediaRoleChange = vi.fn();
    const onMediaApiKeyChange = vi.fn();
    renderDialog(onMediaRoleChange, onMediaApiKeyChange);

    fireEvent.click(screen.getByLabelText(/Vai trò Media/));
    fireEvent.click(screen.getByText("Uploader"));
    expect(onMediaRoleChange).toHaveBeenCalledWith("uploader");

    fireEvent.change(screen.getByLabelText(/API key Media riêng/), {
      target: { value: "dak_abcdefghijkl" },
    });
    expect(onMediaApiKeyChange).toHaveBeenCalledWith("dak_abcdefghijkl");
  });
});
