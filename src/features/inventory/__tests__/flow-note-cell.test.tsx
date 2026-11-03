import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as http from "@/services/http";

import { AwaitingReturnTab } from "../components/AwaitingReturnTab";
import { IssueTab } from "../components/IssueTab";
import { FLOW_FILTERS, mockFlowHttp, renderWithClient } from "./flow-test-utils";

// Ghi chú tự do cho MỌI dòng của trang Lịch sử nhập xuất: dòng đơn xuất và dòng
// phiếu kho ở tab Xuất, dòng chờ hàng hoàn về. Ô ghi chú chỉ hiện dạng nhập khi
// có quyền `stock:edit` — thiếu quyền mà vẫn cho gõ thì người dùng mất chữ vừa
// viết khi BE trả 403.

vi.mock("@/services/http", async (orig) => {
  const actual = await orig<typeof import("@/services/http")>();
  return { ...actual, fetchJson: vi.fn() };
});

let canEdit = true;
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => (code: string) => (code === "stock:edit" ? canEdit : true),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

vi.mock("@/features/exports/ExportJobsProvider", () => ({
  useExportJobs: () => ({ startExport: vi.fn() }),
}));

const ORDER_ROW = {
  kind: "order",
  order_id: 42,
  order_code: "DH-42",
  invoice_code: "HD-42",
  shipping_code: "VD-42",
  doc_code: null,
  doc_id: null,
  warehouse_name: "Kho A",
  performed_by: "thu kho",
  note: "đóng thiếu 1",
  sku_count: 1,
  dispatched: 2,
  reversed: 0,
  net: 2,
  last_at: "2026-08-20T02:00:00Z",
  lines: [{ product_id: 5, sku: "SKU-1", qty: 2 }],
};

const DOC_ROW = {
  ...ORDER_ROW,
  kind: "document",
  order_id: null,
  order_code: null,
  invoice_code: null,
  shipping_code: null,
  doc_code: "PX-9",
  doc_id: 9,
  note: "phiếu bù đơn X",
};

const AWAITING_ROW = {
  order_id: 7,
  order_code: "DH-7",
  invoice_code: "HD-7",
  shipping_code: "VD-7",
  customer_name: "Khách A",
  warehouse_id: 1,
  warehouse_name: "Kho 1",
  cancelled_at: "2026-08-18T02:00:00Z",
  days_waiting: 5,
  status: "waiting" as const,
  closed_reason: "",
  closed_note: "",
  note: "khách hẹn trả 20/8",
  lines: [{ product_id: 5, sku: "SKU-1", qty: 2 }],
};

function issueTab() {
  return renderWithClient(
    <IssueTab filters={FLOW_FILTERS} matchFilter="all" viewMode="order" pageSize={50} />,
  );
}

describe("Ghi chú trên trang Lịch sử nhập xuất", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canEdit = true;
  });

  it("dòng đơn xuất có ô ghi chú sửa được, PATCH đúng target", async () => {
    mockFlowHttp({ dispatchHistory: { items: [ORDER_ROW] } });
    issueTab();

    const input = await screen.findByDisplayValue("đóng thiếu 1");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "đã bù hàng" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(http.fetchJson).toHaveBeenCalledWith("/api/inventory/flow-notes", {
        method: "PATCH",
        body: JSON.stringify({
          target_type: "order_dispatch",
          target_id: 42,
          note: "đã bù hàng",
        }),
      });
    });
  });

  it("dòng phiếu kho ghi thẳng vào phiếu (stock_document)", async () => {
    mockFlowHttp({ dispatchHistory: { items: [DOC_ROW] } });
    issueTab();

    const input = await screen.findByDisplayValue("phiếu bù đơn X");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "phiếu bù đơn Y" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(http.fetchJson).toHaveBeenCalledWith("/api/inventory/flow-notes", {
        method: "PATCH",
        body: JSON.stringify({
          target_type: "stock_document",
          target_id: 9,
          note: "phiếu bù đơn Y",
        }),
      });
    });
  });

  it("thiếu quyền stock:edit thì hiện chữ thường, không có ô nhập", async () => {
    canEdit = false;
    mockFlowHttp({ dispatchHistory: { items: [ORDER_ROW] } });
    issueTab();

    expect(await screen.findByText("đóng thiếu 1")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("đóng thiếu 1")).not.toBeInTheDocument();
  });

  it("tab Chờ hàng hoàn về có cột Ghi chú riêng của tab", async () => {
    vi.mocked(http.fetchJson).mockResolvedValue({ count: 1, results: [AWAITING_ROW] });
    renderWithClient(<AwaitingReturnTab warehouseIds={[]} pageSize={50} />);

    expect(await screen.findByRole("columnheader", { name: "Ghi chú" })).toBeInTheDocument();
    const input = await screen.findByDisplayValue("khách hẹn trả 20/8");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "khách hẹn trả 25/8" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(http.fetchJson).toHaveBeenCalledWith("/api/inventory/flow-notes", {
        method: "PATCH",
        body: JSON.stringify({
          target_type: "awaiting_return",
          target_id: 7,
          note: "khách hẹn trả 25/8",
        }),
      });
    });
  });
});
