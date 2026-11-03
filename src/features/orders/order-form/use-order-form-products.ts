import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type ProductRow } from "@/features/orders/order-types";
import { swallowError } from "@/lib/errors";
import { useI18n } from "@/i18n";

import { groupProductOptions, productToOption, type ProductOption } from "./order-form-helpers";

type Translate = ReturnType<typeof useI18n>["t"];

type UseOrderFormProductsArgs = {
  open: boolean;
  products: ProductRow[];
  /**
   * Code bảng giá THẬT SỰ mà prop `products` hiện tại phản ánh ("" = bảng mặc
   * định) — do use-orders-catalogs.ts cấp, KHÔNG suy đoán từ `priceBookCode`.
   * Dùng riêng để gắn nhãn khi merge `products`, xem giải thích ở khai báo
   * knownEntries bên dưới (Finding 1 — tránh dán nhãn bảng MỚI cho dữ liệu CŨ).
   */
  productsPriceBook: string;
  /** Tìm sản phẩm theo tên/SKU trực tiếp trên server cho ô chọn sản phẩm. */
  onSearchProducts?: (
    query: string,
    options?: { limit?: number; signal?: AbortSignal },
  ) => Promise<ProductRow[]>;
  /** Code bảng giá suy từ kênh đang chọn trên form ("" = bảng mặc định). */
  priceBookCode: string;
  /**
   * SKU của các dòng hàng ĐANG có trên form (kể cả trước khi đổi kênh, và của
   * đơn cũ khi mở mode edit — form.items đã được nạp từ initialOrder trước khi
   * giá trị này tính lại). Dùng để chủ động refetch đúng những sản phẩm này
   * theo bảng giá mới, thay vì trông chờ danh sách gợi ý mặc định (có giới hạn
   * số lượng, sản phẩm phải gõ tìm mới ra sẽ không bao giờ nằm trong đó) — xem
   * effect refetch bên dưới.
   */
  lineSkus: string[];
  t: Translate;
};

/**
 * Catalog sản phẩm phục vụ form đơn: gộp danh mục "đã biết", nạp option mặc định
 * khi mở dialog, tìm kiếm server có debounce và 2 map tra cứu theo id/sku.
 *
 * Tách khỏi OrderFormDialog vì đây là một mối lo riêng (nguồn dữ liệu sản phẩm),
 * độc lập với state của form.
 */
export function useOrderFormProducts({
  open,
  products,
  productsPriceBook,
  onSearchProducts,
  priceBookCode,
  lineSkus,
  t,
}: UseOrderFormProductsArgs) {
  // Catalog "đã biết": gộp từ prop `products` (nếu có) + kết quả tìm kiếm server +
  // sản phẩm đã chọn. Dùng cho tra cứu nhãn/giá/cân nặng mà không cần tải toàn bộ.
  //
  // CĂN NGUYÊN BUG (đơn KOC bị ghi giá facebook thay vì giá web khi đổi kênh SAU
  // KHI đã chọn sản phẩm): trước đây mảng này chỉ lưu ProductRow trần, không có
  // thông tin "giá này thuộc bảng giá nào". Khi đổi kênh, effect tính lại giá ở
  // OrderFormDialog đọc `productById` NGAY TRONG CÙNG LƯỢT COMMIT mà state dọn
  // sạch (bên dưới) vừa lên lịch chạy nhưng CHƯA áp dụng (setState không đồng bộ
  // với các effect khác đã đăng ký trong cùng lượt render) — nên vẫn đọc trúng entry
  // sản phẩm được merge lúc bảng giá CŨ còn hiệu lực, và ghi nhầm giá đó coi như giá
  // của bảng mới. Nếu sản phẩm đó không có trong danh sách gợi ý mặc định của bảng
  // giá mới (phải gõ tìm mới ra) thì không có gì sửa lại giá sai này về sau.
  //
  // FIX: gắn nhãn `bookCode` (bảng giá tại THỜI ĐIỂM fetch) vào từng entry, và lọc
  // `productById`/`productBySku` (bên dưới) chỉ giữ entry có nhãn KHỚP priceBookCode
  // HIỆN TẠI. Việc lọc này tính lại ngay trong useMemo — tức NGAY TRONG RENDER lúc
  // priceBookCode vừa đổi, không phải chờ effect — nên không còn khe hở thời gian
  // nói trên: sản phẩm thuộc bảng giá cũ biến mất khỏi productById NGAY LẬP TỨC,
  // effect tính lại giá thấy `!product` và bỏ qua dòng đó (giữ nguyên giá cũ) thay vì
  // ghi giá sai — đúng nguyên tắc "thà không đổi giá còn hơn ghi giá sai".
  //
  // FINDING 1 (code review round 1): nhãn phải là SỰ THẬT, không phải suy đoán.
  // Merge từ `onSearchProducts` (gõ tìm, danh sách mặc định, refetch theo SKU) gắn
  // đúng `priceBookCode` vì chính request đó đã gửi `priceBook: priceBookCode` lên
  // server — nhãn đúng theo định nghĩa. NHƯNG merge từ prop `products` (catalog cấp
  // trang) KHÔNG được gắn theo `priceBookCode` hiện hành: prop này do trang cha nạp
  // bất đồng bộ (`onEnsureProductsLoaded`) và có thể CHƯA refetch kịp sau khi đổi
  // kênh — gắn theo `priceBookCode` đoán sẽ dán nhãn bảng MỚI lên dữ liệu còn CŨ,
  // tái lập đúng loại bug vừa sửa qua một đường khác. Phải dùng `productsPriceBook`
  // — nhãn do chính use-orders-catalogs.ts cấp, đi kèm ĐÚNG lúc `products` thực sự
  // được server trả về cho bảng giá nào.
  type KnownProductEntry = { product: ProductRow; bookCode: string };
  const [knownEntries, setKnownEntries] = useState<Map<number, KnownProductEntry>>(() => {
    const map = new Map<number, KnownProductEntry>();
    for (const item of products) map.set(item.id, { product: item, bookCode: productsPriceBook });
    return map;
  });
  const mergeProducts = useCallback((incoming: ProductRow[], bookCode: string) => {
    if (incoming.length === 0) return;
    setKnownEntries((prev) => {
      const map = new Map(prev);
      let changed = false;
      for (const item of incoming) {
        const existing = map.get(item.id);
        if (!existing || existing.product !== item || existing.bookCode !== bookCode) {
          changed = true;
        }
        map.set(item.id, { product: item, bookCode });
      }
      return changed ? map : prev;
    });
  }, []);

  // Option mặc định hiển thị khi mở menu (chưa gõ gì) — tải 1 lần mỗi lần mở dialog.
  // Lưu ở dạng phẳng; gom nhóm lúc render để dùng chung 1 phép biến đổi với kết quả async.
  const [defaultProductOptions, setDefaultProductOptions] = useState<ProductOption[]>([]);

  // Đổi bảng giá: danh sách gợi ý MẶC ĐỊNH (dropdown chưa gõ gì) phải dọn ngay, tránh
  // sale bấm chọn nhầm option còn hiển thị giá của bảng CŨ trong lúc chờ danh sách
  // mới tải xong. knownEntries KHÔNG cần dọn nữa — nhãn bookCode ở trên đã đảm bảo
  // entry bảng giá cũ tự động bị lọc khỏi productById/productBySku, đồng thời việc
  // giữ lại (thay vì xoá) còn cho phép quay lại bảng giá đã xem trước đó mà không
  // phải gọi lại server.
  const previousBookRef = useRef(priceBookCode);
  useEffect(() => {
    if (previousBookRef.current === priceBookCode) return;
    previousBookRef.current = priceBookCode;
    setDefaultProductOptions([]);
  }, [priceBookCode]);

  // Chạy lại khi `products` (nội dung) HOẶC `productsPriceBook` (nhãn) đổi — KHÔNG
  // phụ thuộc `priceBookCode`: đổi kênh xong mà `products` vẫn là mảng CŨ (tham
  // chiếu không đổi, trang cha chưa refetch xong) thì effect này KHÔNG được chạy
  // lại, tránh dán nhãn bảng mới lên dữ liệu cũ (xem Finding 1 ở trên).
  useEffect(() => {
    mergeProducts(products, productsPriceBook);
  }, [products, productsPriceBook, mergeProducts]);

  // Nhãn nhóm cho sản phẩm không thuộc nhóm nào.
  const ungroupedProductLabel = t("orders.placeholders.ungroupedProducts", "Khác");
  // Gom nhóm option mặc định (chia sẻ cùng phép biến đổi với loader async bên dưới).
  const groupedDefaultProductOptions = useMemo(
    () => groupProductOptions(defaultProductOptions, ungroupedProductLabel),
    [defaultProductOptions, ungroupedProductLabel],
  );

  // Mở dialog: tải danh sách option mặc định (hiển thị khi mở menu mà chưa gõ).
  useEffect(() => {
    if (!open || !onSearchProducts) {
      setDefaultProductOptions([]);
      return;
    }
    const controller = new AbortController();
    let active = true;
    void (async () => {
      try {
        const initial = await onSearchProducts("", { signal: controller.signal });
        if (!active) return;
        mergeProducts(initial, priceBookCode);
        setDefaultProductOptions(initial.map(productToOption));
      } catch (err: unknown) {
        // Bỏ qua lỗi tải gợi ý mặc định — người dùng vẫn gõ để tìm được.
        swallowError(err, "orderForm.loadDefaultProductOptions");
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [open, onSearchProducts, mergeProducts, priceBookCode]);

  // Chuỗi ổn định đại diện cho tập SKU đang có trên form — dùng làm dependency thay
  // vì mảng `lineSkus` (tham chiếu đổi mỗi lần OrderFormDialog render dù nội dung
  // không đổi). Hai chuỗi cùng nội dung luôn `===` nhau (primitive), nên effect bên
  // dưới chỉ chạy lại khi TẬP SKU thực sự đổi, không phải mỗi lần gõ liệu khác.
  const lineSkuKey = useMemo(() => lineSkus.join(","), [lineSkus]);

  // "Latest ref" của knownEntries — đọc TRONG effect bên dưới mà KHÔNG đưa vào
  // dependency array. Nếu đưa knownEntries vào deps, effect sẽ chạy lại mỗi khi
  // BẤT KỲ merge nào xảy ra (kể cả gõ tìm sản phẩm khác, không liên quan gì tới
  // dòng hàng hiện có) — vô nghĩa và tốn công tính toán. Ref cho phép đọc trạng
  // thái MỚI NHẤT ngay tại thời điểm effect thực sự chạy (theo lineSkuKey/
  // priceBookCode đổi) mà không kích hoạt thêm lượt chạy nào khác.
  const knownEntriesRef = useRef(knownEntries);
  knownEntriesRef.current = knownEntries;

  // CĂN NGUYÊN BUG (phần còn lại, xem giải thích ở khai báo knownEntries phía trên):
  // lọc theo nhãn bookCode chỉ đảm bảo KHÔNG ghi giá SAI, nhưng nếu sản phẩm đang
  // nằm trên dòng hàng không có trong danh sách gợi ý mặc định của bảng giá mới
  // (phải gõ tìm mới ra) thì productById không bao giờ có giá ĐÚNG cho sản phẩm đó
  // — giá cứ giữ nguyên giá cũ mãi mãi thay vì cập nhật theo bảng giá mới.
  //
  // FIX: mỗi khi đổi bảng giá (hoặc danh sách SKU trên form đổi — thêm dòng mới),
  // chủ động gọi lại onSearchProducts theo ĐÚNG SKU của từng dòng đang có, bất kể
  // mode create/edit — GỘP luôn việc "nạp sẵn chi tiết sản phẩm của đơn cũ lúc mở
  // form sửa đơn" vào effect này (code review round 1, Finding 2): form.items đã
  // được nạp từ initialOrder (effect map ở OrderFormDialog) trước khi `lineSkus`
  // tính lại, nên open dialog sửa đơn cũng tự nhiên rơi vào effect này — không cần
  // effect edit-mode riêng gọi trùng cùng SKU (trước đây gọi 2 lần mỗi khi mở đơn).
  //
  // Chỉ fetch SKU CHƯA có dữ liệu đúng bảng giá hiện tại (tra theo knownEntriesRef)
  // — thêm 1 dòng hàng mới không kéo theo refetch lại TOÀN BỘ SKU đã biết.
  useEffect(() => {
    if (!open || !onSearchProducts) return;
    const skus = lineSkuKey ? Array.from(new Set(lineSkuKey.split(",").filter(Boolean))) : [];
    if (skus.length === 0) return;
    const knownSkusForBook = new Set<string>();
    for (const entry of knownEntriesRef.current.values()) {
      if (entry.bookCode === priceBookCode) knownSkusForBook.add(entry.product.sku);
    }
    const missingSkus = skus.filter((sku) => !knownSkusForBook.has(sku));
    if (missingSkus.length === 0) return;
    const controller = new AbortController();
    let active = true;
    void (async () => {
      const results = await Promise.all(
        missingSkus.map((sku) =>
          onSearchProducts(sku, { signal: controller.signal }).catch((err: unknown) => {
            swallowError(err, "orderForm.fetchLineSkuProducts");
            return [] as ProductRow[];
          }),
        ),
      );
      if (!active) return;
      mergeProducts(
        results.flat().filter((product) => missingSkus.includes(product.sku)),
        priceBookCode,
      );
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [open, onSearchProducts, mergeProducts, priceBookCode, lineSkuKey]);

  // Chỉ giữ entry ĐÚNG bảng giá hiện tại — xem giải thích căn nguyên bug ở khai báo
  // knownEntries phía trên. Tính lại ngay trong render (useMemo), không qua effect.
  const productById = useMemo(() => {
    const map = new Map<number, ProductRow>();
    for (const entry of knownEntries.values()) {
      if (entry.bookCode === priceBookCode) map.set(entry.product.id, entry.product);
    }
    return map;
  }, [knownEntries, priceBookCode]);
  const productBySku = useMemo(() => {
    const map = new Map<string, ProductRow>();
    for (const entry of knownEntries.values()) {
      if (entry.bookCode === priceBookCode) map.set(entry.product.sku, entry.product);
    }
    return map;
  }, [knownEntries, priceBookCode]);

  return {
    groupedDefaultProductOptions,
    productById,
    productBySku,
    // Nguồn option tìm kiếm (`searchProductOptions`) dựng ở use-order-form.ts vì cần
    // bảng giá + callback tìm server; debounce do SearchableSelect lo.
    mergeProducts,
    ungroupedProductLabel,
  };
}
