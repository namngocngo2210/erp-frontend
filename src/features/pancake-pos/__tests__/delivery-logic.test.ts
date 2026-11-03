import { describe, expect, it } from "vitest";

import type { PancakeDeliveryPart } from "@/lib/api/pancakePos";
import {
  ageTone,
  formatAge,
  partMilestones,
  warehouseTotals,
} from "@/features/pancake-pos/delivery-logic";

const labels = { hour: "giờ", day: "ngày" };

function part(overrides: Partial<PancakeDeliveryPart> = {}): PancakeDeliveryPart {
  return {
    pancake_order_id: "P1",
    pancake_status: 2,
    status_name: "Đã gửi hàng",
    dvvc_status: "Đang giao hàng",
    tracking_code: "",
    partner_name: "",
    warehouse_name: "",
    match_method: "order_link",
    inserted_at: null,
    shipped_at: null,
    delivered_at: null,
    returned_at: null,
    last_partner_status_at: null,
    status_changed_at: null,
    ...overrides,
  };
}

describe("formatAge", () => {
  it("dưới 48 giờ hiện giờ, làm tròn xuống", () => {
    expect(formatAge(30.9, labels)).toBe("30 giờ");
    expect(formatAge(0, labels)).toBe("0 giờ");
  });
  it("từ 48 giờ hiện ngày + giờ, bỏ phần giờ khi chẵn ngày", () => {
    expect(formatAge(76, labels)).toBe("3 ngày 4 giờ");
    expect(formatAge(120, labels)).toBe("5 ngày");
  });
  it("giá trị âm / không hợp lệ về 0", () => {
    expect(formatAge(-5, labels)).toBe("0 giờ");
    expect(formatAge(Number.NaN, labels)).toBe("0 giờ");
  });
});

describe("ageTone", () => {
  it("gấp đôi ngưỡng là danger", () => {
    expect(ageTone(48, 24)).toBe("danger");
    expect(ageTone(47, 24)).toBe("warning");
    expect(ageTone(100, 0)).toBe("warning");
  });
});

describe("partMilestones", () => {
  it("chỉ giữ mốc có giá trị, đúng thứ tự", () => {
    const rows = partMilestones(
      part({
        last_partner_status_at: "2026-10-01T03:00:00Z",
        inserted_at: "2026-09-29T01:00:00Z",
        shipped_at: "2026-09-30T01:00:00Z",
      }),
    );
    expect(rows.map((r) => r.key)).toEqual(["inserted_at", "shipped_at", "last_partner_status_at"]);
  });
  it("không mốc nào → rỗng", () => {
    expect(partMilestones(part())).toEqual([]);
  });
});

describe("warehouseTotals", () => {
  it("gộp tên trống về fallback, nhiều nhất trước", () => {
    expect(
      warehouseTotals(
        {
          by_warehouse: [
            { warehouse_name: "Đại Mỗ 1", count: 2 },
            { warehouse_name: "", count: 1 },
            { warehouse_name: "Bình Tân", count: 5 },
            { warehouse_name: " ", count: 2 },
          ],
        },
        "Chưa rõ kho",
      ),
    ).toEqual([
      { name: "Bình Tân", count: 5 },
      { name: "Chưa rõ kho", count: 3 },
      { name: "Đại Mỗ 1", count: 2 },
    ]);
  });
  it("thiếu dữ liệu → rỗng", () => {
    expect(warehouseTotals(undefined, "x")).toEqual([]);
  });
});
