import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Hai điều dễ hỏng nhất của trang này sau khi bộ lọc trạng thái sale lên header:
 *
 * 1. Bộ lọc chỉ đi vào MỘT request. Nó phải chi phối CẢ 4 khối (thẻ số, xu
 *    hướng, bảng theo sale, danh sách) — sót một cái là người dùng thấy điểm TB
 *    của toàn bộ nằm cạnh danh sách của riêng một nhóm mà không biết.
 * 2. Nút Xuất Excel gửi thiếu bộ lọc → file tải về khác hẳn bảng đang xem.
 */

const { startExport, permissions } = vi.hoisted(() => ({
  startExport: vi.fn().mockResolvedValue(undefined),
  permissions: new Set<string>(),
}));

vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());
vi.mock("@/features/exports/ExportJobsProvider", () => ({
  useExportJobs: () => ({
    jobs: [],
    activeCount: 0,
    isOpen: false,
    setOpen: vi.fn(),
    startExport: (...args: unknown[]) => startExport(...args),
    cancel: vi.fn(),
    dismiss: vi.fn(),
  }),
}));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => (code: string) => permissions.has(code),
}));

const SUMMARY = {
  period: { start: "2026-08-01", end: "2026-08-29" },
  rubric_version: "v1",
  pass_score: 80,
  total_calls: 3,
  avg_score: 60,
  pass_rate: 0.3,
  avg_wpm: 120,
  avg_talk_ratio: 0.6,
  blocks: [],
  criteria: [],
  red_flags: [],
  strengths: [],
  weaknesses: [],
  actions: [],
  coverage: {
    total_calls: 10,
    with_recording: 8,
    transcribed: 8,
    scored: 3,
    ignores_filters: false,
  },
};

const FILTER_OPTIONS = {
  sales: [{ id: 7, name: "Sale A" }],
  skus: ["DLX-01"],
  sales_statuses: [
    { code: "created_order", label: "Đã lên đơn" },
    { code: "need_more_consulting", label: "Tư vấn thêm" },
  ],
};

const { fetchJson } = vi.hoisted(() => ({ fetchJson: vi.fn() }));
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));

import { CallQualityPage } from "@/features/call-quality/pages/CallQualityPage";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<CallQualityPage />, { wrapper });
}

/** URL của mọi request đã bắn, để soi từng khối một. */
function requestedUrls(): string[] {
  return fetchJson.mock.calls.map((call) => String(call[0]));
}

/**
 * URL MỚI NHẤT của một khối — request đầu tiên luôn là lượt chưa lọc.
 *
 * Quét ngược bằng vòng for chứ không dùng `Array.findLast`: `lib` của dự án dưới
 * es2023 nên `findLast`/`at` làm `tsc --noEmit` đỏ (dù vitest vẫn chạy được).
 */
function urlFor(path: string): string | undefined {
  const urls = requestedUrls();
  for (let i = urls.length - 1; i >= 0; i -= 1) {
    if (urls[i].startsWith(path)) return urls[i];
  }
  return undefined;
}

beforeEach(() => {
  startExport.mockClear();
  permissions.clear();
  fetchJson.mockReset();
  fetchJson.mockImplementation((url: string) => {
    if (url.startsWith("/api/callcenter/quality/summary")) return Promise.resolve(SUMMARY);
    if (url.startsWith("/api/callcenter/quality/trend")) return Promise.resolve({ items: [] });
    if (url.startsWith("/api/callcenter/quality/agents")) return Promise.resolve({ items: [] });
    if (url.startsWith("/api/callcenter/quality/filters")) return Promise.resolve(FILTER_OPTIONS);
    if (url.startsWith("/api/callcenter/quality/calls"))
      return Promise.resolve({ items: [], total: 0, page: 1, page_size: 100 });
    return Promise.resolve({});
  });
});
afterEach(() => cleanup());

async function chonTrangThai(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox", { name: /tất cả trạng thái/i }));
  await user.click(await screen.findByText(label));
}

describe("CallQualityPage — bộ lọc trạng thái sale", () => {
  it("áp cho CẢ 4 khối chứ không riêng bảng danh sách", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("combobox", { name: /tất cả trạng thái/i });

    await chonTrangThai(user, "Tư vấn thêm");

    await waitFor(() => {
      expect(urlFor("/api/callcenter/quality/summary")).toContain(
        "sales_status=need_more_consulting",
      );
    });
    for (const path of [
      "/api/callcenter/quality/summary",
      "/api/callcenter/quality/trend",
      "/api/callcenter/quality/agents",
      "/api/callcenter/quality/calls",
    ]) {
      const hit = requestedUrls().filter(
        (url) => url.startsWith(path) && url.includes("sales_status=need_more_consulting"),
      );
      expect(hit.length, `thiếu bộ lọc ở ${path}`).toBeGreaterThan(0);
    }
  });

  it("chưa chọn gì thì không gửi tham số sales_status", async () => {
    renderPage();

    await waitFor(() => expect(urlFor("/api/callcenter/quality/summary")).toBeDefined());
    expect(urlFor("/api/callcenter/quality/summary")).not.toContain("sales_status");
  });
});

describe("CallQualityPage — xuất Excel", () => {
  it("ẩn nút khi thiếu quyền call-quality:export", async () => {
    permissions.add("call-quality:view");
    renderPage();
    await screen.findByRole("combobox", { name: /tất cả trạng thái/i });

    expect(screen.queryByRole("button", { name: /xuất excel/i })).not.toBeInTheDocument();
  });

  it("gửi kind call_quality kèm ĐÚNG bộ lọc đang áp", async () => {
    permissions.add("call-quality:export");
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("combobox", { name: /tất cả trạng thái/i });
    await chonTrangThai(user, "Đã lên đơn");

    await user.click(screen.getByRole("button", { name: /xuất excel/i }));

    const { calls } = startExport.mock;
    const [kind, payload] = calls[calls.length - 1] as [
      string,
      { filters: Record<string, unknown> },
    ];
    expect(kind).toBe("call_quality");
    expect(payload.filters.sales_status).toBe("created_order");
    expect(payload.filters.start).toBeTruthy();
    expect(payload.filters.end).toBeTruthy();
  });
});

describe("CallQualityPage — bố cục header", () => {
  it("ô trạng thái KHÔNG nằm trong khối cuộn ngang", async () => {
    // Lỗi thật trên prod sau MR !1389: ô trạng thái nằm chung khối
    // `overflow-x-auto` với bộ chọn ngày. Khối cuộn CẮT phần tử `absolute` con,
    // nên menu thả xuống bị xén còn một dải ~40px — người dùng bấm vào chỉ thấy
    // ô "Tìm..." trôi lơ lửng. jsdom không dựng layout nên phải chốt bằng cấu
    // trúc DOM thay vì đo kích thước.
    renderPage();
    const trigger = await screen.findByRole("combobox", { name: /tất cả trạng thái/i });

    expect(trigger.closest(".overflow-x-auto")).toBeNull();
  });

  it("nút Xuất Excel cũng nằm ngoài khối cuộn ngang", async () => {
    permissions.add("call-quality:export");
    renderPage();
    const button = await screen.findByRole("button", { name: /xuất excel/i });

    expect(button.closest(".overflow-x-auto")).toBeNull();
  });
});
