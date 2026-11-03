import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/features/warranty-codes/queries", () => ({
  useCreateBatch: () => ({ mutate, isPending: false }),
}));
vi.mock("@/features/products/queries", () => ({ useProductSearch: () => async () => [] }));

import { GenerateBatchDialog } from "@/features/warranty-codes/components/GenerateBatchDialog";

function renderDialog() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <GenerateBatchDialog open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
}

describe("GenerateBatchDialog", () => {
  it("bỏ trống 'Từ số' → gửi start_seq null (nối tiếp), không giới hạn số lượng", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("Số lượng"), { target: { value: "1000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo lô" }));
    expect(mutate).toHaveBeenCalledWith(
      { quantity: 1_000_000, start_seq: null, product_id: null },
      expect.anything(),
    );
  });

  it("nhập 'Từ số' → preview dải và gửi start_seq", () => {
    mutate.mockClear();
    renderDialog();
    fireEvent.change(screen.getByLabelText("Từ số"), { target: { value: "20001" } });
    fireEvent.change(screen.getByLabelText("Số lượng"), { target: { value: "10000" } });
    expect(screen.getByText(/20\.001 → 30\.000/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tạo lô" }));
    expect(mutate).toHaveBeenCalledWith(
      { quantity: 10_000, start_seq: 20_001, product_id: null },
      expect.anything(),
    );
  });

  it("chặn 'Từ số' < 1 và số lượng rỗng", () => {
    mutate.mockClear();
    renderDialog();
    fireEvent.change(screen.getByLabelText("Từ số"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Số lượng"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo lô" }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText(/Số bắt đầu/)).toBeTruthy();
  });
});
