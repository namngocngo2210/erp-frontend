import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OrderJourney } from "@/features/warranty-portal/components/OrderJourney";

afterEach(cleanup);

describe("OrderJourney", () => {
  it("hiện cả giờ, không chỉ ngày (M1)", () => {
    const at = "2026-08-06T10:30:00Z";
    render(<OrderJourney results={[{ at, label: "Đang giao hàng", group: "delivering" }]} />);

    const expected = new Date(at).toLocaleString("vi-VN");
    expect(screen.getByText(expected)).toBeTruthy();
    // toLocaleDateString chỉ có ngày, không có dấu ":" của giờ.
    expect(expected).not.toBe(new Date(at).toLocaleDateString("vi-VN"));
  });

  it("mốc mới nhất hiện trên cùng (đảo thứ tự cũ→mới của backend)", () => {
    render(
      <OrderJourney
        results={[
          { at: "2026-08-01T00:00:00Z", label: "Đã tiếp nhận", group: "created" },
          { at: "2026-08-05T00:00:00Z", label: "Đang giao hàng", group: "delivering" },
        ]}
      />,
    );
    const items = screen.getAllByText(/Đã tiếp nhận|Đang giao hàng/i);
    expect(items[0].textContent).toBe("Đang giao hàng");
  });

  it("hiện thông báo trống khi không có mốc nào", () => {
    render(<OrderJourney results={[]} />);
    expect(screen.getByText(/Chưa có thông tin vận chuyển/i)).toBeTruthy();
  });
});
