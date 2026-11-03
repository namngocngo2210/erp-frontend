import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));

import MediaProposalsPage from "@/features/media/pages/MediaProposalsPage";
import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";

const ME = {
  provisioned: true,
  mode: "shared",
  role: "viewer",
  remote_user: null,
  public_base_url: "https://m.example",
  connection_ok: true,
};
const PROPOSAL = {
  id: 4,
  main_key: "Từ khoá chính",
  idea: "Ý tưởng",
  due_date: "2026-10-01T00:00:00Z",
  status: "pending",
  product_id: 5,
  product: { id: 5, code: "SP5", name: "Serum", is_active: true },
  content_id: null,
  content: null,
  created_by: 7,
  creator: { id: 7, name: "Hùng", username: "hung" },
  created_at: "",
  updated_at: "",
};

function route(url: string) {
  if (url.startsWith("/api/media/me")) return ME;
  if (url.startsWith("/api/media/proposals"))
    return { items: [PROPOSAL], total: 1, page: 1, page_size: 20 };
  return { items: [] }; // taxonomy
}

function renderPage(path = "/media/proposals") {
  fetchJson.mockImplementation((url: string) => Promise.resolve(route(url)));
  return renderWithClient(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <MediaProposalsPage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

/** Giả lập điều hướng bên ngoài ô nhập (nút khác, deep-link...) đổi query `q`. */
function ExternalNav() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/media/proposals?q=external")}>
      go
    </button>
  );
}

function renderPageWithExternalNav(path: string) {
  fetchJson.mockImplementation((url: string) => Promise.resolve(route(url)));
  return renderWithClient(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <MediaProposalsPage />
        <ExternalNav />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("MediaProposalsPage", () => {
  it("hiện bảng đề xuất với trạng thái dịch", async () => {
    renderPage();
    // "Từ khoá chính" trùng với nhãn cột (media.proposals.col.mainKey) nên
    // dùng getAllByText — chờ cả header lẫn ô dữ liệu cùng render.
    await waitFor(() =>
      expect(screen.getAllByText("Từ khoá chính").length).toBeGreaterThanOrEqual(2),
    );
    expect(screen.getByText("Chờ xử lý")).toBeInTheDocument();
    expect(screen.getByText("SP5")).toBeInTheDocument();
  });

  it("ô tìm kiếm gửi q lên API", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText("Từ khoá chính").length).toBeGreaterThanOrEqual(2),
    );
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo từ khoá/), { target: { value: "abc" } });
    await waitFor(() =>
      expect(fetchJson.mock.calls.some((c) => String(c[0]).includes("q=abc"))).toBe(true),
    );
  });

  it("mở trực tiếp URL có q/status → ô nhập đồng bộ và request mang đúng filter", async () => {
    renderPage("/media/proposals?q=abc&status=done");
    await waitFor(() =>
      expect(screen.getAllByText("Từ khoá chính").length).toBeGreaterThanOrEqual(2),
    );
    const input = screen.getByPlaceholderText(/Tìm theo từ khoá/) as HTMLInputElement;
    expect(input.value).toBe("abc");
    // fetchJson dùng chung giữa các it() trong file (không reset) — lấy call
    // cuối cùng khớp /api/media/proposals? để tránh dính call sót từ test khác.
    const last = fetchJson.mock.calls
      .map((c) => String(c[0]))
      .filter((u) => u.includes("/api/media/proposals?"))
      .pop();
    expect(last).toContain("q=abc");
    expect(last).toContain("status=done");
  });

  it("gõ xong không phát sinh request thừa (không dao động)", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText("Từ khoá chính").length).toBeGreaterThanOrEqual(2),
    );
    // Đánh dấu mốc để chỉ xét call phát sinh từ hành động gõ dưới đây — fetchJson
    // dùng chung, không reset giữa các it() nên call cũ có thể còn tồn đọng.
    const typeIndex = fetchJson.mock.calls.length;
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo từ khoá/), { target: { value: "abc" } });
    const matching = () =>
      fetchJson.mock.calls
        .slice(typeIndex)
        .map((c) => String(c[0]))
        .filter((u) => u.includes("/api/media/proposals?"));
    await waitFor(() => expect(matching().pop()).toContain("q=abc"));
    const countAfterSettle = matching().length;
    await new Promise((r) => setTimeout(r, 500));
    expect(matching().length).toBe(countAfterSettle);
  });

  it("điều hướng ngoài đổi q trong lúc đang mounted → đồng bộ ô nhập, không dao động vô hạn", async () => {
    renderPageWithExternalNav("/media/proposals?q=initial");
    await waitFor(() =>
      expect(screen.getAllByText("Từ khoá chính").length).toBeGreaterThanOrEqual(2),
    );
    const input = screen.getByPlaceholderText(/Tìm theo từ khoá/) as HTMLInputElement;
    expect(input.value).toBe("initial");
    // Đánh dấu mốc ngay trước khi click để chỉ xét các request phát sinh SAU click.
    const clickIndex = fetchJson.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    await waitFor(() => expect(input.value).toBe("external"));
    // Chờ quá thời gian debounce (300ms) để nếu có vòng lặp thì đã lộ ra.
    await new Promise((r) => setTimeout(r, 700));
    expect(input.value).toBe("external");
    const proposalsAfterClick = fetchJson.mock.calls
      .slice(clickIndex)
      .map((c) => String(c[0]))
      .filter((u) => u.includes("/api/media/proposals?"));
    expect(proposalsAfterClick.pop()).toContain("q=external");
    // Không có request nào sau click còn mang q=initial (đã hết dao động).
    expect(proposalsAfterClick.some((u) => u.includes("q=initial"))).toBe(false);
    // Ổn định: không phát sinh liên tục — tối đa 2 request proposals kể từ sau click.
    expect(
      fetchJson.mock.calls
        .slice(clickIndex)
        .map((c) => String(c[0]))
        .filter((u) => u.includes("/api/media/proposals?")).length,
    ).toBeLessThanOrEqual(2);
  });
});
