import type { ReactNode } from "react";
import { ClipboardList, Minus, Phone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { diagCopyToClipboard } from "./webphone-diag";
import { WebphonePanel } from "./WebphonePanel";

async function copyDiagnostics() {
  const ok = await diagCopyToClipboard();
  if (ok) toast.success("Đã sao chép nhật ký tổng đài — dán gửi cho kỹ thuật.");
  else toast.error("Không sao chép được — nhật ký đã in ra Console (F12).");
}

/**
 * Khung "Tổng đài" nổi góc phải — GIỮ mounted, ẩn bằng CSS để không rớt cuộc gọi
 * (tab chủ đặt iframe Zenify vào `children`). Không có launcher nổi: mở bằng nút
 * "Quay số" trên toolbar trang đơn, icon gọi cạnh SĐT, hoặc khi có cuộc gọi đến.
 */
export function WebphoneDock({
  visible,
  onMinimize,
  errorMessage,
  onReconnect,
  children,
}: {
  visible: boolean;
  onMinimize: () => void;
  errorMessage: string | null;
  onReconnect: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl transition-all duration-200 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="flex items-center justify-between border-b border-border bg-primary/5 px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Phone className="h-3.5 w-3.5 text-primary" />
          Tổng đài
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => void copyDiagnostics()}
            title="Sao chép nhật ký tổng đài (gửi kỹ thuật khi gọi lỗi)"
            aria-label="Sao chép nhật ký tổng đài"
          >
            <ClipboardList className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onMinimize}
            title="Thu gọn"
            aria-label="Thu gọn webphone"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {errorMessage ? (
        <div className="flex w-85 max-w-[calc(100vw-2rem)] flex-col items-center gap-2 px-4 py-6 text-center text-sm text-muted-foreground">
          <span>{errorMessage}</span>
          <Button variant="outline" size="sm" onClick={onReconnect}>
            Kết nối lại
          </Button>
        </div>
      ) : (
        <WebphonePanel />
      )}
      {children}
    </div>
  );
}
