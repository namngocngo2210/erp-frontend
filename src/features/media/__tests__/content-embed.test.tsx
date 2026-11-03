import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ContentEmbed, resolveEmbed } from "@/features/media/content-embed";
import { I18nProvider } from "@/i18n";

describe("resolveEmbed", () => {
  it.each([
    [
      "TikTok /video/",
      "https://www.tiktok.com/@x/video/7123456789012345678",
      "https://www.tiktok.com/player/v1/7123456789012345678?music_info=0&description=0",
      "9:16",
    ],
    [
      "TikTok /player/v1/",
      "https://www.tiktok.com/player/v1/7123456789012345678",
      "https://www.tiktok.com/player/v1/7123456789012345678?music_info=0&description=0",
      "9:16",
    ],
    [
      "TikTok /embed/",
      "https://www.tiktok.com/embed/7123456789012345678",
      "https://www.tiktok.com/player/v1/7123456789012345678?music_info=0&description=0",
      "9:16",
    ],
    [
      "YouTube youtu.be",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "16:9",
    ],
    [
      "YouTube /shorts/",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "9:16",
    ],
    [
      "YouTube /embed/",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "16:9",
    ],
    [
      "YouTube ?v=",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "16:9",
    ],
    ["Vimeo", "https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871", "16:9"],
    [
      "Google Drive /file/d/",
      "https://drive.google.com/file/d/1AbCdEfGh/view",
      "https://drive.google.com/file/d/1AbCdEfGh/preview",
      "16:9",
    ],
    [
      "Google Drive ?id=",
      "https://drive.google.com/open?id=1AbCdEfGh",
      "https://drive.google.com/file/d/1AbCdEfGh/preview",
      "16:9",
    ],
  ])("%s → iframe đúng src + aspect", (_label, url, expectedSrc, expectedAspect) => {
    const result = resolveEmbed(url);
    expect(result.kind).toBe("iframe");
    expect(result.src).toBe(expectedSrc);
    if (result.kind === "iframe") expect(result.aspect).toBe(expectedAspect);
  });

  it("Facebook video/reel/watch và fb.watch → plugin video.php", () => {
    for (const url of [
      "https://www.facebook.com/somepage/videos/1234567890/",
      "https://www.facebook.com/reel/1234567890",
      "https://www.facebook.com/watch/?v=1234567890",
      "https://fb.watch/abcDEF123/",
    ]) {
      const result = resolveEmbed(url);
      expect(result.kind).toBe("iframe");
      expect(result.src).toBe(
        `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      );
      if (result.kind === "iframe") expect(result.aspect).toBe("16:9");
    }
  });

  it("URL lạ/không khớp nền tảng nào (http/https) → unknown nhưng an toàn để làm href", () => {
    const url = "https://example.com/some/random/page";
    expect(resolveEmbed(url)).toEqual({ kind: "unknown", src: url, safe: true });
  });

  it("chuỗi rỗng hoặc URL hỏng → unknown, không an toàn, không ném lỗi", () => {
    expect(resolveEmbed("")).toEqual({ kind: "unknown", src: "", safe: false });
    expect(resolveEmbed("not a url")).toEqual({ kind: "unknown", src: "not a url", safe: false });
  });

  it("scheme nguy hiểm (javascript:, data:) và chuỗi rác → không phải iframe, không được đánh dấu an toàn làm href", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "chuỗi rác không phải URL",
    ]) {
      const result = resolveEmbed(url);
      expect(result.kind).not.toBe("iframe");
      if (result.kind === "unknown") expect(result.safe).toBe(false);
    }
  });
});

describe("ContentEmbed", () => {
  it("URL javascript: → không render bất kỳ thẻ <a href> nào (chặn XSS qua link fallback)", () => {
    render(
      <I18nProvider>
        <ContentEmbed url="javascript:alert(1)" />
      </I18nProvider>,
    );
    expect(document.querySelector("a[href]")).toBeNull();
    expect(screen.getByText("Đường dẫn không hợp lệ.")).toBeInTheDocument();
  });
});
