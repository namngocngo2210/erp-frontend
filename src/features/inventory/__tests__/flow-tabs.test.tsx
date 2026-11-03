import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/http", async (orig) => {
  const actual = await orig<typeof import("@/services/http")>();
  return { ...actual, fetchJson: vi.fn() };
});

// ReturnTab đọc quyền returns:approve cho nút Huỷ — mock cho phép hết (dòng chuyển
// kho vẫn KHÔNG có nút vì gate theo return_id, không theo quyền).
vi.mock("@/hooks/usePermission", () => ({ usePermission: () => () => true }));

vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

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

import { IssueTab } from "../components/IssueTab";
import { ReturnTab } from "../components/ReturnTab";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { I18nProvider } from "@/i18n";
import * as http from "@/services/http";
import { FLOW_FILTERS, mockFlowHttp, renderWithClient } from "./flow-test-utils";

function renderIssueTab() {
  return renderWithClient(
    <IssueTab filters={FLOW_FILTERS} matchFilter="all" viewMode="order" pageSize={50} />,
  );
}

function renderReturnTab() {
  return renderWithClient(
    <I18nProvider>
      <ConfirmProvider>
        <ReturnTab filters={FLOW_FILTERS} matchFilter="all" viewMode="order" pageSize={50} />
      </ConfirmProvider>
    </I18nProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// IssueTab — ca prod 84859721026220: dòng mã quét ĐÃ KHỚP render cụm nút thao tác
// (thu về "—" khi hết thao tác) ngay dưới header "SL xuất" → kho đọc thành "xuất
// nhưng trừ tồn 0" dù sổ đã trừ. Tách cột Thao tác riêng (đồng bộ tab Nhập hoàn)
// và ô SL xuất của dòng đã khớp phải hiện SL thật.
// ---------------------------------------------------------------------------

const issueMatchedScan = {
  id: 9,
  code: "84859721026220",
  warehouse_name: "Đại Mỗ 1",
  status: "matched",
  status_label: "Đã khớp",
  performed_by: "Quang",
  error: "",
  created_at: "2026-08-04T09:10:00Z",
  matched_at: "2026-08-04T10:56:41Z",
  matched_order_code: "HDSPE_2606251NKVY8MV",
  return_id: null,
  note: "",
  lines: [{ product_id: 9, sku: "MSC06", qty: 1, gross: 1 }],
  sku_count: 1,
  qty: 1,
  needs_replacement_issue: false,
  can_unmatch: false,
};

const issueUnmatchedScan = {
  id: 10,
  code: "99999999999999",
  warehouse_name: "Đại Mỗ 1",
  status: "pending",
  status_label: "Chờ khớp",
  performed_by: "",
  error: "",
  created_at: "2026-08-04T09:10:00Z",
  matched_at: null,
  matched_order_code: "",
  return_id: null,
  note: "",
  lines: [],
  sku_count: 0,
  qty: 0,
  needs_replacement_issue: false,
  can_unmatch: false,
};

const issueHistoryRow = {
  kind: "order",
  order_id: 77,
  order_code: "DH077",
  invoice_code: "HD077",
  shipping_code: "VD077",
  doc_code: null,
  warehouse_name: "Kho A",
  performed_by: "",
  sku_count: 1,
  dispatched: 2,
  reversed: 0,
  net: 2,
  last_at: "2026-08-04T09:00:00Z",
  lines: [{ product_id: 1, sku: "SKU1", qty: 2, gross: 2 }],
};

describe("IssueTab — SL xuất của dòng mã quét", () => {
  it("dòng đã khớp hiện SL thật ở ô SL xuất, thao tác nằm ở cột Thao tác", async () => {
    mockFlowHttp({ dispatchPending: [issueMatchedScan] });
    renderIssueTab();

    await waitFor(() => expect(screen.getByText("84859721026220")).toBeInTheDocument());
    expect(screen.getByText("Thao tác")).toBeInTheDocument();
    const row = screen.getByText("84859721026220").closest("tr")!;
    const cells = row.querySelectorAll("td");
    // Ô SL xuất (ngay trước ô Thao tác) là CON SỐ, không phải nút/dấu gạch.
    const qtyCell = cells[cells.length - 2];
    expect(qtyCell.textContent).toBe("1");
    expect(qtyCell.querySelector("button")).toBeNull();
  });

  it("dòng chưa khớp: SL xuất hiện —, nút Khớp/Mã sai/Xóa ở cột Thao tác", async () => {
    mockFlowHttp({ dispatchPending: [issueUnmatchedScan] });
    renderIssueTab();

    await waitFor(() => expect(screen.getByText("99999999999999")).toBeInTheDocument());
    const row = screen.getByText("99999999999999").closest("tr")!;
    const cells = row.querySelectorAll("td");
    const qtyCell = cells[cells.length - 2];
    expect(qtyCell.textContent).toBe("—");
    expect(qtyCell.querySelector("button")).toBeNull();
    const actionCell = cells[cells.length - 1];
    expect(actionCell.textContent).toContain("Khớp");
    expect(actionCell.textContent).toContain("Xóa");
  });

  it("dòng lịch sử đơn đã xuất vẫn thẳng hàng: SL xuất là số, ô Thao tác trống", async () => {
    mockFlowHttp({ dispatchHistory: { items: [issueHistoryRow] } });
    renderIssueTab();

    await waitFor(() => expect(screen.getByText("VD077")).toBeInTheDocument());
    const row = screen.getByText("VD077").closest("tr")!;
    const cells = row.querySelectorAll("td");
    expect(cells[cells.length - 2].textContent).toBe("2");
    expect(cells[cells.length - 1].textContent).toBe("—");
  });
});

// ---------------------------------------------------------------------------
// Cột "Thao tác" tab Nhập hoàn: (1) nút của dòng chờ khớp (Khớp/Mã sai/Xóa) phải
// nằm Ở CỘT THAO TÁC — trước đây nằm trong ô SL hoàn nên bảng bị lệch cột;
// (2) dòng ĐÃ khớp (đơn hoàn đã ghi sổ qua bảng chờ) phải có nút Điều chỉnh SL.
// ---------------------------------------------------------------------------

const returnMatchedScan = {
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
};

const returnUnmatchedScan = {
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
};

describe("ReturnTab — cột Thao tác thẳng hàng", () => {
  it("nút Khớp/Mã sai/Xóa của dòng chưa khớp nằm ở Ô CUỐI (cột Thao tác), SL hoàn hiện —", async () => {
    mockFlowHttp({ returnPending: [returnUnmatchedScan] });
    renderReturnTab();

    await waitFor(() => expect(screen.getByText("VDRUNMATCHED1")).toBeInTheDocument());
    const row = screen.getByText("VDRUNMATCHED1").closest("tr")!;
    const cells = row.querySelectorAll("td");
    const lastCell = cells[cells.length - 1];
    expect(lastCell.querySelector("button")).not.toBeNull();
    expect(lastCell.textContent).toContain("Khớp");
    // Ô SL hoàn (ngay trước ô Thao tác) không còn chứa nút — hiện "—".
    const qtyCell = cells[cells.length - 2];
    expect(qtyCell.querySelector("button")).toBeNull();
    expect(qtyCell.textContent).toBe("—");
  });

  it("số ô của dòng chưa khớp = số cột header (không lệch cột)", async () => {
    mockFlowHttp({ returnPending: [returnUnmatchedScan] });
    renderReturnTab();

    await waitFor(() => expect(screen.getByText("VDRUNMATCHED1")).toBeInTheDocument());
    const headerCount = screen.getAllByRole("columnheader").length;
    const row = screen.getByText("VDRUNMATCHED1").closest("tr")!;
    expect(row.querySelectorAll("td")).toHaveLength(headerCount);
  });
});

describe("ReturnTab — Điều chỉnh SL cho dòng đã khớp qua bảng chờ", () => {
  it("dòng matched có return_id hiện nút Điều chỉnh ở cột Thao tác", async () => {
    mockFlowHttp({ returnPending: [returnMatchedScan] });
    renderReturnTab();

    await waitFor(() => expect(screen.getByText("HD999")).toBeInTheDocument());
    const row = screen.getByText("HD999").closest("tr")!;
    const cells = row.querySelectorAll("td");
    const lastCell = cells[cells.length - 1];
    expect(lastCell.textContent).toContain("Điều chỉnh");
  });

  it("bấm Điều chỉnh mở dialog với dòng hàng, lưu → POST adjust đúng return_id", async () => {
    mockFlowHttp({ returnPending: [returnMatchedScan] });
    renderReturnTab();

    await waitFor(() => expect(screen.getByText("HD999")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Điều chỉnh" }));

    const qty = (await screen.findByLabelText("Số lượng SKU-Y")) as HTMLInputElement;
    expect(qty.value).toBe("4");
    fireEvent.change(qty, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Lưu điều chỉnh/ }));

    await waitFor(() =>
      expect(http.fetchJson).toHaveBeenCalledWith(
        "/api/inventory/returns/42/adjust",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const call = vi
      .mocked(http.fetchJson)
      .mock.calls.find(([url]) => String(url).includes("/adjust"))!;
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({
      lines: [{ product_id: 2, quantity: 1 }],
    });
  });
});

describe("ReturnTab — Huỷ đơn hoàn ngay trên dòng đã khớp qua bảng chờ", () => {
  it("dòng matched có return_id hiện nút Huỷ cạnh Điều chỉnh", async () => {
    mockFlowHttp({ returnPending: [returnMatchedScan] });
    renderReturnTab();

    await waitFor(() => expect(screen.getByText("HD999")).toBeInTheDocument());
    const row = screen.getByText("HD999").closest("tr")!;
    const cells = row.querySelectorAll("td");
    const lastCell = cells[cells.length - 1];
    expect(lastCell.textContent).toContain("Huỷ");
  });

  it("bấm Huỷ + xác nhận → POST cancel đúng return_id", async () => {
    mockFlowHttp({ returnPending: [returnMatchedScan] });
    renderReturnTab();

    await waitFor(() => expect(screen.getByText("HD999")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Huỷ đơn hoàn" }));

    await waitFor(() =>
      expect(http.fetchJson).toHaveBeenCalledWith(
        "/api/inventory/returns/42/cancel",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("bấm Huỷ nhưng không xác nhận → không POST cancel", async () => {
    mockFlowHttp({ returnPending: [returnMatchedScan] });
    renderReturnTab();

    await waitFor(() => expect(screen.getByText("HD999")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    const cancelCalls = vi
      .mocked(http.fetchJson)
      .mock.calls.filter(([url]) => String(url).includes("/cancel"));
    expect(cancelCalls).toHaveLength(0);
  });
});

describe("Phiếu chuyển kho trên Lịch sử nhập xuất", () => {
  it("tab Xuất hiện dòng chuyển kho (kho nguồn → kho đích) + footer breakdown", async () => {
    mockFlowHttp({
      dispatchHistory: {
        items: [
          {
            kind: "transfer",
            order_id: null,
            order_code: null,
            invoice_code: null,
            shipping_code: null,
            doc_code: "CK-DOC1",
            warehouse_name: "Kho Nguồn → Kho Đích",
            performed_by: "Kế Toán",
            sku_count: 1,
            dispatched: 7,
            reversed: 0,
            net: 7,
            last_at: "2026-07-16T00:00:00Z",
            lines: [{ product_id: 1, sku: "MSC06", qty: 7 }],
          },
        ],
        total: 1,
        total_quantity: 7,
        sale_quantity: 0,
        doc_quantity: 0,
        transfer_quantity: 7,
        limit: 50,
        offset: 0,
      },
    });

    renderIssueTab();

    await waitFor(() => expect(screen.getByText("Phiếu chuyển kho CK-DOC1")).toBeInTheDocument());
    expect(screen.getByText("Kho Nguồn → Kho Đích")).toBeInTheDocument();
    expect(screen.getByText(/theo đơn 0 \+ phiếu kho 0 \+ chuyển kho 7 =/)).toBeInTheDocument();
  });

  it("tab Nhập hoàn hiện dòng chuyển kho, không có nút Điều chỉnh/Huỷ", async () => {
    mockFlowHttp({
      returnHistory: {
        items: [
          {
            kind: "transfer",
            return_id: null,
            code: "CK-DOC1",
            source_order_id: null,
            source_order_code: null,
            source_order_invoice_code: null,
            shipping_code: null,
            warehouse_name: "Kho Nguồn → Kho Đích",
            performed_by: "Kế Toán",
            return_type: "",
            return_type_label: "Chuyển kho",
            lines: [{ product_id: 1, sku: "MSC06", qty: 7 }],
            qty_total: 7,
            note: "chuyển bổ sung",
            created_at: "2026-07-16T00:00:00Z",
          },
        ],
        total: 1,
        total_quantity: 7,
        return_quantity: 0,
        transfer_quantity: 7,
        limit: 50,
        offset: 0,
      },
    });

    renderReturnTab();

    await waitFor(() => expect(screen.getByText("CK-DOC1")).toBeInTheDocument());
    expect(screen.getByText("Chuyển kho")).toBeInTheDocument();
    expect(screen.getByText(/hoàn 0 \+ chuyển kho\s*7 =/)).toBeInTheDocument();
    // Dòng chuyển kho không phải nhóm đơn hoàn → không có hành động sửa/huỷ.
    expect(screen.queryByRole("button", { name: "Điều chỉnh" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Huỷ" })).not.toBeInTheDocument();
  });
});
