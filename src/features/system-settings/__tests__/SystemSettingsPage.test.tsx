import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/systemSettings", () => ({
  getSystemSettings: vi.fn(),
  updateSystemSettings: vi.fn(),
  getSystemSettingHistory: vi.fn(async () => []),
}));
vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

import * as api from "@/lib/api/systemSettings";
import SystemSettingsPage from "@/features/system-settings/pages/SystemSettingsPage";
import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";

const RESPONSE = {
  groups: [
    {
      key: "ai",
      label: "Gemini / AI",
      settings: [
        {
          key: "GEMINI_API_KEY",
          label: "Gemini API key",
          help: "",
          type: "str",
          is_secret: true,
          is_set: true,
          value: null,
          hint: "…WXYZ",
          default: "",
          updated_at: "2026-09-19T01:00:00Z",
          updated_by: { id: 1, name: "Hung" },
        },
        {
          key: "GEMINI_MAX_RPM",
          label: "Trần request/phút",
          help: "Trần phía mình",
          type: "int",
          is_secret: false,
          is_set: true,
          value: "60",
          hint: null,
          default: 8,
          updated_at: null,
          updated_by: null,
        },
        {
          key: "GEMINI_EXTRACT_ENABLED",
          label: "Bật trích xuất",
          help: "",
          type: "bool",
          is_secret: false,
          is_set: false,
          value: null,
          hint: null,
          default: false,
          updated_at: null,
          updated_by: null,
        },
      ],
    },
    { key: "zenify", label: "Zenify", settings: [] },
  ],
};

function renderPage() {
  return renderWithClient(
    <I18nProvider>
      <SystemSettingsPage />
    </I18nProvider>,
  );
}

describe("SystemSettingsPage", () => {
  beforeEach(() => {
    vi.mocked(api.getSystemSettings)
      .mockReset()
      .mockResolvedValue(RESPONSE as never);
    vi.mocked(api.updateSystemSettings)
      .mockReset()
      .mockResolvedValue(RESPONSE as never);
  });

  it("hiện nhóm, secret chỉ hiện hint, nút Lưu disabled khi chưa đổi", async () => {
    renderPage();
    expect(await screen.findByText("Gemini / AI")).toBeInTheDocument();
    expect(screen.getByText("Đã đặt (…WXYZ)")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("abcdWXYZ")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });

  it("chỉ gửi khóa đã đổi; secret gõ mới thì gửi, bấm Xoá thì gửi null", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Gemini / AI");
    const rpm = screen.getByLabelText("Trần request/phút");
    await user.clear(rpm);
    await user.type(rpm, "90");
    await user.click(screen.getByRole("button", { name: "Xoá" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() =>
      expect(api.updateSystemSettings).toHaveBeenCalledWith({
        GEMINI_MAX_RPM: "90",
        GEMINI_API_KEY: null,
      }),
    );
  });

  it("switch bool gửi '1'/'0'", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Gemini / AI");
    await user.click(screen.getByRole("switch", { name: "Bật trích xuất" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() =>
      expect(api.updateSystemSettings).toHaveBeenCalledWith({ GEMINI_EXTRACT_ENABLED: "1" }),
    );
  });

  it("secret: Xoá rồi Hoàn tác → về không đổi, Lưu disabled, không gọi API", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Gemini / AI");
    await user.click(screen.getByRole("button", { name: "Xoá" }));
    expect(screen.getByText("Sẽ xoá khi Lưu")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect(screen.queryByText("Sẽ xoá khi Lưu")).not.toBeInTheDocument();
    expect(screen.getByText("Đã đặt (…WXYZ)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
    expect(api.updateSystemSettings).not.toHaveBeenCalled();
  });

  it("secret: gõ rồi xoá hết chữ → về không đổi, không hiện badge Sẽ xoá, Lưu disabled", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Gemini / AI");
    const secret = screen.getByLabelText("Gemini API key");
    await user.type(secret, "abc");
    await user.clear(secret);
    expect(screen.queryByText("Sẽ xoá khi Lưu")).not.toBeInTheDocument();
    expect(screen.getByText("Đã đặt (…WXYZ)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });

  it("lỗi 400 gắn vào đúng ô", async () => {
    const user = userEvent.setup();
    vi.mocked(api.updateSystemSettings).mockRejectedValue(
      Object.assign(new Error("400"), {
        status: 400,
        body: { errors: { GEMINI_MAX_RPM: "phải là số nguyên" } },
      }),
    );
    renderPage();
    await screen.findByText("Gemini / AI");
    const rpm = screen.getByLabelText("Trần request/phút");
    await user.clear(rpm);
    await user.type(rpm, "x");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText("phải là số nguyên")).toBeInTheDocument();
  });
});
