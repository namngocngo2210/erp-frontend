/**
 * Test tích hợp trang Contact (ContactsPage) — MỘT bộ mock dùng chung cho ba kịch
 * bản trước đây tách ba file (contacts-stage-change / contacts-row-selection /
 * contacts-export, mỗi file 8–9 vi.mock gần giống nhau — audit 2026-09-23).
 * Từng describe tự đặt dữ liệu `getContacts`, quyền và stage cần cho kịch bản.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { startExport, permissions, getContacts, getStages, setOperationStage } = vi.hoisted(() => ({
  startExport: vi.fn().mockResolvedValue(undefined),
  permissions: new Set<string>(),
  getContacts: vi.fn(),
  getStages: vi.fn(),
  setOperationStage: vi.fn().mockResolvedValue({
    stage_name: "D7",
    stage_color: "#14b8a6",
    due_at: "2026-08-26T02:00:00Z",
    bucket: "upcoming",
  }),
}));

vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());
// Nút Xuất Excel tạo JOB NỀN qua `useExportJobs().startExport` (engine apps.exports)
// — mock thẳng provider đó, cùng khuôn với `stock-export.test.tsx`.
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
vi.mock("@/features/callcenter/webphone-context", () => ({
  useWebphone: () => ({
    enabled: false,
    canUse: false,
    dialCall: vi.fn(),
    callState: "idle",
    currentCall: null,
  }),
}));
vi.mock("@/features/channels/queries", () => ({
  useAllChannelsQuery: () => ({ data: [{ id: 5, code: "ch-a", name: "Kênh A" }] }),
}));
vi.mock("@/features/customers/queries", () => ({ useCrmCatalogs: () => ({ data: undefined }) }));
vi.mock("@/services/http", () => ({
  fetchJson: vi.fn().mockResolvedValue([]),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/api/contact-flow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/contact-flow")>();
  return {
    ...actual,
    getStages: (...args: unknown[]) => getStages(...args),
    setOperationStage: (...args: unknown[]) => setOperationStage(...args),
  };
});
vi.mock("@/lib/api/contacts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/contacts")>();
  return { ...actual, getContacts: (...args: unknown[]) => getContacts(...args) };
});

import { ContactsPage } from "@/features/contacts/pages/ContactsPage";

const STAGES = [
  { id: 1, name: "Gọi lần đầu", is_active: true },
  { id: 7, name: "D7", is_active: true },
  { id: 99, name: "Bước đã tắt", is_active: false },
];

function contactRow(
  customerId: number,
  name: string,
  operation: Record<string, unknown> = {
    stage_name: "",
    stage_color: "",
    allow_edit_due: false,
    due_at: null,
    bucket: "none",
  },
) {
  return {
    customer_id: customerId,
    customer_code: `KH${customerId}`,
    full_name: name,
    phone_raw: "0912345678",
    is_new_customer: false,
    latest_order: {
      id: customerId,
      created_at: "2026-08-10T02:00:00Z",
      order_source: "landing",
      channel_id: 1,
      channel_name: "Kênh A",
      address: "",
      status: 1,
      items: [],
      total_after_discount: "1000000",
      sales_status_code: null,
      next_followup_at: null,
      staff_id: null,
      staff_name: "",
    },
    order_count: 1,
    action_needed: "new_lead",
    waiting_since: "2026-08-10T02:00:00Z",
    waiting_basis: "activity",
    last_activity_at: null,
    operation,
  };
}

function contactsPayload(items: ReturnType<typeof contactRow>[], total = items.length) {
  return {
    items,
    total,
    action_counts: { all: { pending: 0, total } },
    operation_counts: { all: { pending: 0, total } },
  };
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<ContactsPage />, { wrapper });
}

const exportButton = () => screen.getByRole("button", { name: /xuất excel/i });

function lastExportFilters(): Record<string, unknown> {
  const { calls } = startExport.mock;
  const [kind, payload] = calls[calls.length - 1] as [string, { filters: Record<string, unknown> }];
  expect(kind).toBe("contacts");
  return payload.filters;
}

beforeEach(() => {
  startExport.mockClear();
  setOperationStage.mockClear();
  getStages.mockReset();
  getStages.mockResolvedValue([]);
  getContacts.mockReset();
  getContacts.mockResolvedValue(contactsPayload([]));
  permissions.clear();
});
afterEach(() => cleanup());

describe("ContactsPage — đổi bước tác nghiệp từ cột Tác nghiệp", () => {
  beforeEach(() => {
    getStages.mockResolvedValue(STAGES);
    getContacts.mockResolvedValue(
      contactsPayload([
        contactRow(42, "Nguyễn Thị Lan", {
          stage_name: "Gọi lần đầu",
          stage_color: "#0ea5e9",
          allow_edit_due: true,
          due_at: "2026-08-19T01:51:00Z",
          bucket: "overdue",
        }),
      ]),
    );
  });

  /** Mở ô chọn ở cột Tác nghiệp rồi chọn bước D7. */
  async function pickStageD7(user: ReturnType<typeof userEvent.setup>) {
    const trigger = await screen.findByRole("combobox", { name: "Chọn tác nghiệp" });
    await user.click(trigger);
    await user.click(await screen.findByText("D7"));
  }

  it("chọn bước KHÔNG tự ghi, chỉ mở hộp thoại hỏi giờ hẹn", async () => {
    renderPage();
    const user = userEvent.setup();

    await pickStageD7(user);

    expect(await screen.findByText(/Chuyển sang bước D7/)).toBeInTheDocument();
    expect(setOperationStage).not.toHaveBeenCalled();
  });

  it("xác nhận gửi ĐÚNG MỘT request kèm cả stage_id lẫn due_at", async () => {
    renderPage();
    const user = userEvent.setup();

    await pickStageD7(user);
    const input = await screen.findByLabelText("Giờ hẹn");
    await user.clear(input);
    await user.type(input, "2026-08-26T09:00");
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));

    await waitFor(() => expect(setOperationStage).toHaveBeenCalledTimes(1));
    const [customerId, body] = setOperationStage.mock.calls[0] as [
      number,
      { stage_id: number; due_at: string },
    ];
    expect(customerId).toBe(42);
    expect(body.stage_id).toBe(7);
    expect(body.due_at).toBeTruthy();
  });

  it("hủy hộp thoại thì không ghi gì", async () => {
    renderPage();
    const user = userEvent.setup();

    await pickStageD7(user);
    await user.click(screen.getByRole("button", { name: "Hủy" }));

    await waitFor(() => expect(screen.queryByText(/Chuyển sang bước D7/)).not.toBeInTheDocument());
    expect(setOperationStage).not.toHaveBeenCalled();
  });

  it("bước đã tắt không xuất hiện trong danh sách chọn", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("combobox", { name: "Chọn tác nghiệp" }));

    expect(await screen.findByText("D7")).toBeInTheDocument();
    expect(screen.queryByText("Bước đã tắt")).not.toBeInTheDocument();
  });
});

describe("ContactsPage — tích chọn dòng để xuất Excel", () => {
  beforeEach(() => {
    permissions.add("contacts:export");
    getContacts.mockResolvedValue(
      contactsPayload([contactRow(11, "Khách A"), contactRow(22, "Khách B")]),
    );
  });

  it("không tích dòng nào thì xuất theo bộ lọc (payload không có customer_ids)", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText("Khách A");

    await user.click(exportButton());

    expect(lastExportFilters()).not.toHaveProperty("customer_ids");
  });

  it("tích 1 dòng thì xuất đúng khách đó", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText("Khách A");

    await user.click(screen.getByRole("checkbox", { name: "Chọn Khách A" }));
    await user.click(exportButton());

    expect(lastExportFilters().customer_ids).toEqual([11]);
  });

  it("checkbox ở header tích toàn bộ dòng của trang", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText("Khách A");

    await user.click(screen.getByRole("checkbox", { name: "Chọn tất cả contact trong trang" }));
    await user.click(exportButton());

    expect(lastExportFilters().customer_ids).toEqual([11, 22]);
  });

  it("nút xuất hiện số dòng đã chọn, bấm Bỏ chọn thì trở về xuất theo bộ lọc", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText("Khách A");

    await user.click(screen.getByRole("checkbox", { name: "Chọn Khách A" }));
    expect(screen.getByRole("button", { name: /Xuất Excel \(1\)/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bỏ chọn" }));
    await user.click(exportButton());

    expect(lastExportFilters()).not.toHaveProperty("customer_ids");
  });

  it("đổi bộ lọc thì bỏ hết tích — không xuất nhầm khách đã rời khỏi kết quả", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText("Khách A");
    await user.click(screen.getByRole("checkbox", { name: "Chọn Khách A" }));

    // Bấm chip "KH mới" — cũng là một trục lọc (`action_needed`), nằm trong `filterKey`.
    await user.click(screen.getByRole("button", { name: /KH mới/ }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Xuất Excel \(1\)/ })).not.toBeInTheDocument(),
    );
    await user.click(exportButton());
    expect(lastExportFilters()).not.toHaveProperty("customer_ids");
  });

  it("tích chọn KHÔNG mất khi lật trang", async () => {
    getContacts.mockResolvedValue(
      contactsPayload([contactRow(11, "Khách A"), contactRow(22, "Khách B")], 40),
    );
    renderPage();
    const user = userEvent.setup();
    await screen.findByText("Khách A");

    await user.click(screen.getByRole("checkbox", { name: "Chọn Khách A" }));
    await user.click(screen.getByRole("button", { name: "Trang 2" }));

    expect(screen.getByRole("button", { name: /Xuất Excel \(1\)/ })).toBeInTheDocument();
  });
});

describe("ContactsPage — xuất Excel", () => {
  it("ẩn nút khi thiếu quyền contacts:export", () => {
    permissions.add("contacts:view");
    renderPage();
    expect(screen.queryByRole("button", { name: /xuất excel/i })).not.toBeInTheDocument();
  });

  it("hiện nút khi có quyền contacts:export", () => {
    permissions.add("contacts:export");
    renderPage();
    expect(exportButton()).toBeInTheDocument();
  });

  it("gửi bộ lọc đang áp và KHÔNG gửi limit/offset (file là toàn bộ tập khớp lọc)", async () => {
    permissions.add("contacts:export");
    renderPage();
    const user = userEvent.setup();

    await user.click(exportButton());

    const filters = lastExportFilters();
    // Mặc định trang là THÁNG NÀY → luôn có khoảng ngày, không bao giờ xuất mù.
    expect(filters.date_from).toBeTruthy();
    expect(filters.date_to).toBeTruthy();
    // limit/offset là chuyện phân trang của màn hình, không được rò vào job export —
    // rò vào là file chỉ có đúng trang đang xem.
    expect(filters).not.toHaveProperty("limit");
    expect(filters).not.toHaveProperty("offset");
  });

  it("gửi kèm chip Tác nghiệp cần đang chọn", async () => {
    permissions.add("contacts:export");
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /KH mới/i }));
    await user.click(exportButton());

    expect(lastExportFilters().action_needed).toEqual(["new_customer"]);
  });
});
