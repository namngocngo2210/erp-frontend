import { describe, expect, it } from "vitest";

import type { SaleStaffDailyRow } from "../queries";
import {
  buildSaleDailyRows,
  buildSaleStaffRows,
  formatLeadTime,
  listSaleOptions,
  sumSaleRows,
} from "../sale-report-selectors";

function row(overrides: Partial<SaleStaffDailyRow> = {}): SaleStaffDailyRow {
  return {
    date: "2026-03-01",
    staff_id: 1,
    staff__username: "sale-a",
    staff__display_name: "Sale A",
    data_count: 0,
    orders: 0,
    total_revenue: "0",
    closed_revenue: "0",
    confirmed_revenue: "0",
    lead_time_seconds: 0,
    lead_time_orders: 0,
    queue_wait_seconds: 0,
    ...overrides,
  };
}

const ROWS: SaleStaffDailyRow[] = [
  row({
    date: "2026-03-01",
    data_count: 10,
    orders: 4,
    total_revenue: "1000",
    closed_revenue: "600",
    confirmed_revenue: "800",
  }),
  row({
    date: "2026-03-02",
    data_count: 10,
    orders: 4,
    total_revenue: "1000",
    closed_revenue: "400",
    confirmed_revenue: "800",
  }),
  row({
    date: "2026-03-01",
    staff_id: 2,
    staff__username: "sale-b",
    staff__display_name: "Sale B",
    data_count: 5,
    orders: 1,
    total_revenue: "500",
    closed_revenue: "200",
    confirmed_revenue: "300",
  }),
];

describe("buildSaleStaffRows", () => {
  it("gộp mọi ngày về một hàng cho mỗi nhân viên, sắp doanh thu tổng giảm dần", () => {
    const rows = buildSaleStaffRows(ROWS, "Không xác định");
    expect(rows.map((r) => r.label)).toEqual(["Sale A", "Sale B"]);

    const a = rows[0];
    expect(a.totalRevenue).toBe(2000);
    expect(a.closedRevenue).toBe(1000);
    expect(a.confirmedRevenue).toBe(1600);
    expect(a.dataCount).toBe(20);
    expect(a.orders).toBe(8);
  });

  it("tỉ lệ chốt = số đơn / số data; AOV = (DT xác nhận + DT chốt) / số đơn", () => {
    const [a] = buildSaleStaffRows(ROWS, "Không xác định");
    expect(a.closeRatePct).toBeCloseTo(40); // 8 / 20
    expect(a.aov).toBe(325); // (1600 + 1000) / 8
  });

  it("aov dùng giá trị thực của đơn chốt (confirmed + closed)", () => {
    const rows = buildSaleStaffRows(
      [
        row({
          data_count: 3,
          orders: 2,
          total_revenue: "5000000",
          closed_revenue: "2700000",
          confirmed_revenue: "1500000",
        }),
      ],
      "Không xác định",
    );
    expect(rows[0].aov).toBe((2700000 + 1500000) / 2);
  });

  it("mẫu số 0 trả null thay vì 0", () => {
    const [only] = buildSaleStaffRows([row()], "Không xác định");
    expect(only.closeRatePct).toBeNull();
    expect(only.aov).toBeNull();
  });

  it("đơn chưa gán nhân viên gom về một hàng với nhãn không xác định", () => {
    const rows = buildSaleStaffRows(
      [row({ staff_id: null, staff__username: null, staff__display_name: null, data_count: 3 })],
      "Không xác định",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("__unassigned__");
    expect(rows[0].label).toBe("Không xác định");
  });
});

describe("buildSaleDailyRows", () => {
  it("trải đủ khoảng ngày và chỉ lấy nhân viên được chọn", () => {
    const rows = buildSaleDailyRows(ROWS, "1", "2026-03-01", "2026-03-03");
    expect(rows.map((r) => r.label)).toEqual(["2026-03-01", "2026-03-02", "2026-03-03"]);
    expect(rows[0].totalRevenue).toBe(1000);
    expect(rows[1].closedRevenue).toBe(400);
    expect(rows[2].dataCount).toBe(0);
  });

  it("thiếu khoảng ngày thì rơi về các ngày có trong dữ liệu", () => {
    expect(buildSaleDailyRows(ROWS, "2").map((r) => r.label)).toEqual(["2026-03-01"]);
  });
});

describe("sumSaleRows", () => {
  it("tính lại tỉ lệ trên tổng thay vì cộng dồn phần trăm", () => {
    const total = sumSaleRows(buildSaleStaffRows(ROWS, "—"), "Tổng");
    expect(total.totalRevenue).toBe(2500);
    expect(total.dataCount).toBe(25);
    expect(total.orders).toBe(9);
    expect(total.closeRatePct).toBeCloseTo((9 / 25) * 100);
    expect(total.aov).toBeCloseTo((1900 + 1200) / 9);
  });
});

describe("lead time xử lý data", () => {
  it("gộp nhiều ngày rồi mới chia, không lấy trung bình của trung bình", () => {
    const rows = buildSaleStaffRows(
      [
        row({ date: "2026-03-01", lead_time_seconds: 3600, lead_time_orders: 1 }),
        row({ date: "2026-03-02", lead_time_seconds: 36000, lead_time_orders: 9 }),
      ],
      "—",
    );
    // 39.600s / 10 đơn = 3.960s. Trung bình của trung bình sẽ ra 2.300s.
    expect(rows[0].avgLeadTimeSeconds).toBe(3960);
    expect(rows[0].leadTimeOrders).toBe(10);
  });

  it("chưa đơn nào được xử lý thì trả null thay vì 0", () => {
    const [only] = buildSaleStaffRows([row({ data_count: 5 })], "—");
    expect(only.avgLeadTimeSeconds).toBeNull();
  });

  it("data còn treo không làm phình mẫu số", () => {
    // 10 data nhận nhưng mới xử lý 2 -> mẫu số là 2, không phải 10.
    const [only] = buildSaleStaffRows(
      [row({ data_count: 10, lead_time_seconds: 7200, lead_time_orders: 2 })],
      "—",
    );
    expect(only.avgLeadTimeSeconds).toBe(3600);
  });

  it("hàng Tổng cộng tử và mẫu của các nhân viên trước khi chia", () => {
    const staffRows = buildSaleStaffRows(
      [
        row({ lead_time_seconds: 3600, lead_time_orders: 1 }),
        row({
          staff_id: 2,
          staff__username: "b",
          staff__display_name: "B",
          lead_time_seconds: 36000,
          lead_time_orders: 9,
        }),
      ],
      "—",
    );
    expect(sumSaleRows(staffRows, "Tổng").avgLeadTimeSeconds).toBe(3960);
  });
});

describe("thời gian chờ chia data", () => {
  it("dùng chung mẫu số với lead time nên hai cột cộng lại được", () => {
    const [only] = buildSaleStaffRows(
      [
        row({ lead_time_seconds: 600, queue_wait_seconds: 10_800, lead_time_orders: 1 }),
        row({
          date: "2026-03-02",
          lead_time_seconds: 1800,
          queue_wait_seconds: 0,
          lead_time_orders: 1,
        }),
      ],
      "—",
    );
    expect(only.avgQueueWaitSeconds).toBe(5400); // 10.800 / 2
    expect(only.avgLeadTimeSeconds).toBe(1200); // 2.400 / 2
    // Cộng hai cột = trung bình tổng thời gian từ lúc đơn đổ về tới lúc tác nghiệp.
    expect((only.avgQueueWaitSeconds ?? 0) + (only.avgLeadTimeSeconds ?? 0)).toBe(
      (10_800 + 600 + 1800) / 2,
    );
  });

  it("chưa đơn nào được xử lý thì trả null như lead time", () => {
    const [only] = buildSaleStaffRows([row({ data_count: 4 })], "—");
    expect(only.avgQueueWaitSeconds).toBeNull();
  });

  it("hàng Tổng cộng tử số của các nhân viên trước khi chia", () => {
    const staffRows = buildSaleStaffRows(
      [
        row({ queue_wait_seconds: 3600, lead_time_orders: 1 }),
        row({
          staff_id: 2,
          staff__username: "b",
          staff__display_name: "B",
          queue_wait_seconds: 36_000,
          lead_time_orders: 9,
        }),
      ],
      "—",
    );
    expect(sumSaleRows(staffRows, "Tổng").avgQueueWaitSeconds).toBe(3960);
  });
});

describe("formatLeadTime", () => {
  it.each([
    [null, "—"],
    [0, "<1p"],
    [45, "<1p"],
    [42 * 60, "42p"],
    [2 * 3600, "2h"],
    [5 * 3600 + 12 * 60, "5h 12p"],
    [2 * 86400, "2n"],
    [2 * 86400 + 3 * 3600, "2n 3h"],
  ])("%s giây -> %s", (seconds, expected) => {
    expect(formatLeadTime(seconds)).toBe(expected);
  });
});

describe("listSaleOptions", () => {
  it("liệt kê nhân viên không trùng, sắp theo tên", () => {
    expect(listSaleOptions(ROWS, "—")).toEqual([
      { value: "1", label: "Sale A" },
      { value: "2", label: "Sale B" },
    ]);
  });
});
