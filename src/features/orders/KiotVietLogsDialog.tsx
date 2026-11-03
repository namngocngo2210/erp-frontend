import { memo } from "react";

import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { type KiotVietJobLogRow } from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";

function formatKiotVietActionLabel(
  action: string,
  t: (key: string, fallback?: string) => string,
): string {
  switch (action) {
    case "push_selected":
      return t("orders.kiotviet.pushSelected", "Đẩy đơn (các dòng đã chọn)");
    case "push_unsent":
      return t("orders.kiotviet.pushUnsent", "Đẩy đơn (các dòng chưa gửi)");
    case "sync_shipping_selected":
      return t("orders.kiotviet.syncShippingSelected", "Cập nhật mã vận đơn (các dòng đã chọn)");
    case "sync_status_selected":
      return t("orders.kiotviet.syncStatusSelected", "Cập nhật trạng thái (các dòng đã chọn)");
    case "sync_status_has_shipping":
      return t(
        "orders.kiotviet.syncStatusHasShipping",
        "Cập nhật trạng thái (tất cả đơn đã có mã vận đơn)",
      );
    case "sync_shipping_empty":
      return t(
        "orders.kiotviet.syncShippingDeprecated",
        "Đã bỏ: cập nhật mã vận đơn (đơn chưa có mã vận đơn)",
      );
    case "sync_status_no_shipping":
      return t(
        "orders.kiotviet.syncStatusDeprecated",
        "Đã bỏ: cập nhật trạng thái (đơn chưa có mã vận đơn)",
      );
    default:
      return action || "-";
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  logs: KiotVietJobLogRow[];
};

function KiotVietLogsDialogImpl({ open, onOpenChange, loading, logs }: Props) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={t("orders.kiotviet.logs", "Lịch sử thao tác KiotViet")}
        description={t(
          "orders.kiotviet.logsDesc",
          "Theo dõi thao tác đẩy đơn/cập nhật mã vận đơn/trạng thái theo người dùng.",
        )}
      >
        <div className="overflow-auto rounded-md border border-border">
          <table data-slot="table" className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="border-b border-border text-left">
                <th className="px-2 py-2">{t("orders.kiotviet.logTime", "Thời gian")}</th>
                <th className="px-2 py-2">{t("orders.kiotviet.logAction", "Thao tác")}</th>
                <th className="px-2 py-2">{t("orders.kiotviet.logStatus", "Trạng thái")}</th>
                <th className="px-2 py-2">{t("orders.kiotviet.logOrder", "Đơn hàng")}</th>
                <th className="px-2 py-2">{t("orders.kiotviet.logCode", "Mã")}</th>
                <th className="px-2 py-2">{t("orders.kiotviet.logUser", "Người thao tác")}</th>
                <th className="px-2 py-2">{t("orders.kiotviet.logError", "Lỗi")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-2 py-6 text-center text-muted-foreground" colSpan={7}>
                    {t("common.loading", "Đang tải...")}
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td className="px-2 py-6 text-center text-muted-foreground" colSpan={7}>
                    {t("orders.kiotviet.logsEmpty", "Chưa có dữ liệu log.")}
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border/60 transition-colors hover:bg-muted/50"
                  >
                    <td className="px-2 py-2">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-2 py-2">{formatKiotVietActionLabel(log.action, t)}</td>
                    <td className="px-2 py-2">{log.status}</td>
                    <td className="px-2 py-2">
                      #{log.order_id} {log.order_name || ""}
                    </td>
                    <td className="px-2 py-2">
                      {log.order_invoice_code ||
                        log.order_shipping_code ||
                        log.order_external_id ||
                        "-"}
                    </td>
                    <td className="px-2 py-2">
                      {log.requested_by_display_name || log.requested_by_username || "-"}
                    </td>
                    <td className="max-w-70 truncate px-2 py-2" title={log.error_message || ""}>
                      {log.error_message || "-"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </FormDialogShell>
    </Dialog>
  );
}

export const KiotVietLogsDialog = memo(KiotVietLogsDialogImpl);
