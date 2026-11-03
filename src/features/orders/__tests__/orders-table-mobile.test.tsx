import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@/i18n";
import { OrdersPagination } from "@/features/orders/OrdersPagination";
import { OrdersTable } from "@/features/orders/OrdersTable/OrdersTable";
import type { OrderRow } from "@/features/orders/order-types";
import { mockViewportWidth, restoreViewport } from "@/test/viewport";

/**
 * Trang Đơn hàng trên điện thoại (<768): bảng → danh sách thẻ, toolbar 1 hàng với
 * menu "⋯" giữ nguyên handler của nút desktop, phân trang 1 hàng `‹ 1/3 ›`.
 * Mock giống quick-sale-deferred.test.tsx (AppShell, CRM catalog, export jobs).
 */

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn(), info: vi.fn() },
}));
vi.mock("@/hooks/usePermission", () => ({ usePermission: () => () => false }));
vi.mock("@/hooks/useOrderFieldGrants", () => ({ useOrderFieldGrants: () => () => true }));
vi.mock("@/features/orders/OrdersTable/crm-catalog", () => ({ useCrmCatalog: () => null }));
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

const rows = [
  { id: 1, name: "Khách Một", phone: "0901", fulfillment_warehouse: 5, can_edit: true },
  { id: 2, name: "Khách Hai", phone: "0902", fulfillment_warehouse: 5, can_edit: true },
] as unknown as OrderRow[];

function renderTable(onOpenDetails = vi.fn()) {
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
        visibleColumns={["name", "phone"]}
        lockedColumns={[]}
        kiotvietOptions={[]}
        addressCatalog={{ provinces: [], districts_by_province: {}, wards_by_district_key: {} }}
        channelStaffByCode={{}}
        onOpenDetails={onOpenDetails}
        rightActions={<button type="button">Tạo đơn</button>}
      />
    </I18nProvider>,
  );
  return { onKiotVietAction, onOpenDetails };
}

describe("OrdersTable — điện thoại", () => {
  afterEach(() => {
    cleanup();
    restoreViewport();
    vi.clearAllMocks();
  });

  it("375px: render thẻ thay bảng, chạm thẻ mở chi tiết", async () => {
    mockViewportWidth(375);
    const user = userEvent.setup();
    const { onOpenDetails } = renderTable();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("order-mobile-card")).toHaveLength(2);
    await user.click(screen.getByText("Khách Hai"));
    expect(onOpenDetails).toHaveBeenCalledWith(rows[1]);
  });

  it("375px: menu ⋯ chạy Tạo nhanh với đơn chọn trên thẻ; nút desktop ẩn", async () => {
    mockViewportWidth(375);
    const user = userEvent.setup();
    const { onKiotVietAction } = renderTable();
    expect(screen.queryByRole("button", { name: /KiotViet/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Khách Một/ }));
    await user.click(screen.getByRole("button", { name: "Thao tác khác" }));
    await user.click(screen.getByRole("menuitem", { name: /Tạo nhanh/ }));
    expect(onKiotVietAction).toHaveBeenCalledWith("quick_sale_deferred_selected", [1]);
  });

  it("375px: mục cần chọn đơn bị disable khi chưa chọn", async () => {
    mockViewportWidth(375);
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByRole("button", { name: "Thao tác khác" }));
    expect(screen.getByRole("menuitem", { name: /In hóa đơn/ })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: /Xuất Excel/ })).toBeEnabled();
  });

  it("1280px: giữ bảng + nút KiotViet", () => {
    mockViewportWidth(1280);
    renderTable();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByTestId("order-mobile-card")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /KiotViet/i })).toBeInTheDocument();
  });
});

describe("OrdersPagination — điện thoại", () => {
  afterEach(() => {
    cleanup();
    restoreViewport();
  });

  it("1 hàng ‹ trang/tổng ›, bấm › sang trang sau", async () => {
    mockViewportWidth(375);
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <I18nProvider>
        <OrdersPagination
          rowsCount={50}
          ordersPage={0}
          ordersPageSize={50}
          ordersHasNextPage
          ordersTotalCount={150}
          isLoading={false}
          onPageSizeChange={vi.fn()}
          onPageChange={onPageChange}
        />
      </I18nProvider>,
    );
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trang trước" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
