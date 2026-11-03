import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));
vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

import { toast } from "sonner";

import MediaSettingsPage from "@/features/media/pages/MediaSettingsPage";
import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";

const SETTINGS = {
  base_url: "https://m",
  shared_api_key_set: true,
  shared_api_key_prefix: "dak_sharedke",
  is_active: true,
  last_check_at: null,
  last_check_ok: null,
  last_check_error: "",
  shared_key_role: "",
  shared_key_username: "",
};
const TEST_RESULT = {
  ok: true,
  role: "uploader",
  username: "svc",
  warning: "Key chung không phải role admin, một số thao tác có thể bị từ chối.",
};

function route(url: string, init?: RequestInit) {
  const method = init?.method ?? "GET";
  if (/\/api\/media\/settings\/test$/.test(url) && method === "POST") return TEST_RESULT;
  if (/\/api\/media\/settings$/.test(url) && method === "PATCH") return SETTINGS;
  if (/\/api\/media\/settings$/.test(url)) return SETTINGS;
  return {};
}

function renderPage() {
  fetchJson.mockImplementation((url: string, init?: RequestInit) =>
    Promise.resolve(route(url, init)),
  );
  return renderWithClient(
    <I18nProvider>
      <MediaSettingsPage />
    </I18nProvider>,
  );
}

describe("MediaSettingsPage", () => {
  it("hiện prefix key, nút kiểm tra hiện role + cảnh báo", async () => {
    renderPage();
    expect(await screen.findByText(/dak_sharedke/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Kiểm tra kết nối/ }));
    expect(await screen.findByText(/uploader/)).toBeInTheDocument();
    expect(screen.getByText(/không phải role admin/)).toBeInTheDocument();
  });

  it("kiểm tra kết nối lỗi (vd 503 chưa nhập key) → toast lỗi thay vì im lặng", async () => {
    fetchJson.mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (/\/api\/media\/settings\/test$/.test(url) && method === "POST") {
        return Promise.reject(new Error("Chưa nhập host hoặc API key chung."));
      }
      return Promise.resolve(route(url, init));
    });
    renderWithClient(
      <I18nProvider>
        <MediaSettingsPage />
      </I18nProvider>,
    );
    await screen.findByText(/dak_sharedke/);
    fireEvent.click(screen.getByRole("button", { name: /Kiểm tra kết nối/ }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Chưa nhập host hoặc API key chung.");
    });
  });

  it("lưu với ô key trống không gửi shared_api_key", async () => {
    renderPage();
    await screen.findByText(/dak_sharedke/);
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    await waitFor(() => {
      const patch = fetchJson.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === "PATCH",
      );
      expect(patch).toBeTruthy();
      expect(JSON.parse(String((patch![1] as RequestInit).body))).not.toHaveProperty(
        "shared_api_key",
      );
    });
  });
});
