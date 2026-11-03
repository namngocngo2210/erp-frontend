/**
 * Suy ra URL nhúng (iframe) từ `content.url` gốc — TikTok/YouTube/Facebook/Vimeo/
 * Google Drive. Hàm thuần `resolveEmbed` tách riêng để test bảng không cần render;
 * `<ContentEmbed>` chỉ là lớp hiển thị mỏng bọc quanh nó.
 *
 * Dùng khi KHÔNG có bản cache video trên hệ thống (video_status khác "success"
 * hoặc endpoint /video-url lỗi/không trả url) — xem ContentPlayer. Nội dung
 * không khớp nền tảng nào rơi về nút "mở link gốc", không có màn lỗi.
 */
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/** `autoplay`: bật khi ô lưới Khám phá tự phát ngay khi bấm thumbnail (Task
 * phát tại chỗ) — mỗi nền tảng nhúng có tham số autoplay riêng, Drive không có
 * nên bỏ qua (giữ nguyên như cũ). */
export type EmbedOptions = { autoplay?: boolean };

export type EmbedResult =
  | { kind: "iframe"; src: string; aspect: "9:16" | "16:9" }
  // `safe`: URL đến từ hệ thống ngoài (ads-crm) nên không thể tin tưởng — chỉ coi
  // là an toàn để render thành href khi scheme là http/https. `javascript:`,
  // `data:`, `vbscript:`… (và chuỗi không parse được thành URL) có hostname rỗng
  // nên lọt hết mọi nhánh so khớp nền tảng phía dưới; nếu render thẳng src đó vào
  // `<a href>` thì đây là điểm chèn XSS. `ContentEmbed` dựa vào cờ này để quyết
  // định render `<a>` (safe) hay `<span>` không có href (không safe).
  | { kind: "unknown"; src: string; safe: boolean };

/** Vẫn thử suy ra id ngay cả khi `new URL()` ném lỗi (host thiếu scheme hiếm gặp). */
function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

// resolveEmbed thuần được export cùng file với <ContentEmbed> theo đúng yêu cầu
// (bảng test không cần render) — vướng react-refresh/only-export-components,
// chấp nhận được vì tách file sẽ phá vỡ chỗ gọi (ContentPlayer cần cả hai).
// eslint-disable-next-line react-refresh/only-export-components
export function resolveEmbed(url: string, options: EmbedOptions = {}): EmbedResult {
  const autoplay = options.autoplay === true;
  if (!url) return { kind: "unknown", src: url, safe: false };
  const u = parseUrl(url);
  // Chỉ http/https mới được coi là an toàn để dùng làm href — xem comment ở
  // field `safe` trong EmbedResult phía trên.
  const safe = u != null && (u.protocol === "http:" || u.protocol === "https:");
  const fallback: EmbedResult = { kind: "unknown", src: url, safe };
  if (!u) return fallback;
  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  const path = u.pathname;

  if (host.endsWith("tiktok.com")) {
    const m = /\/(?:video|player\/v1|embed)\/(\d+)/.exec(path);
    if (m) {
      return {
        kind: "iframe",
        src: `https://www.tiktok.com/player/v1/${m[1]}?music_info=0&description=0${autoplay ? "&autoplay=1" : ""}`,
        aspect: "9:16",
      };
    }
  }

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    let id: string | null = null;
    let isShorts = false;
    if (host === "youtu.be") {
      id = path.slice(1).split("/")[0] || null;
    } else {
      const shorts = /\/shorts\/([\w-]+)/.exec(path);
      const embed = /\/embed\/([\w-]+)/.exec(path);
      if (shorts) {
        id = shorts[1];
        isShorts = true;
      } else if (embed) {
        id = embed[1];
      } else {
        id = u.searchParams.get("v");
      }
    }
    if (id) {
      return {
        kind: "iframe",
        src: `https://www.youtube.com/embed/${id}${autoplay ? "?autoplay=1" : ""}`,
        aspect: isShorts ? "9:16" : "16:9",
      };
    }
  }

  if (host === "fb.watch" || host.endsWith("facebook.com")) {
    const isVideoish = host === "fb.watch" || /\/(videos|reel|watch)(\/|$)/.test(path);
    if (isVideoish) {
      return {
        kind: "iframe",
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false${autoplay ? "&autoplay=true" : ""}`,
        aspect: "16:9",
      };
    }
  }

  if (host.endsWith("vimeo.com")) {
    const m = /\/(\d+)/.exec(path);
    if (m) {
      return {
        kind: "iframe",
        src: `https://player.vimeo.com/video/${m[1]}${autoplay ? "?autoplay=1" : ""}`,
        aspect: "16:9",
      };
    }
  }

  if (host.endsWith("drive.google.com")) {
    const m = /\/file\/d\/([\w-]+)/.exec(path);
    const id = m ? m[1] : u.searchParams.get("id");
    if (id)
      return {
        kind: "iframe",
        src: `https://drive.google.com/file/d/${id}/preview`,
        aspect: "16:9",
      };
  }

  return fallback;
}

type Props = { url: string; className?: string; autoPlay?: boolean };

export function ContentEmbed({ url, className, autoPlay }: Props) {
  const { t } = useI18n();
  const result = resolveEmbed(url, { autoplay: autoPlay });
  if (result.kind === "unknown") {
    return (
      <div
        className={cn(
          "flex aspect-video items-center justify-center rounded-lg bg-muted",
          className,
        )}
      >
        {result.safe ? (
          <a
            href={result.src}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline"
          >
            {t("media.contents.detail.openSource")}
          </a>
        ) : (
          // Scheme không phải http/https (hoặc chuỗi không phải URL) — KHÔNG render
          // <a href>, chỉ hiện text tĩnh để tránh XSS qua javascript:/data:... đến từ
          // URL do hệ thống ngoài cung cấp.
          <span className="text-sm text-muted-foreground">{t("media.embed.invalidLink")}</span>
        )}
      </div>
    );
  }
  return (
    <div
      className={cn(
        result.aspect === "9:16" ? "aspect-[9/16]" : "aspect-video",
        "overflow-hidden rounded-lg bg-black",
        className,
      )}
    >
      <iframe
        src={result.src}
        title={url}
        className="h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
