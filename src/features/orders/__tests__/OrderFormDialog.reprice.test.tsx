import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OrderFormDialog } from "@/features/orders/OrderFormDialog";
import type { ChannelOption } from "@/features/orders/order-form/order-form-helpers";
import type { OrderRow, ProductRow } from "@/features/orders/order-types";
import { I18nProvider } from "@/i18n";

afterEach(cleanup);

const CHANNELS: ChannelOption[] = [
  { code: "facebook", name: "Facebook", price_book: null },
  { code: "web", name: "Web", price_book: { id: 2, code: "web", name: "Web" } },
];

const productFor = (price: string): ProductRow => ({
  id: 1,
  name: "Sản phẩm A",
  sku: "SKU-A",
  price,
  is_active: true,
  packages: [{ id: 1, quantity: 1, price, weight: 0, length: 0, width: 0, height: 0 }],
  created_at: "",
  updated_at: "",
});

function noop() {
  return Promise.resolve();
}

function baseProps() {
  return {
    open: true,
    onOpenChange: vi.fn(),
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
    // Nhãn bảng giá THẬT của prop `products` mặc định trong các test dưới đây —
    // "" (facebook) khớp với dữ liệu `productFor(...)` được truyền kèm. Test nào
    // cố tình mô phỏng "trang cha chưa refetch kịp" phải override giá trị này
    // đúng bảng giá mà `products` thực sự đại diện (xem use-orders-catalogs.ts).
    productsPriceBook: "",
  };
}

/** Tìm ô combobox (SearchableSelect) nằm ngay dưới <label> có text `labelText`. */
function comboboxNear(labelText: string) {
  const label = screen.getAllByText(labelText).find((el) => el.tagName === "LABEL");
  if (!label?.parentElement) throw new Error(`Không tìm thấy label "${labelText}"`);
  return within(label.parentElement).getByRole("combobox");
}

/** Tìm input (Input shadcn) nằm ngay dưới <label> có text `labelText`. */
function textboxNear(labelText: string) {
  const label = screen.getAllByText(labelText).find((el) => el.tagName === "LABEL");
  if (!label?.parentElement) throw new Error(`Không tìm thấy label "${labelText}"`);
  return within(label.parentElement).getByRole("textbox") as HTMLInputElement;
}

async function selectProductForFirstRow(user: ReturnType<typeof userEvent.setup>) {
  const productCombobox = comboboxNear("Sản phẩm");
  await user.click(productCombobox);
  const option = await screen.findByRole("option", { name: "SKU-A" });
  await user.click(option);
}

async function changeChannel(user: ReturnType<typeof userEvent.setup>, label: string) {
  const combobox = comboboxNear("Kênh bán hàng");
  await user.click(combobox);
  await user.type(combobox, label);
  const option = await screen.findByRole("option", { name: label });
  await user.click(option);
}

function buildOnSearchProducts() {
  return vi.fn(
    async (
      _query: string,
      options?: { limit?: number; signal?: AbortSignal; priceBook?: string },
    ) => {
      const price = options?.priceBook === "web" ? "130000" : "100000";
      return [productFor(price)];
    },
  );
}

/**
 * Mock sát production hơn `buildOnSearchProducts`: sản phẩm CHỈ được trả về khi
 * gõ tìm (query khớp). Danh sách gợi ý mặc định (query rỗng — dùng để nạp
 * `defaultProductOptions` lúc mở dialog HOẶC ngay sau khi đổi bảng giá) KHÔNG
 * chứa sản phẩm này, đúng như báo cáo: "sản phẩm phải gõ tìm mới ra, không có
 * sẵn trong danh sách gợi ý mặc định".
 */
function buildOnSearchProductsRequiresTyping() {
  return vi.fn(
    async (
      query: string,
      options?: { limit?: number; signal?: AbortSignal; priceBook?: string },
    ) => {
      if (!query) return [];
      const price = options?.priceBook === "web" ? "130000" : "100000";
      return [productFor(price)];
    },
  );
}

/** Chọn sản phẩm cho dòng đầu bằng cách GÕ TÌM (khác `selectProductForFirstRow`
 * vốn dựa vào danh sách gợi ý mặc định đã có sẵn sản phẩm). */
async function selectProductByTyping(user: ReturnType<typeof userEvent.setup>, query: string) {
  const productCombobox = comboboxNear("Sản phẩm");
  await user.click(productCombobox);
  await user.type(productCombobox, query);
  const option = await screen.findByRole("option", { name: "SKU-A" });
  await user.click(option);
}

describe("OrderFormDialog — tính lại giá khi đổi kênh", () => {
  it("đổi kênh sang bảng giá 'web' → dòng chưa sửa tay đổi unit_price từ 100000 sang 130000", async () => {
    const user = userEvent.setup();
    const onSearchProducts = buildOnSearchProducts();
    render(
      <I18nProvider>
        <OrderFormDialog
          {...baseProps()}
          mode="create"
          initialOrder={null}
          products={[productFor("100000")]}
          onSearchProducts={onSearchProducts}
        />
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(onSearchProducts).toHaveBeenCalledWith("", expect.objectContaining({ priceBook: "" })),
    );
    await selectProductForFirstRow(user);
    await waitFor(() => expect(textboxNear("Đơn giá").value).toBe("100,000"));

    await changeChannel(user, "Web");

    await waitFor(() => expect(textboxNear("Đơn giá").value).toBe("130,000"), { timeout: 3000 });
  });

  it("[H1] SP phải gõ tìm mới ra + catalog trang chưa refetch → đổi kênh KHÔNG được ghi giá bảng CŨ", async () => {
    // Tái hiện đúng điều kiện production (khác test phía trên):
    // - onSearchProducts CHỈ trả sản phẩm khi gõ tìm (query khớp); danh sách gợi ý
    //   mặc định (query rỗng) LUÔN rỗng — sản phẩm "phải gõ tìm mới ra".
    // - prop `products` cấp trang GIỮ NGUYÊN dữ liệu bảng giá mặc định trong suốt
    //   test (mô phỏng catalog của bảng "web" chưa fetch xong / về chậm).
    const user = userEvent.setup();
    const onSearchProducts = buildOnSearchProductsRequiresTyping();
    render(
      <I18nProvider>
        <OrderFormDialog
          {...baseProps()}
          mode="create"
          initialOrder={null}
          products={[productFor("100000")]}
          onSearchProducts={onSearchProducts}
        />
      </I18nProvider>,
    );

    // Gõ tìm chọn sản phẩm (đúng như production — không có sẵn trong gợi ý mặc định).
    await selectProductByTyping(user, "SKU-A");
    await waitFor(() => expect(textboxNear("Đơn giá").value).toBe("100,000"));

    await changeChannel(user, "Web");

    // Kỳ vọng ĐÚNG: đơn giá phải theo bảng giá "web" (130000). Nguyên tắc: thà
    // không đổi giá còn hơn ghi giá sai — nên timeout ở giá trị KHÁC 130000 (kể cả
    // giữ nguyên 100000) đều là bug, không phải hành vi chấp nhận được.
    await waitFor(() => expect(textboxNear("Đơn giá").value).toBe("130,000"), {
      timeout: 3000,
    });
  });

  it("dòng đã sửa giá tay giữ nguyên sau khi đổi kênh", async () => {
    const user = userEvent.setup();
    const onSearchProducts = buildOnSearchProducts();
    render(
      <I18nProvider>
        <OrderFormDialog
          {...baseProps()}
          mode="create"
          initialOrder={null}
          products={[productFor("100000")]}
          onSearchProducts={onSearchProducts}
        />
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(onSearchProducts).toHaveBeenCalledWith("", expect.objectContaining({ priceBook: "" })),
    );
    await selectProductForFirstRow(user);
    await waitFor(() => expect(textboxNear("Đơn giá").value).toBe("100,000"));

    const priceInput = textboxNear("Đơn giá");
    await user.clear(priceInput);
    await user.type(priceInput, "99000");
    // Input đang focus: displayPrice hiển thị KHÔNG định dạng dấu phẩy (xem OrderFormDialog).
    await waitFor(() => expect(textboxNear("Đơn giá").value).toBe("99000"));

    await changeChannel(user, "Web");

    // Đợi catalog nạp lại theo bảng giá web rồi khẳng định giá dòng đã sửa tay KHÔNG đổi.
    await waitFor(() =>
      expect(onSearchProducts).toHaveBeenCalledWith(
        "",
        expect.objectContaining({ priceBook: "web" }),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(textboxNear("Đơn giá").value).toBe("99,000");
  });

  it("mở đơn cũ (mode edit) KHÔNG tự tính lại giá khi chỉ mở form", async () => {
    const onSearchProducts = buildOnSearchProducts();
    const order: OrderRow = {
      id: 10,
      channel_code: "web",
      channel_name: "Web",
      customer_phone: "0900000000",
      customer_code: "KH001",
      status: 1,
      total_amount: "100000",
      shipping_fee: "0",
      shipping_code: "",
      can_edit: true,
      items: [
        {
          id: 1,
          product_id: 1,
          product_name: "Sản phẩm A",
          sku: "SKU-A",
          quantity: 1,
          unit_price: "100000",
          line_total: "100000",
        },
      ],
    };

    render(
      <I18nProvider>
        <OrderFormDialog
          {...baseProps()}
          mode="edit"
          initialOrder={order}
          products={[productFor("130000")]}
          productsPriceBook="web"
          onSearchProducts={onSearchProducts}
        />
      </I18nProvider>,
    );

    // `products` đã gắn đúng nhãn "web" (khớp priceBookCode của đơn) nên effect
    // refetch-theo-SKU (use-order-form-products.ts) THẤY SKU-A đã có sẵn dữ liệu
    // đúng bảng giá và bỏ qua, KHÔNG gọi lại onSearchProducts("SKU-A", ...) nữa —
    // đây là tối ưu cố ý (Finding 2, code review round 1), không phải regression.
    // Đồng bộ hoá bằng lượt gọi danh sách gợi ý mặc định (luôn chạy, không bị tối
    // ưu này ảnh hưởng) rồi mới khẳng định giá KHÔNG tự tính lại.
    await waitFor(() =>
      expect(onSearchProducts).toHaveBeenCalledWith(
        "",
        expect.objectContaining({ priceBook: "web" }),
      ),
    );
    // Chờ thêm một nhịp để chắc chắn nếu có bug reprice thì đã kịp xảy ra.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(textboxNear("Đơn giá").value).toBe("100,000");
  });

  it("mở dialog luôn phát request catalog thay vì ăn cache TTL 24h (force: true)", async () => {
    const onSearchProducts = buildOnSearchProducts();
    const onEnsureProductsLoaded = vi.fn().mockResolvedValue(undefined);
    render(
      <I18nProvider>
        <OrderFormDialog
          {...baseProps()}
          mode="create"
          initialOrder={null}
          products={[productFor("100000")]}
          onSearchProducts={onSearchProducts}
          onEnsureProductsLoaded={onEnsureProductsLoaded}
        />
      </I18nProvider>,
    );

    // Nếu thiếu force:true, một tab đã mở sẵn trước khi giá được sửa ở server sẽ
    // tiếp tục ăn cache TTL 24h (STATIC_CATALOG_CACHE_TTL_MS) và không bao giờ có
    // cơ hội thấy giá mới, dù ETag phía server đã sẵn sàng phục vụ revalidate.
    await waitFor(() =>
      expect(onEnsureProductsLoaded).toHaveBeenCalledWith(
        expect.objectContaining({ priceBook: "", force: true }),
      ),
    );
  });

  it("[Finding 1] prop `products` cấp trang trễ hơn priceBookCode → KHÔNG được dán nhãn bảng MỚI lên giá trị CŨ", async () => {
    // Round 1 sửa lỗi "sản phẩm phải gõ tìm mới ra" (test H1) nhưng lọt một đường
    // thứ 5: effect merge prop `products` có `priceBookCode` trong dependency array
    // nên vẫn chạy lại NGAY khi đổi kênh dù `products` (mảng cấp trang, không tự
    // mang nhãn bảng giá) chưa kịp refetch — dán nhầm nhãn bảng MỚI lên dữ liệu CŨ.
    // Test này KHÔNG cần điều kiện "gõ tìm mới ra": chỉ cần `products` trễ hơn
    // `priceBookCode`, điều gần như chắc chắn xảy ra ngay khoảnh khắc đổi kênh.
    const user = userEvent.setup();
    // Request theo SKU cho bảng "web" TREO VĨNH VIỄN (mô phỏng mạng lỗi) — loại bỏ
    // khả năng effect refetch-theo-SKU tự sửa lại giá, để cô lập đúng hazard của
    // đường merge `products`. Bảng "" (facebook) vẫn hoạt động bình thường.
    const onSearchProducts = vi.fn(
      (_query: string, options?: { limit?: number; signal?: AbortSignal; priceBook?: string }) => {
        if (options?.priceBook === "web") return new Promise<ProductRow[]>(() => {});
        if (!_query) return Promise.resolve([] as ProductRow[]);
        return Promise.resolve([productFor("100000")]);
      },
    );
    render(
      <I18nProvider>
        <OrderFormDialog
          {...baseProps()}
          mode="create"
          initialOrder={null}
          // 777777 là giá KHÔNG BAO GIỜ được onSearchProducts trả về ở bất kỳ bảng
          // giá nào — nếu nó xuất hiện trên ô Đơn giá, đó là bằng chứng trực tiếp
          // dữ liệu CŨ của `products` bị dán nhầm nhãn bảng giá MỚI.
          products={[productFor("777777")]}
          productsPriceBook=""
          onSearchProducts={onSearchProducts}
        />
      </I18nProvider>,
    );

    await selectProductByTyping(user, "SKU-A");
    await waitFor(() => expect(textboxNear("Đơn giá").value).toBe("100,000"));

    await changeChannel(user, "Web");

    // `products` (cấp trang) KHÔNG đổi và request refetch-theo-SKU của bảng "web"
    // treo vĩnh viễn — nguyên tắc "thà không đổi giá còn hơn ghi giá sai": giá phải
    // giữ nguyên 100.000, TUYỆT ĐỐI không được nhảy sang 777.777.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(textboxNear("Đơn giá").value).not.toBe("777,777");
    expect(textboxNear("Đơn giá").value).toBe("100,000");
  });
});
