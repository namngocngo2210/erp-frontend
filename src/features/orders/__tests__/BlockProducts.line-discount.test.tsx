import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { BlockProducts } from "@/features/orders/BlockProducts";
import type { OrderItemRow, OrderRow, ProductRow } from "@/features/orders/order-types";

afterEach(cleanup);

const PRODUCT: ProductRow = {
  id: 1,
  name: "Sản phẩm A",
  sku: "SKU-A",
  price: "100000",
  is_active: true,
  packages: [],
  created_at: "",
  updated_at: "",
};

function orderWithItem(overrides: Partial<OrderItemRow> = {}) {
  return {
    id: 10,
    items: [
      {
        id: 100,
        product_id: 1,
        product_name: "Sản phẩm A",
        sku: "SKU-A",
        quantity: 2,
        unit_price: "100000.00",
        discount: "0.00",
        discount_percent: null,
        line_total: "200000.00",
        ...overrides,
      },
    ],
    total_amount: "200000.00",
    discount_amount: "0",
    booking_voucher_discount: "0",
  } as unknown as OrderRow;
}

function discountInput() {
  return screen.getByLabelText("Giảm giá") as HTMLInputElement;
}

describe("BlockProducts — giảm giá theo dòng", () => {
  it("nhập tiền giảm rồi blur → patch items mang discount và tổng tiền đã trừ", () => {
    const patch = vi.fn();
    render(<BlockProducts order={orderWithItem()} products={[PRODUCT]} patch={patch} />);

    fireEvent.change(discountInput(), { target: { value: "10000" } });
    fireEvent.blur(discountInput());

    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ discount: "10000", discount_percent: null })],
        total_amount: "180000",
      }),
    );
  });

  it("đổi số lượng giữ nguyên giảm giá dòng đang có", () => {
    const patch = vi.fn();
    render(
      <BlockProducts
        order={orderWithItem({ discount: "5000.00", line_total: "190000.00" })}
        products={[PRODUCT]}
        patch={patch}
      />,
    );

    const qty = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(qty, { target: { value: "3" } });
    fireEvent.blur(qty, { target: { value: "3" } });

    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ quantity: 3, discount: "5000.00" })],
        total_amount: "285000",
      }),
    );
  });

  it("chuyển sang % → patch discount_percent và tiền giảm theo đơn giá", () => {
    const patch = vi.fn();
    render(<BlockProducts order={orderWithItem()} products={[PRODUCT]} patch={patch} />);

    fireEvent.click(screen.getByRole("button", { name: "%" }));
    fireEvent.change(discountInput(), { target: { value: "10" } });
    fireEvent.blur(discountInput());

    expect(patch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ discount_percent: "10" })],
        total_amount: "180000",
      }),
    );
  });
});
