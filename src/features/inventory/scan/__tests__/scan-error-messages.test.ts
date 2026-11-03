import { describe, it, expect } from "vitest";

import {
  cancelledScanMessage,
  isCancelledOrder,
  INVOICE_STATUS_CANCELLED,
  ORDER_STATUS_CANCELLED,
} from "../scan-cancelled";
import { dispatchLookupErrorMessage, returnScanLookupErrorMessage } from "../scan-lookup-error";

describe("isCancelledOrder", () => {
  it("nhận diện đơn đã hủy theo status", () => {
    expect(isCancelledOrder({ status: ORDER_STATUS_CANCELLED, invoice_status: 1 })).toBe(true);
  });

  it("coi đơn có invoice_status=2 là đã hủy dù status chưa đổi", () => {
    expect(isCancelledOrder({ status: 2, invoice_status: INVOICE_STATUS_CANCELLED })).toBe(true);
  });

  it("đơn bình thường không bị coi là hủy", () => {
    expect(isCancelledOrder({ status: 2, invoice_status: 1 })).toBe(false);
  });

  it("không cờ nhầm đơn còn hiệu lực", () => {
    for (const status of [1, 2, 3, 4, 5]) {
      expect(isCancelledOrder({ status, invoice_status: null })).toBe(false);
    }
  });
});

describe("cancelledScanMessage", () => {
  it("nêu mã đơn trong thông báo", () => {
    expect(cancelledScanMessage({ order_code: "DH123" })).toContain("DH123");
    expect(cancelledScanMessage({ order_code: "DH123" })).toContain("đã hủy");
  });
});

describe("dispatchLookupErrorMessage", () => {
  it("409 + detail order_cancelled → câu tiếng Việt kèm mã đơn của backend", () => {
    expect(
      dispatchLookupErrorMessage(409, { detail: "order_cancelled", order_code: "DH1" }, "SPX1"),
    ).toBe("Đơn DH1 đã hủy — không thể xuất kho.");
  });

  it("409 + detail order_cancelled nhưng thiếu order_code → dùng mã vận đơn", () => {
    expect(dispatchLookupErrorMessage(409, { detail: "order_cancelled" }, "SPX1")).toBe(
      "Đơn SPX1 đã hủy — không thể xuất kho.",
    );
  });

  it("503 + detail verify_unavailable → câu KiotViet", () => {
    expect(dispatchLookupErrorMessage(503, { detail: "verify_unavailable" }, "SPX2")).toContain(
      "Chưa xác minh được đơn của mã SPX2 với KiotViet",
    );
  });

  it("503 hạ tầng (nginx, body rỗng) → null để caller hiện lỗi chung", () => {
    expect(dispatchLookupErrorMessage(503, null, "SPX3")).toBeNull();
    expect(dispatchLookupErrorMessage(503, undefined, "SPX3")).toBeNull();
    expect(dispatchLookupErrorMessage(503, { detail: "upstream timeout" }, "SPX3")).toBeNull();
  });

  it("409 vì lý do khác → null", () => {
    expect(dispatchLookupErrorMessage(409, { detail: "conflict" }, "SPX4")).toBeNull();
  });

  it("status khác → null kể cả khi detail khớp mã nghiệp vụ", () => {
    expect(dispatchLookupErrorMessage(500, { detail: "order_cancelled" }, "SPX5")).toBeNull();
    expect(
      dispatchLookupErrorMessage(undefined, { detail: "verify_unavailable" }, "SPX5"),
    ).toBeNull();
  });
});

describe("returnScanLookupErrorMessage", () => {
  it("409 + return_already_scanned kèm phiếu → nêu mã phiếu và đường thoát", () => {
    const msg = returnScanLookupErrorMessage(
      409,
      { detail: "return_already_scanned", note_code: "PTH-20260817-K2" },
      "SPX1",
    );
    expect(msg).toBe(
      "Mã SPX1 đã nhập hoàn ở phiếu PTH-20260817-K2 — huỷ lần bắn trước nếu muốn bắn lại.",
    );
  });

  it("note_code rỗng (mã còn chờ khớp đơn) → vẫn nói rõ phải huỷ lần trước", () => {
    const msg = returnScanLookupErrorMessage(
      409,
      { detail: "return_already_scanned", note_code: "" },
      "SPX2",
    );
    expect(msg).toBe(
      "Mã SPX2 đã nhập hoàn (đang chờ khớp đơn) — huỷ lần bắn trước nếu muốn bắn lại.",
    );
  });

  it("409 vì lý do khác / 409 hạ tầng body rỗng → null", () => {
    expect(returnScanLookupErrorMessage(409, { detail: "order_cancelled" }, "SPX3")).toBeNull();
    expect(returnScanLookupErrorMessage(409, null, "SPX3")).toBeNull();
    expect(returnScanLookupErrorMessage(409, undefined, "SPX3")).toBeNull();
  });

  it("status khác → null kể cả khi detail khớp", () => {
    expect(
      returnScanLookupErrorMessage(500, { detail: "return_already_scanned" }, "SPX4"),
    ).toBeNull();
  });
});
