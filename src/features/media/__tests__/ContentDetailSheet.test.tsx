import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";
import type { MediaTaxonomyItem, TaxonomyGroup } from "@/lib/api/media";

import { ContentDetailSheet } from "../components/ContentDetailSheet";

const TAXONOMY: Record<TaxonomyGroup, MediaTaxonomyItem[]> = {
  "content-types": [{ id: 2, name: "Review", is_active: true }],
  products: [{ id: 1, code: "SP1", name: "Serum", is_active: true }],
  "product-categories": [],
  "ad-channels": [],
  "content-sources": [{ id: 3, name: "TikTok", is_active: true }],
};

const CONTENT = {
  id: 12,
  content_code: "C0012",
  uploaded_at: "2026-09-01T00:00:00Z",
  title: "Video review A",
  url: "https://www.tiktok.com/@u/video/1",
  thumbnail_url: "",
  thumbnail_ext: "jpg",
  video_status: "success" as const,
  video_ext: "mp4",
  video_size: 1,
  video_cached_at: null,
  source_id: 3,
  source: { id: 3, name: "TikTok", is_active: true },
  content_type_id: 2,
  content_type: { id: 2, name: "Review", is_active: true },
  overall_rating: "good" as const,
  overall_score: 4.25,
  overall_note: "",
  products: [] as never[],
  categories: [] as never[],
  ad_evaluations: [] as never[],
  created_by: 7,
  creator: { id: 1, name: "Uploader A", username: "up" },
  updated_by: 7,
  created_at: "",
  updated_at: "",
};

function route(url: string) {
  if (/\/api\/media\/contents\/12(\?|$)/.test(url)) return CONTENT;
  return { items: [] };
}

function renderSheet(
  role: "admin" | "viewer",
  opts: Partial<{ siblingIds: number[]; onNavigate: (id: number) => void }> = {},
) {
  fetchJson.mockImplementation((url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") return Promise.resolve({ ...CONTENT, title: "Đã sửa" });
    return Promise.resolve(route(url));
  });
  const onNavigate = opts.onNavigate ?? vi.fn();
  renderWithClient(
    <I18nProvider>
      <ContentDetailSheet
        contentId={12}
        publicBaseUrl="https://m.example"
        role={role}
        taxonomy={TAXONOMY}
        onClose={vi.fn()}
        siblingIds={opts.siblingIds}
        onNavigate={onNavigate}
      />
    </I18nProvider>,
  );
  return { onNavigate };
}

describe("ContentDetailSheet", () => {
  it("role có content.edit_upload → hiện input, lưu PATCH upload-info với dữ liệu đã sửa", async () => {
    renderSheet("admin");
    const titleInput = (await screen.findByLabelText(/Tiêu đề/)) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Video review B" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu upload info" }));
    await waitFor(() =>
      expect(fetchJson).toHaveBeenCalledWith(
        "/api/media/contents/12/upload-info",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            uploaded_at: "2026-09-01",
            title: "Video review B",
            url: CONTENT.url,
            source_id: 3,
          }),
        }),
      ),
    );
  });

  it("role viewer → dữ liệu upload hiện dạng đọc, không input/không nút lưu", async () => {
    renderSheet("viewer");
    // Tiêu đề xuất hiện 2 lần: trong header panel + dòng đọc-thôi của card Upload.
    await waitFor(() =>
      expect(screen.getAllByText("Video review A").length).toBeGreaterThanOrEqual(2),
    );
    expect(screen.queryByLabelText(/Tiêu đề/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lưu upload info" })).not.toBeInTheDocument();
    // URL xuất hiện 2 lần: link nhỏ dưới player (card "Xem trước") + dòng URL đọc-thôi
    // trong card "Thông tin upload" (không có quyền sửa).
    expect(screen.getAllByText(CONTENT.url).length).toBeGreaterThanOrEqual(2);
  });

  it("'Huỷ thay đổi' khôi phục giá trị đã tải", async () => {
    renderSheet("admin");
    const titleInput = (await screen.findByLabelText(/Tiêu đề/)) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Nháp bỏ dở" } });
    expect(titleInput.value).toBe("Nháp bỏ dở");
    // "Huỷ thay đổi" xuất hiện ở cả card Upload lẫn Marketing (admin sửa được cả hai) —
    // card Upload đứng trước trong DOM nên lấy phần tử [0].
    fireEvent.click(screen.getAllByRole("button", { name: "Huỷ thay đổi" })[0]);
    expect(titleInput.value).toBe("Video review A");
  });

  it("▼ gọi onNavigate với id kế tiếp trong siblingIds", async () => {
    const { onNavigate } = renderSheet("admin", { siblingIds: [11, 12, 13] });
    await screen.findByText("Video review A");
    fireEvent.click(screen.getByRole("button", { name: "Nội dung sau" }));
    expect(onNavigate).toHaveBeenCalledWith(13);
  });

  it("▼ vô hiệu khi content đang mở là phần tử cuối siblingIds", async () => {
    renderSheet("admin", { siblingIds: [11, 12] });
    await screen.findByText("Video review A");
    expect(screen.getByRole("button", { name: "Nội dung sau" })).toBeDisabled();
  });
});
