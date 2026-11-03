import { describe, expect, it } from "vitest";

import {
  PENDING_NOTE_CODE,
  scanRowResultLabel,
  scanConfirmSummary,
  scanConfirmToastLevel,
} from "../scan-return-result";

describe("scanRowResultLabel", () => {
  it("đơn hoàn đã ghi sổ (auto_post) → nêu mã PHIẾU NGÀY", () => {
    expect(scanRowResultLabel({ ok: true, noteCode: "PTH-20260711-K1", posted: true })).toBe(
      "Đã ghi sổ vào phiếu PTH-20260711-K1",
    );
  });

  it("đơn hoàn nháp (không auto_post) → 'Đã thêm vào phiếu {mã ngày}'", () => {
    expect(scanRowResultLabel({ ok: true, noteCode: "PTH-20260711-K1" })).toBe(
      "Đã thêm vào phiếu PTH-20260711-K1",
    );
  });

  it("mã chờ khớp → 'Đã ghi nhận — chờ khớp'", () => {
    expect(scanRowResultLabel({ ok: true, noteCode: PENDING_NOTE_CODE })).toBe(
      "Đã ghi nhận — chờ khớp",
    );
  });

  it("lỗi → '✗ {error}'", () => {
    expect(scanRowResultLabel({ ok: false, error: "đơn đã hoàn kho" })).toBe("đơn đã hoàn kho");
  });
});

describe("scanConfirmSummary", () => {
  it("có mã phiếu ngày → nêu phiếu nhận các đơn hoàn", () => {
    expect(scanConfirmSummary(2, 1, 0, "PTH-20260711-K1")).toBe(
      "Đã ghi sổ 2 đơn hoàn vào phiếu PTH-20260711-K1 — 1 mã chờ khớp",
    );
  });

  it("không có mã phiếu (chỉ mã chờ khớp) → bỏ phần phiếu", () => {
    expect(scanConfirmSummary(0, 1, 0)).toBe("Đã ghi sổ 0 đơn hoàn — 1 mã chờ khớp");
  });

  it("có lỗi → thêm ' — N lỗi'", () => {
    expect(scanConfirmSummary(2, 0, 1, "PTH-20260711-K1")).toBe(
      "Đã ghi sổ 2 đơn hoàn vào phiếu PTH-20260711-K1 — 0 mã chờ khớp — 1 lỗi",
    );
  });
});

// 6.8 — toast tổng kết quét trước đây LUÔN xanh (success) kể cả khi có dòng lỗi.
describe("scanConfirmToastLevel", () => {
  it("không có lỗi → success", () => {
    expect(scanConfirmToastLevel(2, 1, 0)).toBe("success");
  });

  it("có lỗi nhưng vẫn có dòng thành công/chờ khớp → warning (không phải success)", () => {
    expect(scanConfirmToastLevel(2, 0, 1)).toBe("warning");
    expect(scanConfirmToastLevel(0, 1, 1)).toBe("warning");
  });

  it("mọi dòng đều lỗi (0 thành công, 0 chờ khớp) → error", () => {
    expect(scanConfirmToastLevel(0, 0, 3)).toBe("error");
  });
});
