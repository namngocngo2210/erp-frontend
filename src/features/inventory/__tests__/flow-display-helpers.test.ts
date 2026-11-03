import { describe, expect, it } from "vitest";

import { displayQty, shippingCodeLabel } from "../flow-quantity";
import { formatRate } from "../stock-run-rate";
import { pendingBadge, pendingRowTimestamp } from "../pending-scan-display";
import { buildFlowExportParams, buildFlowParams } from "../issue-history-queries";

describe("displayQty — SL hiển thị ở Lịch sử nhập xuất", () => {
  it("giữ nguyên số lượng của đơn xuất bình thường", () => {
    expect(displayQty(3, 3)).toBe(3);
  });

  it("giữ NET khi đơn hoàn một phần (xuất 3, hoàn 1)", () => {
    expect(displayQty(2, 3)).toBe(2);
  });

  it("rơi về SL đã xuất khi net = 0 (đơn huỷ đã chuyển sổ sang đơn .NN)", () => {
    expect(displayQty(0, 3)).toBe(3);
  });

  it("không bao giờ trả số âm", () => {
    expect(displayQty(-2, 0)).toBe(2);
  });

  it("chịu được payload cũ không có gross", () => {
    expect(displayQty(4)).toBe(4);
    expect(displayQty(0)).toBe(0);
  });
});

describe("formatRate", () => {
  it("số nguyên giữ nguyên", () => {
    expect(formatRate(2)).toBe("2");
  });

  it("làm tròn 1 chữ số thập phân", () => {
    expect(formatRate(0.86)).toBe("0,9");
  });

  it("0 hiển thị là 0", () => {
    expect(formatRate(0)).toBe("0");
  });
});

describe("pendingBadge", () => {
  it("gắn nhãn 'Đã khớp' xanh cho status matched", () => {
    expect(pendingBadge("matched").text).toBe("Đã khớp");
    expect(pendingBadge("matched").cls).toContain("action-success");
  });

  it("giữ nhãn cũ cho failed/invalid và mặc định 'Chờ khớp'", () => {
    expect(pendingBadge("failed").text).toBe("Lỗi khớp");
    expect(pendingBadge("invalid").text).toBe("Mã không đúng");
    expect(pendingBadge("pending").text).toBe("Chờ khớp");
    expect(pendingBadge("unknown").text).toBe("Chờ khớp");
  });
});

describe("pendingRowTimestamp", () => {
  const scanned = "2026-07-01T02:00:00Z";
  const matched = "2026-07-03T09:30:00Z";

  it("dòng đã khớp hiển thị thời điểm khớp (matched_at)", () => {
    expect(
      pendingRowTimestamp({ status: "matched", created_at: scanned, matched_at: matched }),
    ).toEqual({ iso: matched, kind: "matched" });
  });

  it("dòng chưa khớp hiển thị lúc quét (created_at)", () => {
    expect(
      pendingRowTimestamp({ status: "pending", created_at: scanned, matched_at: null }),
    ).toEqual({ iso: scanned, kind: "scanned" });
  });

  it("matched nhưng thiếu matched_at → fallback lúc quét", () => {
    expect(
      pendingRowTimestamp({ status: "matched", created_at: scanned, matched_at: null }),
    ).toEqual({ iso: scanned, kind: "scanned" });
  });
});

describe("buildFlowParams", () => {
  it("chỉ set param có giá trị", () => {
    const p = buildFlowParams({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-08",
      warehouseIds: ["3", "4"],
      product: " SKU1 ",
      productIds: ["5", "9"],
      order: "",
      carrier: "GHN",
    });
    expect(p.get("date_from")).toBe("2026-07-01");
    expect(p.get("date_to")).toBe("2026-07-08");
    expect(p.get("warehouse_ids")).toBe("3,4");
    expect(p.get("product")).toBe("SKU1");
    expect(p.get("product_ids")).toBe("5,9");
    expect(p.get("carrier")).toBe("GHN");
    expect(p.has("order")).toBe(false);
  });

  it("bỏ qua danh sách kho rỗng và các bộ lọc rỗng", () => {
    const p = buildFlowParams({
      dateFrom: "",
      dateTo: "",
      warehouseIds: [],
      product: "",
      productIds: [],
      order: "VD1",
      carrier: "",
    });
    expect(p.has("warehouse_ids")).toBe(false);
    expect(p.has("product_ids")).toBe(false);
    expect(p.has("carrier")).toBe(false);
    expect(p.get("order")).toBe("VD1");
  });
});

describe("buildFlowExportParams", () => {
  // Job export nền chạy lại bộ lọc phía backend — gửi thiếu/sai kiểu danh sách
  // kho thì file Excel rộng hơn hẳn màn hình người dùng đang xem mà không báo gì.
  it("gửi danh sách kho dạng chuỗi CSV như màn hình đang lọc", () => {
    const params = buildFlowExportParams({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-08",
      warehouseIds: ["3", "4"],
      product: "",
      productIds: ["5"],
      order: " VD1 ",
      carrier: "GHN",
    });
    expect(params).toMatchObject({
      date_from: "2026-07-01",
      date_to: "2026-07-08",
      warehouse_ids: "3,4",
      product_ids: "5",
      order: "VD1",
      carrier: "GHN",
      group: "",
    });
  });

  it("không lọc kho khi chưa chọn kho nào", () => {
    const params = buildFlowExportParams(
      {
        dateFrom: "",
        dateTo: "",
        warehouseIds: [],
        product: "",
        productIds: [],
        order: "",
        carrier: "",
      },
      "sku",
    );
    expect(params).toMatchObject({ warehouse_ids: "", group: "sku" });
  });
});

describe("shippingCodeLabel — ô Mã vận đơn của dòng đơn đã xuất", () => {
  it("ca thường: chỉ mã trên đơn", () => {
    expect(shippingCodeLabel({ shipping_code: "GYT8AP4A", scan_codes: [] })).toBe("GYT8AP4A");
  });

  it("khớp tay bằng mã khác: ghép mã quét sau mã trên đơn, cùng dấu '; ' với Excel", () => {
    expect(shippingCodeLabel({ shipping_code: "GYT8AP4A", scan_codes: ["84859795173645"] })).toBe(
      "GYT8AP4A; 84859795173645",
    );
  });

  it("đơn không có mã vận đơn nhưng có mã quét: chỉ mã quét", () => {
    expect(shippingCodeLabel({ shipping_code: null, scan_codes: ["84859797173814"] })).toBe(
      "84859797173814",
    );
  });

  it("không có gì (phiếu kho / backend cũ chưa gửi scan_codes): dấu gạch", () => {
    expect(shippingCodeLabel({ shipping_code: null })).toBe("—");
  });
});
