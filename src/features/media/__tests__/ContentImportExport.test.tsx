import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue("tok"),
}));

import MediaContentsPage from "@/features/media/pages/MediaContentsPage";
import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";

const ME = {
  provisioned: true,
  mode: "shared",
  role: "uploader",
  remote_user: null,
  public_base_url: "https://m.example",
  connection_ok: true,
};
const IMPORT_RESULT = {
  total_rows: 3,
  created: 2,
  created_ids: [1, 2],
  errors: [{ row: 4, title: "Ngày sai", message: "Ngày upload không hợp lệ." }],
};

function renderPage(me = ME) {
  fetchJson.mockImplementation((url: string) => {
    if (url.startsWith("/api/media/me")) return Promise.resolve(me);
    if (url.startsWith("/api/media/contents/import")) return Promise.resolve(IMPORT_RESULT);
    if (url.startsWith("/api/media/contents"))
      return Promise.resolve({ items: [], total: 0, page: 1, page_size: 20 });
    return Promise.resolve({ items: [] });
  });
  return renderWithClient(
    <I18nProvider>
      <MemoryRouter initialEntries={["/media/contents?source_id=3"]}>
        <Routes>
          <Route path="/media/contents" element={<MediaContentsPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("Nhập/xuất Excel nội dung Media", () => {
  it("viewer chỉ thấy nút xuất, uploader thấy cả nút nhập", async () => {
    const { unmount } = renderPage({ ...ME, role: "viewer" });
    expect(await screen.findByRole("button", { name: "Xuất Excel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nhập Excel" })).not.toBeInTheDocument();
    unmount();

    renderPage();
    expect(await screen.findByRole("button", { name: "Nhập Excel" })).toBeInTheDocument();
  });

  it("gửi file lên /contents/import dạng FormData rồi hiện tổng kết + dòng lỗi", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Nhập Excel" }));

    // Dialog render qua portal nên input nằm ngoài container của render().
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "noi-dung.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const call = fetchJson.mock.calls.find(([url]) => url === "/api/media/contents/import");
      expect(call).toBeTruthy();
      const body = (call?.[1] as RequestInit).body as FormData;
      expect(body).toBeInstanceOf(FormData);
      expect((body.get("file") as File).name).toBe("noi-dung.xlsx");
    });

    expect(await screen.findByText("Ngày upload không hợp lệ.")).toBeInTheDocument();
    expect(screen.getByText("Ngày sai")).toBeInTheDocument();
  });
});
