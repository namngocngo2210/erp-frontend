import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { ExportDockRow } from "@/features/exports/ExportDockRow";
import type { ExportJob } from "@/features/exports/types";

const downloadExportJob = vi.fn().mockResolvedValue(undefined);
vi.mock("@/features/exports/api", () => ({
  downloadExportJob: (job: ExportJob) => downloadExportJob(job),
}));
vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

function job(overrides: Partial<ExportJob>): ExportJob {
  return {
    id: "j1",
    kind: "orders",
    status: "failed",
    total_rows: null,
    progress_rows: 0,
    file_name: "don-hang.xlsx",
    file_size: null,
    error_message: "",
    created_at: "",
    finished_at: null,
    ...overrides,
  };
}

describe("ExportDockRow", () => {
  // final-fix-report mục 8: nút trên dòng FAILED trước đây dùng icon RotateCcw
  // (mũi tên xoay — đọc như "Thử lại") nhưng handler thật là onDismiss (bỏ qua,
  // không tạo job mới). Test này khoá lại: aria-label PHẢI khớp hành vi thật, và
  // bấm nút phải gọi onDismiss chứ không phải một hành động "thử lại" nào khác.
  it("nút bỏ qua trên dòng FAILED gọi onDismiss, không phải hành động thử lại", async () => {
    const onDismiss = vi.fn();
    const onCancel = vi.fn();
    render(
      <ExportDockRow
        job={job({ status: "failed", error_message: "Quá thời gian cho phép." })}
        onCancel={onCancel}
        onDismiss={onDismiss}
      />,
    );
    const button = screen.getByRole("button", { name: "Bỏ qua" });
    await userEvent.click(button);
    expect(onDismiss).toHaveBeenCalledWith("j1");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("dòng EXPIRED có nút Bỏ qua (trước đây không có nút nào)", async () => {
    const onDismiss = vi.fn();
    render(
      <ExportDockRow job={job({ status: "expired" })} onCancel={vi.fn()} onDismiss={onDismiss} />,
    );
    expect(screen.getByText(/File đã hết hạn/)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Bỏ qua" });
    await userEvent.click(button);
    expect(onDismiss).toHaveBeenCalledWith("j1");
  });

  it("hiện message riêng của lỗi tải file (vd 410 hết hạn) thay vì message chung", async () => {
    downloadExportJob.mockRejectedValueOnce(new Error("File đã hết hạn, vui lòng xuất lại."));
    render(
      <ExportDockRow job={job({ status: "success" })} onCancel={vi.fn()} onDismiss={vi.fn()} />,
    );
    await userEvent.click(screen.getByText("Nhấn vào đây để tải xuống"));
    // toast.error() phải nhận đúng message cụ thể của lỗi — nuốt nó thành một câu
    // chung sẽ xoá sạch tác dụng của việc tách message 410 ra ở downloadExportJob.
    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("File đã hết hạn, vui lòng xuất lại.");
    });
  });
});
