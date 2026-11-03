import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";

import { renderWithI18n } from "@/test/render-with-i18n";
import type { MediaContent, MediaTaxonomyItem, TaxonomyGroup } from "@/lib/api/media";

import { ContentFormDialog } from "../components/ContentFormDialog";

const TAX: Record<TaxonomyGroup, MediaTaxonomyItem[]> = {
  "content-types": [],
  products: [{ id: 1, code: "SP1", name: "Serum", is_active: true }],
  "product-categories": [],
  "ad-channels": [],
  "content-sources": [{ id: 3, name: "TikTok", is_active: true }],
};

const INITIAL: MediaContent = {
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

describe("ContentFormDialog", () => {
  it("bắt buộc tiêu đề, URL tuyệt đối, nguồn; submit payload đúng shape", async () => {
    const onSubmit = vi.fn();
    renderWithI18n(
      <ContentFormDialog open onOpenChange={() => {}} taxonomy={TAX} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Tiêu đề bắt buộc/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: "V1" } });
    fireEvent.change(screen.getByLabelText(/^URL/), { target: { value: "tiktok.com/x" } });
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    expect(screen.getByText(/URL phải có http/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^URL/), { target: { value: "https://tiktok.com/x" } });
    fireEvent.click(screen.getByLabelText(/Nguồn/));
    fireEvent.click(screen.getByRole("option", { name: "TikTok" }));
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "V1",
        url: "https://tiktok.com/x",
        source_id: 3,
        uploaded_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
  });

  it("mặc định ngày upload là ngày hôm nay theo giờ LOCAL, không phải UTC", () => {
    renderWithI18n(
      <ContentFormDialog open onOpenChange={() => {}} taxonomy={TAX} onSubmit={vi.fn()} />,
    );
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const expected = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const dateInput = screen.getByLabelText(/Ngày upload/) as HTMLInputElement;
    expect(dateInput.value).toBe(expected);
  });

  it("sửa thông tin upload: payload KHÔNG kèm content_type_id/product_ids/category_ids", async () => {
    const onSubmit = vi.fn();
    renderWithI18n(
      <ContentFormDialog
        open
        onOpenChange={() => {}}
        initial={INITIAL}
        taxonomy={TAX}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("content_type_id");
    expect(payload).not.toHaveProperty("product_ids");
    expect(payload).not.toHaveProperty("category_ids");
    expect(payload).toMatchObject({
      title: INITIAL.title,
      url: INITIAL.url,
      source_id: INITIAL.source_id,
      uploaded_at: "2026-09-01",
    });
  });
});
