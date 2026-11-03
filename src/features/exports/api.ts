import { fetchJson, getValidAccessToken } from "@/services/http";
import type { ExportJob } from "@/features/exports/types";

// fetchJson tự ném lỗi khi response không OK (kể cả 403/429): Error kèm
// .status và .body, message ưu tiên detail/message JSON từ backend hoặc
// thông báo tiếng Việt riêng cho 429 (throttledMessage). Nơi gọi createExportJob
// chỉ cần bắt Error và hiển thị err.message cho người dùng.
export async function createExportJob(kind: string, params: unknown): Promise<ExportJob> {
  return (await fetchJson("/api/exports", {
    method: "POST",
    body: JSON.stringify({ kind, params }),
  })) as ExportJob;
}

export async function listExportJobs(activeOnly = false): Promise<ExportJob[]> {
  const url = activeOnly ? "/api/exports?active=1" : "/api/exports";
  const data = (await fetchJson(url)) as { items: ExportJob[] };
  return data.items ?? [];
}

export async function cancelExportJob(id: string): Promise<void> {
  await fetchJson(`/api/exports/${id}`, { method: "DELETE" });
}

/** Tải file đã sẵn sàng. Dùng fetch trần vì đây là blob nhị phân, không phải JSON
 * (từng bám khuôn helper xlsx cũ của luồng export đồng bộ — đã xoá ở Task 18
 * sau khi 7 endpoint export đồng bộ cuối cùng chuyển hết sang luồng chạy nền). */
export async function downloadExportJob(job: ExportJob): Promise<void> {
  let token: string | null = null;
  try {
    token = await getValidAccessToken();
  } catch {
    token = null;
  }
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // eslint-disable-next-line no-restricted-globals -- blob download (export file); fetchJson only handles JSON
  const res = await fetch(`/api/exports/${job.id}/download`, {
    method: "GET",
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    // 410: job không còn downloadable — thường là đã hết hạn TTL và bị
    // purge_expired_exports dọn (xem docs/runbooks/export-jobs.md mục 5). Thông
    // báo riêng để người dùng biết cần bấm Xuất lại thay vì tưởng lỗi tạm thời
    // rồi bấm tải lại vô ích — 404 (không phải chủ job/không tồn tại) và các lỗi
    // khác giữ message chung.
    if (res.status === 410) throw new Error("File đã hết hạn, vui lòng xuất lại.");
    throw new Error("Không tải được file.");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = job.file_name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
