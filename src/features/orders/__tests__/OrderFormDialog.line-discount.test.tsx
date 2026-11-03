import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OrderFormDialog } from "@/features/orders/OrderFormDialog";
import type { ChannelOption } from "@/features/orders/order-form/order-form-helpers";
import type { ProductRow } from "@/features/orders/order-types";
import { I18nProvider } from "@/i18n";

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

function renderCreateDialog() {
  return render(
    <I18nProvider>
      <OrderFormDialog
        open
        onOpenChange={vi.fn()}
        mode="create"
        initialOrder={null}
        channels={CHANNELS}
        kiotvietOptions={[]}
        addressCatalog={{ provinces: [], districts_by_province: {}, wards_by_district_key: {} }}
        channelStaffByCode={{}}
        submitting={false}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onFetchOrderHistoryByPhone={vi.fn().mockResolvedValue([])}
        onLookupCustomerByPhone={vi.fn().mockResolvedValue(null)}
        onLoadDistrictsForProvince={noop}
        onLoadWardsForDistrict={noop}
        productsPriceBook=""
        products={[PRODUCT]}
        onSearchProducts={vi.fn(async () => [PRODUCT])}
      />
    </I18nProvider>,
  );
}

function fieldNear(labelText: string, role: "textbox" | "combobox" | "spinbutton" = "textbox") {
  const label = screen.getAllByText(labelText).find((el) => el.tagName === "LABEL");
  if (!label?.parentElement) throw new Error(`Không tìm thấy label "${labelText}"`);
  return within(label.parentElement).getByRole(role) as HTMLInputElement;
}

async function pickProduct(user: ReturnType<typeof userEvent.setup>) {
  await user.click(fieldNear("Sản phẩm", "combobox"));
  await user.click(await screen.findByRole("option", { name: "SKU-A" }));
  await waitFor(() => expect(fieldNear("Đơn giá").value).toBe("100,000"));
}

describe("OrderFormDialog — giảm giá theo dòng hàng", () => {
  it("nhập tiền giảm → Tổng số tiền = (đơn giá − giảm) × SL", async () => {
    const user = userEvent.setup();
    renderCreateDialog();
    await pickProduct(user);

    // Ô số lượng ép min=1 ngay khi rỗng nên không clear+type được; đổi giá trị thẳng.
    // SL 3 (không phải 2) để không dính giảm giá tự động của dòng SL 2.
    fireEvent.change(fieldNear("Số lượng", "spinbutton"), { target: { value: "3" } });
    await user.type(fieldNear("Giảm giá"), "10000");

    await waitFor(() => expect(fieldNear("Tổng số tiền").value).toBe("270,000"));
  });

  it("đổi SL sang 2 → tự điền giảm 100k mỗi sản phẩm (200k cả dòng)", async () => {
    const user = userEvent.setup();
    renderCreateDialog();
    await pickProduct(user);

    fireEvent.change(fieldNear("Số lượng", "spinbutton"), { target: { value: "2" } });

    await waitFor(() => expect(fieldNear("Giảm giá").value).toBe("100,000"));
  });

  it("chuyển sang % → tiền giảm tính theo đơn giá", async () => {
    const user = userEvent.setup();
    renderCreateDialog();
    await pickProduct(user);

    await user.click(screen.getByRole("button", { name: "%" }));
    await user.type(fieldNear("Giảm giá"), "10");

    await waitFor(() => expect(fieldNear("Tổng số tiền").value).toBe("90,000"));
  });
});
