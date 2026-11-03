import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

vi.mock("../scan-sound", () => ({
  beepError: vi.fn(),
  beepSuccess: vi.fn(),
}));

vi.mock("@/services/http", async () => {
  const { scanFetchJson } = await import("./scan-test-utils");
  return { fetchJson: vi.fn(scanFetchJson) };
});

import { toast } from "sonner";

import { ScanDispatchDialog } from "../ScanDispatchDialog";
import {
  lookups,
  lookupOutcomes,
  postHandlers,
  resetScanHttp,
  order,
  renderScanDialog,
  scan,
} from "./scan-test-utils";

function renderDialog() {
  return renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetScanHttp();
});

describe("ScanDispatchDialog — 2 lookup chồng nhau không nuốt row của nhau", () => {
  // Lookup treo theo mã — test chủ động resolve từng mã theo thứ tự bất kỳ để
  // giả lập 2 lượt quét súng chồng nhau (B resolve trước A).
  it("quét A rồi B, B resolve trước A → cả 2 dòng đều còn", async () => {
    renderDialog();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPX001");
    scan(input, "SPX002");

    // B (quét sau) resolve trước → dòng SPX002 vào bảng trước.
    lookups.get("SPX002")!.resolve(order(2, "SPX002"));
    await screen.findByText("SPX002");

    // A resolve sau — closure của A không được phép ghi đè mất dòng SPX002.
    lookups.get("SPX001")!.resolve(order(1, "SPX001"));
    await screen.findByText("SPX001");

    expect(screen.queryByText("SPX001")).toBeTruthy();
    expect(screen.queryByText("SPX002")).toBeTruthy();
  });
});

describe("ScanDispatchDialog — trùng đơn qua 2 mã vận đơn khác nhau, resolve chồng nhau", () => {
  // 6.12 — pushRow trước đây check trùng dựa trên biến `rows` đóng gói ở lần render tạo
  // ra pushRow (snapshot cũ), chỉ việc THÊM row mới dùng functional updater. Quét 2 mã
  // vận đơn KHÁC NHAU của CÙNG 1 đơn (multi-kiện), lượt sau resolve trong lúc lượt trước
  // chưa kịp re-render, phải vẫn được nhận diện là trùng đơn (addDispatchScanRow so theo
  // order_id) — không được âm thầm thêm 2 dòng cho cùng 1 đơn.
  it("mã thứ 2 (cùng đơn) resolve sau vẫn bị nhận là trùng — chỉ 1 dòng, có toast trùng đơn", async () => {
    renderDialog();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXM01");
    scan(input, "SPXM02");

    // Mã 2 resolve trước.
    lookups.get("SPXM02")!.resolve(order(9, "SPXM02"));
    await screen.findByText("SPXM02");

    // Mã 1 (cùng order_id=9) resolve ngay sau — phải bị nhận diện trùng đơn dù rows
    // closure ở thời điểm handleScan("SPXM01") bắt đầu còn là mảng rỗng.
    lookups.get("SPXM01")!.resolve(order(9, "SPXM01"));

    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    expect(String(vi.mocked(toast.warning).mock.calls[0][0])).toContain("DH9");

    // Chỉ 1 dòng cho đơn DH9 — mã SPXM01 (trùng) không được thêm dòng riêng.
    expect(screen.queryByText("SPXM02")).toBeInTheDocument();
    expect(screen.queryByText("SPXM01")).toBeNull();
  });
});

describe("ScanDispatchDialog — đơn đã xuất kho quét lại", () => {
  // Đơn đã xuất kho quét lại phải được BÁO, ở cả hai lớp:
  //  1. Lúc quét — lookup trả already_dispatched → không thêm dòng, toast cảnh báo.
  //  2. Lúc Xác nhận — backend trả warning "already_dispatched" (2 người quét cùng lúc,
  //     hoặc quét xong vài phút mới bấm) → toast cảnh báo thay vì dấu ✓ chung.
  beforeEach(() => {
    // SPXDONE: backend đã biết đơn xuất rồi. SPXNEW: đơn chưa xuất.
    lookupOutcomes.set(
      "SPXDONE",
      order(1, "SPXDONE", {
        already_dispatched: true,
        items: [{ product_id: 1, sku: "SKU1", name: "SP 1", quantity: 1 }],
      }),
    );
    lookupOutcomes.set(
      "SPXNEW",
      order(2, "SPXNEW", {
        items: [{ product_id: 2, sku: "SKU2", name: "SP 2", quantity: 1 }],
      }),
    );
    postHandlers.dispatchBatch = (body) =>
      Promise.resolve({
        // Đơn 2 vừa bị người khác xuất xong giữa lúc quét và lúc bấm Xác nhận.
        results: (body as { order_ids: number[] }).order_ids.map((id) => ({
          order_id: id,
          ok: true,
          warnings: ["already_dispatched"],
        })),
      });
  });

  it("lookup báo already_dispatched → không thêm dòng và cảnh báo rõ", async () => {
    renderDialog();

    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "SPXDONE");

    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    expect(String(vi.mocked(toast.warning).mock.calls[0][0])).toContain("đã xuất kho trước đó");
    // Không có dòng nào được thêm → nút vẫn đếm 0, bảng vẫn rỗng.
    expect(screen.getByText("Chưa quét đơn nào.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Xác nhận xuất kho \(0\)/ })).toBeTruthy();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("backend cảnh báo already_dispatched lúc Xác nhận → nêu tên đơn, không im lặng", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Kho A" }));

    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "SPXNEW");
    // Bảng hiển thị theo MÃ VẬN ĐƠN (không có cột mã đơn) — chờ dòng xuất hiện.
    await screen.findByText("SPXNEW");

    await user.click(screen.getByRole("button", { name: /Xác nhận xuất kho/ }));

    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    const [message, opts] = vi.mocked(toast.warning).mock.calls[0];
    expect(String(message)).toContain("1 đơn đã xuất kho trước đó");
    expect(String((opts as { description?: string })?.description)).toContain("DH2");
  });
});
