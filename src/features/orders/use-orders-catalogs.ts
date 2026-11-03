import { useCallback, useRef, useState } from "react";
import { type FetchJson } from "@/services/http";

import { extractListPayload } from "@/lib/api/list-payload";
import { productsCatalogUrl } from "@/lib/api/products";
import {
  getFreshMapEntryValue,
  pruneExpiredMapEntries,
  setMapCacheWithLimit,
} from "@/lib/expiring-map-cache";
import type { KiotVietOption } from "@/features/orders/order-branch";
import { type OrderRow, type ProductRow } from "@/features/orders/order-types";

const PRODUCTS_FETCH_LIMIT = 10000;
const PRODUCTS_FETCH_MAX_PAGES = 1;
// Số sản phẩm trả về cho mỗi lần tìm kiếm server-side trong form đơn hàng.
const PRODUCTS_SEARCH_LIMIT = 20;
const STATIC_CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ADDRESS_PREFETCH_MAX_PROVINCES = 20;
const ADDRESS_PREFETCH_MAX_DISTRICTS = 80;
const DISTRICTS_CACHE_MAX_ENTRIES = 120;
const WARDS_CACHE_MAX_ENTRIES = 360;

export type AddressCatalogProvince = {
  code: string;
  name: string;
  type: string;
  label: string;
};

export type AddressCatalogDistrict = {
  code: string;
  key: string;
  name: string;
  type: string;
  label: string;
  province_code: string;
};

export type AddressCatalogWard = {
  code: string;
  key: string;
  name: string;
  type: string;
  label: string;
  district_code: string;
  district_key: string;
  province_code: string;
};

export type AddressCatalog = {
  provinces: AddressCatalogProvince[];
  districts_by_province: Record<string, AddressCatalogDistrict[]>;
  wards_by_district_key: Record<string, AddressCatalogWard[]>;
};

type LoadProductsOverrides = {
  force?: boolean;
  /** Code bảng giá của kênh đang chọn. Rỗng = bảng mặc định. */
  priceBook?: string;
};

async function fetchAllProductsCatalog(
  fetchJson: FetchJson,
  priceBook?: string,
): Promise<ProductRow[]> {
  const allProducts: ProductRow[] = [];
  let offset = 0;

  for (let page = 0; page < PRODUCTS_FETCH_MAX_PAGES; page += 1) {
    const data = await fetchJson(
      productsCatalogUrl({ limit: PRODUCTS_FETCH_LIMIT, offset, price_book: priceBook }),
    );
    const parsed = extractListPayload<ProductRow>(data);
    if (parsed.length === 0) {
      break;
    }
    allProducts.push(...parsed);
    if (parsed.length < PRODUCTS_FETCH_LIMIT) {
      break;
    }
    offset += PRODUCTS_FETCH_LIMIT;
  }

  return allProducts;
}

// Tìm kiếm sản phẩm theo tên/SKU trực tiếp trên server thay vì tải toàn bộ catalog.
async function searchProductsCatalog(
  fetchJson: FetchJson,
  query: string,
  options?: { limit?: number; signal?: AbortSignal; priceBook?: string },
): Promise<ProductRow[]> {
  const url = productsCatalogUrl({
    limit: options?.limit ?? PRODUCTS_SEARCH_LIMIT,
    offset: 0,
    q: query,
    price_book: options?.priceBook,
  });
  const data = await fetchJson(url, { signal: options?.signal });
  return extractListPayload<ProductRow>(data);
}

/**
 * Sở hữu cụm catalog tĩnh của trang Đơn hàng — tách khỏi `useOrdersData` (god hook).
 *
 * Gồm 3 catalog độc lập với danh sách đơn, mỗi cái có cache TTL riêng
 * (`STATIC_CATALOG_CACHE_TTL_MS`) + de-dup request đang bay (`*InFlightRef`):
 * - sản phẩm (`products`, `searchProducts`),
 * - kênh/chi nhánh KiotViet (`kiotvietOptions`),
 * - địa chỉ hành chính (`addressCatalog` + districts/wards nạp theo nhu cầu, giới hạn
 *   số entry bằng `DISTRICTS_CACHE_MAX_ENTRIES` / `WARDS_CACHE_MAX_ENTRIES`).
 *
 * Hành vi giữ NGUYÊN so với bản inline trong god hook: cùng thứ tự kiểm tra
 * cache → in-flight → fetch, cùng cách merge từng phần vào `addressCatalog`.
 */
export function useOrdersCatalogs(fetchJson: FetchJson) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  // Code bảng giá THẬT SỰ mà mảng `products` hiện tại đang phản ánh (server đã trả
  // về đúng bảng này) — "" = bảng mặc định. KHÔNG suy đoán từ kênh đang chọn trên
  // form: cập nhật đồng thời với `products` mỗi khi `loadProducts` set dữ liệu mới
  // (xem `applyProducts` bên dưới), nên form đơn luôn biết CHÍNH XÁC `products` có
  // phải dữ liệu của bảng giá đang cần hay còn là dữ liệu cũ chưa refetch kịp.
  const [productsPriceBook, setProductsPriceBook] = useState<string>("");
  const [kiotvietOptions, setKiotvietOptions] = useState<KiotVietOption[]>([]);
  const [addressCatalog, setAddressCatalog] = useState<AddressCatalog>({
    provinces: [],
    districts_by_province: {},
    wards_by_district_key: {},
  });

  // Cache/in-flight tách theo bảng giá (key = code bảng giá, "" = mặc định): đổi kênh
  // sang nền tảng khác mà dùng chung một ref thì form sẽ bán giá của kênh cũ.
  const productsCacheRef = useRef<Map<string, { value: ProductRow[]; expiresAt: number }>>(
    new Map(),
  );
  const productsInFlightRef = useRef<Map<string, Promise<ProductRow[]>>>(new Map());
  // Chống stale-write: hai lệnh loadProducts liên tiếp cho HAI bảng giá khác nhau
  // (vd nạp mặc định lúc mở section rồi đổi kênh ngay) chạy song song, không đảm bảo
  // thứ tự resolve — nếu request CŨ về SAU, nó không được phép ghi đè `products` bằng
  // dữ liệu bảng giá cũ. requestId tăng dần mỗi lệnh gọi; chỉ request đang giữ id MỚI
  // NHẤT tại thời điểm resolve mới được phép setProducts ("request mới nhất thắng").
  const productsRequestIdRef = useRef(0);
  const kiotvietOptionsCacheRef = useRef<{ value: KiotVietOption[]; expiresAt: number } | null>(
    null,
  );
  const kiotvietOptionsInFlightRef = useRef<Promise<KiotVietOption[]> | null>(null);
  const addressCatalogCacheRef = useRef<{ value: AddressCatalog; expiresAt: number } | null>(null);
  const addressCatalogInFlightRef = useRef<Promise<AddressCatalog> | null>(null);
  const districtsByProvinceCacheRef = useRef<
    Map<string, { value: AddressCatalogDistrict[]; expiresAt: number }>
  >(new Map());
  const districtsByProvinceInFlightRef = useRef<Map<string, Promise<AddressCatalogDistrict[]>>>(
    new Map(),
  );
  const wardsByDistrictCacheRef = useRef<
    Map<string, { value: AddressCatalogWard[]; expiresAt: number }>
  >(new Map());
  const wardsByDistrictInFlightRef = useRef<Map<string, Promise<AddressCatalogWard[]>>>(new Map());

  const isCacheFresh = (expiresAt: number) => Date.now() < expiresAt;

  const mergeAddressCatalog = useCallback((partial: Partial<AddressCatalog>) => {
    setAddressCatalog((prev) => {
      const next: AddressCatalog = {
        provinces: partial.provinces ?? prev.provinces,
        districts_by_province: partial.districts_by_province
          ? { ...prev.districts_by_province, ...partial.districts_by_province }
          : prev.districts_by_province,
        wards_by_district_key: partial.wards_by_district_key
          ? { ...prev.wards_by_district_key, ...partial.wards_by_district_key }
          : prev.wards_by_district_key,
      };
      addressCatalogCacheRef.current = {
        value: next,
        expiresAt: Date.now() + STATIC_CATALOG_CACHE_TTL_MS,
      };
      return next;
    });
  }, []);

  const clearProductsCache = useCallback(() => {
    productsCacheRef.current.clear();
    productsInFlightRef.current.clear();
  }, []);

  const clearKiotVietOptionsCache = useCallback(() => {
    kiotvietOptionsCacheRef.current = null;
    kiotvietOptionsInFlightRef.current = null;
  }, []);

  const clearAddressCatalogCache = useCallback(() => {
    addressCatalogCacheRef.current = null;
    addressCatalogInFlightRef.current = null;
    districtsByProvinceCacheRef.current.clear();
    districtsByProvinceInFlightRef.current.clear();
    wardsByDistrictCacheRef.current.clear();
    wardsByDistrictInFlightRef.current.clear();
  }, []);

  const loadDistrictsForProvince = useCallback(
    async (provinceCode: string, options?: { force?: boolean }) => {
      const normalizedProvinceCode = String(provinceCode || "").trim();
      if (!normalizedProvinceCode) return;

      if (!options?.force) {
        const now = Date.now();
        pruneExpiredMapEntries(districtsByProvinceCacheRef.current, now);
        const cached = getFreshMapEntryValue(
          districtsByProvinceCacheRef.current,
          normalizedProvinceCode,
          now,
        );
        if (cached) {
          mergeAddressCatalog({
            districts_by_province: {
              [normalizedProvinceCode]: cached,
            },
          });
          return;
        }
        const inFlight = districtsByProvinceInFlightRef.current.get(normalizedProvinceCode);
        if (inFlight) {
          const shared = await inFlight;
          mergeAddressCatalog({
            districts_by_province: {
              [normalizedProvinceCode]: shared,
            },
          });
          return;
        }
      }

      const request = (async () => {
        const query = new URLSearchParams({ province_code: normalizedProvinceCode });
        const data = await fetchJson(`/api/orders/address-catalog/districts?${query.toString()}`);
        const parsed = Array.isArray(data) ? data : [];
        setMapCacheWithLimit(
          districtsByProvinceCacheRef.current,
          normalizedProvinceCode,
          parsed,
          STATIC_CATALOG_CACHE_TTL_MS,
          DISTRICTS_CACHE_MAX_ENTRIES,
        );
        return parsed as AddressCatalogDistrict[];
      })();

      districtsByProvinceInFlightRef.current.set(normalizedProvinceCode, request);
      try {
        const parsed = await request;
        mergeAddressCatalog({
          districts_by_province: {
            [normalizedProvinceCode]: parsed,
          },
        });
      } finally {
        districtsByProvinceInFlightRef.current.delete(normalizedProvinceCode);
      }
    },
    [fetchJson, mergeAddressCatalog],
  );

  const loadWardsForDistrict = useCallback(
    async (provinceCode: string, districtCode: string, options?: { force?: boolean }) => {
      const normalizedProvinceCode = String(provinceCode || "").trim();
      const normalizedDistrictCode = String(districtCode || "").trim();
      if (!normalizedProvinceCode || !normalizedDistrictCode) return;
      const districtKey = `${normalizedProvinceCode}:${normalizedDistrictCode}`;

      if (!options?.force) {
        const now = Date.now();
        pruneExpiredMapEntries(wardsByDistrictCacheRef.current, now);
        const cached = getFreshMapEntryValue(wardsByDistrictCacheRef.current, districtKey, now);
        if (cached) {
          mergeAddressCatalog({
            wards_by_district_key: {
              [districtKey]: cached,
            },
          });
          return;
        }
        const inFlight = wardsByDistrictInFlightRef.current.get(districtKey);
        if (inFlight) {
          const shared = await inFlight;
          mergeAddressCatalog({
            wards_by_district_key: {
              [districtKey]: shared,
            },
          });
          return;
        }
      }

      const request = (async () => {
        const query = new URLSearchParams({
          province_code: normalizedProvinceCode,
          district_code: normalizedDistrictCode,
        });
        const data = await fetchJson(`/api/orders/address-catalog/wards?${query.toString()}`);
        const parsed = Array.isArray(data) ? data : [];
        setMapCacheWithLimit(
          wardsByDistrictCacheRef.current,
          districtKey,
          parsed,
          STATIC_CATALOG_CACHE_TTL_MS,
          WARDS_CACHE_MAX_ENTRIES,
        );
        return parsed as AddressCatalogWard[];
      })();

      wardsByDistrictInFlightRef.current.set(districtKey, request);
      try {
        const parsed = await request;
        mergeAddressCatalog({
          wards_by_district_key: {
            [districtKey]: parsed,
          },
        });
      } finally {
        wardsByDistrictInFlightRef.current.delete(districtKey);
      }
    },
    [fetchJson, mergeAddressCatalog],
  );

  const prefetchAddressCatalogForRows = useCallback(
    async (orderRows: OrderRow[]) => {
      if (!Array.isArray(orderRows) || orderRows.length === 0) return;

      const provinceCodes = Array.from(
        new Set(
          orderRows.map((row) => String(row.province_code || "").trim()).filter((code) => !!code),
        ),
      ).slice(0, ADDRESS_PREFETCH_MAX_PROVINCES);

      const districtPairs = Array.from(
        new Set(
          orderRows
            .map((row) => {
              const provinceCode = String(row.province_code || "").trim();
              const districtCode = String(row.district_code || "").trim();
              if (!provinceCode || !districtCode) return "";
              return `${provinceCode}:${districtCode}`;
            })
            .filter((pair) => !!pair),
        ),
      ).slice(0, ADDRESS_PREFETCH_MAX_DISTRICTS);

      await Promise.all([
        ...provinceCodes.map((provinceCode) => loadDistrictsForProvince(provinceCode)),
        ...districtPairs.map((pair) => {
          const [provinceCode, districtCode] = pair.split(":");
          return loadWardsForDistrict(provinceCode, districtCode);
        }),
      ]);
    },
    [loadDistrictsForProvince, loadWardsForDistrict],
  );

  // Set cả `products` LẪN `productsPriceBook` cùng lúc — nhãn này là SỰ THẬT (bảng
  // giá server vừa trả về), không phải suy đoán từ kênh đang chọn trên form. Form
  // đơn (use-order-form-products.ts) dùng nhãn này để biết `products` hiện tại có
  // thực sự thuộc bảng giá đang cần hay không, tránh gắn nhầm dữ liệu cũ là mới.
  const applyProducts = useCallback((bookKey: string, parsed: ProductRow[]) => {
    setProducts(parsed);
    setProductsPriceBook(bookKey);
  }, []);

  const loadProducts = useCallback(
    async (overrides?: LoadProductsOverrides) => {
      const bookKey = overrides?.priceBook ?? "";
      // Đăng ký lượt gọi này là "mới nhất" NGAY từ đầu (kể cả khi trả lời từ cache/
      // in-flight) — một lệnh loadProducts KHÁC gọi sau đó, dù cho bảng giá nào, sẽ
      // khiến requestId này lỗi thời và bị chặn setProducts ở dưới.
      const requestId = (productsRequestIdRef.current += 1);
      const isStale = () => requestId !== productsRequestIdRef.current;

      const cached = productsCacheRef.current.get(bookKey);
      if (!overrides?.force && cached && isCacheFresh(cached.expiresAt)) {
        if (!isStale()) applyProducts(bookKey, cached.value);
        return;
      }
      const inFlight = productsInFlightRef.current.get(bookKey);
      if (!overrides?.force && inFlight) {
        const shared = await inFlight;
        if (!isStale()) applyProducts(bookKey, shared);
        return;
      }

      const request = (async () => {
        const parsed = await fetchAllProductsCatalog(fetchJson, overrides?.priceBook);
        productsCacheRef.current.set(bookKey, {
          value: parsed,
          expiresAt: Date.now() + STATIC_CATALOG_CACHE_TTL_MS,
        });
        return parsed;
      })();
      productsInFlightRef.current.set(bookKey, request);
      try {
        const parsed = await request;
        if (!isStale()) applyProducts(bookKey, parsed);
      } finally {
        productsInFlightRef.current.delete(bookKey);
      }
    },
    [fetchJson, applyProducts],
  );

  const searchProducts = useCallback(
    (query: string, options?: { limit?: number; signal?: AbortSignal; priceBook?: string }) =>
      searchProductsCatalog(fetchJson, query, options),
    [fetchJson],
  );

  const loadKiotVietOptions = useCallback(
    async (options?: { force?: boolean }) => {
      if (
        !options?.force &&
        kiotvietOptionsCacheRef.current &&
        isCacheFresh(kiotvietOptionsCacheRef.current.expiresAt)
      ) {
        setKiotvietOptions(kiotvietOptionsCacheRef.current.value);
        return;
      }
      if (!options?.force && kiotvietOptionsInFlightRef.current) {
        const shared = await kiotvietOptionsInFlightRef.current;
        setKiotvietOptions(shared);
        return;
      }

      const request = (async () => {
        const data = await fetchJson("/api/orders/kiotviet-options");
        const parsed = Array.isArray(data) ? data : [];
        kiotvietOptionsCacheRef.current = {
          value: parsed,
          expiresAt: Date.now() + STATIC_CATALOG_CACHE_TTL_MS,
        };
        return parsed;
      })();
      kiotvietOptionsInFlightRef.current = request;
      try {
        const parsed = await request;
        setKiotvietOptions(parsed);
      } finally {
        kiotvietOptionsInFlightRef.current = null;
      }
    },
    [fetchJson],
  );

  const loadAddressCatalog = useCallback(
    async (options?: { force?: boolean }) => {
      if (
        !options?.force &&
        addressCatalogCacheRef.current &&
        isCacheFresh(addressCatalogCacheRef.current.expiresAt)
      ) {
        setAddressCatalog(addressCatalogCacheRef.current.value);
        return;
      }
      if (!options?.force && addressCatalogInFlightRef.current) {
        const shared = await addressCatalogInFlightRef.current;
        setAddressCatalog(shared);
        return;
      }
      const request = (async () => {
        // Endpoint /api/orders/address-catalog/provinces chưa được implement
        // backend → skip fetch, trả empty list. Districts/wards loaders
        // riêng vẫn giữ; chúng sẽ no-op nếu user không tương tác.
        const parsedProvinces: AddressCatalogProvince[] = [];
        const existing = addressCatalogCacheRef.current?.value;
        const parsed: AddressCatalog = {
          provinces: parsedProvinces,
          districts_by_province: existing?.districts_by_province ?? {},
          wards_by_district_key: existing?.wards_by_district_key ?? {},
        };
        addressCatalogCacheRef.current = {
          value: parsed,
          expiresAt: Date.now() + STATIC_CATALOG_CACHE_TTL_MS,
        };
        return parsed;
      })();
      addressCatalogInFlightRef.current = request;
      try {
        const parsed = await request;
        mergeAddressCatalog({ provinces: parsed.provinces });
      } finally {
        addressCatalogInFlightRef.current = null;
      }
    },
    [mergeAddressCatalog],
  );

  const getOrdersCacheStats = useCallback(() => {
    const now = Date.now();
    pruneExpiredMapEntries(districtsByProvinceCacheRef.current, now);
    pruneExpiredMapEntries(wardsByDistrictCacheRef.current, now);

    return {
      orders: {
        size: 0,
        inFlight: 0,
      },
      districtsByProvince: {
        size: districtsByProvinceCacheRef.current.size,
        inFlight: districtsByProvinceInFlightRef.current.size,
      },
      wardsByDistrict: {
        size: wardsByDistrictCacheRef.current.size,
        inFlight: wardsByDistrictInFlightRef.current.size,
      },
    };
  }, []);

  // Phần catalog của `resetOrdersData`: dọn state + mọi cache/in-flight ref.
  const resetCatalogs = useCallback(() => {
    setProducts([]);
    setProductsPriceBook("");
    setKiotvietOptions([]);
    setAddressCatalog({ provinces: [], districts_by_province: {}, wards_by_district_key: {} });
    clearProductsCache();
    clearKiotVietOptionsCache();
    clearAddressCatalogCache();
  }, [clearAddressCatalogCache, clearKiotVietOptionsCache, clearProductsCache]);

  return {
    products,
    productsPriceBook,
    kiotvietOptions,
    addressCatalog,
    loadProducts,
    searchProducts,
    loadKiotVietOptions,
    loadAddressCatalog,
    loadDistrictsForProvince,
    loadWardsForDistrict,
    prefetchAddressCatalogForRows,
    clearProductsCache,
    clearKiotVietOptionsCache,
    clearAddressCatalogCache,
    getOrdersCacheStats,
    resetCatalogs,
  };
}
