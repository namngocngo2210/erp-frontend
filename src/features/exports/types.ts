export type ExportJobStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled"
  | "expired";

export type ExportJob = {
  id: string;
  kind: string;
  status: ExportJobStatus;
  total_rows: number | null;
  progress_rows: number;
  file_name: string;
  file_size: number | null;
  error_message: string;
  created_at: string;
  finished_at: string | null;
};

// Các trạng thái coi là "đang chạy" — dùng để lọc job cần theo dõi tiếp (polling).
export const ACTIVE_STATUSES: ExportJobStatus[] = ["pending", "running"];

export function isActive(job: ExportJob): boolean {
  return ACTIVE_STATUSES.includes(job.status);
}
