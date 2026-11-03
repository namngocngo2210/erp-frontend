import { useState } from "react";
import { createPortal } from "react-dom";
import { Camera } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CameraScanner } from "./CameraScanner";

type Props = {
  /** Cùng dạng handler mà ScanShipmentInput/useScannerGun gọi. */
  onScan: (code: string) => void | Promise<void>;
};

/**
 * Nút "Quét bằng camera" cho viewport mobile: mở overlay full-screen chứa
 * {@link CameraScanner}, đổ mã thẳng vào handler quét của dialog (không qua
 * phiên quét trung gian). Thành/bại từng mã do beep + toast của handler phản hồi;
 * overlay chỉ đếm số mã camera bắt được (đã dedup trong CameraScanner).
 */
export function CameraScanButton({ onScan }: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  function handleCode(code: string) {
    setCount((n) => n + 1);
    void onScan(code);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setCount(0);
          setOpen(true);
        }}
      >
        <Camera className="mr-2 size-4" />
        Quét bằng camera
      </Button>
      {open &&
        createPortal(
          // z-50 = ngang DialogContent nhưng mount sau nên nổi lên trên;
          // toaster của sonner z cao hơn nhiều nên toast vẫn hiện đè overlay.
          <div className="fixed inset-0 z-50 bg-black text-white">
            <style>{`@keyframes camscanbtn-line{0%{top:6%}50%{top:94%}100%{top:6%}}`}</style>

            <div className="absolute inset-0">
              <CameraScanner onCode={handleCode} />
            </div>

            {/* Lớp tối xung quanh để khung quét nổi bật (không chặn camera) */}
            <div className="pointer-events-none absolute inset-0 bg-black/35" />

            {/* Thanh trên: bộ đếm */}
            <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent px-4 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] text-center">
              <p className="text-sm text-white/80">{`Đã quét ${count} mã`}</p>
            </div>

            {/* Khung ngắm quét ở giữa */}
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
              <div className="relative aspect-[3/2] w-full max-w-sm">
                <span className="absolute -left-1 -top-1 size-9 rounded-tl-xl border-l-4 border-t-4 border-primary" />
                <span className="absolute -right-1 -top-1 size-9 rounded-tr-xl border-r-4 border-t-4 border-primary" />
                <span className="absolute -bottom-1 -left-1 size-9 rounded-bl-xl border-b-4 border-l-4 border-primary" />
                <span className="absolute -bottom-1 -right-1 size-9 rounded-br-xl border-b-4 border-r-4 border-primary" />
                <div
                  className="absolute inset-x-3 h-0.5 rounded-full bg-primary shadow-[0_0_12px_2px] shadow-primary/70"
                  style={{ animation: "camscanbtn-line 2.2s ease-in-out infinite" }}
                />
              </div>
            </div>

            {/* Thanh dưới: hướng dẫn + nút Xong */}
            <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 bg-gradient-to-t from-black/85 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
              <p className="text-center text-sm text-white/80">Đưa mã vạch vào khung để quét</p>
              <Button type="button" className="h-11 w-full" onClick={() => setOpen(false)}>
                Xong
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
