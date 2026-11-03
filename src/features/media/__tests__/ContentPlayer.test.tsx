import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";

vi.mock("@/services/http", () => ({
  fetchJson: vi.fn(),
  getValidAccessToken: vi.fn().mockResolvedValue("tok"),
}));

import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";
import type { MediaContent } from "@/lib/api/media";

import { ContentPlayer } from "../components/ContentPlayer";

function makeContent(overrides: Partial<MediaContent> = {}): MediaContent {
  return {
    id: 12,
    content_code: "C12",
    uploaded_at: "2026-09-01",
    title: "V1",
    url: "https://www.tiktok.com/@x/video/7123456789012345678",
    thumbnail_url: "",
    thumbnail_ext: "jpg",
    video_status: "success",
    video_ext: "mp4",
    video_size: 1,
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

function renderPlayer(content: MediaContent, autoPlay = false) {
  return renderWithClient(
    <I18nProvider>
      <ContentPlayer content={content} publicBaseUrl="https://m.example" autoPlay={autoPlay} />
    </I18nProvider>,
  );
}

describe("ContentPlayer", () => {
  it("video_status success → render <video> gắn thẳng /video-stream, không qua fetch/Blob", () => {
    renderPlayer(makeContent({ video_status: "success" }));

    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("/api/media/contents/12/video-stream");
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("video_status khác success → không render <video>, nhúng nguồn gốc ngay", () => {
    renderPlayer(makeContent({ video_status: "idle" }));

    expect(document.querySelector("iframe")).not.toBeNull();
    expect(document.querySelector("video")).toBeNull();
  });

  it("<video> bắn sự kiện error (luồng ERP lỗi) → chuyển sang nhúng nguồn gốc", async () => {
    renderPlayer(makeContent({ video_status: "success" }));

    const video = document.querySelector("video") as HTMLVideoElement;
    expect(video).not.toBeNull();

    video.dispatchEvent(new Event("error"));

    await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
    expect(document.querySelector("video")).toBeNull();
    const iframe = document.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toContain(
      "https://www.tiktok.com/player/v1/7123456789012345678",
    );
  });

  it("autoPlay + luồng ERP: trình duyệt chặn play() có tiếng (NotAllowedError) → tự tắt tiếng, phát lại, hiện nút Bật tiếng", async () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementationOnce(() => Promise.reject(new DOMException("blocked", "NotAllowedError")))
      .mockImplementation(() => Promise.resolve());

    renderPlayer(makeContent({ video_status: "success" }), true);

    await waitFor(() => expect(document.querySelector("video")).not.toBeNull());
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(2));
    const video = document.querySelector("video");
    expect(video?.muted).toBe(true);
    await screen.findByText("Bật tiếng");
  });

  it("luồng ERP treo (không có metadata, không bắn error) → sau 8s rơi về nhúng nguồn gốc", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderPlayer(makeContent({ video_status: "success" }));
      expect(document.querySelector("video")).not.toBeNull();

      // jsdom giữ readyState = 0 (HAVE_NOTHING) vì không tải media thật — đúng
      // trạng thái "treo" mà watchdog phải bắt.
      await act(async () => {
        vi.advanceTimersByTime(8100);
      });

      await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
      expect(document.querySelector("video")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
