import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useStockDocument } from "@/features/inventory/documents-queries";
import { AttachmentsSection } from "@/features/inventory/components/AttachmentsSection";
import { formatDateTimeVi } from "@/lib/format";

const DOC_TYPE_LABELS: Record<string, string> = {
  receipt: "Nhập kho",
  issue: "Xuất kho",
  adjustment: "Điều chỉnh",
  transfer: "Chuyển kho",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  pending_approval: "Chờ duyệt",
  posted: "Đã ghi sổ",
  cancelled: "Đã huỷ",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

export function StockDocumentDetailDialog({
  documentId,
  onOpenChange,
}: {
  documentId: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: doc, isLoading } = useStockDocument(documentId);

  const warehouseLabel = doc
    ? doc.doc_type === "transfer"
      ? `${doc.source_warehouse_name ?? "?"} → ${doc.dest_warehouse_name ?? "?"}`
      : (doc.source_warehouse_name ?? doc.dest_warehouse_name ?? "—")
    : "";

  return (
    <Dialog open={documentId != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chi tiết phiếu {doc?.code ?? ""}</DialogTitle>
        </DialogHeader>

        {isLoading || !doc ? (
          <div className="flex justify-center py-12">
            <LogoSpinner label="Đang tải..." />
          </div>
        ) : (
          <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Loại phiếu" value={DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type} />
              <Field label="Trạng thái" value={STATUS_LABELS[doc.status] ?? doc.status} />
              <Field label="Kho" value={warehouseLabel} />
              <Field label="Ngày tạo" value={formatDateTimeVi(doc.created_at)} />
              {doc.submitted_by_name && (
                <Field label="Người gửi duyệt" value={doc.submitted_by_name} />
              )}
              {doc.approved_by_name && <Field label="Người duyệt" value={doc.approved_by_name} />}
            </div>

            {doc.note && <Field label="Ghi chú" value={doc.note} />}
            {doc.rejected_reason && <Field label="Lý do từ chối" value={doc.rejected_reason} />}

            <div>
              <p className="mb-1 text-sm font-medium text-foreground">
                Dòng hàng ({doc.lines.length})
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table data-slot="table" className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5">SKU</th>
                      <th className="px-3 py-1.5 text-right">SL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.lines.map((l) => (
                      <tr
                        key={l.id}
                        className="border-t border-border transition-colors hover:bg-muted/50"
                      >
                        <td className="px-3 py-1.5 font-medium">{l.product_sku}</td>
                        <td className="px-3 py-1.5 text-right">{l.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <AttachmentsSection documentId={doc.id} attachments={doc.attachments} canManage />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
