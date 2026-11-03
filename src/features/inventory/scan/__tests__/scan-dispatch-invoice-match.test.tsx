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
  lookupOutcomes,
  manualDispatchCalls,
  order,
  postHandlers,
  renderScanDialog,
  resetScanHttp,
  scan,
} from "./scan-test-utils";

// Task 7 — dòng khớp bằng MÃ HOÁ ĐƠN (matched_by: "invoice") phải trừ tồn ở kho
// CỦA ĐƠN (fulfillment_warehouse_id), không phải kho đang chọn ở đầu màn hình.
// Dialog chọn "Kho A" (id=1) ở mọi test dưới đây — order dùng "Kho B" (id=2) để
// chứng minh dispatch không lẫn kho.

function renderDialog() {
  return renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
}

async function renderDialogWithScanWarehouse() {
  renderDialog();
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByRole("option", { name: "Kho A" }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetScanHttp();
});

describe("ScanDispatchDialog — dòng khớp mã hoá đơn hiện rõ kho CỦA ĐƠN ngay lúc quét", () => {
  it("có kho xuất trên đơn → badge nêu tên kho của đơn (khác kho màn quét)", async () => {
    lookupOutcomes.set(
      "HD-INV-01",
      order(1, "HD-INV-01", { matched_by: "invoice", fulfillment_warehouse_id: 2 }),
    );
    renderDialog();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "HD-INV-01");

    await screen.findByText("HD-INV-01");
    expect(await screen.findByText(/Khớp mã hoá đơn.*Kho B/)).toBeInTheDocument();
  });

  it("thiếu kho xuất trên đơn → badge đỏ báo ngay lúc quét, trước khi bấm Xác nhận", async () => {
    lookupOutcomes.set(
      "HD-INV-02",
      order(2, "HD-INV-02", { matched_by: "invoice", fulfillment_warehouse_id: null }),
    );
    renderDialog();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "HD-INV-02");

    await screen.findByText("HD-INV-02");
    expect(await screen.findByText(/Khớp mã hoá đơn.*thiếu kho xuất/)).toBeInTheDocument();
  });
});

describe("ScanDispatchDialog — Xác nhận: đơn khớp mã hoá đơn đi qua endpoint xuất kho tay, đúng kho của đơn", () => {
  it("gọi POST /api/inventory/orders/dispatch với warehouse_id CỦA ĐƠN, không phải kho màn quét", async () => {
    lookupOutcomes.set(
      "HD-INV-10",
      order(10, "HD-INV-10", {
        matched_by: "invoice",
        fulfillment_warehouse_id: 2,
        items: [{ product_id: 1, sku: "SKU1", name: "SP 1", quantity: 3 }],
      }),
    );
    postHandlers.manualDispatch = () => Promise.resolve({ confirmed: [10], skipped: [] });

    const user = await renderDialogWithScanWarehouse();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "HD-INV-10");
    await screen.findByText("HD-INV-10");

    await user.click(screen.getByRole("button", { name: /Xác nhận xuất kho/ }));

    await waitFor(() => expect(manualDispatchCalls).toHaveLength(1));
    expect(manualDispatchCalls[0]).toEqual({ order_ids: [10], warehouse_id: 2 });

    // toast.success cũng bắn lúc quét xong ("Đã quét xong mã vận đơn ...") — lấy
    // lượt gọi CUỐI (toast tổng kết sau khi bấm Xác nhận).
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const calls = vi.mocked(toast.success).mock.calls;
    expect(String(calls[calls.length - 1][0])).toContain("Đã xuất kho 1/1 đơn");
  });

  it("nhiều đơn khớp hoá đơn cùng kho → gộp 1 lần gọi cho cả nhóm", async () => {
    lookupOutcomes.set(
      "HD-INV-20",
      order(20, "HD-INV-20", { matched_by: "invoice", fulfillment_warehouse_id: 2 }),
    );
    lookupOutcomes.set(
      "HD-INV-21",
      order(21, "HD-INV-21", { matched_by: "invoice", fulfillment_warehouse_id: 2 }),
    );
    postHandlers.manualDispatch = (body) =>
      Promise.resolve({
        confirmed: (body as { order_ids: number[] }).order_ids,
        skipped: [],
      });

    const user = await renderDialogWithScanWarehouse();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "HD-INV-20");
    await screen.findByText("HD-INV-20");
    scan(input, "HD-INV-21");
    await screen.findByText("HD-INV-21");

    await user.click(screen.getByRole("button", { name: /Xác nhận xuất kho/ }));

    await waitFor(() => expect(manualDispatchCalls).toHaveLength(1));
    expect(new Set(manualDispatchCalls[0].order_ids)).toEqual(new Set([20, 21]));
    expect(manualDispatchCalls[0].warehouse_id).toBe(2);
  });

  it("đơn thiếu kho xuất → KHÔNG gọi API nào, báo lỗi đúng câu của cron", async () => {
    lookupOutcomes.set(
      "HD-INV-30",
      order(30, "HD-INV-30", { matched_by: "invoice", fulfillment_warehouse_id: null }),
    );

    const user = await renderDialogWithScanWarehouse();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "HD-INV-30");
    await screen.findByText("HD-INV-30");

    await user.click(screen.getByRole("button", { name: /Xác nhận xuất kho/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(manualDispatchCalls).toHaveLength(0);
    const call = vi
      .mocked(toast.error)
      .mock.calls.find((c) =>
        String((c[1] as { description?: string })?.description ?? "").includes(
          "bổ sung kho trên đơn rồi quét lại",
        ),
      );
    expect(call).toBeTruthy();
  });

  it("lô hỗn hợp: 1 dòng khớp mã vận đơn (kho màn quét) + 1 dòng khớp hoá đơn (kho của đơn) → cả 2 đường cùng chạy", async () => {
    lookupOutcomes.set("SPX-SHIP-1", order(40, "SPX-SHIP-1", { matched_by: "shipping" }));
    lookupOutcomes.set(
      "HD-INV-41",
      order(41, "HD-INV-41", { matched_by: "invoice", fulfillment_warehouse_id: 2 }),
    );
    postHandlers.dispatchBatch = (body) =>
      Promise.resolve({
        results: (body as { order_ids: number[] }).order_ids.map((id) => ({
          order_id: id,
          ok: true,
        })),
      });
    postHandlers.manualDispatch = (body) =>
      Promise.resolve({
        confirmed: (body as { order_ids: number[] }).order_ids,
        skipped: [],
      });

    const user = await renderDialogWithScanWarehouse();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "SPX-SHIP-1");
    await screen.findByText("SPX-SHIP-1");
    scan(input, "HD-INV-41");
    await screen.findByText("HD-INV-41");

    await user.click(screen.getByRole("button", { name: /Xác nhận xuất kho/ }));

    await waitFor(() => expect(manualDispatchCalls).toHaveLength(1));
    expect(manualDispatchCalls[0]).toEqual({ order_ids: [41], warehouse_id: 2 });

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const calls = vi.mocked(toast.success).mock.calls;
    expect(String(calls[calls.length - 1][0])).toContain("Đã xuất kho 2/2 đơn");
  });
});

// Fix round 1 (review): 2 finding Important.
// (1) skip reason "already_dispatched" của endpoint Task 1 KHÔNG phải lỗi — quét lại
//     1 kiện đã xuất là chuyện thường ngày (idempotent), phải rơi vào ĐÚNG cảnh báo
//     hổ phách mà nhánh shipping/recall đã dùng cho cùng tình huống, không phải danh
//     sách đỏ "đơn không xuất kho được".
// (2) useManualDispatch (Task 5) tự bắn toast success/warning/error riêng trong
//     onSuccess/onError — ScanDispatchDialog là TIẾNG NÓI DUY NHẤT (dispatchBatch/
//     createPendingScans không tự toast), nên phải gọi hook ở chế độ `silent: true`
//     để không chồng/ngược dấu với toast tổng kết của dialog.
describe("ScanDispatchDialog — Task 7 fix round 1: already_dispatched không phải lỗi, hook không tự bắn toast", () => {
  it("invoice-matched đã xuất trước đó → cảnh báo hổ phách giống shipping/recall, KHÔNG vào danh sách lỗi, KHÔNG bíp/toast trùng từ hook", async () => {
    lookupOutcomes.set(
      "HD-INV-60",
      order(60, "HD-INV-60", { matched_by: "invoice", fulfillment_warehouse_id: 2 }),
    );
    postHandlers.manualDispatch = () =>
      Promise.resolve({
        confirmed: [],
        skipped: [{ order_id: 60, reason: "already_dispatched" }],
      });

    const user = await renderDialogWithScanWarehouse();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "HD-INV-60");
    await screen.findByText("HD-INV-60");

    await user.click(screen.getByRole("button", { name: /Xác nhận xuất kho/ }));

    await waitFor(() => expect(manualDispatchCalls).toHaveLength(1));

    // KHÔNG rơi vào danh sách lỗi đỏ "N đơn không xuất kho được".
    const errorCalls = vi.mocked(toast.error).mock.calls;
    expect(errorCalls.some((c) => String(c[0]).includes("không xuất kho được"))).toBe(false);

    // CÓ cảnh báo hổ phách đúng nhánh already_dispatched dùng chung với shipping/recall
    // (ScanDispatchDialog.tsx — khối `alreadyDispatched`), nêu tên đơn.
    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    const summaryWarning = vi
      .mocked(toast.warning)
      .mock.calls.find((c) => String(c[0]).includes("đã xuất kho trước đó"));
    expect(summaryWarning).toBeTruthy();
    expect(String((summaryWarning?.[1] as { description?: string })?.description)).toContain(
      "DH60",
    );

    // Hook (silent: true) KHÔNG được tự bắn toast bare riêng của nó — nếu còn, nghĩa
    // là 1 sự kiện bắn ra 2 toast (finding 2 tái phát).
    const bareHookToast = vi
      .mocked(toast.warning)
      .mock.calls.find((c) => c[0] === "Đơn đã được xuất kho trước đó.");
    expect(bareHookToast).toBeUndefined();
    expect(toast.success).not.toHaveBeenCalledWith("Đã xuất kho.");

    // dispatchedOk tính đơn này là THÀNH CÔNG (ok:true) → toast tổng kết "1/1", không
    // phải "0/1".
    const successCalls = vi.mocked(toast.success).mock.calls;
    expect(String(successCalls[successCalls.length - 1][0])).toContain("Đã xuất kho 1/1 đơn");
  });

  it("invoice-matched xuất thành công → CHỈ 2 toast.success trong toàn luồng (lúc quét + tổng kết cuối) — hook không thêm toast thứ 3", async () => {
    lookupOutcomes.set(
      "HD-INV-70",
      order(70, "HD-INV-70", { matched_by: "invoice", fulfillment_warehouse_id: 2 }),
    );
    postHandlers.manualDispatch = () => Promise.resolve({ confirmed: [70], skipped: [] });

    const user = await renderDialogWithScanWarehouse();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "HD-INV-70");
    await screen.findByText("HD-INV-70");

    await user.click(screen.getByRole("button", { name: /Xác nhận xuất kho/ }));

    await waitFor(() => expect(manualDispatchCalls).toHaveLength(1));
    await waitFor(() => {
      const calls = vi.mocked(toast.success).mock.calls;
      expect(calls[calls.length - 1]?.[0]).toContain("Đã xuất kho 1/1 đơn");
    });

    const successCalls = vi.mocked(toast.success).mock.calls;
    expect(successCalls).toHaveLength(2);
    expect(String(successCalls[0][0])).toContain("Đã quét xong");
    expect(String(successCalls[1][0])).toContain("Đã xuất kho 1/1 đơn");
  });
});
