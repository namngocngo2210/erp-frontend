import { useEffect, useRef, useState } from "react";

import { createScanDeduper } from "./scan-dedup";

type Props = { onCode: (code: string) => void };

// Chống quét trùng: mã phải RỜI khung hình đủ lâu mới được bắn lại (cửa sổ
// trượt theo lần thấy cuối — xem scan-dedup.ts).
const DEDUP_MS = 1500;

const CAMERA_ERROR = "Không truy cập được camera. Hãy cấp quyền hoặc dùng ô nhập tay.";

// Yêu cầu độ phân giải cao → nhiều pixel/vạch hơn → đọc được mã nhỏ / ở xa hơn
// (không phải đưa sát vào camera). Dùng `ideal` để thiết bị tự chọn mức gần nhất.
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

// Bật lấy nét liên tục (nếu thiết bị hỗ trợ) để ảnh nét hơn khi quét. Best-effort.
async function enableContinuousFocus(video: HTMLVideoElement | null): Promise<void> {
  const stream = (video?.srcObject ?? null) as MediaStream | null;
  const track = stream?.getVideoTracks?.()[0];
  if (!track?.applyConstraints) return;
  // getCapabilities/focusMode chưa có trong lib TS → ép kiểu.
  const caps = (track.getCapabilities?.() ?? {}) as { focusMode?: string[] };
  if (!caps.focusMode?.includes("continuous")) return;
  try {
    await track.applyConstraints({
      advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet],
    });
  } catch {
    /* thiết bị từ chối → bỏ qua */
  }
}

export function CameraScanner({ onCode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    // Latest-ref qua effect (ghi ref trong thân render làm React Compiler bail out).
    // Chỉ đọc trong emit() của vòng detect camera — không đọc trong render.
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let zxingControls: { stop: () => void } | null = null;
    const shouldEmit = createScanDeduper(DEDUP_MS);

    function emit(code: string) {
      if (!shouldEmit(code, Date.now())) return;
      onCodeRef.current(code);
    }

    async function start() {
      try {
        if ("BarcodeDetector" in window) {
          // Đường nhanh (Chrome Android): ta tự lấy camera + vòng detect.
          stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
          if (stopped) {
            // Unmount trong lúc chờ quyền camera → cleanup đã chạy, tự tắt track kẻo đèn camera treo.
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            try {
              await video.play();
            } catch {
              /* jsdom / autoplay policy: ignore */
            }
            await enableContinuousFocus(video);
          }
          // Không truyền `formats` → BarcodeDetector nhận TẤT CẢ loại nền tảng hỗ trợ.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detector = new (window as any).BarcodeDetector();
          const loop = async () => {
            if (stopped || !videoRef.current) return;
            try {
              const found = await detector.detect(videoRef.current);
              if (stopped) return;
              if (found?.[0]?.rawValue) emit(found[0].rawValue);
            } catch {
              /* frame chưa sẵn sàng */
            }
            raf = requestAnimationFrame(loop);
          };
          raf = requestAnimationFrame(loop);
        } else {
          // iOS Safari (không có BarcodeDetector): để @zxing tự quản camera +
          // vòng decode. decodeFromConstraints đáng tin hơn decodeFromVideoElement,
          // và hints (TRY_HARDER + POSSIBLE_FORMATS) giúp đọc 1D như Code128.
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const { DecodeHintType } = await import("@zxing/library");
          if (stopped) return;
          // KHÔNG giới hạn POSSIBLE_FORMATS → zxing thử TẤT CẢ symbology nó hỗ trợ
          // (Code128/39/93, Codabar, EAN/UPC, ITF, QR, DataMatrix, PDF417, Aztec…).
          // TRY_HARDER tăng khả năng đọc mã 1D mờ/nghiêng. Khi biết đúng loại mã của
          // đơn vị vận chuyển, có thể set lại POSSIBLE_FORMATS để tăng tốc + giảm đọc nhầm.
          const hints = new Map<number, unknown>();
          hints.set(DecodeHintType.TRY_HARDER, true);
          const reader = new BrowserMultiFormatReader(hints);
          zxingControls = await reader.decodeFromConstraints(
            { video: VIDEO_CONSTRAINTS },
            videoRef.current!,
            (result) => {
              if (result) emit(result.getText());
            },
          );
          if (stopped) {
            zxingControls.stop();
            return;
          }
          // zxing đã gắn stream vào video → bật continuous focus (best-effort).
          await enableContinuousFocus(videoRef.current);
        }
      } catch {
        if (!stopped) setError(CAMERA_ERROR);
      }
    }

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return <p className="p-4 text-center text-sm text-destructive">{error}</p>;
  }
  return (
    <video
      ref={videoRef}
      className="h-full w-full rounded-lg bg-black object-cover"
      muted
      playsInline
    />
  );
}
