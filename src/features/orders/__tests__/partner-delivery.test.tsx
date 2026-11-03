import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CRM_CELL_RENDERERS } from "@/features/orders/OrdersTable/cell-renderers/crm-cells";
import type { OrderRow } from "@/features/orders/order-types";
import { partnerDeliverySummary } from "@/features/orders/partner-delivery";

describe("partnerDeliverySummary", () => {
  it("không có giá trị nào → null (không hiện dòng phụ)", () => {
    expect(partnerDeliverySummary({})).toBeNull();
    expect(
      partnerDeliverySummary({ partner_delivery_status: " ", partner_dvvc_delivery_status: "" }),
    ).toBeNull();
  });

  it("đủ hai giá trị → dòng ngắn + tooltip rõ nguồn", () => {
    expect(
      partnerDeliverySummary({
        partner_delivery_status: "Đã gửi hàng",
        partner_dvvc_delivery_status: "Đang giao hàng",
      }),
    ).toEqual({
      line: "Đã gửi hàng · Đang giao hàng",
      title: "Pancake: Đã gửi hàng / ĐVVC: Đang giao hàng",
    });
  });

  it("chỉ có trạng thái ĐVVC", () => {
    expect(partnerDeliverySummary({ partner_dvvc_delivery_status: "Đã giao hàng" })).toEqual({
      line: "Đã giao hàng",
      title: "ĐVVC: Đã giao hàng",
    });
  });
});

describe("cột Trạng thái vận chuyển thực", () => {
  const renderCell = (row: Partial<OrderRow>) => {
    const cell = CRM_CELL_RENDERERS.delivery_business_status!;
    // Renderer chỉ đọc row (+ onPatch); các field context khác không dùng ở cột này.
    const ctx = { row: { id: 1, can_edit: false, crm: {}, ...row } } as unknown as Parameters<
      typeof cell
    >[0];
    return render(<>{cell(ctx)}</>);
  };

  it("có trạng thái đối tác → hiện dòng phụ kèm tooltip", () => {
    renderCell({ partner_delivery_status: "Đang hoàn", partner_dvvc_delivery_status: "" });
    const line = screen.getByTestId("partner-delivery-line");
    expect(line.textContent).toBe("Đang hoàn");
    expect(line.getAttribute("title")).toBe("Pancake: Đang hoàn");
  });

  it("không có → chỉ ô chọn, không dòng phụ", () => {
    renderCell({});
    expect(screen.queryByTestId("partner-delivery-line")).toBeNull();
    expect(screen.getByRole("combobox")).toBeTruthy();
  });
});
