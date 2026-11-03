import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));

import MediaContentsPage from "@/features/media/pages/MediaContentsPage";
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
const ME_ADMIN = { ...ME, role: "admin" };
const CONTENT = {
  id: 12,
  content_code: "C0012",
  uploaded_at: "2026-09-01T00:00:00Z",
  title: "Video review A",
  url: "https://www.tiktok.com/@u/video/1",
  thumbnail_url: "",
  thumbnail_ext: "jpg",
  video_status: "success",
  video_ext: "mp4",
  video_size: 1,
  video_cached_at: null,
  source_id: 3,
  source: { id: 3, name: "TikTok", is_active: true },
  content_type_id: 2,
  content_type: { id: 2, name: "Review", is_active: true },
  overall_rating: "good",
  overall_score: 4.25,
  overall_note: "",
  products: [{ id: 1, code: "SP1", name: "Serum", is_active: true }],
  categories: [],
  ad_evaluations: [],
  created_by: 7,
  creator: null,
  updated_by: 7,
  created_at: "",
  updated_at: "",
};

function route(url: string, me: typeof ME) {
  if (url.startsWith("/api/media/me")) return me;
  if (url.includes("/ad-evaluations")) return { items: [] }; // Task 17: AdEvaluationList
  if (/\/api\/media\/contents\/12$/.test(url)) return CONTENT;
  if (url.startsWith("/api/media/contents"))
    return { items: [CONTENT], total: 1, page: 1, page_size: 20 };
  return { items: [] }; // taxonomy
}

function renderPage(path = "/media/contents", me: typeof ME = ME) {
  fetchJson.mockImplementation((url: string) => Promise.resolve(route(url, me)));
  return renderWithClient(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/media/contents" element={<MediaContentsPage />} />
          <Route path="/media/contents/:contentId" element={<MediaContentsPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

const CONTENT_NULL_TAGS = {
  ...CONTENT,
  id: 13,
  content_code: "C0013",
  title: "Video chưa gắn tag",
  products: null,
  categories: null,
  ad_evaluations: null,
};

describe("MediaContentsPage", () => {
  it("nội dung có products/categories/ad_evaluations null từ ads-crm không làm trắng trang", async () => {
    // Tái hiện crash prod: ads-crm (Go) trả nil slice thành null trong JSON —
    // listContents phải chuẩn hoá về [] trước khi tới bảng, nếu không
    // ContentTable.map() ném TypeError và trắng cả trang.
    fetchJson.mockImplementation((url: string) => {
      if (url.startsWith("/api/media/me")) return Promise.resolve(ME);
      if (url.startsWith("/api/media/contents")) {
        return Promise.resolve({ items: [CONTENT_NULL_TAGS], total: 1, page: 1, page_size: 20 });
      }
      return Promise.resolve({ items: [] });
    });
    renderWithClient(
      <I18nProvider>
        <MemoryRouter initialEntries={["/media/contents"]}>
          <Routes>
            <Route path="/media/contents" element={<MediaContentsPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(await screen.findByText("Video chưa gắn tag")).toBeInTheDocument();
    // Cột "Nhãn" (products+categories) rỗng phải hiện gạch ngang, không throw.
    expect(screen.getByText("—", { selector: "td" })).toBeInTheDocument();
  });

  it("hiện bảng với thumbnail hotlink và badge rating", async () => {
    renderPage();
    expect(await screen.findByText("Video review A")).toBeInTheDocument();
    const img = screen.getByRole("img", { name: "Video review A" }) as HTMLImageElement;
    expect(img.src).toBe("https://m.example/api/v1/contents/12/thumbnail");
    // RatingBadge gộp nhãn + điểm số thành 1 cụm text ("Tốt 4.25") để không
    // trùng với option "Tốt" của MultiSelect Rating tổng trong thanh lọc.
    expect(screen.getByText("Tốt 4.25")).toBeInTheDocument();
    // viewer: không có nút Thêm nội dung
    expect(screen.queryByRole("button", { name: /Thêm nội dung/ })).toBeNull();
  });
  it("mở chi tiết theo URL /media/contents/:id", async () => {
    renderPage("/media/contents/12");
    const dialog = await screen.findByRole("dialog");
    // Header panel giờ hiện "#<id>" thay vì content_code — panel chi tiết theo mẫu ads-crm.
    // Tên xuất hiện 2 lần: header panel + dòng đọc-thôi card Upload (viewer không
    // có quyền content.edit_upload nên card hiện dạng đọc thay vì input).
    expect((await within(dialog).findAllByText("Video review A")).length).toBeGreaterThanOrEqual(1);
    expect(within(dialog).getByText("#12")).toBeInTheDocument();
  });
  it("đổi filter rating ghi vào query string", async () => {
    renderPage();
    await screen.findByText("Video review A");
    // Rating tổng giờ là MultiSelect: nhãn field và placeholder trùng chữ
    // "Rating tổng" nên lấy phần tử thứ 2 (placeholder trong ô trigger) để mở.
    fireEvent.click(screen.getAllByText("Rating tổng")[1]);
    // Bên trong dropdown, option "Tốt" là chữ duy nhất khớp chính xác — badge
    // rating trong bảng đã gộp thành "Tốt 4.25" nên không trùng (xem RatingBadge).
    fireEvent.click(await screen.findByText("Tốt"));
    const last = fetchJson.mock.calls
      .map((c) => String(c[0]))
      .filter((u) => u.includes("/api/media/contents?"))
      .pop();
    expect(last).toContain("overall_rating=good");
    expect(last).not.toContain("page=");
  });
  it("Huỷ dialog Thêm nội dung rồi mở lại → form không giữ draft cũ", async () => {
    renderPage("/media/contents", ME_ADMIN);
    await screen.findByText("Video review A");
    fireEvent.click(screen.getByRole("button", { name: /Thêm nội dung/ }));
    const titleInput = (await screen.findByLabelText(/Tiêu đề/)) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Nháp bỏ dở" } });
    expect(titleInput.value).toBe("Nháp bỏ dở");
    fireEvent.click(screen.getByRole("button", { name: /^Huỷ$/ }));
    await waitFor(() => expect(screen.queryByLabelText(/Tiêu đề/)).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Thêm nội dung/ }));
    const reopened = (await screen.findByLabelText(/Tiêu đề/)) as HTMLInputElement;
    expect(reopened.value).toBe("");
  });
});
