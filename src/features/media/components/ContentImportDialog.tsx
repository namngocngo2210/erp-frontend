import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { downloadContentsImportTemplate, type MediaImportResult } from "@/lib/api/media";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => Promise<MediaImportResult>;
};

/** Nhập nội dung hàng loạt từ .xlsx: chọn/thả file → backend tạo từng dòng trên
 * ads-crm → hiện tổng kết + bảng dòng lỗi (dòng hợp lệ vẫn được tạo). */
export function ContentImportDialog({ open, onOpenChange, onImport }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MediaImportResult | null>(null);

  async function processFile(file: File) {
    setFileName(file.name);
    setResult(null);
    setBusy(true);
    try {
      const res = await onImport(file);
      setResult(res);
      if (res.created > 0)
        toast.success(`${t("media.contents.import.created")}: ${res.created}/${res.total_rows}`);
      if (res.created === 0 && res.errors.length === 0)
        toast.error(t("media.contents.import.emptyFile"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("media.contents.import.failed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleTemplate() {
    try {
      await downloadContentsImportTemplate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("media.contents.import.templateFailed"));
    }
  }

  function handleOpenChange(next: boolean) {
    if (busy) return;
    if (!next) {
      setFileName(null);
      setResult(null);
      setDragOver(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("media.contents.import.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div
            role="button"
            tabIndex={0}
            aria-label={t("media.contents.import.dropzone")}
            className={[
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors select-none",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
              busy ? "pointer-events-none opacity-60" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) void processFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void processFile(file);
              }}
            />
            {busy ? (
              <>
                <FileSpreadsheet className="size-10 animate-pulse text-primary" />
                <p className="text-sm text-muted-foreground">{t("media.contents.import.busy")}</p>
              </>
            ) : fileName ? (
              <>
                <FileSpreadsheet className="size-10 text-primary" />
                <p className="text-sm font-medium text-foreground">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {t("media.contents.import.pickAnother")}
                </p>
              </>
            ) : (
              <>
                <Upload className="size-10 text-muted-foreground" />
                <p className="text-center text-sm text-muted-foreground">
                  {t("media.contents.import.dropzone")}
                </p>
                <p className="text-xs text-muted-foreground">{t("media.contents.import.hint")}</p>
              </>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleTemplate()}
              disabled={busy}
            >
              <Download className="mr-1.5 size-3.5" />
              {t("media.contents.import.template")}
            </Button>
          </div>

          {result ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm">
                {t("media.contents.import.created")}: <strong>{result.created}</strong>/
                {result.total_rows}
                {result.errors.length > 0 ? (
                  <span className="ml-2 text-destructive">
                    {t("media.contents.import.failedRows")}: {result.errors.length}
                  </span>
                ) : null}
              </p>
              {result.errors.length > 0 ? (
                <div className="max-h-64 overflow-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="w-16 px-2 py-1">{t("media.contents.import.col.row")}</th>
                        <th className="px-2 py-1">{t("media.contents.col.title")}</th>
                        <th className="px-2 py-1">{t("media.contents.import.col.error")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e) => (
                        <tr key={e.row} className="border-t align-top">
                          <td className="px-2 py-1 tabular-nums">{e.row}</td>
                          <td className="px-2 py-1">{e.title}</td>
                          <td className="px-2 py-1 text-destructive">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={busy}
            >
              {t("media.common.close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
