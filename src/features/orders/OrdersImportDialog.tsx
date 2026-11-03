import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORDER_SOURCE_OPTIONS } from "@/features/orders/order-source";
import { type OrderSource } from "@/features/orders/order-types";

type ImportFailure = { row_number: number; error: string; phone?: string; name?: string };

type Props = {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  isLandingPage: boolean;
  isKoc: boolean;
  importText: string;
  setImportText: React.Dispatch<React.SetStateAction<string>>;
  importOrderSource: OrderSource;
  setImportOrderSource: React.Dispatch<React.SetStateAction<OrderSource>>;
  importUploading: boolean;
  importSummary: { successCount: number; failedCount: number } | null;
  importFailures: ImportFailure[];
  activeImportHeaders: readonly string[];
  onAutoFormat: () => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  t: (key: string, fallback?: string) => string;
};

/** Dialog "Nhập đơn hàng" — paste/format/preview rồi gửi text import. */
export function OrdersImportDialog({
  open,
  onOpenChange,
  isLandingPage,
  isKoc,
  importText,
  setImportText,
  importOrderSource,
  setImportOrderSource,
  importUploading,
  importSummary,
  importFailures,
  activeImportHeaders,
  onAutoFormat,
  onPaste,
  onSubmit,
  t,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={t("orders.importExcel.title", "Nhập đơn hàng")}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importUploading}
            >
              {t("common.cancel", "Hủy")}
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!importText.trim() || importUploading}
            >
              {importUploading
                ? t("orders.importExcel.uploading", "Đang nhập...")
                : t("orders.importExcel.submit", "Nhập đơn")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {isLandingPage ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("orders.importExcel.orderSource", "Nguồn đơn")}
              </label>
              <Select
                value={importOrderSource}
                onValueChange={(value) => setImportOrderSource(value as OrderSource)}
                disabled={importUploading}
              >
                <SelectTrigger className="w-full sm:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_SOURCE_OPTIONS.filter((opt) => opt.value !== "koc").map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {t("orders.importExcel.dataInput", "Dữ liệu đơn hàng")}
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAutoFormat}
                disabled={!importText.trim() || importUploading}
                className="text-xs"
              >
                {t("orders.importExcel.autoFormat", "Auto Format")}
              </Button>
            </div>
            <textarea
              placeholder={
                isLandingPage
                  ? "Facebook|admin|20/04/2026 09:30:00|Nguyen Van A|0909123456|123 Nguyen Trai, Quan 1, TP HCM|Bộ nồi cao cấp 5 món"
                  : isKoc
                    ? "old_kiot|KOC790|admin|Hàng mẫu KOC|Nguyen Van A|true|0909123456|123 Nguyen Trai, Quan 1, TP HCM|Bắc Giang - Huyện Việt Yên|Thị trấn Bích Động|DC12|1|715680|0|0|4500|51,35,24|1000000477|đơn có trả"
                    : "old_kiot|admin|facebook|Nguyen Van A|true|0909123456|123 Nguyen Trai, Quan 1, TP HCM|BNC02,TSM01|2,2|500000,1000000|100000|0|0.5|50,50,50||đơn thường|0"
              }
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              onPaste={onPaste}
              disabled={importUploading}
              className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {(() => {
            const importHeaders = activeImportHeaders;
            const lines = importText.trim()
              ? importText
                  .trim()
                  .split("\n")
                  .filter((l) => l.trim())
              : [];
            return (
              <div className="overflow-auto border rounded-md max-h-75">
                <table data-slot="table" className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b whitespace-nowrap">
                        #
                      </th>
                      {importHeaders.map((h) => (
                        <th
                          key={h}
                          className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={importHeaders.length + 1}
                          className="px-2 py-4 text-center text-muted-foreground"
                        >
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      lines.map((line, i) => {
                        const fields = line.split("|");
                        return (
                          <tr
                            key={`${i}-${line}`}
                            className="border-b last:border-b-0 hover:bg-muted/50"
                          >
                            <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                            {importHeaders.map((_, ci) => (
                              <td
                                key={ci}
                                className="px-2 py-1 whitespace-nowrap max-w-50 truncate"
                              >
                                {fields[ci] ?? ""}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {importSummary ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-medium text-foreground">
                  {t("orders.importExcel.successCount", "Thành công")}: {importSummary.successCount}
                </span>
                <span className="font-medium text-foreground">
                  {t("orders.importExcel.failedCount", "Thất bại")}: {importSummary.failedCount}
                </span>
              </div>
              {importFailures.length > 0 ? (
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                  {importFailures.map((failure) => (
                    <div
                      key={`${failure.row_number}-${failure.phone || failure.name || failure.error}`}
                      className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-foreground"
                    >
                      <div className="font-medium">
                        {t("orders.importExcel.failureRow", "Dòng")} {failure.row_number}
                      </div>
                      <div className="text-muted-foreground">{failure.error}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
