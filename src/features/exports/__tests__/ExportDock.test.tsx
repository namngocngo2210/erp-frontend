import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ExportDock } from "@/features/exports/ExportDock";
import type { ExportJob } from "@/features/exports/types";

const downloadExportJob = vi.fn().mockResolvedValue(undefined);
vi.mock("@/features/exports/api", () => ({
  downloadExportJob: (job: ExportJob) => downloadExportJob(job),
}));

const state = {
  jobs: [] as ExportJob[],
  activeCount: 0,
  isOpen: true,
  setOpen: vi.fn(),
  startExport: vi.fn(),
  cancel: vi.fn(),
  dismiss: vi.fn(),
};

vi.mock("@/features/exports/ExportJobsProvider", () => ({
  useExportJobs: () => state,
}));

function job(overrides: Partial<ExportJob>): ExportJob {
  return {
    id: "j1",
    kind: "orders",
    status: "running",
    total_rows: 100,
    progress_rows: 40,
    file_name: "don-hang.xlsx",
    file_size: null,
    error_message: "",
    created_at: "",
    finished_at: null,
    ...overrides,
  };
}

describe("ExportDock", () => {
  it("hiện tiến độ khi đang chạy", () => {
    state.jobs = [job({ status: "running" })];
    render(<ExportDock />);
    expect(screen.getByText(/Đang xử lý xuất file/)).toBeInTheDocument();
    expect(screen.getByText(/40\/100/)).toBeInTheDocument();
  });

  it("hiện link tải khi thành công và gọi download khi bấm", async () => {
    state.jobs = [job({ status: "success", progress_rows: 100 })];
    render(<ExportDock />);
    await userEvent.click(screen.getByText("Nhấn vào đây để tải xuống"));
    expect(downloadExportJob).toHaveBeenCalled();
  });

  it("hiện lý do thất bại", () => {
    state.jobs = [job({ status: "failed", error_message: "Quá thời gian cho phép." })];
    render(<ExportDock />);
    expect(screen.getByText(/Quá thời gian cho phép/)).toBeInTheDocument();
  });

  it("không render gì khi không có job", () => {
    state.jobs = [];
    const { container } = render(<ExportDock />);
    expect(container.firstChild).toBeNull();
  });
});
