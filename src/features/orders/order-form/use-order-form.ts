import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  normalizeDecimalInput as normalizeNumericInput,
  parseDimensions,
} from "@/features/orders/order-normalizers";
import { ORDER_SOURCE_OPTIONS } from "@/features/orders/order-source";
import { ORDER_VAT_OPTIONS } from "@/features/orders/vat";
import { type OrderRow, type ProductRow } from "@/features/orders/order-types";
import {
  getBranchOptionsForChannel,
  type CreateOrderPayload,
} from "@/features/orders/use-orders-data";
import { staffOptionsForChannel, withSelectedStaffOption } from "@/features/orders/channel-staff";
import { getKiotVietLocationData } from "@/lib/api/orders";
import { getWarehouses, type Warehouse } from "@/lib/api/warehouses";
import { swallowError } from "@/lib/errors";
import { useI18n } from "@/i18n";

import {
  calculateItemsTotal,
  DEFAULT_FORM_VALUES,
  findPackageForQuantity,
  formatAmountValue,
  groupProductOptions,
  mapOrderToForm,
  packageUnitPrice,
  parseAmount,
  productToOption,
  toDateTimeLocalInputValue,
  type ChannelOption,
  type EditableOrderItem,
  type OrderSelectOption,
  type ProductOption,
} from "./order-form-helpers";
import { useOrderFormCustomer } from "./use-order-form-customer";
import { useOrderFormProducts } from "./use-order-form-products";
import { useOrderFormStock } from "./use-order-form-stock";

type Translate = ReturnType<typeof useI18n>["t"];

export type OrderDialogMode = "create" | "edit";

type ProductOptionGroup = { label: string; options: ProductOption[] };

/** Trải nhóm thành danh sách phẳng có `group` (ô chọn tự vẽ header nhóm). */
function flattenProductGroups(groups: ProductOptionGroup[]): ProductOption[] {
  return groups.flatMap((group) =>
    group.options.map((option) => ({ ...option, group: group.label })),
  );
}

/** Các ô tiền có hành vi "focus vào thì xoá số 0" dùng chung của form đơn. */
export type ClearZeroField =
  | "weight"
  | "total_amount"
  | "shipping_fee"
  | "discount_amount"
  | "booking_voucher_discount"
  | "total_after_discount"
  | "other_price";

export type KiotVietChannelOption = {
  id: number;
  name: string;
  branch_id?: string;
  branch_ids?: string[];
};

type UseOrderFormArgs = {
  open: boolean;
  mode: OrderDialogMode;
  initialOrder: OrderRow | null;
  channels: ChannelOption[];
  products: ProductRow[];
  /** Xem docblock prop cùng tên ở OrderFormDialog. */
  productsPriceBook: string;
  onSearchProducts?: (
    query: string,
    options?: { limit?: number; signal?: AbortSignal; priceBook?: string },
  ) => Promise<ProductRow[]>;
  onEnsureProductsLoaded?: (options?: { force?: boolean; priceBook?: string }) => Promise<void>;
  kiotvietOptions: KiotVietChannelOption[];
  channelStaffByCode: Record<string, Array<{ id: number; name: string }>>;
  kocMode: boolean;
  canAssignSale: boolean;
  currentUserId: number | null;
  onFetchOrderHistoryByPhone: (
    phone: string,
    options?: { signal?: AbortSignal },
  ) => Promise<OrderRow[]>;
  onLookupCustomerByPhone: (
    phone: string,
    options?: { signal?: AbortSignal },
  ) => Promise<{
    id: number;
    code?: string;
    full_name?: string;
    phone_raw: string;
    phone_normalized: string;
    gender?: number | null;
  } | null>;
  t: Translate;
};

/**
 * Toàn bộ state + effect + dữ liệu dẫn xuất của form đơn hàng: seed form theo
 * mode/đơn đang sửa, catalog sản phẩm theo bảng giá của kênh, các option cho
 * dropdown, thao tác trên dòng hàng và tra cứu khách theo SĐT.
 *
 * OrderFormDialog chỉ còn lắp ráp các section trình bày từ giá trị hook này trả về.
 */
export function useOrderForm({
  open,
  mode,
  initialOrder,
  channels,
  products,
  productsPriceBook,
  onSearchProducts,
  onEnsureProductsLoaded,
  kiotvietOptions,
  channelStaffByCode,
  kocMode,
  canAssignSale,
  currentUserId,
  onFetchOrderHistoryByPhone,
  onLookupCustomerByPhone,
  t,
}: UseOrderFormArgs) {
  const [form, setForm] = useState<CreateOrderPayload>({ ...DEFAULT_FORM_VALUES });
  const [focusedPriceIndex, setFocusedPriceIndex] = useState<number | null>(null);
  const [dimensionParts, setDimensionParts] = useState<[string, string, string]>(["", "", ""]);

  const isCreateMode = mode === "create";

  // Danh sách kho xuất hàng (fulfillment_warehouse)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getWarehouses({ isActive: true, limit: 200 });
        if (!cancelled) setWarehouses(data.items);
      } catch (err: unknown) {
        // Cố ý nuốt — select sẽ rỗng, người dùng vẫn lưu được.
        swallowError(err, "orderForm.loadWarehouses");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // KiotViet location data for cascading dropdowns
  const [kvLocationData, setKvLocationData] = useState<Record<string, string[]>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getKiotVietLocationData();
        if (!cancelled) {
          setKvLocationData(data);
        }
      } catch (err: unknown) {
        // Cố ý nuốt — dropdown địa chỉ KV rỗng, form vẫn dùng được.
        swallowError(err, "orderForm.loadKiotVietLocations");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const locationOptions = useMemo(() => {
    return Object.keys(kvLocationData).map((loc) => ({ value: loc, label: loc }));
  }, [kvLocationData]);

  const wardOptions = useMemo(() => {
    const loc = form.kiotviet_location || "";
    if (!loc) return [];
    const wards = kvLocationData[loc] ?? [];
    return wards.map((w: string) => ({ value: w, label: w }));
  }, [kvLocationData, form.kiotviet_location]);

  // Latest-ref: các effect seed form dưới đây chủ đích chỉ chạy khi (open, mode,
  // initialOrder.id) đổi — KHÔNG chạy lại khi object initialOrder đổi identity
  // (parent refetch) để không reset form đè lên thao tác đang gõ của user.
  const initialOrderRef = useRef(initialOrder);
  useEffect(() => {
    initialOrderRef.current = initialOrder;
  });

  useEffect(() => {
    if (!open) return;
    // Phiên chỉnh sửa mới (mở dialog / đổi đơn đang sửa): dọn cờ "đã sửa giá tay" và
    // "sale vừa đổi kênh" của phiên trước — không được để rò rỉ sang đơn khác.
    manualPriceIndexesRef.current = new Set();
    channelChangedByUserRef.current = false;
    if (mode === "create") {
      // Bắt đầu với một dòng sản phẩm trống; người dùng tự tìm và chọn sản phẩm.
      const initialItems: EditableOrderItem[] = [{ quantity: 1 }];
      const initialTotal = formatAmountValue(calculateItemsTotal(initialItems));
      setForm({
        ...DEFAULT_FORM_VALUES,
        // Trang đơn KOC mặc định nguồn đơn là "koc"; vẫn cho phép đổi.
        order_source: kocMode ? "koc" : DEFAULT_FORM_VALUES.order_source,
        discount_amount: "0",
        booking_voucher_discount: "0",
        customer_prepaid: "0",
        total_amount: initialTotal,
        total_after_discount: initialTotal,
        created_at_override: toDateTimeLocalInputValue(),
        items: initialItems,
        weight: "",
        dimensions: "",
      });
      setDimensionParts(parseDimensions(""));
      return;
    }
    const mapped = mapOrderToForm(initialOrderRef.current);
    setForm(mapped);
    setDimensionParts(parseDimensions(mapped.dimensions));
  }, [open, mode, initialOrder?.id, kocMode]);

  // Không có quyền gán sale → đơn mới luôn đứng tên chính mình, khớp với BE
  // (order_crud_view ép staff = request.user). Chỉ áp cho đơn tạo mới: đơn đang
  // sửa phải giữ nguyên sale hiện tại, không được âm thầm kéo về người đang mở form.
  // Ngoại lệ: đang bật "chia đơn tự động" thì để TRỐNG cho bộ chia, đúng như BE —
  // điền sẵn chính mình sẽ vô hiệu hoá cờ (bộ chia bỏ qua đơn đã có sale).
  useEffect(() => {
    if (!open || canAssignSale || initialOrder || form.auto_assign_staff) return;
    setForm((prev) =>
      prev.staff_id === currentUserId ? prev : { ...prev, staff_id: currentUserId },
    );
  }, [open, canAssignSale, initialOrder, currentUserId, form.auto_assign_staff]);

  // Bảng giá suy từ kênh đang chọn. Sale không thấy khái niệm này trên form — chọn
  // kênh xong là catalog + giá các dòng tự đúng theo bảng giá của kênh đó.
  const priceBookCode = useMemo(() => {
    const channel = channels.find((item) => item.code === form.channel_code);
    return channel?.price_book?.code ?? "";
  }, [channels, form.channel_code]);

  // Bọc onSearchProducts để mọi lượt tìm sản phẩm trong form (gợi ý mặc định lúc mở
  // dialog, tìm khi gõ, nạp lại SKU của đơn cũ) đều theo đúng bảng giá đang chọn.
  const searchProductsForPriceBook = useCallback(
    (query: string, options?: { limit?: number; signal?: AbortSignal }) =>
      onSearchProducts
        ? onSearchProducts(query, { ...options, priceBook: priceBookCode })
        : Promise.resolve([] as ProductRow[]),
    [onSearchProducts, priceBookCode],
  );

  // Kênh đổi bảng giá → catalog nền (prop `products`) phải nạp lại theo bảng giá mới,
  // nếu không knownProducts chỉ được dọn (use-order-form-products) mà không có gì bù vào.
  //
  // force: true LUÔN LUÔN — cache FE có TTL 24h (STATIC_CATALOG_CACHE_TTL_MS trong
  // use-orders-catalogs.ts) theo từng bảng giá, nên không force thì một tab mở sẵn
  // trước khi ai đó sửa giá sẽ ăn cache cũ tới 24 tiếng dù server đã có giá mới:
  // ETag phía server làm đúng nhưng vô dụng vì request thậm chí không được gửi đi.
  // Endpoint /api/orders/products có Cache-Control: private, no-cache + ETag nên
  // force chỉ tốn một round-trip revalidate (304 rỗng khi không đổi gì).
  useEffect(() => {
    if (!open) return;
    void onEnsureProductsLoaded?.({ priceBook: priceBookCode, force: true });
  }, [open, priceBookCode, onEnsureProductsLoaded]);

  // SKU của các dòng hàng đang có trên form — dùng để chủ động refetch đúng những
  // sản phẩm này theo bảng giá mới khi đổi kênh (xem use-order-form-products.ts).
  const currentLineSkus = useMemo(() => {
    const items = Array.isArray(form.items) ? (form.items as EditableOrderItem[]) : [];
    return Array.from(new Set(items.map((item) => (item.sku || "").trim()).filter(Boolean)));
  }, [form.items]);

  // Tồn BÁN ĐƯỢC của đúng những SKU trên form, tại kho xuất đang chọn — dùng
  // chung `currentLineSkus` với catalog sản phẩm, không tính lại tập SKU lần hai.
  const stock = useOrderFormStock({
    open,
    warehouseId: form.fulfillment_warehouse ?? null,
    skus: currentLineSkus,
  });

  const {
    groupedDefaultProductOptions,
    productById,
    productBySku,
    mergeProducts,
    ungroupedProductLabel,
  } = useOrderFormProducts({
    open,
    products,
    productsPriceBook,
    onSearchProducts: searchProductsForPriceBook,
    priceBookCode,
    lineSkus: currentLineSkus,
    t,
  });

  // Nguồn option cho ô chọn sản phẩm (SearchableSelect tự debounce 250ms): từ khoá
  // rỗng → danh sách gợi ý mặc định (không gọi server); có từ khoá → tìm theo
  // tên/SKU trên server theo đúng bảng giá đang chọn.
  const searchProductOptions = useCallback(
    async (input: string): Promise<ProductOption[]> => {
      if (!input) return flattenProductGroups(groupedDefaultProductOptions);
      if (!onSearchProducts) return [];
      try {
        const rows = await searchProductsForPriceBook(input);
        // Gắn nhãn đúng bảng giá đang chọn lúc gõ tìm (xem use-order-form-products.ts:
        // productById/productBySku chỉ nhận entry khớp nhãn này).
        mergeProducts(rows, priceBookCode);
        // Dùng chung phép gom nhóm với danh sách mặc định để đồng nhất cách hiển thị.
        return flattenProductGroups(
          groupProductOptions(rows.map(productToOption), ungroupedProductLabel),
        );
      } catch (err: unknown) {
        swallowError(err, "orderForm.searchProducts");
        return [];
      }
    },
    [
      groupedDefaultProductOptions,
      onSearchProducts,
      searchProductsForPriceBook,
      mergeProducts,
      ungroupedProductLabel,
      priceBookCode,
    ],
  );

  useEffect(() => {
    const totalAmount = parseAmount(form.total_amount);
    const discountAmount = parseAmount(form.discount_amount);
    const bookingVoucherDiscount = parseAmount(form.booking_voucher_discount);
    const calculated = formatAmountValue(totalAmount - discountAmount - bookingVoucherDiscount);
    setForm((prev) =>
      String(prev.total_after_discount || "") === calculated
        ? prev
        : { ...prev, total_after_discount: calculated },
    );
  }, [form.total_amount, form.discount_amount, form.booking_voucher_discount]);

  const staffOptions = useMemo(
    () => staffOptionsForChannel(channelStaffByCode, form.channel_code),
    [channelStaffByCode, form.channel_code],
  );

  // BE đã scope danh sách kênh theo phòng ban (xem channel_repositories_impl.list_for_user).
  // FE chỉ đảm bảo kênh đang chọn (đơn đang sửa) luôn xuất hiện trong dropdown, kể cả khi
  // kênh đó nằm ngoài phạm vi phòng ban — lấy nhãn từ initialOrder.
  const channelSelectOptions = useMemo<OrderSelectOption[]>(() => {
    const options = channels.map((item) => ({ value: item.code, label: item.name }));
    const selected = String(form.channel_code || "");
    if (selected && !options.some((opt) => opt.value === selected)) {
      options.unshift({
        value: selected,
        label: initialOrder?.channel_name || selected,
      });
    }
    return options;
  }, [channels, form.channel_code, initialOrder]);
  // Giống dropdown kênh: nhân viên đang gán luôn phải có option, kể cả khi đã nghỉ /
  // khác phòng ban nên không nằm trong danh sách BE trả về.
  const staffSelectOptions = useMemo<OrderSelectOption[]>(
    () =>
      withSelectedStaffOption(
        staffOptions.map((item) => ({ value: String(item.id), label: item.name })),
        form.staff_id,
        initialOrder?.staff_name,
      ),
    [staffOptions, form.staff_id, initialOrder],
  );
  const kiotvietSelectOptions = useMemo<OrderSelectOption[]>(
    () => kiotvietOptions.map((item) => ({ value: String(item.id), label: item.name })),
    [kiotvietOptions],
  );
  const orderSourceOptions = useMemo<OrderSelectOption[]>(
    () => ORDER_SOURCE_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
    [],
  );
  const vatOptions = useMemo<OrderSelectOption[]>(
    () => ORDER_VAT_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
    [],
  );
  const warehouseSelectOptions = useMemo<OrderSelectOption[]>(
    () => warehouses.map((w) => ({ value: String(w.id), label: w.name })),
    [warehouses],
  );
  // Tên kho đang chọn — nhãn của khối tồn kho dưới ô Kho xuất.
  const selectedWarehouseName = useMemo(
    () => warehouses.find((w) => w.id === form.fulfillment_warehouse)?.name ?? "",
    [warehouses, form.fulfillment_warehouse],
  );
  const selectedKiotviet = useMemo(
    () => kiotvietOptions.find((item) => item.id === form.kiotviet_channel_id),
    [kiotvietOptions, form.kiotviet_channel_id],
  );
  const branchSelectOptions = useMemo<OrderSelectOption[]>(
    () => getBranchOptionsForChannel(selectedKiotviet),
    [selectedKiotviet],
  );

  const customer = useOrderFormCustomer({
    open,
    mode,
    isCreateMode,
    phone: form.phone,
    setForm,
    onLookupCustomerByPhone,
    onFetchOrderHistoryByPhone,
    t,
  });

  // useCallback (thay vì hàm thường) để giữ identity ổn định xuyên render — cần thiết
  // vì effect tính lại giá khi đổi kênh (bên dưới) đưa hàm này vào dependency array.
  const updateItems = useCallback(
    (updater: (items: EditableOrderItem[]) => EditableOrderItem[]) => {
      setForm((prev) => {
        const currentItems = Array.isArray(prev.items) ? (prev.items as EditableOrderItem[]) : [];
        const nextItems = updater(currentItems).filter((item) => item.quantity > 0);
        const firstItem = nextItems[0];
        const nextItemsTotal = formatAmountValue(calculateItemsTotal(nextItems));
        return {
          ...prev,
          items: nextItems,
          sku: firstItem?.sku || "",
          quantity: firstItem?.quantity ?? 0,
          product:
            nextItems.length > 1
              ? `${nextItems.length} items`
              : firstItem?.sku || prev.product || "",
          total_amount: nextItemsTotal,
        };
      });
    },
    [],
  );

  const addItem = useCallback(() => {
    // Thêm dòng trống; người dùng tìm và chọn sản phẩm qua ô tìm kiếm.
    updateItems((items) => [...items, { quantity: 1 }]);
  }, [updateItems]);

  // Dòng đã sửa giá tay (đánh dấu ở ô "Đơn giá" của OrderFormItemsSection) được theo
  // dõi theo INDEX trong mảng items, dùng để effect tính lại giá khi đổi kênh (bên
  // dưới) bỏ qua.
  const manualPriceIndexesRef = useRef<Set<number>>(new Set());

  // Sale tự gõ giá một dòng: đánh dấu để effect tính lại giá theo bảng giá kênh
  // (khi đổi kênh) bỏ qua dòng đó, giữ giá đã sửa tay.
  const markItemPriceManuallyEdited = useCallback((index: number) => {
    manualPriceIndexesRef.current.add(index);
  }, []);

  // Xoá một dòng phải dồn lại các index đứng sau trong manualPriceIndexesRef, nếu
  // không cờ "đã sửa tay" sẽ dính nhầm sang dòng kế cận sau khi xoá.
  const removeItemAt = useCallback(
    (index: number) => {
      manualPriceIndexesRef.current = new Set(
        Array.from(manualPriceIndexesRef.current)
          .filter((markedIndex) => markedIndex !== index)
          .map((markedIndex) => (markedIndex > index ? markedIndex - 1 : markedIndex)),
      );
      updateItems((items) => items.filter((_, idx) => idx !== index));
    },
    [updateItems],
  );

  // Đánh dấu "sale VỪA đổi kênh trên form đang mở" — gắn trực tiếp ở onChange của ô
  // chọn kênh (OrderFormBasicSection), KHÔNG suy luận gián tiếp bằng cách so sánh
  // priceBookCode giữa các lần render: effect nạp dữ liệu đơn cũ (mode edit) CŨNG làm
  // channel_code đổi từ "" (giá trị mặc định lúc mount) sang kênh thật của đơn ở render
  // kế tiếp — nếu suy luận qua diff giá trị sẽ nhầm việc "nạp đơn cũ" thành "người dùng
  // đổi kênh" và tự ý sửa giá đơn cũ (đúng cái bẫy phải tránh). Effect dưới đọc cờ này
  // ở THỜI ĐIỂM CHẠY (ref là live-cell, không bị đóng băng theo render như biến thường)
  // nên không bị ảnh hưởng bởi effect nạp dữ liệu ở trên chạy trước nó trong cùng một
  // lượt flush.
  const channelChangedByUserRef = useRef(false);

  const markChannelChangedByUser = useCallback(() => {
    channelChangedByUserRef.current = true;
  }, []);

  // Đổi kênh → tính lại giá các dòng CHƯA bị sale sửa giá tay theo bảng giá mới; dòng
  // đã sửa tay giữ nguyên. KHÔNG tắt channelChangedByUserRef sau lần chạy đầu: lúc kênh
  // vừa đổi, knownProducts vừa bị dọn sạch (Step 7 ở use-order-form-products.ts) nên
  // catalog bảng giá mới thường CHƯA về kịp — `!product` bỏ qua dòng đó, và effect cần
  // chạy lại (vô hại, idempotent) khi productById cập nhật ở render sau, lúc catalog mới
  // đã về, để thực sự tính lại giá.
  useEffect(() => {
    if (!channelChangedByUserRef.current) return;
    updateItems((items) =>
      items.map((item, index) => {
        if (manualPriceIndexesRef.current.has(index)) return item;
        const product = item.product_id ? productById.get(item.product_id) : undefined;
        if (!product) return item;
        const pkg = findPackageForQuantity(product, Math.max(1, Number(item.quantity) || 1));
        return {
          ...item,
          unit_price: pkg ? packageUnitPrice(pkg) : product.price || item.unit_price,
        };
      }),
    );
  }, [priceBookCode, productById, updateItems]);

  const clearZeroOnFocus = useCallback((field: ClearZeroField) => {
    setForm((prev) => {
      const current = normalizeNumericInput(String(prev[field] ?? ""));
      if (current !== "0") return prev;
      return { ...prev, [field]: "" };
    });
  }, []);

  return {
    form,
    setForm,
    isCreateMode,
    focusedPriceIndex,
    setFocusedPriceIndex,
    dimensionParts,
    setDimensionParts,
    locationOptions,
    wardOptions,
    productById,
    productBySku,
    searchProductOptions,
    channelSelectOptions,
    staffSelectOptions,
    kiotvietSelectOptions,
    orderSourceOptions,
    vatOptions,
    warehouseSelectOptions,
    selectedWarehouseName,
    stock,
    branchSelectOptions,
    customer,
    updateItems,
    addItem,
    removeItemAt,
    markItemPriceManuallyEdited,
    markChannelChangedByUser,
    clearZeroOnFocus,
  };
}
