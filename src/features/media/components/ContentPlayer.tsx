/**
 * Quyết định phát gì cho một content: video_status="success" → phát bằng luồng
 * cùng origin qua chính ERP (endpoint /video-stream, xem lib/api/media.ts), rơi
 * về nhúng nguồn gốc (TikTok/YouTube/…) trong MỌI trường hợp khác — kể cả khi
 * luồng ERP lỗi hoặc treo (watchdog). Không có màn lỗi riêng: fallback CHÍNH LÀ
 * cách xử lý lỗi (spec Khám phá).
 *
 * Không dùng URL R2 ký sẵn (/video-url, hook `useVideoUrl`) nữa: trình duyệt của
 * chủ dự án nhận 403 khi gọi thẳng presigned URL của R2 trong khi server gọi
 * cùng URL, cùng lúc, ra 200/206 — tên miền của họ cũng không qua Cloudflare nên
 * không có đường CDN, kết luận mạng người xem không bao giờ tới được
 * `*.r2.cloudflarestorage.com`. Giữ nguyên hook/endpoint /video-url trong mã (có
 * thể dùng lại nếu sau này họ dựng CDN) — chỉ là không gọi ở player nữa.
 *
 * <video src=…> gắn THẲNG vào /video-stream — không còn tự fetch kèm Bearer rồi
 * phát qua Blob như trước (mất ~10s tải hết một video ~6MB mới bắt đầu phát, và
 * không tua được cho tới lúc tải xong, vì URL Blob không có Content-Range). Sở dĩ
 * gắn thẳng được: endpoint giờ CHẤP NHẬN THÊM cookie phiên `refresh_token` khi
 * request không có header Authorization (`apps/media/transport/stream_auth.py::
 * RefreshCookieAuthentication`) — <video> không tự gắn được Authorization (token
 * giữ ở RAM, xem services/http.ts) nhưng trình duyệt tự đính kèm cookie httpOnly
 * cho request same-origin, nên không cần JS can thiệp nữa. Trình duyệt tự stream
 * tiến độ + tua bằng Range như một <video src> bình thường.
 */
import { useEffect, useRef, useState } from "react";

import { ContentEmbed, resolveEmbed } from "@/features/media/content-embed";
import { useI18n } from "@/i18n";
import { contentVideoStreamUrl, thumbnailUrl, type MediaContent } from "@/lib/api/media";
import { cn } from "@/lib/utils";

type Props = {
  content: MediaContent;
  publicBaseUrl: string;
  className?: string;
  /** Tự phát ngay khi mount — dùng cho ô lưới Khám phá (phát tại chỗ khi bấm
   * thumbnail); mặc định false cho drawer chi tiết/bảng (Sheet vẫn cần bấm play). */
  autoPlay?: boolean;
};

/** Chờ tối đa ngần này rồi mới kết luận luồng ERP không phát được (xem effect dưới). */
const STREAM_TIMEOUT_MS = 8000;

export function ContentPlayer({ content, publicBaseUrl, className, autoPlay }: Props) {
  const { t } = useI18n();
  const enabled = content.video_status === "success";
  const poster = thumbnailUrl(publicBaseUrl, content) ?? undefined;
  // Suy ra tỉ lệ khung hình từ nguồn gốc kể cả khi phát qua luồng ERP — endpoint
  // đó chỉ trả bytes video, không trả kích thước, nên dựa vào nền tảng nguồn
  // (TikTok dọc 9:16…).
  const embed = resolveEmbed(content.url);
  const aspectClass =
    embed.kind === "iframe" && embed.aspect === "9:16" ? "aspect-[9/16]" : "aspect-video";

  const videoRef = useRef<HTMLVideoElement>(null);
  // Luồng ERP lỗi (<video> bắn `error`, hoặc watchdog hết giờ) → rơi về nhúng
  // nguồn gốc thay vì để player đứng hình không phản hồi.
  const [streamFailed, setStreamFailed] = useState(false);
  // Trình duyệt (Chrome/Safari) chặn autoplay có tiếng — phải tự tắt tiếng rồi
  // phát lại mới chạy; giữ cờ này để hiện nút "Bật tiếng" nhỏ, tự ẩn sau khi bấm.
  const [mutedAutostart, setMutedAutostart] = useState(false);

  // Đổi sang content khác → không mang trạng thái lỗi/mute của video cũ theo.
  useEffect(() => {
    setStreamFailed(false);
    setMutedAutostart(false);
  }, [content.id]);

  // Đường lùi: luồng ERP không chỉ hỏng bằng lỗi, nó còn hỏng bằng cách TREO —
  // <video> nhận được response nhưng không "ra hàng" (hiếm, nhưng có thể xảy ra
  // nếu upstream treo giữa chừng). Không có metadata trong ngần này giây thì coi
  // như hỏng và chuyển sang nhúng nguồn gốc.
  useEffect(() => {
    if (!enabled || streamFailed) return;
    const timer = window.setTimeout(() => {
      const el = videoRef.current;
      // readyState 0 = HAVE_NOTHING: chưa lấy nổi metadata sau ngần ấy giây.
      if (!el || el.readyState === 0) setStreamFailed(true);
    }, STREAM_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, streamFailed, content.id]);

  // Chính sách autoplay của trình duyệt: đặt thuộc tính HTML `autoPlay` trên
  // <video> có tiếng thường bị Chrome/Safari nuốt lặng lẽ (không lỗi, không phát)
  // vì thiếu tương tác người dùng trước đó — nên effect này tự gọi play() rồi bắt
  // NotAllowedError để tắt tiếng và thử lại, thay vì phó mặc cho thuộc tính tĩnh.
  useEffect(() => {
    if (!autoPlay || !enabled || streamFailed) return;
    const el = videoRef.current;
    if (!el) return;
    let cancelled = false;
    el.play().catch((err: unknown) => {
      if (cancelled) return;
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        el.muted = true;
        setMutedAutostart(true);
        void el.play().catch(() => {
          // Vẫn không phát được (hiếm) — để nguyên controls cho người dùng bấm tay.
        });
      }
    });
    return () => {
      cancelled = true;
    };
    // content.id để chạy lại effect khi remount sang video khác dù autoPlay/enabled
    // giữ nguyên giá trị (ví dụ hai content liên tiếp đều autoPlay=true).
  }, [autoPlay, enabled, streamFailed, content.id]);

  if (enabled && !streamFailed) {
    return (
      <div className={className}>
        <div className={cn(aspectClass, "relative overflow-hidden rounded-lg bg-black")}>
          <video
            key={content.id}
            ref={videoRef}
            src={contentVideoStreamUrl(content.id)}
            controls
            playsInline
            preload="metadata"
            poster={poster}
            onError={() => setStreamFailed(true)}
            className="h-full w-full object-contain"
          />
          {mutedAutostart && (
            <button
              type="button"
              onClick={() => {
                const el = videoRef.current;
                if (el) el.muted = false;
                setMutedAutostart(false);
              }}
              className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white hover:bg-black/90"
            >
              {t("media.player.unmute")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ContentEmbed url={content.url} className={aspectClass} autoPlay={autoPlay} />
    </div>
  );
}
