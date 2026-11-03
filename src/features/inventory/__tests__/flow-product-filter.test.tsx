import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/http", async (orig) => {
  const actual = await orig<typeof import("@/services/http")>();
  return { ...actual, fetchJson: vi.fn() };
});

vi.mock("@/hooks/usePermission", () => ({ usePermission: () => () => true }));

vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

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

import * as http from "@/services/http";

import DispatchHistoryPage from "../pages/DispatchHistoryPage";
import { renderWithClient } from "./flow-test-utils";

// Catalog prod có >2.000 SP đang bán; SKU cần tìm nằm NGOÀI 1.000 bản ghi đầu
// (thứ tự BE là order_by name) — ca thật: gõ "tms" ra "Không có dữ liệu".
const CATALOG_SIZE = 1_500;
const TARGET_INDEX = 1_200;

const CATALOG = Array.from({ length: CATALOG_SIZE }, (_, i) =>
  i === TARGET_INDEX
    ? { id: 3715, sku: "TMS01", name: "Thảm massage TMS01" }
    : { id: i + 1, sku: `SKU${String(i).padStart(4, "0")}`, name: `San pham ${i}` },
);

function mockHttp() {
  vi.mocked(http.fetchJson).mockImplementation((url: string) => {
    const u = String(url);
    if (u.includes("/orders/products")) {
      const params = new URLSearchParams(u.split("?")[1] ?? "");
      const limit = Number(params.get("limit") ?? "0");
      const offset = Number(params.get("offset") ?? "0");
      return Promise.resolve(CATALOG.slice(offset, offset + limit));
    }
    if (u.includes("/warehouses")) {
      return Promise.resolve({ items: [], total: 0 });
    }
    return Promise.resolve({ items: [], total: 0 });
  });
}

function productRequests(): string[] {
  return vi
    .mocked(http.fetchJson)
    .mock.calls.map((call) => String(call[0]))
    .filter((url) => url.includes("/orders/products"));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHttp();
});

describe("Lịch sử nhập xuất — bộ lọc sản phẩm", () => {
  it("tìm được SKU nằm ngoài 1.000 sản phẩm đầu của catalog", async () => {
    renderWithClient(<DispatchHistoryPage />);

    fireEvent.click(screen.getByText("Tất cả sản phẩm"));
    fireEvent.change(screen.getByPlaceholderText("Tìm..."), { target: { value: "tms" } });

    expect(await screen.findByText("TMS01")).toBeInTheDocument();
  });

  it("nạp catalog ở chế độ slim — không kéo theo gói/giá của từng SP", async () => {
    renderWithClient(<DispatchHistoryPage />);

    await screen.findByText("Tất cả sản phẩm");
    await waitFor(() => expect(productRequests().length).toBeGreaterThan(0));
    for (const url of productRequests()) {
      expect(url).toContain("slim=1");
    }
  });

  it("tìm được theo TÊN sản phẩm dù option chỉ hiện SKU", async () => {
    renderWithClient(<DispatchHistoryPage />);

    fireEvent.click(screen.getByText("Tất cả sản phẩm"));
    fireEvent.change(screen.getByPlaceholderText("Tìm..."), { target: { value: "thảm massage" } });

    await waitFor(() => expect(screen.getByText("TMS01")).toBeInTheDocument());
  });
});
