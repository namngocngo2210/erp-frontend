import { describe, it, expect, vi, beforeEach } from "vitest";

// Bind cốt lõi của feature: mode=dispatch mới bị gate xác minh (409/503), mode=return
// KHÔNG bị gate (đơn hủy vẫn phải nhập hoàn được). Nếu một call site quên truyền mode,
// backend mặc định "dispatch" và chặn oan luồng nhập hoàn → khóa hành vi ở đây.
vi.mock("@/services/http", () => ({
  fetchJson: vi.fn(() => Promise.resolve({})),
}));
vi.mock("@/api/typed", () => ({ apiDelete: vi.fn() }));

import { fetchJson } from "@/services/http";
import { apiDelete } from "@/api/typed";
import { lookupByShippingCode } from "../scan-queries";
import {
  createPendingScans,
  deletePendingScan,
  listPendingScans,
  retryPendingScan,
} from "@/lib/api/pending-scans";

const mockFetchJson = vi.mocked(fetchJson);
const mockApiDelete = apiDelete as ReturnType<typeof vi.fn>;

function calledUrl(): string {
  return String(mockFetchJson.mock.calls[0][0]);
}

describe("lookupByShippingCode — mode đi vào URL", () => {
  beforeEach(() => {
    mockFetchJson.mockClear();
  });

  it('mode="dispatch" → &mode=dispatch', async () => {
    await lookupByShippingCode("SPX001", "dispatch");
    const url = calledUrl();
    expect(url).toContain("/api/orders/lookup-by-shipping-code");
    expect(url).toContain("code=SPX001");
    expect(url).toContain("mode=dispatch");
  });

  it('mode="return" → &mode=return (không dính gate xác minh)', async () => {
    await lookupByShippingCode("SPX002", "return");
    const url = calledUrl();
    expect(url).toContain("mode=return");
    expect(url).not.toContain("mode=dispatch");
  });

  it("không truyền mode → mặc định dispatch (fail-closed)", async () => {
    await lookupByShippingCode("SPX003");
    expect(calledUrl()).toContain("mode=dispatch");
  });

  it("mã có ký tự đặc biệt vẫn được encode và mode vẫn còn", async () => {
    await lookupByShippingCode("A B&C", "return");
    const url = calledUrl();
    expect(url).toContain("code=A%20B%26C");
    expect(url).toContain("mode=return");
  });

  // Cửa khoá triển khai (shipping_lookup_view.py): chỉ mode=dispatch mới gửi
  // invoice_match=1 — đây LÀ bundle mới nên luôn gửi cờ này cho dispatch; mode
  // return/return_scan không liên quan tới khớp mã hoá đơn nên không gửi.
  it('mode="dispatch" → kèm invoice_match=1', async () => {
    await lookupByShippingCode("SPX004", "dispatch");
    expect(calledUrl()).toContain("invoice_match=1");
  });

  it("không truyền mode (mặc định dispatch) → cũng kèm invoice_match=1", async () => {
    await lookupByShippingCode("SPX005");
    expect(calledUrl()).toContain("invoice_match=1");
  });

  it('mode="return" → KHÔNG gửi invoice_match', async () => {
    await lookupByShippingCode("SPX006", "return");
    expect(calledUrl()).not.toContain("invoice_match");
  });

  it('mode="return_scan" → KHÔNG gửi invoice_match', async () => {
    await lookupByShippingCode("SPX007", "return_scan");
    expect(calledUrl()).not.toContain("invoice_match");
  });
});

describe("pending-scans api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listPendingScans defaults limit/offset and omits status (BE mặc định pending+failed)", async () => {
    mockFetchJson.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    await listPendingScans();
    expect(mockFetchJson).toHaveBeenCalledWith("/api/inventory/pending-scans?limit=50&offset=0");
  });

  it("listPendingScans forwards extra filters (kind/status) and overrides limit/offset", async () => {
    mockFetchJson.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 40 });
    await listPendingScans({ kind: "dispatch", status: "matched", limit: "20", offset: "40" });
    expect(mockFetchJson).toHaveBeenCalledWith(
      "/api/inventory/pending-scans?limit=20&offset=40&kind=dispatch&status=matched",
    );
  });

  it("createPendingScans posts to the batch endpoint with the payload", async () => {
    mockFetchJson.mockResolvedValue({ results: [{ code: "A1", ok: true }] });
    const payload = {
      kind: "dispatch" as const,
      warehouse_id: 1,
      return_type: "" as const,
      codes: ["A1"],
    };
    const res = await createPendingScans(payload);
    expect(mockFetchJson).toHaveBeenCalledWith("/api/inventory/pending-scans/batch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    expect(res).toEqual({ results: [{ code: "A1", ok: true }] });
  });

  it("retryPendingScan posts to the retry endpoint with no body", async () => {
    mockFetchJson.mockResolvedValue({ id: 3, status: "pending" });
    const res = await retryPendingScan(3);
    expect(mockFetchJson).toHaveBeenCalledWith("/api/inventory/pending-scans/3/retry", {
      method: "POST",
    });
    expect(res).toEqual({ id: 3, status: "pending" });
  });

  it("deletePendingScan calls the typed apiDelete wrapper with the row id", async () => {
    mockApiDelete.mockResolvedValue(undefined);
    await deletePendingScan(9);
    expect(mockApiDelete).toHaveBeenCalledWith("/api/inventory/pending-scans/9");
  });
});
