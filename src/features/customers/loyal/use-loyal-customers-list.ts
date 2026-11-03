import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getDateRange } from "@/components/ui/date-filter";
import { useI18n } from "@/i18n";
import {
  customerKeys,
  useLoyalCustomers,
  useSegmentCategories,
} from "@/features/customers/queries";
import { useProductCategories } from "@/features/products/queries";
import {
  ALL_CATEGORIES,
  ALL_SEGMENTS,
  buildLoyalListParams,
  clampPageSize,
  type DateRange,
  type PresetKey,
} from "./loyal-format";

const getScrollableContainer = (): HTMLElement | null =>
  document.querySelector("main.overflow-y-auto");

/** Bộ lọc (thời gian / phân khúc / danh mục) + phân trang + dữ liệu bảng khách thân thiết. */
export function useLoyalCustomersList() {
  const { t } = useI18n();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Bộ lọc thời gian — null = toàn thời gian.
  const [range, setRange] = useState<DateRange>(null);
  const [activePreset, setActivePreset] = useState<PresetKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Bộ lọc phân khúc — ALL_SEGMENTS = tất cả.
  const [segment, setSegment] = useState<string>(ALL_SEGMENTS);

  // Bộ lọc danh mục sản phẩm — ALL_CATEGORIES = tất cả.
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  // Chỉ chạy truy vấn khách thân thiết sau khi đã áp danh mục mặc định (nếu có) —
  // tránh fetch thừa lần đầu (tất cả danh mục → danh mục mặc định).
  const [filtersReady, setFiltersReady] = useState(false);
  const initializedCategory = useRef(false);

  const segmentCategories = useSegmentCategories().data ?? [];
  const categoriesQuery = useProductCategories();
  const productCategories = useMemo(
    () => categoriesQuery.data?.items ?? [],
    [categoriesQuery.data],
  );

  // Áp danh mục mặc định đúng 1 lần khi danh mục tải xong (kể cả khi lỗi).
  useEffect(() => {
    if (initializedCategory.current || categoriesQuery.isPending) return;
    initializedCategory.current = true;
    // Mặc định lọc theo danh mục được đánh dấu (nếu có) — vd nhóm "máy massage".
    const defaultCat = productCategories.find((c) => c.is_loyal_default && c.is_active);
    if (defaultCat) setCategory(String(defaultCat.id));
    setFiltersReady(true);
  }, [categoriesQuery.isPending, productCategories]);

  const listParams = useMemo(
    () => buildLoyalListParams({ currentPage, pageSize, range, segment, category }),
    [currentPage, pageSize, range, segment, category],
  );
  const listKey = customerKeys.loyal(listParams);
  const listQuery = useLoyalCustomers(listParams, { enabled: filtersReady });
  const listData = listQuery.data;
  // useMemo giữ identity ổn định — rows là dep của useLayoutEffect bên dưới.
  const rows = useMemo(() => listData?.results ?? [], [listData]);
  const total = listData?.total ?? 0;
  const loading = listQuery.isPending;

  useEffect(() => {
    if (!listQuery.isError) return;
    console.error("Error loading loyal customers:", listQuery.error);
    toast.error(
      t("loyalCustomers.toast.fetchFailed", "Tải danh sách khách hàng thân thiết thất bại."),
    );
  }, [listQuery.isError, listQuery.error, t]);

  const pendingScrollTopRef = useRef<number | null>(null);

  const rememberScrollPosition = () => {
    const container = getScrollableContainer();
    if (container) pendingScrollTopRef.current = container.scrollTop;
  };

  const applyPreset = (preset: Exclude<PresetKey, "custom">) => {
    rememberScrollPosition();
    setActivePreset(preset);
    setCurrentPage(1);
    if (preset === "all") {
      setRange(null);
      setCustomFrom("");
      setCustomTo("");
      return;
    }
    const nextRange = getDateRange(preset);
    setRange(nextRange);
    setCustomFrom(nextRange.from);
    setCustomTo(nextRange.to);
  };

  // Tự áp dụng ngay khi đổi ô ngày (không cần nút Áp dụng).
  const applyCustomRange = (from: string, to: string) => {
    rememberScrollPosition();
    setCurrentPage(1);
    if (!from && !to) {
      setActivePreset("all");
      setRange(null);
      return;
    }
    setActivePreset("custom");
    setRange({ from, to });
  };

  const changeCustomFrom = (value: string) => {
    setCustomFrom(value);
    applyCustomRange(value, customTo);
  };

  const changeCustomTo = (value: string) => {
    setCustomTo(value);
    applyCustomRange(customFrom, value);
  };

  const handleSegmentChange = (value: string) => {
    rememberScrollPosition();
    setCurrentPage(1);
    setSegment(value);
  };

  const handleCategoryChange = (value: string) => {
    rememberScrollPosition();
    setCurrentPage(1);
    setCategory(value);
  };

  useLayoutEffect(() => {
    if (loading) return;
    const pendingScrollTop = pendingScrollTopRef.current;
    if (pendingScrollTop === null) return;
    const container = getScrollableContainer();
    if (container) container.scrollTop = pendingScrollTop;
    pendingScrollTopRef.current = null;
  }, [loading, rows]);

  const safePageSize = clampPageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  const changePageSize = (value: string) => {
    rememberScrollPosition();
    setPageSize(clampPageSize(Number(value)));
    setCurrentPage(1);
  };

  const changePage = (page: number) => {
    rememberScrollPosition();
    setCurrentPage(page);
  };

  return {
    filters: {
      activePreset,
      customFrom,
      customTo,
      segment,
      category,
      segmentCategories,
      productCategories,
      applyPreset,
      changeCustomFrom,
      changeCustomTo,
      handleSegmentChange,
      handleCategoryChange,
    },
    listKey,
    rows,
    total,
    loading,
    currentPage,
    pageSize,
    totalPages,
    changePage,
    changePageSize,
  };
}

export type LoyalFilters = ReturnType<typeof useLoyalCustomersList>["filters"];
