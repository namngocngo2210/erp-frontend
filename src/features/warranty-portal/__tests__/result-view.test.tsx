import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OrderSummary } from "@/features/warranty-portal/components/OrderSummary";
import { WarrantyCard } from "@/features/warranty-portal/components/WarrantyCard";

afterEach(cleanup);

describe("WarrantyCard", () => {
  const warranty = {
    serial: "DX-000001",
    code: "A8K2M4P9QX",
    product_sku: "BNC02",
    product_name: "Bồn ngâm chân",
    activated_at: "2026-08-06T03:00:00Z",
    expires_at: "2028-08-06",
    days_left: 730,
    months: 24,
  };

  it("hiện sản phẩm, hạn bảo hành và số ngày còn lại", () => {
    render(<WarrantyCard warranty={warranty} />);
    expect(screen.getByText("BNC02")).toBeTruthy();
    expect(screen.getByText(/730/)).toBeTruthy();
    expect(screen.getByText(/Còn hạn/i)).toBeTruthy();
  });

  it("hiện hết hạn khi days_left <= 0", () => {
    render(<WarrantyCard warranty={{ ...warranty, days_left: -1 }} />);
    expect(screen.getByText(/Hết hạn/i)).toBeTruthy();
  });
});

describe("OrderSummary", () => {
  const order = {
    order_code: "DH001",
    invoice_code: "HD0001",
    shipping_code: "SC00001",
    created_at: "2026-08-01T03:00:00Z",
    status: 3,
    status_label: "Giao thành công",
    customer_name: "Nguyễn Văn A",
    phone: "0901234567",
    province: "Hà Nội",
    items: [{ sku: "BNC02", name: "Bồn ngâm chân", quantity: 1 }],
  };

  it("hiện mã đơn, trạng thái, tỉnh/thành và sản phẩm", () => {
    render(<OrderSummary order={order} />);
    expect(screen.getByText("DH001")).toBeTruthy();
    expect(screen.getByText("Giao thành công")).toBeTruthy();
    expect(screen.getByText(/Hà Nội/)).toBeTruthy();
    expect(screen.getByText(/Bồn ngâm chân/)).toBeTruthy();
  });

  it("hiện tên khách, SĐT, mã vận đơn, mã hoá đơn, SKU và ngày đặt", () => {
    render(<OrderSummary order={order} />);
    expect(screen.getByText("Nguyễn Văn A")).toBeTruthy();
    expect(screen.getByText("0901234567")).toBeTruthy();
    expect(screen.getByText("SC00001")).toBeTruthy();
    expect(screen.getByText("HD0001")).toBeTruthy();
    expect(screen.getByText(/SKU: BNC02/)).toBeTruthy();
    // Định dạng ngày do ICU của môi trường quyết định (1/8 hay 01/08) — chỉ cần
    // chắc là ngày đặt có được render.
    expect(screen.getByText(/0?1\/0?8\/2026/)).toBeTruthy();
  });

  it("ẩn hẳn dòng mã hoá đơn khi đơn chưa lên hoá đơn", () => {
    render(<OrderSummary order={{ ...order, invoice_code: "" }} />);
    expect(screen.queryByText("Mã hoá đơn")).toBeNull();
    expect(screen.getByText("Mã vận đơn")).toBeTruthy();
  });

  it("ẩn dòng khách hàng khi đơn không có tên", () => {
    render(<OrderSummary order={{ ...order, customer_name: "" }} />);
    expect(screen.queryByText("Khách hàng")).toBeNull();
  });

  it("không hiện total_amount (backend đã lược bỏ trường này)", () => {
    render(<OrderSummary order={order} />);
    expect(screen.queryByText(/₫/)).toBeNull();
  });
});
