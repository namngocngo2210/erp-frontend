import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Điều chỉnh SL đơn hoàn ĐÃ GHI SỔ tại Lịch sử nhập xuất: hạ số lượng dòng
// (0 = gỡ dòng — SP không về), gửi POST /returns/{id}/adjust.

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("@/services/http", () => ({
  fetchJson: vi.fn(() => Promise.resolve({ status: "posted" })),
}));

import { toast } from "sonner";
import { fetchJson } from "@/services/http";
import { AdjustReturnDialog } from "../components/AdjustReturnDialog";

const target = {
  return_id: 5,
  label: "HD001",
  lines: [
    { product_id: 10, sku: "SKU10", qty: 1 },
    { product_id: 20, sku: "SKU20", qty: 1 },
  ],
};

function renderDialog(onOpenChange = () => {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<AdjustReturnDialog target={target} onOpenChange={onOpenChange} />, {
    wrapper,
  });
}

function adjustPosts() {
  return vi.mocked(fetchJson).mock.calls.filter(([url]) => String(url).includes("/adjust"));
}

beforeEach(() => {
  vi.mocked(fetchJson).mockClear();
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
});

afterEach(cleanup);

describe("AdjustReturnDialog — điều chỉnh SL đơn hoàn đã ghi sổ", () => {
  it("hiển thị dòng hàng với số lượng hiện tại", () => {
    renderDialog();
    const qty10 = screen.getByLabelText("Số lượng SKU10") as HTMLInputElement;
    const qty20 = screen.getByLabelText("Số lượng SKU20") as HTMLInputElement;
    expect(qty10.value).toBe("1");
    expect(qty20.value).toBe("1");
  });

  it("hạ 1 dòng về 0 rồi lưu → POST adjust với đủ các dòng", async () => {
    const user = userEvent.setup();
    renderDialog();

    fireEvent.change(screen.getByLabelText("Số lượng SKU20"), { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: /Lưu điều chỉnh/ }));

    await waitFor(() => expect(adjustPosts()).toHaveLength(1));
    const [url, init] = adjustPosts()[0];
    expect(url).toBe("/api/inventory/returns/5/adjust");
    expect(JSON.parse(String(init?.body))).toEqual({
      lines: [
        { product_id: 10, quantity: 1 },
        { product_id: 20, quantity: 0 },
      ],
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("mọi dòng về 0 → báo lỗi dùng Huỷ, không POST", async () => {
    const user = userEvent.setup();
    renderDialog();

    fireEvent.change(screen.getByLabelText("Số lượng SKU10"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Số lượng SKU20"), { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: /Lưu điều chỉnh/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).toContain("Huỷ");
    expect(adjustPosts()).toHaveLength(0);
  });

  it("BE trả lỗi → hiện nguyên văn lỗi", async () => {
    vi.mocked(fetchJson).mockRejectedValueOnce(
      new Error("Sản phẩm #10: đơn nguồn chỉ còn 0 đơn vị"),
    );
    const user = userEvent.setup();
    renderDialog();

    fireEvent.change(screen.getByLabelText("Số lượng SKU10"), { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: /Lưu điều chỉnh/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).toContain("chỉ còn 0 đơn vị");
  });
});
