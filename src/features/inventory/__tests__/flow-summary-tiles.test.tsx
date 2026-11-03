import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { FlowSummaryTiles } from "../components/FlowSummaryTiles";
import type { FlowFilters } from "../issue-history-queries";
import * as http from "@/services/http";
import { FLOW_FILTERS, renderWithClient } from "./flow-test-utils";

vi.mock("@/services/http", async (orig) => {
  const actual = await orig<typeof import("@/services/http")>();
  return { ...actual, fetchJson: vi.fn() };
});

const filters: FlowFilters = { ...FLOW_FILTERS, dateFrom: "2026-07-18", dateTo: "2026-07-18" };

describe("FlowSummaryTiles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hiện đủ tile tổng + chip ĐVVC với số đơn/SL", async () => {
    vi.mocked(http.fetchJson).mockResolvedValue({
      issue: {
        total_quantity: 1612,
        sale_quantity: 1500,
        doc_quantity: 62,
        transfer_quantity: 50,
        order_count: 1133,
      },
      return: {
        total_quantity: 40,
        return_quantity: 30,
        transfer_quantity: 10,
        return_count: 25,
      },
      carriers: [
        { label: "GHN", order_count: 700, quantity: 900 },
        { label: "GHTK", order_count: 300, quantity: 400 },
        { label: "Khác", order_count: 133, quantity: 200 },
      ],
    });

    renderWithClient(<FlowSummaryTiles filters={filters} tab="issue" />);

    await waitFor(() => expect(screen.getByText("Tổng SL xuất")).toBeInTheDocument());
    expect(screen.getByText("1.612")).toBeInTheDocument();
    expect(screen.getByText("Chuyển kho đi")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("Đơn đã xuất")).toBeInTheDocument();
    expect(screen.getByText("1.133")).toBeInTheDocument();
    // Tab Xuất KHÔNG hiện tile của tab Nhập.
    expect(screen.queryByText("Tổng SL nhập về")).not.toBeInTheDocument();
    // Chip ĐVVC.
    expect(screen.getByText("GHN")).toBeInTheDocument();
    expect(screen.getByText(/700 đơn · 900 sp/)).toBeInTheDocument();
    expect(screen.getByText("GHTK")).toBeInTheDocument();
    expect(screen.getByText("Khác")).toBeInTheDocument();
    // Gọi đúng endpoint với bộ lọc ngày.
    expect(vi.mocked(http.fetchJson).mock.calls[0][0]).toContain(
      "/api/inventory/dispatch-history/summary?date_from=2026-07-18&date_to=2026-07-18",
    );
  });

  it("tab Nhập hoàn hiện tile nhập, ẩn tile xuất + chip ĐVVC", async () => {
    vi.mocked(http.fetchJson).mockResolvedValue({
      issue: {
        total_quantity: 100,
        sale_quantity: 100,
        doc_quantity: 0,
        transfer_quantity: 0,
        order_count: 90,
      },
      return: {
        total_quantity: 40,
        return_quantity: 30,
        transfer_quantity: 10,
        return_count: 25,
      },
      carriers: [{ label: "GHN", order_count: 700, quantity: 900 }],
    });

    const { container } = renderWithClient(<FlowSummaryTiles filters={filters} tab="return" />);

    await waitFor(() => expect(within(container).getByText("Tổng SL nhập về")).toBeInTheDocument());
    expect(within(container).getByText("40")).toBeInTheDocument();
    expect(within(container).getByText("Hoàn theo đơn")).toBeInTheDocument();
    expect(within(container).getByText("Chuyển kho đến")).toBeInTheDocument();
    expect(within(container).getByText("Nhóm đơn hoàn")).toBeInTheDocument();
    expect(within(container).queryByText("Tổng SL xuất")).not.toBeInTheDocument();
    expect(within(container).queryByText("Theo ĐVVC")).not.toBeInTheDocument();
  });

  it("không có ĐVVC nào thì ẩn hàng chip", async () => {
    vi.mocked(http.fetchJson).mockResolvedValue({
      issue: {
        total_quantity: 0,
        sale_quantity: 0,
        doc_quantity: 0,
        transfer_quantity: 0,
        order_count: 0,
      },
      return: { total_quantity: 0, return_quantity: 0, transfer_quantity: 0, return_count: 0 },
      carriers: [],
    });

    const { container } = renderWithClient(<FlowSummaryTiles filters={filters} tab="issue" />);

    await waitFor(() => expect(within(container).getByText("Tổng SL xuất")).toBeInTheDocument());
    expect(within(container).queryByText("Theo ĐVVC")).not.toBeInTheDocument();
  });
});
