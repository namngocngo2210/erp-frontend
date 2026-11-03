import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera } from "lucide-react";

import { extractWarrantyCode } from "../extract-code";
import { PORTAL_COLOR } from "../portal-theme";

// Nạp CameraScanner (và @zxing/browser + @zxing/library bên trong nó) chỉ khi
// khách thực sự bấm quét — giữ chunk portal ban đầu gọn cho lượt tải đầu tiên
// trên di động (thường là mạng 4G/tem QR quét ngoài cửa hàng).
const CameraScanner = lazy(() =>
  import("@/features/inventory/scan/CameraScanner").then((m) => ({ default: m.CameraScanner })),
);

type Props = {
  /** Nhận mã 8 ký tự đã trích từ QR/URL trên tem. */
  onDetected: (code: string) => void;
  disabled?: boolean;
};

/**
 * Nút mở camera quét tem cho form kích hoạt bảo hành (public, không auth).
 *
 * Khác {@link CameraScanButton} (dùng cho quét liên tục nhiều mã trong CRM
 * nội bộ): nút này TỰ ĐÓNG ngay sau khi bắt được mã đầu tiên — khách chỉ cần
 * quét một tem rồi điền thẳng vào ô nhập.
 */
export function PortalScanButton({ onDetected, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const cameraSupported =
    typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  function handleCode(raw: string) {
    setOpen(false);
    onDetected(extractWarrantyCode(raw));
  }

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trigger = triggerRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      // Trả focus về nút bấm sau khi overlay đóng (đóng bằng Esc, quét xong, hoặc bấm Đóng).
      trigger?.focus();
    };
  }, [open]);

  if (!cameraSupported) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Quét mã trên tem"
        title="Quét mã trên tem"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="h-13 w-13 flex shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm transition-opacity disabled:opacity-60"
        style={{ borderColor: PORTAL_COLOR.tealDeep }}
      >
        <Camera className="size-6" style={{ color: PORTAL_COLOR.tealDeep }} />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white">
            <div className="flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <p className="text-sm font-medium">Quét mã trên tem</p>
              <button
                type="button"
                onClick={close}
                className="flex h-11 min-w-11 items-center justify-center rounded-full bg-white/10 px-4 text-sm font-semibold"
              >
                Đóng
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <Suspense
                fallback={
                  <p className="flex h-full items-center justify-center text-sm text-white/80">
                    Đang mở camera…
                  </p>
                }
              >
                <CameraScanner onCode={handleCode} />
              </Suspense>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
                <div
                  className="aspect-[3/2] w-full max-w-sm rounded-2xl border-4"
                  style={{ borderColor: PORTAL_COLOR.green }}
                />
              </div>
            </div>

            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center text-sm text-white/80">
              Đưa mã QR trên tem vào khung để quét
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
