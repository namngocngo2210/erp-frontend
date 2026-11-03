import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@/i18n";
import { OrdersTable } from "@/features/orders/OrdersTable/OrdersTable";
import type { OrderRow } from "@/features/orders/order-types";
import { mockViewport, restoreViewport } from "@/test/viewport";

/**
 * Mục menu "Tạo nhanh" trên dropdown KiotViet của trang Đơn hàng. Từ 2026-08-28
 * hai mục "bán nhanh" (trừ tồn ngay) và "xuất sau" đã GỘP còn một: mọi đơn bán
 * trực tiếp đều lên hoá đơn ngay rồi nằm ở màn "Chờ xuất kho" tới khi kho bấm
 * xác nhận. Nút gửi `quick_sale_deferred_selected` qua callback
 * `onKiotVietAction` (endpoint `/api/orders/kiotviet-actions` ở tầng
 * use-orders-bulk-actions.ts) và giữ nguyên guard "thiếu kho xuất".
 *
 * Render thẳng OrdersTable (không qua OrdersPage) để giữ phạm vi test hẹp,
 * nhưng đây LÀ render thật + click thật qua dropdown dựng bằng createPortal,
 * không phải test hàm thuần — khác với findOrdersWithoutWarehouse ở
 * shipping-type.test.tsx. Để làm được điều đó phải cách ly:
 *  - usePermission/useOrderFieldGrants: gọi useAppShell() nội bộ, ném lỗi nếu
 *    không có AppShellContext.Provider — mock thẳng module thay vì dựng cả
 *    context (khớp cách OrderTableRow đã tách canEditField ra prop để test
 *    không cần AppShellContext).
 *  - useCrmCatalog / useExportJobs: fetch thật / cần ExportJobsProvider thật
 *    (kéo theo QueryClientProvider + WebSocket) — mock y hệt
 *    useOrdersTableData.export-gate.test.tsx đã làm.
 *  - visibleColumns=[] để OrderTableRow không render OrderCell nào (đơn giản
 *    hoá row xuống chỉ còn checkbox) — không cần dựng OrderRow đầy đủ field.
 */

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn(), info: vi.fn() },
}));

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => () => false,
}));

vi.mock("@/hooks/useOrderFieldGrants", () => ({
  useOrderFieldGrants: () => () => false,
}));

vi.mock("@/features/orders/OrdersTable/crm-catalog", () => ({
  useCrmCatalog: () => null,
}));

vi.mock("@/features/exports/ExportJobsProvider", () => ({
  useExportJobs: () => ({
    jobs: [],
    activeCount: 0,
    isOpen: false,
    setOpen: vi.fn(),
    startExport: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

import { toast } from "sonner";

const orderWithWarehouse = { id: 1, invoice_code: "HD001", fulfillment_warehouse: 5 } as OrderRow;
const orderWithoutWarehouse = {
  id: 2,
  invoice_code: "HD002",
  fulfillment_warehouse: null,
} as OrderRow;

function renderOrdersTable(rows: OrderRow[]) {
  const onKiotVietAction = vi.fn().mockResolvedValue(undefined);
  render(
    <I18nProvider>
      <OrdersTable
        rows={rows}
        products={[]}
        onPatch={vi.fn().mockResolvedValue(undefined)}
        onDuplicateOrder={vi.fn().mockResolvedValue(undefined)}
        onBulkDelete={vi.fn().mockResolvedValue(undefined)}
        onKiotVietAction={onKiotVietAction}
        visibleColumns={[]}
        lockedColumns={[]}
        kiotvietOptions={[]}
        addressCatalog={{ provinces: [], districts_by_province: {}, wards_by_district_key: {} }}
        channelStaffByCode={{}}
      />
    </I18nProvider>,
  );
  return { onKiotVietAction };
}

/** Chọn dòng đơn DUY NHẤT của bảng: checkbox[0] là "chọn tất cả", checkbox[1] là dòng. */
async function selectOnlyRow(user: ReturnType<typeof userEvent.setup>) {
  const checkboxes = screen.getAllByRole("checkbox");
  await user.click(checkboxes[1]);
}

describe("dropdown KiotViet — mục 'Tạo nhanh'", () => {
  beforeEach(() => {
    mockViewport(false);
  });

  afterEach(() => {
    cleanup();
    restoreViewport();
    vi.clearAllMocks();
  });

  it("gửi action quick_sale_deferred_selected khi bấm Tạo nhanh", async () => {
    const user = userEvent.setup();
    const { onKiotVietAction } = renderOrdersTable([orderWithWarehouse]);

    await selectOnlyRow(user);
    await user.click(screen.getByRole("button", { name: /KiotViet/i }));
    await user.click(screen.getByRole("button", { name: /Tạo nhanh/i }));

    expect(onKiotVietAction).toHaveBeenCalledWith("quick_sale_deferred_selected", [
      orderWithWarehouse.id,
    ]);
  });

  it("chỉ còn MỘT mục Tạo nhanh — nhánh trừ tồn ngay đã bị gỡ khỏi UI", async () => {
    const user = userEvent.setup();
    renderOrdersTable([orderWithWarehouse]);

    await user.click(screen.getByRole("button", { name: /KiotViet/i }));

    // Còn hai mục nghĩa là ai đó dựng lại nút "bán nhanh" (trừ tồn ngay) — thứ
    // đã bị gỡ có chủ đích, không phải nút bị quên xoá.
    expect(screen.getAllByRole("button", { name: /Tạo nhanh/i })).toHaveLength(1);
  });

  it("nhãn nút nói rõ hậu quả: hoá đơn lên ngay nhưng tồn kho chờ kho xác nhận", async () => {
    const user = userEvent.setup();
    renderOrdersTable([orderWithWarehouse]);

    await user.click(screen.getByRole("button", { name: /KiotViet/i }));

    const button = screen.getByRole("button", { name: /Tạo nhanh/i });
    expect(button.textContent).toMatch(/xác nhận/i);
    expect(button.textContent).toMatch(/xuất/i);
  });

  it("chặn NGAY trên UI khi đơn được chọn chưa có kho xuất — không gọi API", async () => {
    const user = userEvent.setup();
    const { onKiotVietAction } = renderOrdersTable([orderWithoutWarehouse]);

    await selectOnlyRow(user);
    await user.click(screen.getByRole("button", { name: /KiotViet/i }));
    await user.click(screen.getByRole("button", { name: /Tạo nhanh/i }));

    expect(onKiotVietAction).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("HD002"));
  });

  it("nút vô hiệu hoá khi chưa chọn đơn nào", async () => {
    const user = userEvent.setup();
    renderOrdersTable([orderWithWarehouse]);

    await user.click(screen.getByRole("button", { name: /KiotViet/i }));

    expect(screen.getByRole("button", { name: /Tạo nhanh/i })).toBeDisabled();
  });
});
