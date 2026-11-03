import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import { Customer, CustomerProfile, SegmentCategory } from "@/lib/api/customers";
import type { OrderRow } from "@/features/orders/order-types";
import {
  COLUMN_GROUPS,
  GROUP_COLUMN_COUNTS,
  type ColumnGroupKey,
} from "@/pages/customers/profile-columns";
import {
  defaultGroupOrder,
  defaultVisibleGroupKeys,
  getStoredGroupOrder,
  getStoredVisibleGroups,
  setStoredGroupOrder,
  setStoredVisibleGroups,
} from "@/features/customers/customers-columns-storage";

import {
  useCustomerProfiles,
  useSegmentCategories,
  useChannels,
  useCrmCatalogs,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useBulkDeleteCustomers,
  useUpdateCustomerResaleNote,
} from "./queries";
import {
  ALL_CHANNELS,
  ALL_SALES_STATUS,
  ALL_SEGMENTS,
  CHECKBOX_COL_WIDTH,
  CODE_COL_WIDTH,
  type CustomerFormData,
  type EditingResale,
  type ResaleField,
} from "./customer-types";
import { clampCustomersPageSize, toGenderNumber, toGenderOption } from "./customer-utils";

const toMap = (options?: { code: string; label: string }[]): Record<string, string> =>
  Array.isArray(options) ? Object.fromEntries(options.map((o) => [o.code, o.label])) : {};

const getScrollableContainer = (): HTMLElement | null =>
  document.querySelector("main.overflow-y-auto");

/**
 * Owns the full state/data cluster previously inlined in `CustomersPage`:
 * filters, pagination, column groups, expand/resale edit state, selection,
 * dialogs, react-query data, derived memos and all handlers. Behaviour is
 * intentionally identical to the prior inline implementation.
 */
export function useCustomersData(canManageUsers: boolean) {
  const { t } = useI18n();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Bộ lọc — seed từ URL search params nếu có (drill-down từ báo cáo).
  const initialParams = new URLSearchParams(window.location.search);
  const [segment, setSegment] = useState<string>(initialParams.get("segment") ?? ALL_SEGMENTS);
  const [channel, setChannel] = useState<string>(initialParams.get("channel") ?? ALL_CHANNELS);
  const [salesStatus, setSalesStatus] = useState<string>(ALL_SALES_STATUS);

  // Hiển thị nhóm cột — khôi phục từ localStorage (xem customers-columns-storage).
  const [visibleGroupKeys, setVisibleGroupKeys] =
    useState<ColumnGroupKey[]>(getStoredVisibleGroups);
  const [columnOrder, setColumnOrder] = useState<ColumnGroupKey[]>(getStoredGroupOrder);

  const visibleGroups = useMemo(() => {
    const visible = new Set(visibleGroupKeys);
    const map = {} as Record<ColumnGroupKey, boolean>;
    // Nhóm "identity" là cột cố định — luôn hiện dù localStorage nói gì.
    for (const group of COLUMN_GROUPS) {
      map[group.key] = group.key === "identity" || visible.has(group.key);
    }
    return map;
  }, [visibleGroupKeys]);

  // Expandable row — lịch sử đơn lazy theo từng customer.
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [ordersCache, setOrdersCache] = useState<Record<number, OrderRow[]>>({});
  const [ordersLoadingId, setOrdersLoadingId] = useState<number | null>(null);

  // Inline edit resale.
  const [editingResale, setEditingResale] = useState<EditingResale | null>(null);
  const [resaleDraft, setResaleDraft] = useState("");

  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<{
    id: number;
    full_name: string;
  } | null>(null);

  const [formData, setFormData] = useState<CustomerFormData>({
    full_name: "",
    phone_raw: "",
    gender: "none",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const pendingScrollTopRef = useRef<number | null>(null);

  const rememberScrollPosition = useCallback(() => {
    const container = getScrollableContainer();
    if (!container) return;
    pendingScrollTopRef.current = container.scrollTop;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchDebounced(searchTerm.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Chữ ký bộ lọc hiện tại — đổi bộ lọc => luôn về trang 1.
  const filterSignature = `${searchDebounced}|${segment}|${channel}|${salesStatus}`;
  const prevFilterSignatureRef = useRef(filterSignature);

  useEffect(() => {
    const filtersChanged = prevFilterSignatureRef.current !== filterSignature;
    prevFilterSignatureRef.current = filterSignature;
    if (filtersChanged) {
      setSelectedCustomerIds([]);
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [filterSignature, currentPage]);

  const safePageSize = clampCustomersPageSize(pageSize);
  const profilesParams = {
    query: searchDebounced,
    limit: safePageSize,
    offset: Math.max(0, (currentPage - 1) * safePageSize),
    segment: segment === ALL_SEGMENTS ? undefined : segment,
    channel: channel === ALL_CHANNELS ? undefined : channel,
    salesStatus: salesStatus === ALL_SALES_STATUS ? undefined : salesStatus,
  };

  const { data: profilesData, isFetching: loading } = useCustomerProfiles(profilesParams);
  // useMemo giữ identity ổn định — profiles là dep của useLayoutEffect/useCallback bên dưới.
  const profiles = useMemo(() => profilesData?.results ?? [], [profilesData]);
  const total = profilesData?.total ?? 0;

  const { data: segmentCategoriesData } = useSegmentCategories();
  const segmentCategories: SegmentCategory[] = segmentCategoriesData ?? [];

  const { data: channelsData } = useChannels();
  const channelOptions = channelsData ?? [];

  const { data: crmCatalogsData } = useCrmCatalogs();
  const salesStatusOptions = crmCatalogsData?.sales_status_options ?? [];

  const personaLabels = useMemo(
    () => ({
      delax_source: toMap(crmCatalogsData?.delax_source_options),
      lifestyle_habit: toMap(crmCatalogsData?.lifestyle_habit_options),
      relax_time: toMap(crmCatalogsData?.relax_time_options),
      purchase_barrier: toMap(crmCatalogsData?.purchase_barrier_options),
    }),
    [crmCatalogsData],
  );

  // Mutation hooks.
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();
  const bulkDeleteMutation = useBulkDeleteCustomers();
  const updateResaleMutation = useUpdateCustomerResaleNote();

  useLayoutEffect(() => {
    if (loading) return;
    const pendingScrollTop = pendingScrollTopRef.current;
    if (pendingScrollTop === null) return;
    const container = getScrollableContainer();
    if (container) container.scrollTop = pendingScrollTop;
    pendingScrollTopRef.current = null;
  }, [loading, profiles]);

  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const hasNextPage = currentPage < totalPages;

  const allChecked =
    canManageUsers &&
    profiles.length > 0 &&
    profiles.every((profile) => selectedCustomerIds.includes(profile.identity.id));

  // Danh sách nhóm đang hiện theo thứ tự cấu hình.
  const groupsByKey = useMemo(
    () =>
      Object.fromEntries(COLUMN_GROUPS.map((group) => [group.key, group])) as Record<
        ColumnGroupKey,
        (typeof COLUMN_GROUPS)[number]
      >,
    [],
  );

  const orderedGroups = useMemo(
    () => columnOrder.map((key) => groupsByKey[key]).filter(Boolean),
    [columnOrder, groupsByKey],
  );

  const activeGroups = useMemo(
    () => orderedGroups.filter((group) => visibleGroups[group.key]),
    [orderedGroups, visibleGroups],
  );

  /** Nhóm đang hiện, theo đúng thứ tự cột trên bảng. */
  const visibleGroupOrder = useMemo(
    () => columnOrder.filter((key) => visibleGroups[key]),
    [columnOrder, visibleGroups],
  );

  /**
   * Ghi đè cả danh sách nhóm đang hiện (kéo đổi thứ tự, bật/tắt cả nhóm).
   * `identity` luôn được giữ lại vì đó là cột định danh cố định của bảng.
   */
  const setColumnGroups = useCallback((next: ColumnGroupKey[]) => {
    const withIdentity: ColumnGroupKey[] = next.includes("identity") ? next : ["identity", ...next];
    const seen = new Set(withIdentity);
    const nextOrder = [
      ...withIdentity,
      ...COLUMN_GROUPS.map((group) => group.key).filter((key) => !seen.has(key)),
    ];
    setVisibleGroupKeys(withIdentity);
    setColumnOrder(nextOrder);
    setStoredVisibleGroups(withIdentity);
    setStoredGroupOrder(nextOrder);
  }, []);

  const resetColumnGroups = useCallback(() => {
    const nextVisible = defaultVisibleGroupKeys();
    const nextOrder = defaultGroupOrder();
    setVisibleGroupKeys(nextVisible);
    setColumnOrder(nextOrder);
    setStoredVisibleGroups(nextVisible);
    setStoredGroupOrder(nextOrder);
  }, []);

  // Tổng số cột dữ liệu (gồm cột mở rộng + checkbox + hành động) — cho colSpan hàng mở rộng.
  const dataColumnCount = useMemo(() => {
    let count = activeGroups.reduce((acc, group) => acc + GROUP_COLUMN_COUNTS[group.key], 0);
    count += 1; // cột chevron expand
    if (canManageUsers) count += 2; // checkbox + actions
    return count;
  }, [activeGroups, canManageUsers]);

  // Offset trái cho các cột sticky. Cột chevron luôn sticky tại 0; nếu là admin thì
  // có thêm cột checkbox; sau đó tới "Mã KH" và "Họ tên" trong nhóm identity.
  // Tính toán tập trung để header và body dùng CÙNG một giá trị, tránh lệch.
  const stickyOffsets = useMemo(() => {
    const chevron = 0;
    const checkbox = CHECKBOX_COL_WIDTH; // sau chevron
    const codeBase = CHECKBOX_COL_WIDTH + (canManageUsers ? CHECKBOX_COL_WIDTH : 0);
    const code = codeBase;
    const name = codeBase + CODE_COL_WIDTH;
    return { chevron, checkbox, code, name };
  }, [canManageUsers]);

  // Tiêu đề cột con cho mỗi nhóm — suy ra từ COLUMN_GROUPS (nguồn sự thật duy nhất),
  // chỉ áp i18n cho phần hiển thị.
  const groupColumnLabels = useMemo(() => {
    const map = {} as Record<ColumnGroupKey, string[]>;
    for (const group of COLUMN_GROUPS) {
      map[group.key] = group.columns.map((col) => t(col.i18nKey, col.fallback));
    }
    return map;
  }, [t]);

  const resetForm = useCallback(() => {
    setFormData({ full_name: "", phone_raw: "", gender: "none" });
    setFormErrors({});
    setSelectedCustomer(null);
  }, []);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    if (!formData.full_name.trim() && !formData.phone_raw.trim()) {
      errors.full_name = t("customers.form.nameOrPhoneRequired", "Nhập tên hoặc số điện thoại.");
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.full_name, formData.phone_raw, t]);

  const handleCreate = useCallback(() => {
    if (!validateForm()) return;
    createCustomerMutation.mutate(
      {
        full_name: formData.full_name.trim(),
        phone_raw: formData.phone_raw.trim(),
        gender: toGenderNumber(formData.gender),
      },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          resetForm();
          toast.success(t("customers.toast.created", "Đã thêm khách hàng."));
        },
        onError: (error) => {
          console.error("Error creating customer:", error);
          toast.error(t("customers.toast.createFailed", "Thêm khách hàng thất bại."));
        },
      },
    );
  }, [createCustomerMutation, formData, resetForm, t, validateForm]);

  const handleOpenEdit = useCallback((profile: CustomerProfile) => {
    setSelectedCustomer({
      id: profile.identity.id,
      code: profile.identity.code,
      full_name: profile.identity.full_name,
      phone_raw: profile.identity.phone,
      phone_normalized: profile.identity.phone,
      gender: profile.demographics.gender,
      created_at: "",
      updated_at: "",
    });
    setFormData({
      full_name: profile.identity.full_name || "",
      phone_raw: profile.identity.phone || "",
      gender: toGenderOption(profile.demographics.gender),
    });
    setFormErrors({});
    setEditDialogOpen(true);
  }, []);

  const handleUpdate = useCallback(() => {
    if (!selectedCustomer || !validateForm()) return;
    updateCustomerMutation.mutate(
      {
        id: selectedCustomer.id,
        payload: {
          full_name: formData.full_name.trim(),
          phone_raw: formData.phone_raw.trim(),
          gender: toGenderNumber(formData.gender),
        },
      },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          resetForm();
          toast.success(t("customers.toast.updated", "Đã cập nhật khách hàng."));
        },
        onError: (error) => {
          console.error("Error updating customer:", error);
          toast.error(t("customers.toast.updateFailed", "Cập nhật khách hàng thất bại."));
        },
      },
    );
  }, [formData, resetForm, selectedCustomer, t, updateCustomerMutation, validateForm]);

  const handleDelete = useCallback((profile: CustomerProfile) => {
    setCustomerToDelete({ id: profile.identity.id, full_name: profile.identity.full_name });
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!customerToDelete) return;
    deleteCustomerMutation.mutate(customerToDelete.id, {
      onSuccess: () => {
        setSelectedCustomerIds((prev) => prev.filter((id) => id !== customerToDelete.id));
        toast.success(t("customers.toast.deleted", "Đã xóa khách hàng."));
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
      },
      onError: (error) => {
        console.error("Error deleting customer:", error);
        toast.error(t("customers.toast.deleteFailed", "Xóa khách hàng thất bại."));
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
      },
    });
  }, [customerToDelete, deleteCustomerMutation, t]);

  const handleConfirmBulkDelete = useCallback(() => {
    if (!selectedCustomerIds.length) return;
    bulkDeleteMutation.mutate(selectedCustomerIds, {
      onSuccess: (result) => {
        if (result.deleted_count > 0) {
          toast.success(
            t("customers.toast.bulkDeleted", "Đã xóa {count} khách hàng.").replace(
              "{count}",
              String(result.deleted_count),
            ),
          );
        }
        if (result.protected_ids.length > 0) {
          toast.warning(
            t(
              "customers.toast.bulkProtected",
              "Có {count} khách hàng không thể xóa vì đã có đơn hàng.",
            ).replace("{count}", String(result.protected_ids.length)),
          );
        }
        setSelectedCustomerIds([]);
        setBulkDeleteDialogOpen(false);
      },
      onError: (error) => {
        console.error("Error bulk deleting customers:", error);
        toast.error(t("customers.toast.bulkDeleteFailed", "Xóa nhiều khách hàng thất bại."));
        setBulkDeleteDialogOpen(false);
      },
    });
  }, [bulkDeleteMutation, selectedCustomerIds, t]);

  const handleToggleExpand = useCallback(
    async (customerId: number) => {
      if (expandedId === customerId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(customerId);
      if (ordersCache[customerId]) return;
      setOrdersLoadingId(customerId);
      try {
        // Direct call to keep lazy per-row cache (not converted to hook to avoid
        // triggering N queries for all rows; each row fetches once on expand).
        const { getCustomerOrders } = await import("@/lib/api/customers");
        const orders = await getCustomerOrders(customerId);
        setOrdersCache((prev) => ({ ...prev, [customerId]: Array.isArray(orders) ? orders : [] }));
      } catch (error) {
        console.error("Error loading customer order history:", error);
        toast.error(t("customers.toast.fetchHistoryFailed", "Tải lịch sử khách hàng thất bại."));
      } finally {
        setOrdersLoadingId(null);
      }
    },
    [expandedId, ordersCache, t],
  );

  const startResaleEdit = useCallback((id: number, field: ResaleField, current: string) => {
    setEditingResale({ id, field });
    setResaleDraft(current || "");
  }, []);

  const cancelResaleEdit = useCallback(() => {
    setEditingResale(null);
    setResaleDraft("");
  }, []);

  const saveResaleEdit = useCallback(() => {
    if (!editingResale) return;
    const { id, field } = editingResale;
    const profile = profiles.find((p) => p.identity.id === id);
    if (!profile) {
      cancelResaleEdit();
      return;
    }
    const nextValue = resaleDraft;
    if (nextValue === (profile.resale[field] || "")) {
      cancelResaleEdit();
      return;
    }
    updateResaleMutation.mutate(
      { id, payload: { [field]: nextValue } },
      {
        onSuccess: () => {
          toast.success(t("customers.toast.resaleSaved", "Đã lưu ghi chú resale."));
        },
        onError: (error) => {
          console.error("Error saving resale note:", error);
          toast.error(t("customers.toast.resaleSaveFailed", "Lưu ghi chú resale thất bại."));
        },
        onSettled: () => {
          cancelResaleEdit();
        },
      },
    );
  }, [cancelResaleEdit, editingResale, profiles, resaleDraft, t, updateResaleMutation]);

  const toggleSelectAll = useCallback(() => {
    setSelectedCustomerIds(
      allChecked
        ? selectedCustomerIds.filter((id) => !profiles.some((p) => p.identity.id === id))
        : [...new Set([...selectedCustomerIds, ...profiles.map((p) => p.identity.id)])],
    );
  }, [allChecked, profiles, selectedCustomerIds]);

  const toggleSelectRow = useCallback((id: number) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setCreateDialogOpen(true);
  }, [resetForm]);

  const toggleGroupVisibility = useCallback(
    (key: ColumnGroupKey) => {
      // Nhóm định danh không tắt được — bảng luôn cần cột Mã KH / Họ tên.
      if (key === "identity") return;
      setColumnGroups(
        visibleGroupOrder.includes(key)
          ? visibleGroupOrder.filter((item) => item !== key)
          : [...visibleGroupOrder, key],
      );
    },
    [visibleGroupOrder, setColumnGroups],
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      rememberScrollPosition();
      setPageSize(clampCustomersPageSize(Number(value)));
      setCurrentPage(1);
    },
    [rememberScrollPosition],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      rememberScrollPosition();
      setCurrentPage(Math.max(1, page));
    },
    [rememberScrollPosition],
  );

  return {
    t,
    // Search & filters
    searchTerm,
    setSearchTerm,
    segment,
    setSegment,
    channel,
    setChannel,
    salesStatus,
    setSalesStatus,
    // Pagination
    currentPage,
    pageSize,
    safePageSize,
    totalPages,
    hasNextPage,
    handlePageSizeChange,
    handlePageChange,
    // Data
    profiles,
    total,
    loading,
    segmentCategories,
    channelOptions,
    salesStatusOptions,
    personaLabels,
    // Column groups
    visibleGroups,
    visibleGroupOrder,
    orderedGroups,
    activeGroups,
    groupColumnLabels,
    toggleGroupVisibility,
    setColumnGroups,
    resetColumnGroups,
    dataColumnCount,
    stickyOffsets,
    // Expand / orders
    expandedId,
    ordersCache,
    ordersLoadingId,
    handleToggleExpand,
    // Resale inline edit
    editingResale,
    resaleDraft,
    setResaleDraft,
    startResaleEdit,
    cancelResaleEdit,
    saveResaleEdit,
    // Selection
    selectedCustomerIds,
    allChecked,
    toggleSelectAll,
    toggleSelectRow,
    // Dialogs & form
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    formData,
    setFormData,
    formErrors,
    openCreateDialog,
    resetForm,
    handleCreate,
    handleOpenEdit,
    handleUpdate,
    handleDelete,
    handleConfirmDelete,
    handleConfirmBulkDelete,
    createCustomerMutation,
    updateCustomerMutation,
  };
}

export type UseCustomersDataReturn = ReturnType<typeof useCustomersData>;
