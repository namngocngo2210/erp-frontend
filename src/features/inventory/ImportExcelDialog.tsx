import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseImportLines, downloadLinesTemplate } from "@/features/inventory/import-lines";
import type { ImportLine } from "@/features/inventory/import-lines";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (lines: ImportLine[]) => void;
};

export function ImportExcelDialog({ open, onOpenChange, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  async function processFile(file: File) {
    setSelectedFileName(file.name);
    setIsParsing(true);
    try {
      const result = await parseImportLines(file);
      toast.success(`Đã đọc ${result.lines.length} dòng`);
      if (result.errors.length > 0) {
        const preview = result.errors
          .slice(0, 3)
          .map((e) => e.sku || "(trống)")
          .join(", ");
        toast.error(`${result.errors.length} dòng lỗi: ${preview}…`);
      }
      if (result.lines.length === 0) {
        // nothing to import — keep dialog open
        return;
      }
      onImported(result.lines);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nhập file thất bại.");
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  }

  async function handleDownloadTemplate() {
    try {
      await downloadLinesTemplate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tải mẫu thất bại.");
    }
  }

  function handleOpenChange(o: boolean) {
    if (!isParsing) {
      if (!o) {
        setSelectedFileName(null);
        setIsDragOver(false);
      }
      onOpenChange(o);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nhập từ Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Drag-and-drop zone */}
          <div
            role="button"
            tabIndex={0}
            className={[
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors select-none",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
              isParsing ? "pointer-events-none opacity-60" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {isParsing ? (
              <>
                <FileSpreadsheet className="size-10 text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground">Đang xử lý file…</p>
              </>
            ) : selectedFileName ? (
              <>
                <FileSpreadsheet className="size-10 text-primary" />
                <p className="text-sm font-medium text-foreground">{selectedFileName}</p>
                <p className="text-xs text-muted-foreground">Bấm để chọn file khác</p>
              </>
            ) : (
              <>
                <Upload className="size-10 text-muted-foreground" />
                <p className="text-center text-sm text-muted-foreground">
                  Kéo &amp; thả file Excel vào đây, hoặc bấm để chọn
                </p>
                <p className="text-xs text-muted-foreground">Hỗ trợ .xlsx, .xls</p>
              </>
            )}
          </div>

          {/* Download template */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isParsing}
            >
              <Download className="mr-1.5 size-3.5" />
              Tải file mẫu
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
