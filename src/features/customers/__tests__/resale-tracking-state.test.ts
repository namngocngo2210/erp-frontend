import { describe, expect, it } from "vitest";

import type { ResaleTrackingRow } from "@/lib/api/customers";
import { ALL } from "@/features/customers/resale-format";
import {
  appointmentFormFromRow,
  buildResaleListParams,
  computeResaleKpis,
  resaleFormFromRow,
} from "@/features/customers/resale/resale-tracking-state";

const allFilters = {
  query: "",
  sale: ALL,
  segment: ALL,
  status: ALL,
  days: ALL,
  dateFrom: "",
  dateTo: "",
};

describe("buildResaleListParams", () => {
  it("ALL → không lọc, offset theo trang", () => {
    expect(buildResaleListParams(allFilters, 3, 20)).toEqual({
      query: "",
      limit: 20,
      offset: 40,
      dateFrom: "",
      dateTo: "",
      sale: null,
      contactStatus: "",
      segment: "",
      minDays: null,
    });
  });

  it("đổi giá trị lọc sang số/chuỗi và kẹp page size", () => {
    const params = buildResaleListParams(
      { ...allFilters, sale: "7", segment: "S3", status: "none", days: "60", query: "an" },
      1,
      500,
    );
    expect(params).toMatchObject({
      query: "an",
      limit: 100,
      offset: 0,
      sale: 7,
      segment: "S3",
      contactStatus: "none",
      minDays: 60,
    });
  });
});

describe("computeResaleKpis", () => {
  it("đếm chưa/đã liên hệ và cộng giá trị đơn (bỏ giá trị lỗi)", () => {
    const rows = [
      { contact_1_at: null, contact_2_at: null, contact_3_at: null, order_value: "100" },
      { contact_1_at: "x", contact_2_at: null, contact_3_at: null, order_value: "250.5" },
      { contact_1_at: "x", contact_2_at: "y", contact_3_at: "z", order_value: "abc" },
    ] as ResaleTrackingRow[];
    expect(computeResaleKpis(rows)).toEqual({ needContact: 1, contacted: 2, revenue: 350.5 });
    expect(computeResaleKpis([])).toEqual({ needContact: 0, contacted: 0, revenue: 0 });
  });
});

describe("form mặc định theo dòng", () => {
  it("lịch hẹn: rỗng khi chưa có hẹn, giữ giá trị khi đã có", () => {
    expect(appointmentFormFromRow({ appointment: null } as unknown as ResaleTrackingRow)).toEqual({
      appointment_at: "",
      channel: "Gọi điện",
      purpose: "Hỏi thăm cảm nhận SP",
      note: "",
    });
    const form = appointmentFormFromRow({
      appointment: {
        appointment_at: "2026-09-25T03:04:00Z",
        channel: "Zalo",
        purpose: "Tư vấn upsell",
        note: "gọi chiều",
      },
    } as unknown as ResaleTrackingRow);
    expect(form).toMatchObject({ channel: "Zalo", purpose: "Tư vấn upsell", note: "gọi chiều" });
    expect(form.appointment_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("đơn resale: chọn sẵn sản phẩm đầu tiên", () => {
    expect(resaleFormFromRow({ products: ["BNC02", "MSC06"] } as ResaleTrackingRow)).toEqual({
      product: "BNC02",
      quantity: 1,
      order_value: "",
      channel: "Gọi điện",
      note: "",
    });
    expect(resaleFormFromRow({ products: [] as string[] } as ResaleTrackingRow).product).toBe("");
  });
});
