import { useEffect, useState } from "react";

import { fetchBlob } from "@/services/http";

interface Props {
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Tải ảnh được bảo vệ bằng JWT vào blob URL.
 * `<img src>` thường không gắn được Authorization header nên phải fetch kèm token
 * rồi tạo object URL. Thất bại thì render placeholder, không throw để khỏi vỡ trang.
 */
export function AuthImage({ src, alt, className }: Props) {
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

  if (!url) return <div className={className} aria-hidden />;
  return <img src={url} alt={alt ?? ""} className={className} />;
}
