import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));

import MediaTaxonomyPage from "@/features/media/pages/MediaTaxonomyPage";
import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";
import type { MediaMe } from "@/lib/api/media";

const ME: MediaMe = {
  provisioned: true,
  mode: "shared",
  role: "viewer",
  remote_user: null,
  public_base_url: "https://m.example",
  connection_ok: true,
};

function route(url: string) {
  if (url.startsWith("/api/media/me")) return ME;
  // Mọi group taxonomy đều trả cùng 1 item để kiểm tra bảng theo tab.
  return { items: [{ id: 1, name: "Review", group: "video", is_active: true }] };
}

function renderPage(me: MediaMe = ME) {
  fetchJson.mockImplementation((url: string) =>
    Promise.resolve(url.startsWith("/api/media/me") ? me : route(url)),
  );
  return renderWithClient(
    <I18nProvider>
      <MemoryRouter initialEntries={["/media/taxonomy"]}>
        <MediaTaxonomyPage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("MediaTaxonomyPage", () => {
  it("5 tab, bảng theo tab; viewer không thấy toggle 'hiện cả đã tắt' lẫn nút Thêm", async () => {
    renderPage(); // ME role viewer
    expect(await screen.findByText("Review")).toBeInTheDocument();
    for (const label of ["Loại nội dung", "Sản phẩm", "Danh mục SP", "Kênh ads", "Nguồn"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByLabelText(/Hiện cả đã tắt/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Thêm" })).toBeNull();
  });

  it("admin thấy toggle và bật gửi include_inactive=true", async () => {
    renderPage({ ...ME, role: "admin" });
    await screen.findByText("Review");
    fireEvent.click(screen.getByLabelText(/Hiện cả đã tắt/));
    await waitFor(() =>
      expect(fetchJson.mock.calls.some((c) => String(c[0]).includes("include_inactive=true"))).toBe(
        true,
      ),
    );
  });

  it("tab rỗng hiện EmptyState thay vì bảng trống", async () => {
    fetchJson.mockImplementation((url: string) =>
      Promise.resolve(url.startsWith("/api/media/me") ? ME : { items: [] }),
    );
    renderWithClient(
      <I18nProvider>
        <MemoryRouter initialEntries={["/media/taxonomy"]}>
          <MediaTaxonomyPage />
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(await screen.findByText("Không có dữ liệu")).toBeInTheDocument();
  });
});
