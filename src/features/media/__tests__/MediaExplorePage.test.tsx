import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));

import MediaExplorePage from "@/features/media/pages/MediaExplorePage";
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
const CONTENT_1 = {
  id: 1,
  content_code: "C0001",
  uploaded_at: "2026-09-01T00:00:00Z",
  title: "Video một",
  url: "https://www.tiktok.com/@u/video/1111111111111111111",
  thumbnail_url: "",
  thumbnail_ext: "jpg",
  video_status: "idle",
  video_ext: null,
  video_size: null,
  video_cached_at: null,
  source_id: 3,
  source: { id: 3, name: "TikTok", is_active: true },
  content_type_id: null,
  content_type: null,
  overall_rating: "unknown",
  overall_score: null,
  overall_note: "",
  products: [],
  categories: [],
  ad_evaluations: [],
  created_by: 7,
  creator: null,
  updated_by: 7,
  created_at: "",
  updated_at: "",
};
// url khác CONTENT_1 để <iframe title=url> phân biệt được 2 ô khi test kiểm tra
// "chỉ 1 player trong DOM" (nếu trùng url, title trùng, test không phát hiện được lỗi).
const CONTENT_2 = {
  ...CONTENT_1,
  id: 2,
  content_code: "C0002",
  title: "Video hai",
  url: "https://www.tiktok.com/@u/video/2222222222222222222",
};

function route(url: string) {
  if (url.startsWith("/api/media/me")) return ME;
  // Đánh giá ads (AdEvaluationList trong panel chi tiết) — phải khớp TRƯỚC nhánh
  // /contents/{id} generic bên dưới vì URL cũng bắt đầu bằng /contents/{id}/...
  if (/\/ad-evaluations(\?|$)/.test(url)) return { items: [] };
  if (/\/api\/media\/contents\/2(\?|$)/.test(url)) return CONTENT_2;
  if (/\/api\/media\/contents\/1(\?|$)/.test(url)) return CONTENT_1;
  if (url.startsWith("/api/media/contents"))
    return { items: [CONTENT_1, CONTENT_2], total: 2, page: 1, page_size: 24 };
  return { items: [] }; // taxonomy
}

// Lộ chuỗi search hiện tại ra DOM để test kiểm tra URL đổi đúng (content=<id>)
// sau khi bấm tên — MemoryRouter không đụng tới window.location thật.
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="loc-search">{location.search}</span>;
}

function renderPage(initialEntry = "/media/explore") {
  fetchJson.mockImplementation((url: string) => Promise.resolve(route(url)));
  return renderWithClient(
    <I18nProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <MediaExplorePage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("MediaExplorePage", () => {
  it("hiện lưới thumbnail từ /api/media/contents", async () => {
    renderPage();
    expect(await screen.findByText("Video một")).toBeInTheDocument();
    expect(screen.getByText("Video hai")).toBeInTheDocument();
  });

  it("bấm ảnh thumbnail → phát video tại chỗ trong lưới, không có overlay/dialog", async () => {
    renderPage();
    await screen.findByText("Video một");
    // 2 nút cùng tên "Video một": [0] = thumbnail (aria-label), [1] = tên bên dưới.
    const [thumbButton] = screen.getAllByRole("button", { name: "Video một" });
    fireEvent.click(thumbButton);
    expect(await screen.findByTitle(CONTENT_1.url)).toBeInTheDocument(); // <iframe title=url>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("phát ô khác → ô đang phát tự dừng, chỉ 1 player trong DOM", async () => {
    renderPage();
    await screen.findByText("Video một");
    const [thumb1] = screen.getAllByRole("button", { name: "Video một" });
    fireEvent.click(thumb1);
    expect(await screen.findByTitle(CONTENT_1.url)).toBeInTheDocument();

    const [thumb2] = screen.getAllByRole("button", { name: "Video hai" });
    fireEvent.click(thumb2);
    expect(await screen.findByTitle(CONTENT_2.url)).toBeInTheDocument();
    expect(screen.queryByTitle(CONTENT_1.url)).not.toBeInTheDocument();
    expect(document.querySelectorAll("iframe")).toHaveLength(1);
  });

  it("bấm tên nội dung → mở panel chi tiết bên phải + URL có content=<id>", async () => {
    renderPage();
    await screen.findByText("Video một");
    const [, titleButton] = screen.getAllByRole("button", { name: "Video hai" });
    fireEvent.click(titleButton);

    const dialog = await screen.findByRole("dialog");
    // Sheet mở ngay (role="dialog") nhưng nội dung tải bất đồng bộ (useContent) —
    // phải findAllByText (đợi) chứ không getByText (đồng bộ) để tránh bắt lúc còn
    // LogoSpinner. Tên xuất hiện 2 lần: header panel + dòng đọc-thôi card Upload
    // (viewer không có quyền content.edit_upload nên card hiện dạng đọc).
    expect((await within(dialog).findAllByText("Video hai")).length).toBeGreaterThanOrEqual(1);
    // Header panel giờ hiện "#<id>" thay vì content_code — panel chi tiết theo mẫu ads-crm.
    expect(within(dialog).getByText("#2")).toBeInTheDocument();
    expect(screen.getByTestId("loc-search").textContent).toContain("content=2");
  });

  it("URL có sẵn content=<id> lúc mount → panel mở ngay khi refresh", async () => {
    renderPage("/media/explore?content=1");
    const dialog = await screen.findByRole("dialog");
    expect((await within(dialog).findAllByText("Video một")).length).toBeGreaterThanOrEqual(1);
  });
});
