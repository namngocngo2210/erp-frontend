import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";

import type { AdsSpendFilter } from "@/features/ads/queries";
import { swallowError } from "@/lib/errors";

/**
 * Bộ hook dùng chung cho 2 trang chi tiêu ads (FacebookAdsPage / GoogleAdsPage).
 *
 * Hai trang là "song sinh" về logic: cùng bộ lọc persist localStorage, cùng
 * các effect chọn parent / prune account selection, cùng cách dựng map metrics
 * theo account. Phần khác thật giữa 2 platform (form CRUD, cột bảng, shape
 * metrics, quyền hiện nút sync) ở lại từng page.
 *
 * Vì React Compiler cấm truyền hook như giá trị (react-compiler/react-compiler:
 * "Hooks may not be referenced as normal values"), không thể gom thành 1 hook
 * nhận query hook của platform làm tham số. Thay vào đó chia 3 tầng — page gọi
 * query hook của platform mình và chuyền KẾT QUẢ (giá trị) vào:
 *
 *   const filters   = useAdsSpendFilters({ storageKey, parentIdField });
 *   const parents   = usePlatformParents();            // hook riêng platform
 *   const accounts  = usePlatformAccounts(filters.selectedParentId);
 *   const selection = useAdsSpendSelection({ filters, parentsQuery, accountsQuery });
 *   const spend     = usePlatformSpendSummary(id, selection.visibleAccountIds, filters.spendFilter);
 *   const metrics   = useAdsSpendMetrics({ visibleAccounts, spendQuery, emptyMetrics, buildMetrics });
 *
 * LƯU Ý hành vi: giữ nguyên 100% logic cũ, kể cả tên field id parent trong
 * JSON persisted (selectedAppId / selectedConfigId) để không mất bộ lọc mà
 * user đã lưu từ trước.
 */

/** Shape tối thiểu của metrics 1 account (platform có thể mở rộng thêm). */
export interface AdsSpendMetricsBase {
  spend: number;
  loading: boolean;
  error?: string;
}

/** Option cho SearchableSelect / MultiSelect trên filter bar. */
export interface AdsSelectOption {
  value: string;
  label: string;
}

interface PersistedAdsFilters {
  selectedAccountIds?: string[];
  filterMode?: "preset" | "custom";
  filterPreset?: string;
  filterSince?: string;
  filterUntil?: string;
  /** Id parent nằm dưới key riêng của từng platform (selectedAppId/...). */
  [parentIdField: string]: unknown;
}

function loadPersistedFilters(storageKey: string): PersistedAdsFilters {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedAdsFilters;
  } catch {
    return {};
  }
}

/** Format số nguyên kiểu 1,234,567 — dùng chung cho bảng + card 2 trang. */
export function fmtInt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export interface AdsSpendFiltersState {
  selectedParentId: number | null;
  setSelectedParentId: Dispatch<SetStateAction<number | null>>;
  selectedAccountIds: string[];
  setSelectedAccountIds: Dispatch<SetStateAction<string[]>>;
  filterMode: "preset" | "custom";
  setFilterMode: Dispatch<SetStateAction<"preset" | "custom">>;
  filterPreset: string;
  setFilterPreset: Dispatch<SetStateAction<string>>;
  filterSince: string;
  setFilterSince: Dispatch<SetStateAction<string>>;
  filterUntil: string;
  setFilterUntil: Dispatch<SetStateAction<string>>;
  /** Bộ lọc thời gian dạng gửi cho query spend-summary / sync on-demand. */
  spendFilter: AdsSpendFilter;
}

/**
 * State bộ lọc của trang chi tiêu ads + persist localStorage.
 *
 * @param storageKey    Key localStorage lưu bộ lọc (giữ nguyên key cũ mỗi trang).
 * @param parentIdField Tên field chứa id parent trong JSON persisted
 *                      ("selectedAppId" / "selectedConfigId") — giữ nguyên để
 *                      tương thích dữ liệu user đã lưu.
 */
export function useAdsSpendFilters(options: {
  storageKey: string;
  parentIdField: string;
}): AdsSpendFiltersState {
  const { storageKey, parentIdField } = options;

  const persisted = useMemo(() => loadPersistedFilters(storageKey), [storageKey]);
  const persistedParentId = persisted[parentIdField];

  const [selectedParentId, setSelectedParentId] = useState<number | null>(
    typeof persistedParentId === "number" ? persistedParentId : null,
  );
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    persisted.selectedAccountIds ?? [],
  );

  const [filterMode, setFilterMode] = useState<"preset" | "custom">(
    persisted.filterMode ?? "preset",
  );
  // Mặc định this_month — luôn có dữ liệu nếu cron đã sync trong tháng. Trước
  // đây dùng "today" nhưng nếu cron stale (chưa chạy hôm nay) thì user thấy 0.
  const [filterPreset, setFilterPreset] = useState(persisted.filterPreset ?? "this_month");
  const [filterSince, setFilterSince] = useState(persisted.filterSince ?? "");
  const [filterUntil, setFilterUntil] = useState(persisted.filterUntil ?? "");

  useEffect(() => {
    const data: Record<string, unknown> = {
      [parentIdField]: selectedParentId,
      selectedAccountIds,
      filterMode,
      filterPreset,
      filterSince,
      filterUntil,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      /* ignore quota errors */
      swallowError(err, "ads.report.cache");
    }
  }, [
    storageKey,
    parentIdField,
    selectedParentId,
    selectedAccountIds,
    filterMode,
    filterPreset,
    filterSince,
    filterUntil,
  ]);

  const spendFilter: AdsSpendFilter =
    filterMode === "custom"
      ? { mode: "custom", since: filterSince, until: filterUntil }
      : { mode: "preset", preset: filterPreset };

  return {
    selectedParentId,
    setSelectedParentId,
    selectedAccountIds,
    setSelectedAccountIds,
    filterMode,
    setFilterMode,
    filterPreset,
    setFilterPreset,
    filterSince,
    setFilterSince,
    filterUntil,
    setFilterUntil,
    spendFilter,
  };
}

/**
 * Nối state bộ lọc với data parent/account: toast lỗi tải, tự chọn parent đầu
 * tiên, prune selection theo account thực có (mặc định chọn tất cả), tính tập
 * account hiển thị + options cho filter bar.
 */
export function useAdsSpendSelection<
  TParent extends { id: number; name: string },
  TAccount extends { id: number; name: string },
>(options: {
  filters: AdsSpendFiltersState;
  parentsQuery: UseQueryResult<TParent[], Error>;
  accountsQuery: UseQueryResult<TAccount[], Error>;
}) {
  const { filters, parentsQuery, accountsQuery } = options;
  const {
    selectedParentId,
    setSelectedParentId,
    selectedAccountIds,
    setSelectedAccountIds,
    filterMode,
    filterSince,
    filterUntil,
  } = filters;

  const parents = useMemo(() => parentsQuery.data ?? [], [parentsQuery.data]);
  const parentsLoading = parentsQuery.isFetching;

  const accounts = useMemo(
    () => (selectedParentId != null ? (accountsQuery.data ?? []) : []),
    [selectedParentId, accountsQuery.data],
  );
  const accountsLoading = selectedParentId != null && accountsQuery.isPending;

  // Toast khi tải danh sách parent / account thất bại (hành vi cũ của
  // loadApps/loadAdAccounts & loadConfigs/loadAccounts).
  useEffect(() => {
    if (!parentsQuery.isError) return;
    toast.error((parentsQuery.error as Error).message);
  }, [parentsQuery.isError, parentsQuery.errorUpdatedAt, parentsQuery.error]);
  useEffect(() => {
    if (!accountsQuery.isError) return;
    toast.error((accountsQuery.error as Error).message);
  }, [accountsQuery.isError, accountsQuery.errorUpdatedAt, accountsQuery.error]);

  // Chọn parent đầu tiên nếu parent đang chọn không còn tồn tại.
  const parentsData = parentsQuery.data;
  useEffect(() => {
    if (!parentsData) return;
    if (parentsData.length === 0) {
      setSelectedParentId(null);
      return;
    }
    setSelectedParentId((prev) =>
      prev != null && parentsData.some((p) => p.id === prev) ? prev : parentsData[0].id,
    );
  }, [parentsData, setSelectedParentId]);

  // Lọc selection theo account thực có; mặc định chọn tất cả.
  const accountsData = accountsQuery.data;
  useEffect(() => {
    if (selectedParentId == null) {
      setSelectedAccountIds([]);
      return;
    }
    if (!accountsData) return;
    setSelectedAccountIds((prev) => {
      const validIds = new Set(accountsData.map((a) => String(a.id)));
      const filtered = prev.filter((id) => validIds.has(id));
      return filtered.length > 0 ? filtered : accountsData.map((a) => String(a.id));
    });
  }, [accountsData, selectedParentId, setSelectedAccountIds]);

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => selectedAccountIds.includes(String(a.id))),
    [accounts, selectedAccountIds],
  );

  const visibleAccountIds = useMemo(() => visibleAccounts.map((a) => a.id), [visibleAccounts]);

  // Custom mode thiếu ngày → nhắc nhập đủ (hành vi cũ của loadMetricsForAccounts).
  const hasVisibleAccounts = visibleAccounts.length > 0;
  useEffect(() => {
    if (!hasVisibleAccounts || filterMode !== "custom") return;
    if (!filterSince || !filterUntil) {
      toast.error("Vui lòng nhập đủ ngày bắt đầu/kết thúc.");
    }
  }, [hasVisibleAccounts, filterMode, filterSince, filterUntil]);

  const parentOptions = useMemo(
    (): AdsSelectOption[] => parents.map((p) => ({ value: String(p.id), label: p.name })),
    [parents],
  );

  const accountOptions = useMemo(
    (): AdsSelectOption[] => accounts.map((a) => ({ value: String(a.id), label: a.name })),
    [accounts],
  );

  return {
    parents,
    parentsLoading,
    accounts,
    accountsLoading,
    visibleAccounts,
    visibleAccountIds,
    parentOptions,
    accountOptions,
  };
}

/**
 * Dựng map metrics theo account từ kết quả spend-summary + tổng chi phí.
 * `buildMetrics` map 1 dòng by_account của BE thành metrics hiển thị của
 * platform; `emptyMetrics` là nền cho trạng thái loading / error.
 */
export function useAdsSpendMetrics<
  TAccount extends { id: number },
  TRow,
  TSummary extends { by_account: Record<string, TRow>; last_synced_at: string | null },
  TMetrics extends AdsSpendMetricsBase,
>(options: {
  visibleAccounts: TAccount[];
  spendQuery: UseQueryResult<TSummary, Error>;
  emptyMetrics: TMetrics;
  buildMetrics: (row: TRow | undefined) => TMetrics;
}) {
  const { visibleAccounts, spendQuery, emptyMetrics, buildMetrics } = options;

  // Overlay chỉ khi tải lần đầu / đổi bộ lọc (placeholder), không khi poll nền
  // (hành vi cũ: silent refresh không bật metricsLoading).
  const metricsLoading =
    spendQuery.isFetching && (spendQuery.isPending || spendQuery.isPlaceholderData);

  const summary = spendQuery.data;
  const spendError = spendQuery.isError ? (spendQuery.error as Error).message : null;
  // isLoading = đang fetch lần đầu (query enabled); nếu query bị disable
  // (vd custom thiếu ngày) thì rows hiển thị 0 thay vì spinner treo.
  const spendInitialLoading = spendQuery.isLoading;
  const metricsByAcc = useMemo(() => {
    const map: Record<number, TMetrics> = {};
    for (const a of visibleAccounts) {
      if (summary) {
        map[a.id] = buildMetrics(summary.by_account[String(a.id)]);
      } else if (spendError) {
        map[a.id] = { ...emptyMetrics, error: spendError };
      } else if (spendInitialLoading) {
        map[a.id] = { ...emptyMetrics, loading: true };
      } else {
        map[a.id] = emptyMetrics;
      }
    }
    return map;
  }, [visibleAccounts, summary, spendError, spendInitialLoading, buildMetrics, emptyMetrics]);

  // Toast khi tải metrics thất bại mà chưa có số liệu hiển thị. Lỗi refresh
  // nền (đã có data) bỏ qua — hành vi cũ: silent polling nuốt lỗi.
  useEffect(() => {
    if (!spendQuery.isError || spendQuery.data) return;
    toast.error((spendQuery.error as Error).message);
  }, [spendQuery.isError, spendQuery.errorUpdatedAt, spendQuery.error, spendQuery.data]);

  const totalSpend = useMemo(
    () => visibleAccounts.reduce((s, a) => s + (metricsByAcc[a.id]?.spend ?? 0), 0),
    [visibleAccounts, metricsByAcc],
  );

  return { metricsLoading, summary, metricsByAcc, totalSpend };
}
