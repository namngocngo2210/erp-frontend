import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ExportJobsProvider,
  exportKeys,
  pollIntervalFor,
  useExportJobs,
} from "@/features/exports/ExportJobsProvider";
import type { ExportJob } from "@/features/exports/types";

vi.mock("@/features/exports/api", () => ({
  createExportJob: vi.fn().mockResolvedValue({
    id: "j1",
    kind: "orders",
    status: "pending",
    total_rows: 10,
    progress_rows: 0,
    file_name: "don-hang.xlsx",
    file_size: null,
    error_message: "",
    created_at: "",
    finished_at: null,
  }),
  listExportJobs: vi.fn().mockResolvedValue([]),
  cancelExportJob: vi.fn().mockResolvedValue(undefined),
  downloadExportJob: vi.fn().mockResolvedValue(undefined),
}));

// fakeWs được khai báo bằng vi.hoisted vì factory của vi.mock chạy trước mọi import
// khác trong file — cần một tham chiếu ổn định để test có thể tự tay bắn event
// "export.updated" sau khi provider đã đăng ký listener, thay vì giả vờ đoán payload.
const { fakeWs } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(event: MessageEvent) => void>>();
  return {
    fakeWs: {
      listeners,
      addEventListener: vi.fn((event: string, cb: (event: MessageEvent) => void) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: (event: MessageEvent) => void) => {
        listeners.get(event)?.delete(cb);
      }),
    },
  };
});

vi.mock("@/services/websocket", () => ({
  getCRMWebSocket: () => fakeWs,
}));

const baseJob: ExportJob = {
  id: "j1",
  kind: "orders",
  status: "success",
  total_rows: 10,
  progress_rows: 10,
  file_name: "don-hang.xlsx",
  file_size: 1024,
  error_message: "",
  created_at: "",
  finished_at: "",
};

function Probe() {
  const { jobs, startExport } = useExportJobs();
  return (
    <div>
      <button onClick={() => startExport("orders", { section: "orders" })}>go</button>
      <span data-testid="count">{jobs.length}</span>
    </div>
  );
}

function renderProbe() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ExportJobsProvider>
        <Probe />
      </ExportJobsProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fakeWs.listeners.clear();
  fakeWs.addEventListener.mockClear();
  fakeWs.removeEventListener.mockClear();
});

describe("ExportJobsProvider", () => {
  it("thêm job vào danh sách sau khi startExport", async () => {
    renderProbe();
    await userEvent.click(screen.getByText("go"));
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));
  });
});

// Điểm rủi ro tải cao nhất của cả provider: nếu refetchInterval lỡ trả một số thay
// vì `false` khi hết job active, mọi tab đang mở sẽ poll 3s vô hạn — tái lập đúng
// loại tải đã gây sự cố "bão POST /api/orders" (WS order.created fanout ~40 tab).
describe("pollIntervalFor", () => {
  it("danh sách rỗng -> false (không poll)", () => {
    expect(pollIntervalFor([])).toBe(false);
  });

  it("chỉ có job đã kết thúc (success/failed) -> false (không poll)", () => {
    const jobs: ExportJob[] = [
      { ...baseJob, id: "j1", status: "success" },
      { ...baseJob, id: "j2", status: "failed" },
    ];
    expect(pollIntervalFor(jobs)).toBe(false);
  });

  it("có job pending -> 3000ms", () => {
    expect(pollIntervalFor([{ ...baseJob, status: "pending" }])).toBe(3000);
  });

  it("có job running -> 3000ms", () => {
    expect(pollIntervalFor([{ ...baseJob, status: "running" }])).toBe(3000);
  });

  it("data undefined (chưa fetch xong lần đầu) -> false (không poll)", () => {
    expect(pollIntervalFor(undefined)).toBe(false);
  });
});

describe("ExportJobsProvider - lắng nghe WebSocket", () => {
  it("event export.updated gọi invalidateQueries đúng query key, không tự merge payload", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    render(
      <QueryClientProvider client={client}>
        <ExportJobsProvider>
          <div />
        </ExportJobsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(fakeWs.addEventListener).toHaveBeenCalledWith("export.updated", expect.any(Function)),
    );

    const handler = fakeWs.listeners.get("export.updated")?.values().next().value;
    expect(handler).toBeInstanceOf(Function);
    handler?.(new MessageEvent("message"));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: exportKeys.list });
  });
});
