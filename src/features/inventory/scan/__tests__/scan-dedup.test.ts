import { describe, expect, it } from "vitest";

import { createScanDeduper } from "../scan-dedup";

const WINDOW = 1500;

describe("createScanDeduper", () => {
  it("cho emit lần đầu tiên thấy một mã", () => {
    const shouldEmit = createScanDeduper(WINDOW);
    expect(shouldEmit("GYX44ELX", 0)).toBe(true);
  });

  it("chặn cùng mã xuất hiện lại trong cửa sổ dedup", () => {
    const shouldEmit = createScanDeduper(WINDOW);
    shouldEmit("GYX44ELX", 0);
    expect(shouldEmit("GYX44ELX", 100)).toBe(false);
    expect(shouldEmit("GYX44ELX", 1400)).toBe(false);
  });

  it("KHÔNG bao giờ re-emit khi mã liên tục trong khung hình (cửa sổ trượt theo lần thấy cuối)", () => {
    const shouldEmit = createScanDeduper(WINDOW);
    shouldEmit("GYX44ELX", 0);
    // camera thấy lại mã mỗi 500ms suốt 10 giây — mô phỏng giữ điện thoại trên tem
    for (let t = 500; t <= 10_000; t += 500) {
      expect(shouldEmit("GYX44ELX", t)).toBe(false);
    }
  });

  it("cho emit lại khi mã đã rời khung hình đủ lâu (>= cửa sổ kể từ lần thấy cuối)", () => {
    const shouldEmit = createScanDeduper(WINDOW);
    shouldEmit("GYX44ELX", 0);
    shouldEmit("GYX44ELX", 1000); // vẫn trong khung — refresh cửa sổ
    expect(shouldEmit("GYX44ELX", 1000 + WINDOW)).toBe(true);
  });

  it("dedup độc lập theo từng mã — mã khác emit ngay", () => {
    const shouldEmit = createScanDeduper(WINDOW);
    expect(shouldEmit("CODE-A", 0)).toBe(true);
    expect(shouldEmit("CODE-B", 50)).toBe(true);
  });

  it("2 mã luân phiên trong khung hình (tem nhiều barcode) — mỗi mã chỉ emit 1 lần", () => {
    const shouldEmit = createScanDeduper(WINDOW);
    let emitsA = 0;
    let emitsB = 0;
    // detector bắt xen kẽ A/B mỗi frame ~50ms trong 5 giây
    for (let t = 0; t <= 5_000; t += 50) {
      const code = (t / 50) % 2 === 0 ? "CODE-A" : "CODE-B";
      if (shouldEmit(code, t)) {
        if (code === "CODE-A") emitsA++;
        else emitsB++;
      }
    }
    expect(emitsA).toBe(1);
    expect(emitsB).toBe(1);
  });
});
