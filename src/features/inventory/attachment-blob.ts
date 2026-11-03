import { useEffect, useState } from "react";

import { fetchBlob } from "@/services/http";

export function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

/** Tải file (ảnh/PDF) bảo vệ bằng JWT thành blob URL để hiển thị/tải về. */
export function useBlobUrl(src: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    if (!src) {
      setUrl(null);
      return;
    }
    fetchBlob(src)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return url;
}
