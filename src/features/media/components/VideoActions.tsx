import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { downloadContentVideo, type MediaContent } from "@/lib/api/media";

import { mediaCan, type MediaRole } from "../access";
import { useRequestVideoCache } from "../queries";

type Props = { content: MediaContent; role: MediaRole | null };

/** Chỉ TikTok mới cache được video (ads-crm chỉ hỗ trợ tải TikTok, spec D9). */
const TIKTOK_URL_RE = /tiktok\.com/i;

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Thao tác thất bại.";
}

/**
 * Nút "Tải video" (proxy Bearer → Blob, spec D9) + "Cache video"/"Cache lại"
 * cho nội dung TikTok, cắm vào `ContentDetailSheet actions` (Task 21).
 */
export function VideoActions({ content, role }: Props) {
  const { t } = useI18n();
  const [downloading, setDownloading] = useState(false);
  const cacheMutation = useRequestVideoCache(content.id);

  const isTiktok = TIKTOK_URL_RE.test(content.url);
  const showCache = isTiktok && content.video_status !== "success";
  const showRecache =
    mediaCan(role, "video.cache_force") && content.video_status === "success" && isTiktok;

  async function handleDownload() {
    setDownloading(true);
    try {
      const { blob, filename } = await downloadContentVideo(content.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  async function handleCache(force: boolean) {
    try {
      const { video_status } = await cacheMutation.mutateAsync(force);
      if (video_status === "pending") toast.success(t("media.video.queued"));
      else if (video_status === "success") toast.success(t("media.video.already"));
      else toast.success(video_status);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={downloading}
        onClick={handleDownload}
      >
        {downloading ? t("media.video.downloading") : t("media.video.download")}
      </Button>
      {showCache ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cacheMutation.isPending}
          onClick={() => handleCache(false)}
        >
          {t("media.video.cache")}
        </Button>
      ) : null}
      {showRecache ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cacheMutation.isPending}
          onClick={() => handleCache(true)}
        >
          {t("media.video.recache")}
        </Button>
      ) : null}
    </>
  );
}
