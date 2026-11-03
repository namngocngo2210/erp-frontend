import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { type FlowImportErrorBody, type FlowImportReport } from "@/lib/api/contact-flow";
import { useImportFlow } from "../queries";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isFlowImportErrorBody(body: unknown): body is FlowImportErrorBody {
  return !!body && typeof body === "object" && Array.isArray((body as { errors?: unknown }).errors);
}

/** Dialog "Nhập Excel" cấu hình tác nghiệp — upload .xlsx, hiển thị counts thành công hoặc bảng lỗi theo dòng. */
export function FlowImportDialog({ open, onOpenChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<FlowImportReport | null>(null);
  const [errors, setErrors] = useState<FlowImportErrorBody["errors"]>([]);
  const importMutation = useImportFlow();

  const resetState = () => {
    setFile(null);
    setReport(null);
    setErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen && !importMutation.isPending) resetState();
  };

  const handleSubmit = async () => {
    if (!file) return;
    setReport(null);
    setErrors([]);
    try {
      const result = await importMutation.mutateAsync(file);
      setReport(result);
      toast.success("Nhập cấu hình tác nghiệp thành công.");
    } catch (err) {
      const body = err && typeof err === "object" ? (err as { body?: unknown }).body : null;
      if (isFlowImportErrorBody(body)) {
        setErrors(body.errors);
        toast.error(`Nhập thất bại: ${body.errors.length} dòng lỗi.`);
      } else {
        toast.error(err instanceof Error ? err.message : "Nhập Excel thất bại.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <FormDialogShell
        title="Nhập Excel cấu hình tác nghiệp"
        description="Chọn file .xlsx theo mẫu (sheet Stage/Result/Transition) để tạo/cập nhật hàng loạt."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={importMutation.isPending}
            >
              Đóng
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!file || importMutation.isPending}
            >
              {importMutation.isPending ? "Đang nhập..." : "Nhập file"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">File Excel (.xlsx)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              disabled={importMutation.isPending}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {report ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <div className="mb-2 font-medium text-foreground">Kết quả nhập</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  Trạng thái: tạo mới {report.stages.created}, cập nhật {report.stages.updated}
                </div>
                <div>
                  Kết quả: tạo mới {report.results.created}, cập nhật {report.results.updated}
                </div>
                <div>
                  Chuyển bước: tạo mới {report.transitions.created}, cập nhật{" "}
                  {report.transitions.updated}
                </div>
              </div>
            </div>
          ) : null}

          {errors.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {errors.map((failure, idx) => (
                <div
                  key={`${failure.sheet}-${failure.row}-${idx}`}
                  className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-foreground"
                >
                  <div className="font-medium">
                    Sheet {failure.sheet} — Dòng {failure.row}
                  </div>
                  <div className="text-muted-foreground">{failure.error}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
