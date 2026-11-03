import { describe, expect, it } from "vitest";

import type { ResaleBucketsApi, ResaleStaffApiRow } from "../queries";
import { buildResaleKpis, buildResaleRows, sumResaleRows } from "../resale-selectors";

const UNKNOWN = "Không xác định";

function buckets(overrides: Partial<ResaleBucketsApi> = {}): ResaleBucketsApi {
  return {
    total_revenue: "100000",
    total_orders: 10,
    delivered_revenue: "60000",
    delivered_orders: 6,
    awaiting_revenue: "20000",
    awaiting_orders: 2,
    returned_revenue: "15000",
    returned_orders: 1,
    return_risk_revenue: "5000",
    return_risk_orders: 1,
    ...overrides,
  };
}

function apiRow(overrides: Partial<ResaleStaffApiRow> = {}): ResaleStaffApiRow {
  return {
    ...buckets(),
    staff_id: 1,
    staff__username: "sale1",
    staff__display_name: "Sale Một",
    ...overrides,
  };
}

describe("buildResaleKpis", () => {
  it("parses decimal strings into numbers", () => {
    const kpis = buildResaleKpis(buckets());
    expect(kpis.totalRevenue).toBe(100000);
    expect(kpis.deliveredRevenue).toBe(60000);
    expect(kpis.returnRiskOrders).toBe(1);
  });

  it("computes delivered percent against total revenue", () => {
    expect(buildResaleKpis(buckets()).deliveredPct).toBe(60);
  });

  it("returns null percent instead of NaN when total is zero", () => {
    const kpis = buildResaleKpis(buckets({ total_revenue: "0", delivered_revenue: "0" }));
    expect(kpis.deliveredPct).toBeNull();
  });

  it("returns a zeroed shape for undefined input", () => {
    const kpis = buildResaleKpis(undefined);
    expect(kpis.totalRevenue).toBe(0);
    expect(kpis.totalOrders).toBe(0);
    expect(kpis.deliveredPct).toBeNull();
  });
});

describe("buildResaleRows", () => {
  it("prefers display name, falls back to username then unknown label", () => {
    const rows = buildResaleRows(
      [
        apiRow({ staff_id: 1, delivered_revenue: "90000" }),
        apiRow({
          staff_id: 2,
          staff__display_name: null,
          staff__username: "sale2",
          delivered_revenue: "80000",
        }),
        apiRow({
          staff_id: null,
          staff__display_name: null,
          staff__username: null,
          delivered_revenue: "70000",
        }),
      ],
      UNKNOWN,
    );
    expect(rows.map((row) => row.label)).toEqual(["Sale Một", "sale2", UNKNOWN]);
  });

  it("gives unassigned staff a stable distinct key", () => {
    const [row] = buildResaleRows(
      [apiRow({ staff_id: null, staff__display_name: null, staff__username: null })],
      UNKNOWN,
    );
    expect(row.key).toBe("__unassigned__");
  });

  it("sorts by delivered revenue descending", () => {
    const rows = buildResaleRows(
      [
        apiRow({ staff_id: 1, staff__display_name: "A", delivered_revenue: "10000" }),
        apiRow({ staff_id: 2, staff__display_name: "B", delivered_revenue: "90000" }),
        apiRow({ staff_id: 3, staff__display_name: "C", delivered_revenue: "50000" }),
      ],
      UNKNOWN,
    );
    expect(rows.map((row) => row.label)).toEqual(["B", "C", "A"]);
  });

  it("treats malformed money strings as zero rather than NaN", () => {
    // "abc" -> Number("abc") is NaN, which is what actually exercises the
    // Number.isFinite guard in toNumber. Number("") is already 0, so an
    // empty string would pass even without the guard being there at all.
    const [row] = buildResaleRows([apiRow({ delivered_revenue: "abc" })], UNKNOWN);
    expect(row.deliveredRevenue).toBe(0);
  });

  it("returns an empty array for empty input", () => {
    expect(buildResaleRows([], UNKNOWN)).toEqual([]);
  });
});

describe("sumResaleRows", () => {
  it("sums every bucket and recomputes the percent from the totals", () => {
    // Row A is 60% delivered on a 100000 base; row B is 10% delivered on a
    // 300000 base. If the two rows had the SAME denominator, "recompute from
    // the summed totals" and "average the per-row percents" produce the same
    // number, so the test couldn't tell a correct implementation from a
    // buggy one. With unequal denominators they diverge: recomputing from
    // totals gives (60000+30000)/(100000+300000) = 22.5%, while averaging
    // the percents would give (60+10)/2 = 35%. Do not "simplify" these back
    // to equal totals.
    const rowA = apiRow({ staff_id: 1 });
    const rowB = apiRow({
      staff_id: 2,
      total_revenue: "300000",
      total_orders: 30,
      delivered_revenue: "30000",
      delivered_orders: 3,
      awaiting_revenue: "200000",
      awaiting_orders: 20,
      returned_revenue: "50000",
      returned_orders: 5,
      return_risk_revenue: "20000",
      return_risk_orders: 2,
    });
    const rows = buildResaleRows([rowA, rowB], UNKNOWN);
    const total = sumResaleRows(rows, "Tổng");

    expect(total.label).toBe("Tổng");
    expect(total.totalRevenue).toBe(400000);
    expect(total.deliveredRevenue).toBe(90000);
    expect(total.returnRiskOrders).toBe(3);
    expect(total.deliveredPct).toBe(22.5);
  });

  it("handles an empty row list without dividing by zero", () => {
    const total = sumResaleRows([], "Tổng");
    expect(total.totalRevenue).toBe(0);
    expect(total.deliveredPct).toBeNull();
  });
});
