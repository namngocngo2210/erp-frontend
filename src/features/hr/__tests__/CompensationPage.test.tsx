import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n";
import type { CompensationRow } from "@/lib/api/hr-compensation";

const mockUpdate = vi.fn();
let mockQuery: { data?: CompensationRow[]; isLoading: boolean; isError: boolean; error?: unknown };

vi.mock("@/features/hr/queries", () => ({
  useCompensations: () => mockQuery,
  useUpdateCompensation: () => ({ mutateAsync: mockUpdate }),
}));

vi.mock("@/lib/api/hr-compensation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/hr-compensation")>();
  return { ...actual, downloadPayrollExport: vi.fn() };
});

import CompensationPage from "@/features/hr/pages/CompensationPage";

const row: CompensationRow = {
  employee_id: 1,
  employee_code: "NV001",
  full_name: "Nguyễn Văn A",
  department: "Kinh doanh",
  base_salary: "10000000.00",
  standard_workdays: "26.0",
  attendance_bonus: "500000.00",
  responsibility_allowance: "0.00",
  kpi_rate: "0.20000",
  lunch_per_meal: "30000.00",
  other_allowance: "0.00",
  social_insurance: "0.00",
  note: "",
} as CompensationRow;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
  return render(<CompensationPage />, { wrapper });
}

/** Nút Lưu của dòng cuối bảng (nút cuối cùng trong DOM). */
const saveButton = () => {
  const buttons = screen.getAllByRole("button");
  return buttons[buttons.length - 1];
};

afterEach(() => {
  cleanup();
  mockUpdate.mockReset();
});

describe("CompensationPage", () => {
  it("số cùng giá trị nhưng khác chuỗi (26 vs 26.0) KHÔNG bị coi là chưa lưu", () => {
    mockQuery = { data: [row], isLoading: false, isError: false };
    renderPage();

    // Ô Công chuẩn hiển thị "26.0" từ server; user gõ lại "26" → cùng giá trị số.
    const workdays = screen.getByDisplayValue("26.0");
    fireEvent.change(workdays, { target: { value: "26" } });

    expect(saveButton()).toBeDisabled();
  });

  it("đổi giá trị thật thì bật nút Lưu; lưu xong seed lại draft từ response nên hết dirty", async () => {
    const saved: CompensationRow = { ...row, standard_workdays: "24.0" };
    mockQuery = { data: [row], isLoading: false, isError: false };
    mockUpdate.mockResolvedValue(saved);
    const { rerender } = renderPage();

    fireEvent.change(screen.getByDisplayValue("26.0"), { target: { value: "24" } });
    expect(saveButton()).not.toBeDisabled();

    fireEvent.click(saveButton());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    // Response canonical "24.0" được seed lại vào ô nhập (thay vì giữ "24" user gõ).
    await waitFor(() => expect(screen.getByDisplayValue("24.0")).toBeInTheDocument());

    // Query invalidate → list refetch trả bản đã lưu: dòng phải HẾT trạng thái chưa lưu.
    mockQuery = { data: [saved], isLoading: false, isError: false };
    rerender(<CompensationPage />);
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });

  it("lỗi tải hiện thông báo lỗi, KHÔNG hiện 'Chưa có nhân sự.'", () => {
    mockQuery = {
      data: [],
      isLoading: false,
      isError: true,
      error: new Error("Bạn không có quyền."),
    };
    renderPage();

    expect(screen.getByText("Bạn không có quyền.")).toBeInTheDocument();
    expect(screen.queryByText("Chưa có nhân sự.")).not.toBeInTheDocument();
  });

  it("không lỗi và không có dòng nào thì hiện 'Chưa có nhân sự.'", () => {
    mockQuery = { data: [], isLoading: false, isError: false };
    renderPage();

    expect(screen.getByText("Chưa có nhân sự.")).toBeInTheDocument();
  });
});
