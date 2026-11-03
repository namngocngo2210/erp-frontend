import { useState } from "react";
import { ChevronDown, ChevronUp, Maximize2, Minimize2, X } from "lucide-react";

import { ExportDockRow } from "@/features/exports/ExportDockRow";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";

/** Chiều cao danh sách job ở trạng thái thường vs. "phóng to" — kiểu panel tải
 * file của KiotViet: phóng to chỉ nới chiều cao vùng cuộn, không đổi vị trí/độ
 * rộng panel. */
const LIST_MAX_HEIGHT = "max-h-80";
const LIST_MAX_HEIGHT_EXPANDED = "max-h-[28rem]";

export function ExportDock() {
  const { jobs, isOpen, setOpen, cancel, dismiss } = useExportJobs();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Không có job nào thì không render gì — tránh một khung rỗng lơ lửng góc màn
  // hình. Đóng panel (isOpen=false) chỉ ẩn UI, KHÔNG huỷ job — job vẫn chạy nền,
  // trạng thái isOpen do provider quản lý riêng biệt với vòng đời job.
  if (jobs.length === 0 || !isOpen) return null;

  return (
    <div className="fixed bottom-0 right-6 z-50 w-90 max-w-[calc(100vw-2rem)] overflow-hidden rounded-t-lg border border-border bg-background shadow-lg">
      <div className="flex items-center justify-between bg-primary px-4 py-2.5 text-primary-foreground">
        <span className="text-sm font-medium">Xử lý xuất file</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded p-1 hover:bg-primary-foreground/20"
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label={expanded ? "Thu nhỏ" : "Phóng to"}
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded p-1 hover:bg-primary-foreground/20"
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setOpen(false)}
            className="rounded p-1 hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div
          className={`${expanded ? LIST_MAX_HEIGHT_EXPANDED : LIST_MAX_HEIGHT} divide-y divide-border overflow-y-auto`}
        >
          {jobs.map((job) => (
            <ExportDockRow key={job.id} job={job} onCancel={cancel} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </div>
  );
}
