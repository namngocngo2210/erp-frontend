import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  formatImportText,
  IMPORT_HEADERS,
  KOC_IMPORT_HEADERS,
} from "@/features/orders/order-import-format";
import { type OrderSource } from "@/features/orders/order-types";
import { getValidAccessToken } from "@/services/http";

type ImportFailure = { row_number: number; error: string; phone?: string; name?: string };

export type UseOrdersImportParams = {
  isLandingPage: boolean;
  isKoc: boolean;
  t: (key: string, fallback?: string) => string;
  onClearFilters: () => Promise<void>;
  onOrdersPageChange: (nextPage: number) => Promise<void>;
  onRefreshOrdersAfterImport: () => Promise<void>;
};

export type UseOrdersImportReturn = {
  importModalOpen: boolean;
  importText: string;
  importOrderSource: OrderSource;
  importUploading: boolean;
  importSummary: { successCount: number; failedCount: number } | null;
  importFailures: ImportFailure[];
  activeImportHeaders: readonly string[];
  setImportText: React.Dispatch<React.SetStateAction<string>>;
  setImportOrderSource: React.Dispatch<React.SetStateAction<OrderSource>>;
  openImportModal: () => void;
  handleImportModalChange: (nextOpen: boolean) => void;
  handleSubmitImport: () => Promise<void>;
  handleImportPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  handleAutoFormat: () => void;
};

/**
 * Owns the "import orders by pasted text" dialog cluster previously inlined in
 * OrdersPage. Behaviour is intentionally identical: same XHR endpoint selection,
 * same payload shape, same post-import refresh sequence and toasts.
 */
export function useOrdersImport({
  isLandingPage,
  isKoc,
  t,
  onClearFilters,
  onOrdersPageChange,
  onRefreshOrdersAfterImport,
}: UseOrdersImportParams): UseOrdersImportReturn {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  // Nguồn đơn áp cho lần import Landing (mặc định "landing", cho phép đổi sang zalo/messenger/hotline...).
  const [importOrderSource, setImportOrderSource] = useState<OrderSource>("landing");
  const [importUploading, setImportUploading] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    successCount: number;
    failedCount: number;
  } | null>(null);
  const [importFailures, setImportFailures] = useState<ImportFailure[]>([]);

  const resetImportState = useCallback(() => {
    setImportText("");
    setImportOrderSource("landing");
    setImportUploading(false);
    setImportSummary(null);
    setImportFailures([]);
  }, []);

  const openImportModal = useCallback(() => {
    resetImportState();
    setImportModalOpen(true);
  }, [resetImportState]);

  const handleImportModalChange = useCallback(
    (nextOpen: boolean) => {
      setImportModalOpen(nextOpen);
      if (!nextOpen && !importUploading) {
        resetImportState();
      }
    },
    [importUploading, resetImportState],
  );

  const handleSubmitImport = useCallback(async () => {
    if (!importText.trim() || importUploading) return;

    setImportUploading(true);
    setImportSummary(null);
    setImportFailures([]);

    try {
      const accessToken = await getValidAccessToken();
      const result = await new Promise<{
        total_rows: number;
        success_count: number;
        failed_count: number;
        failures: ImportFailure[];
        warnings?: string[];
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const endpoint = isLandingPage
          ? "/api/orders/import-landing-text"
          : isKoc
            ? "/api/orders/import-koc-text"
            : "/api/orders/import-text";
        xhr.open("POST", endpoint);
        xhr.withCredentials = true;
        if (accessToken) {
          xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
          xhr.setRequestHeader("Content-Type", "application/json");
        }
        xhr.onerror = () =>
          reject(new Error(t("orders.toast.importFailed", "Không thể import dữ liệu.")));
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Invalid response"));
            }
          } else {
            reject(new Error(xhr.statusText || "Import failed"));
          }
        };
        const payload = isLandingPage
          ? { text: importText, order_source: importOrderSource }
          : { text: importText };
        xhr.send(JSON.stringify(payload));
      });

      setImportSummary({
        successCount: result.success_count ?? 0,
        failedCount: result.failed_count ?? 0,
      });
      setImportFailures(Array.isArray(result.failures) ? result.failures : []);

      // Cảnh báo cấp file (vd cột Nhân viên bị bỏ vì thiếu quyền gán sale). Toast
      // riêng, KHÔNG gộp vào toast tổng kết bên dưới: gộp vào thì nó biến mất sau
      // "Import thành công" và người dùng vẫn tưởng cột đã có tác dụng.
      for (const warning of Array.isArray(result.warnings) ? result.warnings : []) {
        toast.warning(warning);
      }

      // Clear filters and reset to page 0 to show newly imported orders
      await onClearFilters();
      await onOrdersPageChange(0);
      await onRefreshOrdersAfterImport();

      if ((result.failed_count ?? 0) > 0) {
        toast.warning(
          t(
            "orders.toast.importCompletedWithFailures",
            "Import hoàn tất: thành công {success}, thất bại {failed}.",
          )
            .replace("{success}", String(result.success_count ?? 0))
            .replace("{failed}", String(result.failed_count ?? 0)),
        );
      } else {
        toast.success(
          t("orders.toast.importSuccess", "Import thành công {count} đơn hàng.").replace(
            "{count}",
            String(result.success_count ?? 0),
          ),
        );
      }
    } catch (error) {
      const detail =
        error instanceof Error && error.message
          ? error.message
          : t("orders.toast.importFailed", "Không thể import dữ liệu.");
      toast.error(detail);
    } finally {
      setImportUploading(false);
    }
  }, [
    importText,
    importUploading,
    isLandingPage,
    isKoc,
    importOrderSource,
    onRefreshOrdersAfterImport,
    onOrdersPageChange,
    onClearFilters,
    t,
  ]);

  // Landing import dùng cùng schema 17-cột với orders; order_source do người dùng
  // chọn trong dialog (mặc định "landing") và gửi kèm lên endpoint import-landing-text.
  // Trang KOC dùng layout 19 cột riêng (KOC_IMPORT_HEADERS) + endpoint import-koc-text.
  const activeImportHeaders: readonly string[] = isKoc ? KOC_IMPORT_HEADERS : IMPORT_HEADERS;

  const handleImportPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      setImportText(formatImportText(pastedText, activeImportHeaders.length));
    },
    [activeImportHeaders.length],
  );

  const handleAutoFormat = useCallback(() => {
    setImportText(formatImportText(importText, activeImportHeaders.length));
    toast.success(t("orders.toast.formatSuccess", "Đã format dữ liệu thành công."));
  }, [importText, activeImportHeaders.length, t]);

  return {
    importModalOpen,
    importText,
    importOrderSource,
    importUploading,
    importSummary,
    importFailures,
    activeImportHeaders,
    setImportText,
    setImportOrderSource,
    openImportModal,
    handleImportModalChange,
    handleSubmitImport,
    handleImportPaste,
    handleAutoFormat,
  };
}
