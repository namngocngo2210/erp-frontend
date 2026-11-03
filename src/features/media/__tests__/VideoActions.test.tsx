import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue("tok"),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";
import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";
import type { MediaContent } from "@/lib/api/media";

import { VideoActions } from "../components/VideoActions";

/** Nội dung mẫu — mặc định URL TikTok + chưa cache, đủ dùng cho hầu hết test case. */
function makeContent(overrides: Partial<MediaContent> = {}): MediaContent {
  return {
    id: 12,
    content_code: "C12",
    uploaded_at: "2026-09-01",
    title: "V1",
    url: "https://www.tiktok.com/@x/video/1",
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
    products: [],
    categories: [],
    ad_evaluations: [],
    created_by: 1,
    creator: null,
    updated_by: 1,
    created_at: "2026-09-01",
    updated_at: "2026-09-01",
    ...overrides,
  };
}

function renderActions(content: MediaContent, role: "viewer" | "admin") {
  return renderWithClient(
    <I18nProvider>
      <VideoActions content={content} role={role} />
    </I18nProvider>,
  );
}

describe("VideoActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom không cài createObjectURL/revokeObjectURL — stub tối thiểu cho tải file.
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bấm Tải video → gọi fetch kèm Bearer, tạo <a download> và click", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(["x"]), {
        status: 200,
        headers: { "Content-Disposition": 'attachment; filename="v.mp4"' },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderActions(makeContent(), "viewer");
    fireEvent.click(screen.getByRole("button", { name: "Tải video" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/media/contents/12/download");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.getAttribute("download")).toBe("v.mp4");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x");

    clickSpy.mockRestore();
  });

  it("lỗi 422 khi tải → toast.error với detail từ backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Bài dạng ảnh, không có video để tải." }), {
        status: 422,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderActions(makeContent(), "viewer");
    fireEvent.click(screen.getByRole("button", { name: "Tải video" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Bài dạng ảnh, không có video để tải."),
    );
  });

  it("URL TikTok, chưa cache → chỉ hiện 'Cache video', không hiện 'Cache lại'", () => {
    renderActions(makeContent({ video_status: "idle" }), "viewer");
    expect(screen.getByRole("button", { name: "Cache video" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cache lại" })).not.toBeInTheDocument();
  });

  it("URL TikTok, admin, đã cache → chỉ hiện 'Cache lại', không hiện 'Cache video'", () => {
    renderActions(makeContent({ video_status: "success" }), "admin");
    expect(screen.queryByRole("button", { name: "Cache video" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cache lại" })).toBeInTheDocument();
  });

  it("URL không phải TikTok → không hiện nút cache nào (kể cả admin)", () => {
    renderActions(
      makeContent({ url: "https://example.com/video/1", video_status: "idle" }),
      "admin",
    );
    expect(screen.queryByRole("button", { name: "Cache video" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cache lại" })).not.toBeInTheDocument();
  });

  it("bấm Cache video → POST /video/cache và toast 'đã xếp hàng' khi pending", async () => {
    fetchJson.mockResolvedValue({ video_status: "pending" });
    renderActions(makeContent({ video_status: "idle" }), "viewer");

    fireEvent.click(screen.getByRole("button", { name: "Cache video" }));

    await waitFor(() =>
      expect(fetchJson).toHaveBeenCalledWith(
        "/api/media/contents/12/video/cache",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã xếp hàng cache video."));
  });
});
