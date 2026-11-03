import { useState } from "react";
import { Check, FileSpreadsheet, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { downloadExportJob } from "@/features/exports/api";
import type { ExportJob } from "@/features/exports/types";

type Props = {
  job: ExportJob;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
};

/** Dòng trạng thái khi job đang pending/running — kèm tiến độ dòng nếu backend
 * đã biết total_rows (một số kind chỉ biết total sau khi bắt đầu xử lý). */
function progressLabel(job: ExportJob): string {
  if (!job.total_rows) return "Đang xử lý xuất file…";
  return `Đang xử lý xuất file… (${job.progress_rows}/${job.total_rows} dòng)`;
}

export function ExportDockRow({ job, onCancel, onDismiss }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadExportJob(job);
    } catch (error) {
      // Dùng message riêng của lỗi (vd 410 → "File đã hết hạn, vui lòng xuất
      // lại.") thay vì một câu chung — nuốt message cụ thể ở đây sẽ xoá sạch tác
      // dụng của việc tách message 410 ra ở downloadExportJob.
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Không tải được file. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      {/* min-w-0 bắt buộc: flex item mặc định không co dưới nội dung, thiếu dòng
          này thì truncate ở tên file phía dưới vô tác dụng, tràn ngang panel. */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground" title={job.file_name}>
          {job.file_name}
        </p>
        {(job.status === "pending" || job.status === "running") && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            <span className="truncate">{progressLabel(job)}</span>
          </p>
        )}
        {job.status === "success" && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="mt-1 text-xs text-primary hover:underline disabled:opacity-60"
          >
            {downloading ? "Đang tải…" : "Nhấn vào đây để tải xuống"}
          </button>
        )}
        {job.status === "failed" && (
          <p className="mt-1 text-xs text-destructive">
            Thất bại: {job.error_message || "Lỗi không xác định."}
          </p>
        )}
        {job.status === "cancelled" && (
          <p className="mt-1 text-xs text-muted-foreground">Đã huỷ.</p>
        )}
        {job.status === "expired" && (
          <p className="mt-1 text-xs text-muted-foreground">File đã hết hạn, vui lòng xuất lại.</p>
        )}
      </div>
      {job.status === "success" && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
      {(job.status === "pending" || job.status === "running") && (
        <button
          type="button"
          aria-label="Huỷ"
          onClick={() => onCancel(job.id)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {/* FAILED lẫn EXPIRED đều là trạng thái CHẾT — không có đường "Thử lại"/"Xuất
          lại" thật (cần gọi lại startExport(job.kind, job.params), nhưng `params`
          không nằm trong payload ExportJob mà FE nhận về) nên nút ở đây CHỈ là bỏ
          qua khỏi panel, không tạo job mới. Icon X khớp đúng nghĩa "Bỏ qua" — trước
          đây dùng RotateCcw (mũi tên xoay, đọc như "Thử lại") trong khi hành vi
          thật là dismiss, khiến người dùng tưởng bấm vào sẽ chạy lại job. */}
      {(job.status === "failed" || job.status === "expired") && (
        <button
          type="button"
          aria-label="Bỏ qua"
          onClick={() => onDismiss(job.id)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
