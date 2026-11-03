import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createExportJob, downloadExportJob, listExportJobs } from "@/features/exports/api";
import type { ExportJob } from "@/features/exports/types";

vi.mock("@/services/http", () => ({
  fetchJson: vi.fn(),
  getValidAccessToken: vi.fn().mockResolvedValue("tok"),
}));

const { fetchJson } = await import("@/services/http");

describe("exports api", () => {
  beforeEach(() => vi.mocked(fetchJson).mockReset());

  it("gửi kind và params khi tạo job", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ id: "1", kind: "orders", status: "pending" });
    await createExportJob("orders", { section: "orders" });
    expect(vi.mocked(fetchJson)).toHaveBeenCalledWith(
      "/api/exports",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(vi.mocked(fetchJson).mock.calls[0][1]!.body as string);
    expect(body).toEqual({ kind: "orders", params: { section: "orders" } });
  });

  it("lọc active khi được yêu cầu", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ items: [] });
    await listExportJobs(true);
    expect(vi.mocked(fetchJson)).toHaveBeenCalledWith("/api/exports?active=1");
  });
});

// final-fix-report mục 8: 404 (không phải chủ job/job không tồn tại) và 410 (file
// hết hạn TTL, đã bị purge_expired_exports dọn) trước đây gộp chung một message
// "Không tải được file." — người dùng nhận 410 không biết cần bấm Xuất lại thay vì
// thử tải lại một file đã không còn tồn tại trên MinIO.
describe("downloadExportJob — phân biệt message theo status", () => {
  const job: ExportJob = {
    id: "j1",
    kind: "orders",
    status: "success",
    total_rows: 10,
    progress_rows: 10,
    file_name: "don-hang.xlsx",
    file_size: 100,
    error_message: "",
    created_at: "",
    finished_at: null,
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("410 → message riêng nhắc xuất lại", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 410 } as Response));
    await expect(downloadExportJob(job)).rejects.toThrow("File đã hết hạn, vui lòng xuất lại.");
  });

  it("404 → message chung, không nhắc xuất lại (job có thể không phải của mình)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response));
    await expect(downloadExportJob(job)).rejects.toThrow("Không tải được file.");
  });
});
