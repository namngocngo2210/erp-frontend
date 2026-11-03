/**
 * ads-crm (Go) serialise slice nil thành `null` (không phải `[]`) trong JSON.
 * Một nội dung chưa gắn tag / chưa được đánh giá quảng cáo sẽ trả về
 * `products: null`, `categories: null`, `ad_evaluations: null` — nếu không
 * chuẩn hoá ở tầng gọi API, UI `.map()` thẳng lên các trường này sẽ ném
 * TypeError và trắng cả trang (đã tái hiện trên prod: sort theo rating trả
 * về 3/20 item có products/categories null).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/http", () => ({ fetchJson: vi.fn(), getValidAccessToken: vi.fn() }));
import { fetchJson } from "@/services/http";
import {
  getContent,
  getContentQuality,
  getRatingsByChannel,
  getReportOverview,
  listContents,
  listEvaluations,
  listProposals,
  listTaxonomy,
} from "@/lib/api/media";

const mockFetchJson = fetchJson as ReturnType<typeof vi.fn>;

const RAW_CONTENT_NULLS = {
  id: 2261,
  content_code: "C2261",
  uploaded_at: "2026-08-01T00:00:00Z",
  title: "Video không gắn tag",
  url: "https://example.com",
  thumbnail_url: "",
  thumbnail_ext: null,
  video_status: "idle",
  video_ext: null,
  video_size: null,
  video_cached_at: null,
  source_id: 1,
  source: null,
  content_type_id: null,
  content_type: null,
  overall_rating: "unknown",
  overall_score: null,
  overall_note: "",
  products: null,
  categories: null,
  ad_evaluations: null,
  created_by: 1,
  creator: null,
  updated_by: 1,
  created_at: "",
  updated_at: "",
};

describe("media api — chuẩn hoá quan hệ null từ ads-crm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listContents: products/categories/ad_evaluations null → [] cho từng item, items null → []", async () => {
    mockFetchJson.mockResolvedValueOnce({
      items: [RAW_CONTENT_NULLS],
      total: 1,
      page: 1,
      page_size: 20,
    });
    const res = await listContents(new URLSearchParams());
    expect(res.items[0].products).toEqual([]);
    expect(res.items[0].categories).toEqual([]);
    expect(res.items[0].ad_evaluations).toEqual([]);

    mockFetchJson.mockResolvedValueOnce({ items: null, total: 0, page: 1, page_size: 20 });
    const empty = await listContents(new URLSearchParams());
    expect(empty.items).toEqual([]);
  });

  it("getContent: products/categories/ad_evaluations null → []", async () => {
    mockFetchJson.mockResolvedValueOnce(RAW_CONTENT_NULLS);
    const res = await getContent(2261);
    expect(res.products).toEqual([]);
    expect(res.categories).toEqual([]);
    expect(res.ad_evaluations).toEqual([]);
    // các trường khác giữ nguyên
    expect(res.title).toBe("Video không gắn tag");
  });

  it("listEvaluations: items null → []", async () => {
    mockFetchJson.mockResolvedValueOnce({ items: null });
    const res = await listEvaluations(2261);
    expect(res.items).toEqual([]);
  });

  it("listTaxonomy: items null → []", async () => {
    mockFetchJson.mockResolvedValueOnce({ items: null });
    const res = await listTaxonomy("products", false);
    expect(res.items).toEqual([]);
  });

  it("listProposals: items null → [], content lồng bên trong cũng được chuẩn hoá", async () => {
    mockFetchJson.mockResolvedValueOnce({
      items: [
        {
          id: 1,
          main_key: "K1",
          idea: "Ý tưởng",
          due_date: null,
          status: "pending",
          product_id: null,
          product: null,
          content_id: 2261,
          content: RAW_CONTENT_NULLS,
          created_by: 1,
          creator: null,
          created_at: "",
          updated_at: "",
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    });
    const res = await listProposals(new URLSearchParams());
    expect(res.items[0].content?.products).toEqual([]);
    expect(res.items[0].content?.categories).toEqual([]);
    expect(res.items[0].content?.ad_evaluations).toEqual([]);

    mockFetchJson.mockResolvedValueOnce({ items: null, total: 0, page: 1, page_size: 20 });
    const empty = await listProposals(new URLSearchParams());
    expect(empty.items).toEqual([]);
  });

  // Fix round 2 — trang Báo cáo: cùng bệnh, ba endpoint report cũng trả mảng
  // null khi không có dữ liệu (đối chiếu API thật: ratings-by-channel trả
  // items: null luôn khi chưa có đánh giá gắn kênh nào; overview/content-quality
  // trả null cho các mảng khi khoảng ngày chọn không có dữ liệu).
  it("getReportOverview: content_by_type null → []", async () => {
    mockFetchJson.mockResolvedValueOnce({
      total_contents: 0,
      missing_tags: 0,
      missing_evaluations: 0,
      content_by_type: null,
    });
    const res = await getReportOverview(new URLSearchParams());
    expect(res.content_by_type).toEqual([]);
  });

  it("getRatingsByChannel: items null → []", async () => {
    mockFetchJson.mockResolvedValueOnce({ items: null });
    const res = await getRatingsByChannel(new URLSearchParams());
    expect(res.items).toEqual([]);
  });

  it("getContentQuality: missing_tags và missing_evaluations null → []", async () => {
    mockFetchJson.mockResolvedValueOnce({ missing_tags: null, missing_evaluations: null });
    const res = await getContentQuality(new URLSearchParams());
    expect(res.missing_tags).toEqual([]);
    expect(res.missing_evaluations).toEqual([]);
  });
});
