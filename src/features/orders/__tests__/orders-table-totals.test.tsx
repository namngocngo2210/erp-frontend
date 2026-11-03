import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import { OrdersTable } from "@/features/orders/OrdersTable/OrdersTable";
import { formatAmount } from "@/features/orders/OrdersTable/constants";
import { sumPageAmountAfterDiscount } from "@/features/orders/OrdersTable/order-totals";
import type { OrderColumnKey, OrderRow } from "@/features/orders/order-types";
import { mockViewportWidth, restoreViewport } from "@/test/viewport";

/** Dòng tổng "Tổng sau giảm giá" dưới bảng đơn. Mock giống orders-table-mobile.test.tsx. */

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
  { id: 1, name: "Khách Một", phone: "0901", total_after_discount: "100000.10", can_edit: true },
  { id: 2, name: "Khách Hai", phone: "0902", total_after_discount: "250000.20", can_edit: true },
] as unknown as OrderRow[];

function renderTable(props: { showTotals?: boolean; visibleColumns?: OrderColumnKey[] } = {}) {
  render(
    <I18nProvider>
      <OrdersTable
        rows={rows}
        products={[]}
        onPatch={vi.fn().mockResolvedValue(undefined)}
        onDuplicateOrder={vi.fn().mockResolvedValue(undefined)}
        onBulkDelete={vi.fn().mockResolvedValue(undefined)}
        onKiotVietAction={vi.fn().mockResolvedValue(undefined)}
        visibleColumns={props.visibleColumns ?? ["name", "total_after_discount"]}
        lockedColumns={[]}
        kiotvietOptions={[]}
        addressCatalog={{ provinces: [], districts_by_province: {}, wards_by_district_key: {} }}
        channelStaffByCode={{}}
        showTotals={props.showTotals}
      />
    </I18nProvider>,
  );
}

describe("sumPageAmountAfterDiscount", () => {
  it("cộng theo xu, bỏ qua giá trị rỗng/hỏng", () => {
    const mixed = [
      { total_after_discount: "0.10" },
      { total_after_discount: "0.20" },
      { total_after_discount: undefined },
      { total_after_discount: "abc" },
    ] as unknown as OrderRow[];
    expect(sumPageAmountAfterDiscount(mixed)).toBe(0.3);
  });
});

describe("OrdersTable — dòng tổng sau giảm giá", () => {
  afterEach(() => {
    cleanup();
    restoreViewport();
  });

  it("chỉ hiện số: tổng các dòng đang hiển thị", () => {
    mockViewportWidth(1280);
    renderTable({ showTotals: true });
    expect(screen.getByTestId("orders-total-after-discount").textContent).toBe(
      formatAmount(350000.3),
    );
  });

  it("ẩn khi trang không bật hoặc cột bị ẩn", () => {
    mockViewportWidth(1280);
    renderTable();
    expect(screen.queryByTestId("orders-total-after-discount")).not.toBeInTheDocument();
    cleanup();
    renderTable({ showTotals: true, visibleColumns: ["name"] });
    expect(screen.queryByTestId("orders-total-after-discount")).not.toBeInTheDocument();
  });

  it("điện thoại: thanh tổng dưới danh sách thẻ", () => {
    mockViewportWidth(375);
    renderTable({ showTotals: true });
    expect(screen.getByTestId("orders-mobile-total-after-discount")).toHaveTextContent(
      formatAmount(350000.3),
    );
  });
});
