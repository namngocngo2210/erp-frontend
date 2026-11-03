import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/contact-flow", () => ({
  getResults: vi.fn(),
  applyOperationResult: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { applyOperationResult, getResults, type FlowResult } from "@/lib/api/contact-flow";
import { OperationResultDialog } from "@/features/contacts/components/OperationResultDialog";

const mockGetResults = vi.mocked(getResults);
const mockApplyResult = vi.mocked(applyOperationResult);

const RESULTS: FlowResult[] = [
  {
    id: 1,
    name: "Đã chốt",
    color: "#1C7ED6",
    is_close: true,
    requires_schedule: false,
    is_active: true,
    position: 1,
  },
  {
    id: 2,
    name: "Hẹn gọi lại",
    color: "#F59E0B",
    is_close: false,
    requires_schedule: true,
    is_active: true,
    position: 2,
  },
  {
    id: 3,
    name: "Ngừng dùng",
    color: "#999999",
    is_close: false,
    requires_schedule: false,
    is_active: false,
    position: 3,
  },
];

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <OperationResultDialog
        open
        onOpenChange={vi.fn()}
        customerId={7}
        customerName="Nguyễn Văn A"
      />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockGetResults.mockReset();
  mockApplyResult.mockReset();
  mockGetResults.mockResolvedValue(RESULTS);
  mockApplyResult.mockResolvedValue({
    stage_name: "Chăm sóc",
    stage_color: "#1C7ED6",
    due_at: null,
    bucket: "none",
  });
});

describe("OperationResultDialog", () => {
  it("chỉ hiện option is_active trong danh sách kết quả", async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("combobox", { name: /chọn kết quả/i }));

    expect(await screen.findByText("Đã chốt")).toBeInTheDocument();
    expect(screen.getByText("Hẹn gọi lại")).toBeInTheDocument();
    expect(screen.queryByText("Ngừng dùng")).not.toBeInTheDocument();
  });

  it("disable nút Lưu khi kết quả requires_schedule nhưng chưa chọn giờ hẹn", async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("combobox", { name: /chọn kết quả/i }));
    await user.click(await screen.findByText("Hẹn gọi lại"));

    expect(screen.getByRole("button", { name: /^lưu$/i })).toBeDisabled();
    expect(mockApplyResult).not.toHaveBeenCalled();
  });

  it("kết quả không requires_schedule cho phép Lưu ngay (không cần giờ hẹn)", async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("combobox", { name: /chọn kết quả/i }));
    await user.click(await screen.findByText("Đã chốt"));

    expect(screen.getByRole("button", { name: /^lưu$/i })).not.toBeDisabled();
  });

  it("chọn giờ hẹn rồi Lưu gọi mutate với payload ISO đúng", async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("combobox", { name: /chọn kết quả/i }));
    await user.click(await screen.findByText("Hẹn gọi lại"));

    const dateInput = await screen.findByLabelText(/giờ hẹn/i);
    fireEvent.change(dateInput, { target: { value: "2026-07-20T09:30" } });

    const saveButton = screen.getByRole("button", { name: /^lưu$/i });
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockApplyResult).toHaveBeenCalledWith(7, {
        result_id: 2,
        scheduled_at: new Date("2026-07-20T09:30").toISOString(),
      });
    });
  });
});
