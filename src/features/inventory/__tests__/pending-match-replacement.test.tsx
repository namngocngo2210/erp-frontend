import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Đơn ĐÃ xuất kho mà quét thêm một mã vận đơn nữa = hàng gửi bù (đổi lỗi 2 chiều).
// Panel phải HỎI trước khi khớp, không được im lặng khớp rồi bỏ sót phiếu xuất kho.

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({ fetchJson: (...a: unknown[]) => fetchJson(...a) }));

import { PendingMatchPanel } from "../PendingMatchControl";

const DISPATCHED_ORDER = {
  id: 7,
  order_code: "DH012628",
  invoice_code: "HD013124",
  shipping_code: "84859697925080",
  kiotviet_channel: "",
  name: "Khach A",
  phone: "***1111",
  already_dispatched: true,
  items: [{ product_id: 3, sku: "MSC06", quantity: 1 }],
};

const FRESH_ORDER = { ...DISPATCHED_ORDER, id: 8, already_dispatched: false };

function mockLookup(order: Record<string, unknown>) {
  fetchJson.mockImplementation((url: string) => {
    if (url.startsWith("/api/inventory/flow-order-lookup")) {
      return Promise.resolve({ items: [order] });
    }
    return Promise.resolve({
      ok: true,
      stock_doc_code: "XK20260724-0001",
      replacement_skipped: "",
    });
  });
}

function renderPanel(onDone = vi.fn(), kind: "dispatch" | "return" = "dispatch") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  render(<PendingMatchPanel scanId={42} kind={kind} onDone={onDone} />, { wrapper });
  return onDone;
}

async function searchAndPick(label: string) {
  fireEvent.change(screen.getByPlaceholderText(/Nhập mã hóa đơn/i), {
    target: { value: "HD013124" },
  });
  const button = await screen.findByRole("button", { name: new RegExp(label) }, { timeout: 3000 });
  fireEvent.click(button);
}

function matchCalls() {
  return fetchJson.mock.calls.filter((c) => String(c[0]).includes("/match"));
}

beforeEach(() => {
  // Body block, KHÔNG dùng arrow rút gọn: `mockReset()` trả về chính mock, và Vitest
  // coi giá trị trả về của beforeEach là hàm cleanup → nó gọi mock với 0 đối số ở
  // cuối test, làm implementation nổ khi đọc `url`.
  fetchJson.mockReset();
});
afterEach(cleanup);

describe("PendingMatchPanel — hàng gửi bù", () => {
  it("đơn chưa xuất: khớp ngay, không hỏi gì", async () => {
    mockLookup(FRESH_ORDER);
    renderPanel();
    await searchAndPick("HD013124");
    await waitFor(() => expect(matchCalls()).toHaveLength(1));
    expect(screen.queryByText(/hàng gửi bù/i)).not.toBeInTheDocument();
  });

  it("đơn đã xuất: hiện hộp xác nhận, CHƯA gọi match", async () => {
    mockLookup(DISPATCHED_ORDER);
    renderPanel();
    await searchAndPick("HD013124");
    expect(await screen.findByText(/hàng gửi bù/i)).toBeInTheDocument();
    expect(matchCalls()).toHaveLength(0);
  });

  it("chọn 'Không' → khớp KHÔNG kèm replacement", async () => {
    mockLookup(DISPATCHED_ORDER);
    renderPanel();
    await searchAndPick("HD013124");
    fireEvent.click(await screen.findByRole("button", { name: /Không — chỉ khớp/i }));
    await waitFor(() => expect(matchCalls()).toHaveLength(1));
    const body = JSON.parse(String((matchCalls()[0][1] as { body: string }).body));
    expect(body.order_id).toBe(7);
    expect(body.replacement).toBeUndefined();
  });

  it("sửa SL rồi chọn 'Có' → payload replacement đúng số đã sửa", async () => {
    mockLookup(DISPATCHED_ORDER);
    renderPanel();
    await searchAndPick("HD013124");
    fireEvent.change(await screen.findByLabelText(/SL MSC06/i), { target: { value: "2" } });
    fireEvent.change(screen.getByPlaceholderText(/Ghi chú/i), {
      target: { value: "ko vao dien" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Có — tạo phiếu xuất kho/i }));
    await waitFor(() => expect(matchCalls()).toHaveLength(1));
    const body = JSON.parse(String((matchCalls()[0][1] as { body: string }).body));
    expect(body.replacement).toEqual({
      lines: [{ product_id: 3, quantity: 2 }],
      note: "ko vao dien",
    });
  });

  // Tab Nhập hoàn: đơn hoàn thì gần như LUÔN đã xuất kho trước đó, mà chiều thu hàng
  // về không bao giờ sinh phiếu xuất (spec 2026-07-24 §2/§7 giới hạn ở kind=dispatch).
  // Hỏi "hàng gửi bù?" ở đây là hỏi sai chỗ — bấm "Có" chỉ nhận về lỗi khó hiểu.
  it("tab Nhập hoàn: đơn đã xuất vẫn khớp ngay, không hỏi hàng gửi bù", async () => {
    mockLookup(DISPATCHED_ORDER);
    renderPanel(vi.fn(), "return");
    await searchAndPick("HD013124");
    await waitFor(() => expect(matchCalls()).toHaveLength(1));
    const body = JSON.parse(String((matchCalls()[0][1] as { body: string }).body));
    expect(body.replacement).toBeUndefined();
    expect(screen.queryByText(/hàng gửi bù/i)).not.toBeInTheDocument();
  });

  it("tab Nhập hoàn: không gắn nhãn 'đã xuất kho' ở danh sách đơn", async () => {
    mockLookup(DISPATCHED_ORDER);
    renderPanel(vi.fn(), "return");
    fireEvent.change(screen.getByPlaceholderText(/Nhập mã hóa đơn/i), {
      target: { value: "HD013124" },
    });
    await screen.findByRole("button", { name: /HD013124/ }, { timeout: 3000 });
    expect(screen.queryByText(/đã xuất kho/i)).not.toBeInTheDocument();
  });

  it("BE bỏ qua tạo phiếu → hiện cảnh báo, không im lặng", async () => {
    fetchJson.mockImplementation((url: string) => {
      if (url.startsWith("/api/inventory/flow-order-lookup")) {
        return Promise.resolve({ items: [DISPATCHED_ORDER] });
      }
      return Promise.resolve({
        ok: true,
        stock_doc_code: "",
        replacement_skipped: "order_was_not_dispatched",
      });
    });
    renderPanel();
    await searchAndPick("HD013124");
    fireEvent.click(await screen.findByRole("button", { name: /Có — tạo phiếu xuất kho/i }));
    expect(await screen.findByText(/chưa từng xuất kho/i)).toBeInTheDocument();
  });
});
