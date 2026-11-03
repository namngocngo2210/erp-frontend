import { KiotVietLogsDialog } from "../KiotVietLogsDialog";
import { KiotVietPrecheckDialog } from "../KiotVietPrecheckDialog";
import { OrdersImportDialog } from "../OrdersImportDialog";
import type { useOrdersImport } from "../use-orders-import";
import { OrdersKshipDialogs } from "./OrdersKshipDialogs";
import type { useOrdersKiotVietActions } from "./use-orders-kiotviet-actions";
import type { useOrdersKshipDialogs } from "./use-orders-kship-dialogs";

type Props = {
  importer: ReturnType<typeof useOrdersImport>;
  kiotviet: ReturnType<typeof useOrdersKiotVietActions>;
  kship: ReturnType<typeof useOrdersKshipDialogs>;
  isLandingPage: boolean;
  isKoc: boolean;
  canManageSenderAddresses: boolean;
  t: (key: string, fallback?: string) => string;
};

/** Các dialog phụ của trang đơn: precheck/log KiotViet, import, Kship. */
export function OrdersPageDialogs({
  importer,
  kiotviet,
  kship,
  isLandingPage,
  isKoc,
  canManageSenderAddresses,
  t,
}: Props) {
  return (
    <>
      <KiotVietPrecheckDialog
        precheck={kiotviet.kiotVietPrecheckDialog}
        singlePushOrderId={kiotviet.kiotVietSinglePushOrderId}
        onClose={() => {
          kiotviet.setKiotVietSinglePushOrderId(null);
          kiotviet.setKiotVietPrecheckDialog(null);
        }}
        onPushSingleInvalidOrder={(orderId) => void kiotviet.handlePushSingleInvalidOrder(orderId)}
        t={t}
      />

      <OrdersImportDialog
        open={importer.importModalOpen}
        onOpenChange={importer.handleImportModalChange}
        isLandingPage={isLandingPage}
        isKoc={isKoc}
        importText={importer.importText}
        setImportText={importer.setImportText}
        importOrderSource={importer.importOrderSource}
        setImportOrderSource={importer.setImportOrderSource}
        importUploading={importer.importUploading}
        importSummary={importer.importSummary}
        importFailures={importer.importFailures}
        activeImportHeaders={importer.activeImportHeaders}
        onAutoFormat={importer.handleAutoFormat}
        onPaste={importer.handleImportPaste}
        onSubmit={() => void importer.handleSubmitImport()}
        t={t}
      />

      <KiotVietLogsDialog
        open={kiotviet.kiotVietLogsOpen}
        onOpenChange={kiotviet.setKiotVietLogsOpen}
        loading={kiotviet.kiotVietLogsLoading}
        logs={kiotviet.kiotVietLogs}
      />

      <OrdersKshipDialogs kship={kship} canManageSenderAddresses={canManageSenderAddresses} t={t} />
    </>
  );
}
