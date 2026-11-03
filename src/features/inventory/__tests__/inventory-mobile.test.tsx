/**
 * Responsive mobile cho TOÀN BỘ phần kho.
 *
 * Một file cho cả section thay vì rải test lẻ theo từng màn: mọi màn kho đều đi
 * qua cùng một hợp đồng — `ResponsiveList` giữ NGUYÊN bảng ở desktop và đổi sang
 * thẻ ở mobile. Mỗi màn vì thế có đúng một cặp case (mobile đọc đủ field / desktop
 * vẫn là bảng), cộng case hồi quy của sự cố được báo.
 *
 * Sự cố gốc: ở chế độ "xem theo SKU" của Lịch sử nhập xuất, bảng chi tiết đơn nằm
 * lồng trong `<td colSpan>` của bảng ngoài. Cột "Tên" (mô tả sản phẩm rất dài) kéo
 * bảng ngoài rộng ra, bảng lồng `w-full` giãn theo, nên trên điện thoại hai cột
 * cuối (Kho, SL xuất) bị đẩy khỏi màn hình. Case "không còn bảng lồng" ở dưới là
 * chốt chặn cho đúng ca đó.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";

import { mockViewport, restoreViewport } from "@/test/viewport";
import { renderWithClient } from "@/test/utils";
import * as http from "@/services/http";

import DispatchHistoryPage from "../pages/DispatchHistoryPage";
import { AwaitingReturnTab } from "../components/AwaitingReturnTab";
import { LedgerTable } from "../components/LedgerTable";

vi.mock("@/services/http", async (orig) => {
  const actual = await orig<typeof import("@/services/http")>();
  return { ...actual, fetchJson: vi.fn() };
});

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

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => () => true,
}));

// Tên sản phẩm thật trên prod dài cỡ này — chính nó kéo bảng rộng ra và đẩy các
// cột cuối khỏi màn hình điện thoại.
const LONG_NAME =
  "Thảm massage toàn thân gấp gọn TMS01, CS:36W/12V, chế độ rung đa điểm, con lăn, " +
  "túi khí và nhiệt hồng ngoại giúp giảm đau mỏi cơ, tăng tuần hoàn máu. Hiệu DELAX";

const SKU_ROW = {
  product_id: 1,
  sku: "TMS01-PROMAX",
  name: LONG_NAME,
  order_count: 2,
  dispatched: 8,
  reversed: 1,
  net: 7,
  doc_quantity: 0,
  doc_count: 0,
  transfer_quantity: 0,
  transfer_count: 0,
  last_at: "2026-08-01T00:00:00Z",
};

const SKU_ORDER_ROW = {
  kind: "order",
  order_id: 51,
  doc_code: null,
  invoice_code: "HD015963",
  order_code: "DH1",
  shipping_code: "999800030087132",
  warehouse_name: "Đại Mỗ",
  net: 3,
  dispatched: 3,
};

const ISSUE_ORDER_ROW = {
  kind: "order",
  order_id: 51,
  doc_code: null,
  invoice_code: "HD015963",
  order_code: "DH1",
  shipping_code: "999800030087132",
  warehouse_name: "Đại Mỗ",
  performed_by: "thukho1",
  last_at: "2026-08-01T03:00:00Z",
  sku_count: 1,
  net: 3,
  dispatched: 3,
  lines: [{ product_id: 1, sku: "TMS01-PROMAX", qty: 3 }],
};

const RETURN_SKU_ROW = {
  product_id: 1,
  sku: "TMS01-PROMAX",
  name: LONG_NAME,
  return_count: 2,
  qty_total: 5,
  transfer_quantity: 0,
  transfer_count: 0,
};

const RETURN_SKU_DETAIL = {
  kind: "return",
  return_id: 7,
  code: "HT20260801",
  source_order_invoice_code: "HD015963",
  source_order_code: "DH1",
  shipping_code: "999800030087132",
  warehouse_name: "Đại Mỗ",
  return_type_label: "Hoàn nguyên vẹn",
  quantity: 5,
};

function emptyPage(extra: Record<string, unknown> = {}) {
  return {
    items: [],
    total: 0,
    total_quantity: 0,
    sale_quantity: 0,
    return_quantity: 0,
    doc_quantity: 0,
    transfer_quantity: 0,
    limit: 50,
    offset: 0,
    ...extra,
  };
}

function mockFlowEndpoints() {
  vi.mocked(http.fetchJson).mockImplementation((url: string) => {
    const u = String(url);
    if (u.includes("/warehouses")) return Promise.resolve({ items: [], total: 0 });
    if (u.includes("/products")) return Promise.resolve([]);
    if (u.includes("dispatch-history/skus/")) {
      return Promise.resolve({ items: [SKU_ORDER_ROW], total: 1 });
    }
    if (u.includes("dispatch-history/skus")) {
      return Promise.resolve(emptyPage({ items: [SKU_ROW], total: 1, total_quantity: 7 }));
    }
    if (u.includes("dispatch-history/orders")) {
      return Promise.resolve(emptyPage({ items: [ISSUE_ORDER_ROW], total: 1, total_quantity: 3 }));
    }
    if (u.includes("return-history/skus/")) {
      return Promise.resolve({ items: [RETURN_SKU_DETAIL], total: 1 });
    }
    if (u.includes("return-history/skus")) {
      return Promise.resolve(emptyPage({ items: [RETURN_SKU_ROW], total: 1, total_quantity: 5 }));
    }
    if (u.includes("pending")) return Promise.resolve({ items: [] });
    return Promise.resolve(emptyPage());
  });
}

/**
 * Bung dòng SKU (thẻ ở mobile, hàng bảng ở desktop). Tìm qua `aria-expanded` gần
 * nhất chứ không qua role="button" — cả hai đường render đều đặt aria-expanded ở
 * phần tử bấm được, nhưng mobile còn nhiều nút khác nên lọc theo role là mơ hồ.
 */
async function expandFirstSku(sku: string) {
  const label = await screen.findByText(sku);
  const toggle = label.closest("[aria-expanded]");
  expect(toggle).not.toBeNull();
  fireEvent.click(toggle as HTMLElement);
}

beforeEach(() => {
  mockFlowEndpoints();
});

afterEach(() => {
  cleanup();
  restoreViewport();
  vi.clearAllMocks();
});

describe("Lịch sử nhập xuất — xem theo SKU", () => {
  it("mobile: thẻ chi tiết đơn đọc được kho và SL xuất, không còn bảng lồng", async () => {
    mockViewport(true);
    renderWithClient(<DispatchHistoryPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Theo SKU/i }));
    await expandFirstSku("TMS01-PROMAX");

    // Đây là hai field bị đẩy khỏi màn hình trong sự cố được báo.
    expect(await screen.findByText("999800030087132")).toBeInTheDocument();
    expect(screen.getByText("Đại Mỗ")).toBeInTheDocument();
    expect(screen.getByText("HD015963")).toBeInTheDocument();

    // Nguyên nhân gốc là bảng lồng ăn theo chiều rộng bảng ngoài — ở mobile phải
    // không còn bảng nào để không thể tái diễn.
    expect(document.querySelector("table")).toBeNull();
  });

  it("desktop: vẫn giữ nguyên bảng và đủ 4 cột", async () => {
    mockViewport(false);
    renderWithClient(<DispatchHistoryPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Theo SKU/i }));
    await waitFor(() => expect(screen.getByText("TMS01-PROMAX")).toBeInTheDocument());

    const table = document.querySelector("table");
    expect(table).not.toBeNull();
    const head = within(table as HTMLElement);
    expect(head.getByText("SKU")).toBeInTheDocument();
    expect(head.getByText("Tên")).toBeInTheDocument();
    expect(head.getByText("Số đơn")).toBeInTheDocument();
    expect(head.getByText("SL xuất")).toBeInTheDocument();
  });
});

describe("Lịch sử nhập xuất — xem theo Đơn", () => {
  it("mobile: thẻ đọc được mã vận đơn, kho và SL xuất", async () => {
    mockViewport(true);
    renderWithClient(<DispatchHistoryPage />);

    expect(await screen.findByText("999800030087132")).toBeInTheDocument();
    expect(screen.getByText("Đại Mỗ")).toBeInTheDocument();
    expect(screen.getByText("thukho1")).toBeInTheDocument();
    expect(document.querySelector("table")).toBeNull();
  });

  it("desktop: vẫn giữ nguyên bảng", async () => {
    mockViewport(false);
    renderWithClient(<DispatchHistoryPage />);

    await waitFor(() => expect(screen.getByText("999800030087132")).toBeInTheDocument());
    expect(document.querySelector("table")).not.toBeNull();
  });
});

describe("Lịch sử nhập xuất — tab Nhập hàng hoàn", () => {
  it("mobile: thẻ chi tiết SKU đọc được loại hoàn và kho", async () => {
    mockViewport(true);
    renderWithClient(<DispatchHistoryPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Nhập hàng hoàn về/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Theo SKU/i }));
    await expandFirstSku("TMS01-PROMAX");

    expect(await screen.findByText("Hoàn nguyên vẹn")).toBeInTheDocument();
    expect(screen.getByText("Đại Mỗ")).toBeInTheDocument();
    expect(document.querySelector("table")).toBeNull();
  });
});

describe("Lịch sử nhập xuất — tab Chờ hàng hoàn về", () => {
  const AWAITING = {
    count: 1,
    results: [
      {
        order_id: 9,
        order_code: "DH9",
        invoice_code: "HD015999",
        shipping_code: "999800040087141",
        customer_name: "Khách A",
        warehouse_id: 1,
        warehouse_name: "Đại Mỗ",
        cancelled_at: "2026-08-01T00:00:00Z",
        days_waiting: 12,
        status: "waiting" as const,
        closed_reason: "",
        closed_note: "",
        lines: [{ product_id: 1, sku: "TMS01-PROMAX", qty: 2 }],
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(http.fetchJson).mockImplementation(() => Promise.resolve(AWAITING));
  });

  it("mobile: thẻ đọc được số ngày chờ và nút Đóng", async () => {
    mockViewport(true);
    renderWithClient(<AwaitingReturnTab warehouseIds={[]} pageSize={50} />);

    expect(await screen.findByText("999800040087141")).toBeInTheDocument();
    expect(screen.getByText("12 ngày")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng" })).toBeInTheDocument();
    expect(document.querySelector("table")).toBeNull();
  });

  it("desktop: vẫn giữ nguyên bảng", async () => {
    mockViewport(false);
    renderWithClient(<AwaitingReturnTab warehouseIds={[]} pageSize={50} />);

    await waitFor(() => expect(screen.getByText("999800040087141")).toBeInTheDocument());
    expect(document.querySelector("table")).not.toBeNull();
  });
});

describe("Phiếu kho — sổ phiếu", () => {
  const LEDGER_PROPS = {
    rows: [
      {
        id: 3,
        code: "PXK000123",
        type: "issue",
        type_label: "Phiếu xuất kho",
        status: "draft",
        status_label: "Nháp",
        warehouse_label: "Đại Mỗ",
        has_attachments: false,
        created_at: "2026-08-01T00:00:00Z",
      },
    ],
    isLoading: false,
    canApproveStock: true,
    busy: false,
    onViewStock: vi.fn(),
    onExportStock: vi.fn(),
    onEditStock: vi.fn(),
    onSubmitStock: vi.fn(),
    onApproveStock: vi.fn(),
    onRejectStock: vi.fn(),
    onCancelStock: vi.fn(),
  };

  it("mobile: thẻ đọc được mã phiếu, trạng thái, kho và nút thao tác", async () => {
    mockViewport(true);
    renderWithClient(<LedgerTable {...LEDGER_PROPS} />);

    expect(screen.getByText("PXK000123")).toBeInTheDocument();
    expect(screen.getByText("Nháp")).toBeInTheDocument();
    expect(screen.getByText("Đại Mỗ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xem/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gửi duyệt/ })).toBeInTheDocument();
    expect(document.querySelector("table")).toBeNull();
  });

  it("desktop: vẫn giữ nguyên bảng", () => {
    mockViewport(false);
    renderWithClient(<LedgerTable {...LEDGER_PROPS} />);

    expect(document.querySelector("table")).not.toBeNull();
    expect(screen.getByText("PXK000123")).toBeInTheDocument();
  });
});
