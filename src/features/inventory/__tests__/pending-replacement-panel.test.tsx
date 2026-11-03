import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Ca CŨ: mã đã khớp vào đơn đã xuất kho, guard chặn ghi sổ, chưa ai tạo phiếu bù.
// Backend đánh dấu `needs_replacement_issue` → dòng phải cho xử lý ngay tại chỗ.

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({ fetchJson: (...a: unknown[]) => fetchJson(...a) }));

import { PendingReplacementPanel } from "../PendingReplacementPanel";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { I18nProvider } from "@/i18n";
import { PendingActions } from "../components/flow-shared";
import type { FlowPendingScanItem } from "@/lib/api/inventory-flow";

const MATCHED_ITEM = {
  id: 42,
  code: "84859707184483",
  warehouse_name: "Đại Mỗ 1",
  status: "matched",
  status_label: "Đã khớp",
  performed_by: "Quang",
  error: "already_dispatched",
  created_at: "2026-07-24T01:42:57Z",
  matched_at: "2026-07-24T01:43:00Z",
  matched_order_code: "DH012628",
  return_id: null,
  note: "",
  lines: [{ product_id: 3, sku: "MSC06", qty: 1 }],
  sku_count: 1,
  qty: 1,
  needs_replacement_issue: true,
} as unknown as FlowPendingScanItem;

function renderWithClient(node: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
  return render(<>{node}</>, { wrapper });
}

beforeEach(() => {
  // Body block: `mockReset()` trả về chính mock, arrow rút gọn sẽ biến nó thành hàm
  // cleanup của beforeEach và bị Vitest gọi với 0 đối số ở cuối test.
  fetchJson.mockReset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Xử lý ca cũ chưa có phiếu bù", () => {
  it("dòng đã khớp bị đánh dấu → hiện nút thay cho dấu gạch", () => {
    const onReplacement = vi.fn();
    renderWithClient(
      <PendingActions item={MATCHED_ITEM} onMatch={vi.fn()} onReplacementIssue={onReplacement} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Chưa có phiếu bù/i }));
    expect(onReplacement).toHaveBeenCalledOnce();
  });

  it("dòng đã khớp KHÔNG bị đánh dấu → không có nút", () => {
    renderWithClient(
      <PendingActions
        item={{ ...MATCHED_ITEM, needs_replacement_issue: false } as FlowPendingScanItem}
        onMatch={vi.fn()}
        onReplacementIssue={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Chưa có phiếu bù/i })).not.toBeInTheDocument();
  });

  it("gửi đúng payload tới endpoint replacement-issue", async () => {
    fetchJson.mockResolvedValue({ ok: true, stock_doc_code: "XK20260724-0001" });
    const onDone = vi.fn();
    renderWithClient(
      <PendingReplacementPanel
        scanId={42}
        code="84859707184483"
        orderCode="DH012628"
        lines={[{ product_id: 3, sku: "MSC06", quantity: 1 }]}
        onDone={onDone}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Ghi chú/i), {
      target: { value: "don 2 chieu" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Tạo phiếu xuất kho bù/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    const [url, init] = fetchJson.mock.calls[0] as [string, { body: string }];
    expect(url).toBe("/api/inventory/flow-pending/42/replacement-issue");
    expect(JSON.parse(init.body)).toEqual({
      replacement: { lines: [{ product_id: 3, quantity: 1 }], note: "don 2 chieu" },
    });
  });

  it("BE từ chối → hiện lỗi, không đóng form", async () => {
    const err = Object.assign(new Error("HTTP 400"), {
      status: 400,
      body: { detail: "Mã này không thuộc diện cần phiếu bù" },
    });
    fetchJson.mockRejectedValue(err);
    const onDone = vi.fn();
    renderWithClient(
      <PendingReplacementPanel
        scanId={42}
        code="84859707184483"
        orderCode="DH012628"
        lines={[{ product_id: 3, sku: "MSC06", quantity: 1 }]}
        onDone={onDone}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Tạo phiếu xuất kho bù/i }));
    expect(await screen.findByText(/không thuộc diện cần phiếu bù/i)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("Gỡ khớp mã xuất đã khớp nhầm đơn", () => {
  const UNMATCHABLE = {
    ...MATCHED_ITEM,
    error: "",
    needs_replacement_issue: false,
    can_unmatch: true,
  } as unknown as FlowPendingScanItem;

  it("dòng gỡ được → hiện nút; xác nhận → POST unmatch đúng scan id", async () => {
    fetchJson.mockResolvedValue({ ok: true, released_stock: true, order_id: 7 });
    renderWithClient(<PendingActions item={UNMATCHABLE} onMatch={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Gỡ khớp/i }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Gỡ khớp" }));

    await waitFor(() => expect(fetchJson).toHaveBeenCalled());
    const [url, init] = fetchJson.mock.calls[0] as [string, { method: string }];
    expect(url).toBe("/api/inventory/flow-pending/42/unmatch");
    expect(init.method).toBe("POST");
  });

  it("không xác nhận → không gọi API", async () => {
    renderWithClient(<PendingActions item={UNMATCHABLE} onMatch={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Gỡ khớp/i }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("dòng không gỡ được (can_unmatch=false) → không có nút", () => {
    renderWithClient(
      <PendingActions
        item={{ ...UNMATCHABLE, can_unmatch: false } as FlowPendingScanItem}
        onMatch={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Gỡ khớp/i })).not.toBeInTheDocument();
  });

  it("dòng vừa cần phiếu bù vừa gỡ được → hiện CẢ HAI nút", () => {
    renderWithClient(
      <PendingActions
        item={
          {
            ...UNMATCHABLE,
            error: "already_dispatched",
            needs_replacement_issue: true,
          } as unknown as FlowPendingScanItem
        }
        onMatch={vi.fn()}
        onReplacementIssue={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Chưa có phiếu bù/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gỡ khớp/i })).toBeInTheDocument();
  });
});
