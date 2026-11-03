import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { SkuLines } from "../components/flow-shared";
import { IssueTab } from "../components/IssueTab";
import { ReturnTab } from "../components/ReturnTab";
import * as http from "@/services/http";
import { FLOW_FILTERS as filters, renderWithClient } from "./flow-test-utils";

vi.mock("@/services/http", async (orig) => {
  const actual = await orig<typeof import("@/services/http")>();
  return { ...actual, fetchJson: vi.fn() };
});

// ReturnTab đọc quyền returns:approve cho nút Huỷ — mock cho phép hết.
vi.mock("@/hooks/usePermission", () => ({ usePermission: () => () => true }));

// Task 17: IssueTab/ReturnTab đọc useExportJobs() ở thân component (nút Xuất Excel
// gọi startExport) — không test hành vi export ở đây, chỉ cấp stub để render không throw.
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

describe("SkuLines", () => {
  it("hiển thị mã kèm từng SKU × số lượng", () => {
    render(
      <SkuLines
        code="HD00123"
        lines={[
          { product_id: 1, sku: "DESI-A01", qty: 2 },
          { product_id: 2, sku: "DESI-B07", qty: 1 },
        ]}
      />,
    );
    expect(screen.getByText("HD00123")).toBeInTheDocument();
    expect(screen.getByText("DESI-A01 × 2")).toBeInTheDocument();
    expect(screen.getByText("DESI-B07 × 1")).toBeInTheDocument();
  });

  it("không có dòng SKU thì chỉ hiện mã", () => {
    const { container } = render(<SkuLines code="HD00124" lines={[]} />);
    expect(screen.getByText("HD00124")).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(0);
  });

  it("thiếu mã thì hiện dấu gạch", () => {
    render(<SkuLines code={null} lines={[]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("payload cũ thiếu lines (rolling deploy) vẫn không throw, chỉ hiện mã", () => {
    // Mô phỏng response từ backend cũ chưa có field `lines`.
    const { container } = render(<SkuLines code="HD00125" lines={undefined} />);
    expect(screen.getByText("HD00125")).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(0);
  });
});

describe("IssueTab — gộp phiếu xuất kho vào báo cáo Xuất", () => {
  beforeEach(() => vi.clearAllMocks());

  it("view Theo đơn hiện dòng phiếu xuất kho + footer breakdown", async () => {
    vi.mocked(http.fetchJson).mockImplementation((url: string) => {
      if (url.includes("dispatch-history/pending")) return Promise.resolve({ items: [] });
      if (url.includes("dispatch-history/orders")) {
        return Promise.resolve({
          items: [
            {
              kind: "order",
              order_id: 1,
              order_code: "DH1",
              invoice_code: "HD1",
              shipping_code: "VD1",
              doc_code: null,
              warehouse_name: "Kho A",
              performed_by: "NV",
              sku_count: 1,
              dispatched: 1,
              reversed: 0,
              net: 1,
              last_at: "2026-07-07T00:00:00Z",
              lines: [{ product_id: 1, sku: "DV20", qty: 1 }],
            },
            {
              kind: "document",
              order_id: null,
              order_code: null,
              invoice_code: null,
              shipping_code: null,
              doc_code: "XK-DOC1",
              warehouse_name: "Kho A",
              performed_by: "Kế Toán",
              sku_count: 1,
              dispatched: 1,
              reversed: 0,
              net: 1,
              last_at: "2026-07-15T00:00:00Z",
              lines: [{ product_id: 1, sku: "DV20", qty: 1 }],
            },
          ],
          total: 2,
          total_quantity: 2,
          sale_quantity: 1,
          doc_quantity: 1,
          transfer_quantity: 0,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ items: [] });
    });

    renderWithClient(
      <IssueTab filters={filters} matchFilter="all" viewMode="order" pageSize={50} />,
    );

    await waitFor(() => expect(screen.getByText("Phiếu xuất kho XK-DOC1")).toBeInTheDocument());
    // Footer breakdown: theo đơn 1 + phiếu kho 1 = 2.
    expect(screen.getByText(/theo đơn 1 \+ phiếu kho 1 \+ chuyển kho 0 =/)).toBeInTheDocument();
  });

  it("view Theo SKU cộng SL phiếu kho + chú thích", async () => {
    vi.mocked(http.fetchJson).mockImplementation((url: string) => {
      if (url.includes("dispatch-history/skus")) {
        return Promise.resolve({
          items: [
            {
              product_id: 1,
              sku: "DV20",
              name: "Đầu ghi",
              order_count: 7,
              dispatched: 7,
              reversed: 0,
              net: 7,
              doc_quantity: 1,
              doc_count: 1,
              transfer_quantity: 0,
              transfer_count: 0,
              last_at: "2026-07-15T00:00:00Z",
            },
          ],
          total: 1,
          total_quantity: 8,
          sale_quantity: 7,
          doc_quantity: 1,
          transfer_quantity: 0,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ items: [] });
    });

    renderWithClient(<IssueTab filters={filters} matchFilter="all" viewMode="sku" pageSize={50} />);

    await waitFor(() => expect(screen.getByText("DV20")).toBeInTheDocument());
    // SL xuất = net(7) + phiếu kho(1) = 8, kèm chú thích (scope theo dòng SKU).
    const row = screen.getByText("DV20").closest("tr")!;
    expect(row).toHaveTextContent("8");
    expect(row).toHaveTextContent("gồm 1 phiếu kho");
    expect(screen.getByText(/theo đơn 7 \+ phiếu kho 1 \+ chuyển kho 0 =/)).toBeInTheDocument();
  });
});

describe("IssueTab — dòng chờ khớp hiển thị SKU và bỏ drill-down", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dòng đã khớp hiện mã đơn, danh sách SKU và số SKU", async () => {
    vi.mocked(http.fetchJson).mockImplementation((url: string) => {
      if (url.includes("dispatch-history/pending")) {
        return Promise.resolve({
          items: [
            {
              id: 5,
              code: "VDMATCHED1",
              warehouse_name: "Kho A",
              status: "matched",
              status_label: "Đã khớp",
              error: "",
              created_at: "2026-07-01T00:00:00Z",
              matched_at: "2026-07-02T00:00:00Z",
              matched_order_code: "HD777",
              return_id: null,
              note: "",
              lines: [{ product_id: 1, sku: "SKU-X", qty: 3 }],
              sku_count: 1,
              qty: 3,
            },
          ],
        });
      }
      if (url.includes("dispatch-history/orders")) {
        return Promise.resolve({ items: [], total: 0, total_quantity: 0, limit: 50, offset: 0 });
      }
      return Promise.resolve({ items: [] });
    });

    renderWithClient(
      <IssueTab filters={filters} matchFilter="all" viewMode="order" pageSize={50} />,
    );

    await waitFor(() => expect(screen.getByText("HD777")).toBeInTheDocument());
    expect(screen.getByText("SKU-X × 3")).toBeInTheDocument();
    // Cột "Số SKU" của dòng pending giờ hiện sku_count thay vì "—" cứng.
    const row = screen.getByText("HD777").closest("tr")!;
    expect(row).toHaveTextContent("1");
  });

  it("dòng lịch sử không còn bung bảng con khi bấm vào", async () => {
    vi.mocked(http.fetchJson).mockImplementation((url: string) => {
      if (url.includes("dispatch-history/pending")) {
        return Promise.resolve({ items: [] });
      }
      if (url.includes("dispatch-history/orders")) {
        return Promise.resolve({
          items: [
            {
              order_id: 1,
              order_code: "DH001",
              invoice_code: "HD001",
              shipping_code: "VD001",
              warehouse_name: "Kho A",
              sku_count: 2,
              dispatched: 5,
              reversed: 0,
              net: 5,
              last_at: "2026-07-01T00:00:00Z",
              lines: [{ product_id: 1, sku: "SKU-A", qty: 5 }],
            },
          ],
          total: 1,
          total_quantity: 5,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ items: [] });
    });

    renderWithClient(
      <IssueTab filters={filters} matchFilter="all" viewMode="order" pageSize={50} />,
    );

    await waitFor(() => expect(screen.getByText("HD001")).toBeInTheDocument());
    const row = screen.getByText("HD001").closest("tr")!;
    expect(row.className).not.toContain("cursor-pointer");

    fireEvent.click(row);
    expect(screen.queryByText("Đang tải chi tiết…")).not.toBeInTheDocument();
    // Endpoint drill-down đã bị gỡ hoàn toàn khỏi tab này.
    expect(http.fetchJson).not.toHaveBeenCalledWith(
      expect.stringContaining("dispatch-history/orders/lines"),
    );
  });
});

describe("ReturnTab — dòng chờ khớp hiển thị SKU và bỏ drill-down", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dòng đã khớp hiện mã hóa đơn nguồn và danh sách SKU", async () => {
    vi.mocked(http.fetchJson).mockImplementation((url: string) => {
      if (url.includes("return-history/pending")) {
        return Promise.resolve({
          items: [
            {
              id: 9,
              code: "VDRMATCHED1",
              warehouse_name: "Kho A",
              status: "matched",
              status_label: "Đã khớp",
              error: "",
              created_at: "2026-07-01T00:00:00Z",
              matched_at: "2026-07-02T00:00:00Z",
              matched_order_code: "HD999",
              return_id: 42,
              note: "",
              lines: [{ product_id: 2, sku: "SKU-Y", qty: 4 }],
              sku_count: 1,
              qty: 4,
            },
          ],
        });
      }
      if (url.includes("return-history")) {
        return Promise.resolve({ items: [], total: 0, total_quantity: 0, limit: 50, offset: 0 });
      }
      return Promise.resolve({ items: [] });
    });

    renderWithClient(
      <ReturnTab filters={filters} matchFilter="all" viewMode="order" pageSize={50} />,
    );

    await waitFor(() => expect(screen.getByText("HD999")).toBeInTheDocument());
    expect(screen.getByText("SKU-Y × 4")).toBeInTheDocument();
    // Cột "SL hoàn" của dòng pending ĐÃ khớp hiện tổng qty thay vì nút thao tác.
    const row = screen.getByText("HD999").closest("tr")!;
    expect(row).toHaveTextContent("4");
    expect(screen.queryByRole("button", { name: "Khớp" })).not.toBeInTheDocument();
  });

  it("dòng chờ khớp CHƯA khớp vẫn hiện nút thao tác ở cột SL hoàn", async () => {
    vi.mocked(http.fetchJson).mockImplementation((url: string) => {
      if (url.includes("return-history/pending")) {
        return Promise.resolve({
          items: [
            {
              id: 10,
              code: "VDRUNMATCHED1",
              warehouse_name: "Kho A",
              status: "pending",
              status_label: "Chờ khớp",
              error: "",
              created_at: "2026-07-01T00:00:00Z",
              matched_at: null,
              matched_order_code: "",
              return_id: null,
              note: "",
              lines: [],
              sku_count: 0,
              qty: 0,
            },
          ],
        });
      }
      if (url.includes("return-history")) {
        return Promise.resolve({ items: [], total: 0, total_quantity: 0, limit: 50, offset: 0 });
      }
      return Promise.resolve({ items: [] });
    });

    renderWithClient(
      <ReturnTab filters={filters} matchFilter="all" viewMode="order" pageSize={50} />,
    );

    await waitFor(() => expect(screen.getByText("VDRUNMATCHED1")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Khớp" })).toBeInTheDocument();
  });

  it("dòng lịch sử không còn bung bảng con khi bấm vào", async () => {
    vi.mocked(http.fetchJson).mockImplementation((url: string) => {
      if (url.includes("return-history/pending")) {
        return Promise.resolve({ items: [] });
      }
      if (url.includes("return-history")) {
        return Promise.resolve({
          items: [
            {
              return_id: 7,
              code: "PT001",
              source_order_id: 1,
              source_order_code: "DH001",
              source_order_invoice_code: "HD001",
              shipping_code: "VD001",
              warehouse_name: "Kho A",
              return_type: "return",
              return_type_label: "Hàng hoàn",
              qty_total: 3,
              note: "",
              created_at: "2026-07-01T00:00:00Z",
              lines: [{ product_id: 1, sku: "SKU-A", qty: 3 }],
            },
          ],
          total: 1,
          total_quantity: 3,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ items: [] });
    });

    renderWithClient(
      <ReturnTab filters={filters} matchFilter="all" viewMode="order" pageSize={50} />,
    );

    await waitFor(() => expect(screen.getByText("PT001")).toBeInTheDocument());
    const row = screen.getByText("PT001").closest("tr")!;
    expect(row.className).not.toContain("cursor-pointer");
    // Có quyền returns:approve → dòng lịch sử (đơn hoàn đã ghi sổ) có nút Huỷ.
    // Scope theo dòng: dòng mã quét đã khớp (khối chờ khớp) nay cũng có nút Huỷ.
    expect(within(row).getByRole("button", { name: "Huỷ" })).toBeInTheDocument();

    fireEvent.click(row);
    expect(screen.queryByText("Đang tải chi tiết…")).not.toBeInTheDocument();
    expect(http.fetchJson).not.toHaveBeenCalledWith(
      expect.stringContaining("return-history/lines"),
    );
  });
});
