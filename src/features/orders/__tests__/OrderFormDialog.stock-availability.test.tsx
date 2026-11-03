/**
 * Khối "Tồn kho" dưới ô Kho xuất của form đơn: chỉ hỏi tồn khi đã có ĐỦ kho xuất
 * và sản phẩm, hỏi lại khi đổi kho, và ẩn hẳn khi gọi API hỏng (người thiếu
 * quyền `orders:view` ăn 403 — không được chặn việc tạo đơn bằng báo lỗi).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OrderFormDialog } from "@/features/orders/OrderFormDialog";
import type { ChannelOption } from "@/features/orders/order-form/order-form-helpers";
import type { ProductRow } from "@/features/orders/order-types";
import { getStockAvailability } from "@/lib/api/stock-availability";
import { I18nProvider } from "@/i18n";

vi.mock("@/lib/api/warehouses", () => ({
  getWarehouses: vi.fn(async () => ({
    items: [
      { id: 3, code: "HN", name: "Kho Hà Nội", is_active: true },
      { id: 4, code: "HCM", name: "Kho HCM", is_active: true },
    ],
    total: 2,
    limit: 200,
    offset: 0,
  })),
}));

vi.mock("@/lib/api/stock-availability", () => ({
  STOCK_AVAILABILITY_MAX_SKUS: 50,
  getStockAvailability: vi.fn(),
}));

const mockedGetStockAvailability = vi.mocked(getStockAvailability);

afterEach(cleanup);

const CHANNELS: ChannelOption[] = [{ code: "facebook", name: "Facebook", price_book: null }];

const PRODUCT: ProductRow = {
  id: 1,
  name: "Sản phẩm A",
  sku: "SKU-A",
  price: "100000",
  is_active: true,
  packages: [{ id: 1, quantity: 1, price: "100000", weight: 0, length: 0, width: 0, height: 0 }],
  created_at: "",
  updated_at: "",
};

function noop() {
  return Promise.resolve();
}

function baseProps() {
  return {
    open: true,
    onOpenChange: vi.fn(),
    mode: "create" as const,
    initialOrder: null,
    channels: CHANNELS,
    kiotvietOptions: [],
    addressCatalog: { provinces: [], districts_by_province: {}, wards_by_district_key: {} },
    channelStaffByCode: {},
    submitting: false,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onFetchOrderHistoryByPhone: vi.fn().mockResolvedValue([]),
    onLookupCustomerByPhone: vi.fn().mockResolvedValue(null),
    onLoadDistrictsForProvince: noop,
    onLoadWardsForDistrict: noop,
    onSearchProducts: vi.fn(async () => [PRODUCT]),
    products: [PRODUCT],
    productsPriceBook: "",
  };
}

function comboboxNear(labelText: string) {
  const label = screen.getAllByText(labelText).find((el) => el.tagName === "LABEL");
  if (!label?.parentElement) throw new Error(`Không tìm thấy label "${labelText}"`);
  return within(label.parentElement).getByRole("combobox");
}

async function pickOption(
  user: ReturnType<typeof userEvent.setup>,
  labelText: string,
  optionName: string,
) {
  await user.click(comboboxNear(labelText));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

function renderDialog() {
  return render(
    <I18nProvider>
      <OrderFormDialog {...baseProps()} />
    </I18nProvider>,
  );
}

describe("OrderFormDialog — tồn kho theo kho xuất", () => {
  beforeEach(() => {
    mockedGetStockAvailability.mockReset();
    mockedGetStockAvailability.mockResolvedValue({
      warehouse_id: 3,
      items: [{ sku: "SKU-A", product_name: "Sản phẩm A", sellable: 120, pending_direct: 0 }],
    });
  });

  it("chưa chọn kho xuất: nhắc chọn kho và không gọi API tồn", async () => {
    const user = userEvent.setup();
    renderDialog();

    await pickOption(user, "Sản phẩm", "SKU-A");

    expect(screen.getByText("Chọn kho xuất để xem tồn kho")).toBeTruthy();
    expect(mockedGetStockAvailability).not.toHaveBeenCalled();
  });

  it("chọn kho xuất: hỏi tồn đúng kho + đúng mã và hiển thị số tồn bán được", async () => {
    const user = userEvent.setup();
    renderDialog();

    await pickOption(user, "Sản phẩm", "SKU-A");
    await pickOption(user, "Kho xuất", "Kho Hà Nội");

    await waitFor(() => expect(mockedGetStockAvailability).toHaveBeenCalled());
    const [warehouseId, skus] = mockedGetStockAvailability.mock.calls[0];
    expect(warehouseId).toBe(3);
    expect(skus).toEqual(["SKU-A"]);
    expect(await screen.findByText("120")).toBeTruthy();
    expect(screen.getByText("Tồn kho Kho Hà Nội")).toBeTruthy();
  });

  it("đổi kho xuất: hỏi lại tồn theo kho mới", async () => {
    const user = userEvent.setup();
    renderDialog();

    await pickOption(user, "Sản phẩm", "SKU-A");
    await pickOption(user, "Kho xuất", "Kho Hà Nội");
    await waitFor(() => expect(mockedGetStockAvailability).toHaveBeenCalledTimes(1));

    mockedGetStockAvailability.mockResolvedValue({
      warehouse_id: 4,
      items: [{ sku: "SKU-A", product_name: "Sản phẩm A", sellable: 0, pending_direct: 0 }],
    });
    await pickOption(user, "Kho xuất", "Kho HCM");

    await waitFor(() => expect(mockedGetStockAvailability).toHaveBeenCalledTimes(2));
    expect(mockedGetStockAvailability.mock.calls[1][0]).toBe(4);
    expect(await screen.findByText("0")).toBeTruthy();
  });

  it("có đơn đã lên hoá đơn chưa trừ tồn: hiện số cạnh tồn khả dụng", async () => {
    const user = userEvent.setup();
    mockedGetStockAvailability.mockResolvedValue({
      warehouse_id: 3,
      items: [{ sku: "SKU-A", product_name: "Sản phẩm A", sellable: 12, pending_direct: 3 }],
    });
    renderDialog();

    await pickOption(user, "Sản phẩm", "SKU-A");
    await pickOption(user, "Kho xuất", "Kho Hà Nội");

    expect(await screen.findByText("12")).toBeTruthy();
    expect(screen.getByText(/đã lên HĐ, chưa xuất 3/)).toBeTruthy();
  });

  it("không có đơn nào đã lên hoá đơn chưa trừ tồn: không hiện phần cảnh báo", async () => {
    const user = userEvent.setup();
    mockedGetStockAvailability.mockResolvedValue({
      warehouse_id: 3,
      items: [{ sku: "SKU-A", product_name: "Sản phẩm A", sellable: 12, pending_direct: 0 }],
    });
    renderDialog();

    await pickOption(user, "Sản phẩm", "SKU-A");
    await pickOption(user, "Kho xuất", "Kho Hà Nội");

    expect(await screen.findByText("12")).toBeTruthy();
    expect(screen.queryByText(/đã lên HĐ, chưa xuất/)).toBeNull();
  });

  it("gọi API hỏng (vd 403): ẩn hẳn khối tồn, không báo lỗi", async () => {
    const user = userEvent.setup();
    mockedGetStockAvailability.mockRejectedValue(new Error("HTTP 403"));
    renderDialog();

    await pickOption(user, "Sản phẩm", "SKU-A");
    await pickOption(user, "Kho xuất", "Kho Hà Nội");

    await waitFor(() => expect(screen.queryByText("Tồn kho Kho Hà Nội")).toBeNull());
    expect(screen.queryByText("Chọn kho xuất để xem tồn kho")).toBeNull();
  });
});
