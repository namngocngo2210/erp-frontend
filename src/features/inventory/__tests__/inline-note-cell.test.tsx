import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// 6.1 — autosave ghi chú không được nuốt lỗi: PATCH lỗi phải toast NGUYÊN VĂN lỗi BE
// và KHÔNG cập nhật savedRef, để lần gõ/blur tiếp theo tự thử lưu lại (không im lặng
// mất dữ liệu). PATCH thành công thì savedRef cập nhật bình thường (không lưu lặp).

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
  },
}));

const patchCalls: string[] = [];
let nextShouldFail = true;

vi.mock("@/services/http", () => ({
  fetchJson: vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      patchCalls.push(body.note);
      if (nextShouldFail) {
        const err = new Error("Mã đã bị xoá") as Error & { body?: unknown };
        err.body = { detail: "Mã đã bị xoá" };
        return Promise.reject(err);
      }
      return Promise.resolve({ id: 7, note: body.note });
    }
    return Promise.resolve({});
  }),
}));

import { toast } from "sonner";
import { PendingNoteCell } from "@/features/inventory/components/flow-shared";

function renderCell() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<PendingNoteCell scanId={7} note="" />, { wrapper });
}

beforeEach(() => {
  patchCalls.length = 0;
  nextShouldFail = true;
  vi.mocked(toast.error).mockClear();
});

afterEach(cleanup);

describe("InlineNoteCell (qua PendingNoteCell) — 6.1 autosave không nuốt lỗi", () => {
  it("PATCH lỗi → toast nguyên văn lỗi BE, giữ nguyên chữ đã gõ, blur lại thì thử lưu lại", async () => {
    renderCell();
    const input = screen.getByPlaceholderText("Ghi chú…");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "kho ghi chú" } });
    fireEvent.blur(input);

    await waitFor(() => expect(patchCalls).toEqual(["kho ghi chú"]));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Mã đã bị xoá"));

    // Input vẫn giữ nguyên chữ vừa gõ — không bị xoá/revert do lỗi.
    expect((input as HTMLInputElement).value).toBe("kho ghi chú");

    // savedRef KHÔNG được cập nhật khi lỗi → blur lại (không đổi chữ) vẫn PATCH lại,
    // không im lặng bỏ qua.
    nextShouldFail = false;
    fireEvent.focus(input);
    fireEvent.blur(input);

    await waitFor(() => expect(patchCalls).toEqual(["kho ghi chú", "kho ghi chú"]));
  });

  it("PATCH thành công → savedRef cập nhật, blur lại không đổi chữ thì KHÔNG gửi lặp", async () => {
    nextShouldFail = false;
    renderCell();
    const input = screen.getByPlaceholderText("Ghi chú…");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "đã lưu ok" } });
    fireEvent.blur(input);

    await waitFor(() => expect(patchCalls).toEqual(["đã lưu ok"]));
    expect(toast.error).not.toHaveBeenCalled();

    // Blur lại không đổi giá trị — savedRef đã khớp nên không gửi PATCH thừa.
    fireEvent.focus(input);
    fireEvent.blur(input);
    await new Promise((r) => setTimeout(r, 0));
    expect(patchCalls).toEqual(["đã lưu ok"]);
  });
});
