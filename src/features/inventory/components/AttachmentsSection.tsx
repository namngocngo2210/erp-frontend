import { useRef, useState } from "react";
import { Download, FileText, Trash2, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { fetchBlob } from "@/services/http";
import { useDeleteAttachment, useUploadAttachments } from "@/features/inventory/documents-queries";
import { isImage, useBlobUrl } from "@/features/inventory/attachment-blob";
import type { StockDocumentAttachment } from "@/features/inventory/documents-types";
import { useConfirm } from "@/hooks/use-confirm";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

async function downloadAttachment(att: StockDocumentAttachment) {
  try {
    const blob = await fetchBlob(`${att.file_url}?download=1`);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = att.original_name || `chung-tu-${att.id}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    toast.error("Tải file thất bại.");
  }
}

function Thumb({ att, onOpen }: { att: StockDocumentAttachment; onOpen: () => void }) {
  const image = isImage(att.content_type);
  const url = useBlobUrl(image ? att.file_url : null);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 hover:border-primary"
      title={att.original_name}
    >
      {image ? (
        url ? (
          <img src={url} alt={att.original_name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full animate-pulse bg-muted" />
        )
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <FileText className="size-7" />
          <span className="px-1 text-xs">PDF</span>
        </div>
      )}
    </button>
  );
}

function Lightbox({ att, onClose }: { att: StockDocumentAttachment; onClose: () => void }) {
  const image = isImage(att.content_type);
  const url = useBlobUrl(att.file_url);
  const [zoomed, setZoomed] = useState(false);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogTitle className="truncate pr-8 text-sm">
          {att.original_name || "Chứng từ"}
        </DialogTitle>
        <div className="mt-2 flex max-h-[70vh] items-center justify-center overflow-auto rounded bg-muted/30">
          {image ? (
            url ? (
              <img
                src={url}
                alt={att.original_name}
                onClick={() => setZoomed((z) => !z)}
                className={
                  zoomed
                    ? "max-w-none cursor-zoom-out"
                    : "max-h-[68vh] w-auto cursor-zoom-in object-contain"
                }
                style={zoomed ? { width: "auto", height: "auto" } : undefined}
              />
            ) : (
              <div className="h-64 w-full animate-pulse bg-muted" />
            )
          ) : url ? (
            <iframe src={url} title={att.original_name} className="h-[68vh] w-full" />
          ) : (
            <div className="h-64 w-full animate-pulse bg-muted" />
          )}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {image && (
            <Button variant="outline" size="sm" onClick={() => setZoomed((z) => !z)}>
              {zoomed ? <ZoomOut className="mr-1 size-4" /> : <ZoomIn className="mr-1 size-4" />}
              {zoomed ? "Thu nhỏ" : "Phóng to"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void downloadAttachment(att)}>
            <Download className="mr-1 size-4" />
            Tải về
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AttachmentsSection({
  documentId,
  attachments,
  canManage,
}: {
  documentId: number;
  attachments: StockDocumentAttachment[];
  canManage: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<StockDocumentAttachment | null>(null);
  const uploadMutation = useUploadAttachments();
  const deleteMutation = useDeleteAttachment();
  const confirm = useConfirm();

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      toast.error(`File "${tooBig.name}" vượt quá 10MB.`);
      return;
    }
    try {
      await uploadMutation.mutateAsync({ id: documentId, files });
      toast.success("Tải chứng từ lên thành công.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tải chứng từ thất bại.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(att: StockDocumentAttachment) {
    const ok = await confirm({
      title: `Xoá chứng từ "${att.original_name || att.id}"?`,
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(
      { attachmentId: att.id, documentId },
      {
        onSuccess: () => toast.success("Đã xoá chứng từ."),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Xoá chứng từ thất bại."),
      },
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">
          Chứng từ đính kèm ({attachments.length})
        </span>
        {canManage && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploadMutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-1 size-4" />
              {uploadMutation.isPending ? "Đang tải..." : "Tải lên"}
            </Button>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="rounded border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
          Chưa có chứng từ. {canManage && "Tải ảnh hoặc PDF lên để lưu kèm phiếu."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {attachments.map((att) => (
            <div key={att.id} className="relative">
              <Thumb att={att} onOpen={() => setPreview(att)} />
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDelete(att)}
                  className="absolute -right-2 -top-2 rounded-full border border-border bg-white p-1 text-destructive shadow-sm hover:bg-destructive/10"
                  aria-label={`Xoá ${att.original_name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {preview && <Lightbox att={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
