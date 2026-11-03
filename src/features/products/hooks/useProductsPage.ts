import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "@/hooks/useDebounce";
import { useI18n } from "@/i18n";
import { Product, getProducts, type PancakeSyncMode } from "@/lib/api/products";
import { getPriceBooks } from "@/lib/api/price-books";
import {
  useCreateProduct,
  useDeleteProducts,
  useProductsGrouped,
  useUpdateProduct,
} from "@/features/products/queries";
import {
  EMPTY_PACKAGE,
  PackageForm,
  PackageFormNumField,
  packageFormToPayload,
  sortedPackageForms,
} from "@/features/products/package-form";
import { validateComboRows } from "@/features/products/combo-rows";
import { useComboRows } from "@/features/products/use-combo-rows";
import {
  DEFAULT_ENTRY_PAGE_SIZE,
  GROUP_VARIANTS_FETCH_LIMIT,
  SEARCH_DEBOUNCE_MS,
} from "@/features/products/constants";

/**
 * Toàn bộ state + handler của trang Sản phẩm (audit 2026-09-23 P1-4: tách từ
 * `pages/ProductsPage.tsx` 1.294 dòng). Phần hiển thị chia thành
 * ProductsToolbar / ProductsTable / ProductFormDialog / ProductDeleteDialogs,
 * mỗi cái nhận `ctrl` là kết quả của hook này. Logic giữ nguyên từng dòng.
 */
export function useProductsPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingProductIds, setTogglingProductIds] = useState<number[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  // Thành phần combo nằm NGAY trong form tạo/sửa sản phẩm (không còn dialog
  // riêng). Ở form sửa, hook GET danh sách hiện có trước rồi mới cho ghi — bắt
  // buộc, vì API components ghi đè trọn danh sách: không tải trước thì mỗi lần
  // bấm Lưu là xoá sạch BOM đang có.
  const combo = useComboRows(editDialogOpen ? (selectedProduct?.id ?? null) : null);
  const [formData, setFormData] = useState<{
    name: string;
    short_name: string;
    sku: string;
    is_active: boolean;
    packages: PackageForm[];
    group_id: number | null;
    pancake_sync_mode: PancakeSyncMode;
  }>({
    name: "",
    short_name: "",
    sku: "",
    is_active: true,
    packages: [EMPTY_PACKAGE(1)],
    group_id: null,
    pancake_sync_mode: "auto",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Bảng giá theo nền tảng: gói/KL/KT dùng chung, chỉ giá khác theo tab.
  const priceBooksQuery = useQuery({ queryKey: ["price-books"], queryFn: getPriceBooks });
  const priceBooks = useMemo(
    () => (priceBooksQuery.data ?? []).filter((book) => book.is_active),
    [priceBooksQuery.data],
  );
  const defaultBookCode = useMemo(
    () => priceBooks.find((book) => book.is_default)?.code ?? "facebook",
    [priceBooks],
  );
  const [activeBookCode, setActiveBookCode] = useState<string>("");
  const currentBookCode = activeBookCode || defaultBookCode;
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ENTRY_PAGE_SIZE);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<number>>(new Set());
  // Cache biến thể theo nhóm: chỉ tải khi mở nhóm, giữ lại để mở lần sau không refetch.
  const [groupVariants, setGroupVariants] = useState<Map<number, Product[]>>(new Map());
  const [loadingGroupIds, setLoadingGroupIds] = useState<Set<number>>(new Set());
  const normalizedSearchTerm = searchTerm.trim();
  const debouncedSearchTerm = useDebouncedValue(normalizedSearchTerm, SEARCH_DEBOUNCE_MS);

  // Tải 1 trang "entry" từ server: mỗi entry là 1 nhóm (header gộp) hoặc 1 sản phẩm rời.
  const groupedQuery = useProductsGrouped({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    q: debouncedSearchTerm || undefined,
  });
  // useMemo giữ identity ổn định — entries là dep của useMemo phía dưới.
  const entries = useMemo(() => groupedQuery.data?.entries ?? [], [groupedQuery.data]);
  const totalEntries = groupedQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalEntries / Math.max(1, pageSize)));
  const loading = groupedQuery.isFetching;

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProducts();

  // Toast mỗi lần fetch trang thất bại (errorUpdatedAt đổi theo từng lần lỗi).
  useEffect(() => {
    if (!groupedQuery.isError) return;
    console.error("Error fetching products:", groupedQuery.error);
    toast.error(t("products.toast.fetchFailed"));
  }, [groupedQuery.isError, groupedQuery.errorUpdatedAt, groupedQuery.error, t]);

  // Đổi từ khoá tìm kiếm → quay về trang 1 (offset 0).
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const fetchGroupVariants = useCallback(
    async (groupId: number) => {
      setLoadingGroupIds((prev) => new Set(prev).add(groupId));
      try {
        // include_prices: true — dialog sửa sản phẩm mở từ dòng biến thể trong
        // nhóm cần packages[].prices để dựng tab bảng giá; thiếu cờ này thì mọi
        // tab hiện trống và validate chặn không cho lưu.
        const variants = await getProducts({
          group: groupId,
          limit: GROUP_VARIANTS_FETCH_LIMIT,
          include_prices: true,
        });
        setGroupVariants((prev) => new Map(prev).set(groupId, variants));
      } catch (error) {
        console.error("Error fetching group variants:", error);
        toast.error(t("products.toast.fetchFailed"));
      } finally {
        setLoadingGroupIds((prev) => {
          const next = new Set(prev);
          next.delete(groupId);
          return next;
        });
      }
    },
    [t],
  );

  const toggleGroupExpanded = (groupId: number) => {
    const willExpand = !expandedGroupIds.has(groupId);
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
    if (willExpand && !groupVariants.has(groupId) && !loadingGroupIds.has(groupId)) {
      void fetchGroupVariants(groupId);
    }
  };

  // Sau khi tạo/sửa/xoá/bật-tắt: list refetch qua invalidateQueries trong các
  // mutation hook; ở đây chỉ làm mới cache biến thể của các nhóm bị ảnh hưởng.
  const refreshAfterMutation = (affectedGroupIds: Array<number | null | undefined>) => {
    const ids = [...new Set(affectedGroupIds.filter((id): id is number => typeof id === "number"))];
    if (ids.length === 0) return;
    setGroupVariants((prev) => {
      const next = new Map(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    ids.filter((id) => expandedGroupIds.has(id)).forEach((id) => void fetchGroupVariants(id));
  };

  // Sản phẩm/biến thể đang hiển thị trên trang: sản phẩm rời + biến thể của các
  // nhóm đã mở (dùng cho select-all + bulk delete + tìm sản phẩm để xoá).
  const visibleProducts = useMemo<Product[]>(() => {
    const list: Product[] = [];
    for (const entry of entries) {
      if (entry.kind === "product") {
        list.push(entry.product);
      } else if (expandedGroupIds.has(entry.id)) {
        list.push(...(groupVariants.get(entry.id) ?? []));
      }
    }
    return list;
  }, [entries, expandedGroupIds, groupVariants]);

  useEffect(() => {
    setSelectedProductIds([]);
  }, [currentPage, pageSize, debouncedSearchTerm]);

  // Handle form input changes for non-package fields (name, sku)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const updatePackage = (index: number, field: PackageFormNumField, raw: string) => {
    const nextVal: number | "" = raw === "" ? "" : Number(raw);
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, idx) =>
        idx === index ? { ...pkg, [field]: nextVal } : pkg,
      ),
    }));
    const errKey = `packages.${index}.${field}`;
    if (formErrors[errKey]) {
      setFormErrors((prev) => ({ ...prev, [errKey]: "" }));
    }
  };

  const updatePackagePrice = (index: number, bookCode: string, raw: string) => {
    const nextVal: number | "" = raw === "" ? "" : Number(raw);
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, idx) =>
        idx === index ? { ...pkg, prices: { ...pkg.prices, [bookCode]: nextVal } } : pkg,
      ),
    }));
    const errKey = `packages.${index}.price`;
    if (formErrors[errKey]) setFormErrors((prev) => ({ ...prev, [errKey]: "" }));
  };

  const clearPackageZeroOnFocus = (index: number, field: PackageFormNumField) => {
    setFormData((prev) => {
      const pkg = prev.packages[index];
      if (!pkg) return prev;
      const v = pkg[field];
      if (v === "" || v === null || v === undefined) return prev;
      if (Number(v) === 0) {
        return {
          ...prev,
          packages: prev.packages.map((p, idx) => (idx === index ? { ...p, [field]: "" } : p)),
        };
      }
      return prev;
    });
  };

  const addPackageTier = () => {
    setFormData((prev) => {
      const usedQty = new Set(prev.packages.map((p) => Number(p.quantity || 0)));
      let nextQty = 2;
      while (usedQty.has(nextQty)) nextQty += 1;
      return { ...prev, packages: [...prev.packages, EMPTY_PACKAGE(nextQty)] };
    });
  };

  const removePackageTier = (index: number) => {
    setFormData((prev) => {
      const target = prev.packages[index];
      if (!target || Number(target.quantity) === 1) return prev;
      return { ...prev, packages: prev.packages.filter((_, idx) => idx !== index) };
    });
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = t("products.form.nameRequired");
    }

    if (!formData.sku.trim()) {
      errors.sku = t("products.form.skuRequired");
    }

    const seenQty = new Set<number>();
    formData.packages.forEach((pkg, idx) => {
      const qty = Number(pkg.quantity || 0);
      if (!qty || qty <= 0) {
        errors[`packages.${idx}.quantity`] = t(
          "products.form.packageQtyRequired",
          "Số lượng phải lớn hơn 0.",
        );
      } else if (seenQty.has(qty)) {
        errors[`packages.${idx}.quantity`] = t(
          "products.form.packageQtyDuplicate",
          "Số lượng bị trùng.",
        );
      }
      seenQty.add(qty);
      // Bắt buộc giá CHỈ ở bảng giá mặc định — tab phụ để trống = kế thừa.
      const price = Number(pkg.prices[defaultBookCode] || 0);
      if (!price || price <= 0) {
        errors[`packages.${idx}.price`] = t(
          "products.form.priceRequiredDefaultBook",
          "Bắt buộc nhập giá ở bảng giá mặc định.",
        );
      }
    });
    if (!seenQty.has(1)) {
      errors["packages._base"] = t(
        "products.form.packageQty1Required",
        "Bắt buộc có gói số lượng 1.",
      );
    }

    // Lỗi giá luôn nằm ở bảng giá mặc định — nếu tab đang xem không phải tab
    // đó, tự chuyển về trước khi hiện lỗi để user thấy được ô đỏ.
    if (Object.keys(errors).some((key) => key.endsWith(".price"))) {
      setActiveBookCode(defaultBookCode);
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create product
  const handleCreateProduct = async () => {
    if (!validateForm()) return;
    // Validate combo TRƯỚC khi tạo sản phẩm: sản phẩm đã tạo thì không rút lại
    // được, để lại một SKU rác nếu phần combo mới là chỗ sai.
    const comboError = validateComboRows(combo.rows);
    if (comboError) {
      setFormErrors((prev) => ({ ...prev, combo: comboError }));
      return;
    }

    setSubmitting(true);
    try {
      const created = await createMutation.mutateAsync({
        name: formData.name.trim(),
        short_name: formData.short_name.trim(),
        sku: formData.sku.trim(),
        is_active: formData.is_active,
        packages: formData.packages.map(packageFormToPayload),
        group_id: formData.group_id,
        pancake_sync_mode: formData.pancake_sync_mode,
      });

      // Thành phần combo là request THỨ HAI (API components cần product id, chỉ
      // có sau khi tạo). Không gộp được vào một transaction nên tách nhánh lỗi
      // riêng: sản phẩm đã tạo xong rồi, KHÔNG được báo "tạo thất bại" và cũng
      // không được im lặng nuốt lỗi.
      let comboFailed = false;
      try {
        await combo.saveFor(created.id);
      } catch (componentsError) {
        console.error("Error saving combo components:", componentsError);
        comboFailed = true;
      }

      setCurrentPage(1);
      refreshAfterMutation([created.group?.id]);
      setCreateDialogOpen(false);
      resetForm();
      if (comboFailed) {
        toast.error(
          t(
            "products.toast.createdButComboFailed",
            "Đã tạo sản phẩm nhưng chưa lưu được thành phần combo. Hãy mở lại sản phẩm để khai lại.",
          ),
        );
      } else {
        toast.success(t("products.toast.created"));
      }
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error(t("products.toast.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update product
  const handleUpdateProduct = async () => {
    if (!selectedProduct || !validateForm()) return;
    const comboError = validateComboRows(combo.rows);
    if (comboError) {
      setFormErrors((prev) => ({ ...prev, combo: comboError }));
      return;
    }

    setSubmitting(true);
    try {
      const updatedProduct = await updateMutation.mutateAsync({
        id: selectedProduct.id,
        data: {
          name: formData.name.trim(),
          short_name: formData.short_name.trim(),
          sku: formData.sku.trim(),
          is_active: formData.is_active,
          packages: formData.packages.map(packageFormToPayload),
          group_id: formData.group_id,
          pancake_sync_mode: formData.pancake_sync_mode,
        },
      });

      // Thành phần combo đi bằng request riêng (API khác) nên phải tách nhánh
      // lỗi: sản phẩm đã cập nhật xong rồi, không được báo "cập nhật thất bại".
      // `skipped` = GET danh sách hiện có đã hỏng nên hook cố tình KHÔNG ghi;
      // im lặng ở đây là để người dùng tin rằng combo đã lưu trong khi không.
      let comboOutcome: "ok" | "failed" | "skipped" = "ok";
      try {
        if ((await combo.saveFor(selectedProduct.id)) === "skipped") comboOutcome = "skipped";
      } catch (componentsError) {
        console.error("Error saving combo components:", componentsError);
        comboOutcome = "failed";
      }

      // Làm mới cả nhóm cũ lẫn nhóm mới (sản phẩm có thể vừa đổi nhóm).
      refreshAfterMutation([selectedProduct.group?.id, updatedProduct.group?.id]);
      setEditDialogOpen(false);
      resetForm();
      if (comboOutcome === "ok") {
        toast.success(t("products.toast.updated"));
      } else {
        toast.error(
          t(
            "products.toast.updatedButComboFailed",
            "Đã cập nhật sản phẩm nhưng thành phần combo giữ nguyên như cũ. Hãy mở lại sản phẩm để khai lại.",
          ),
        );
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error(t("products.toast.updateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete product - this will be called by the delete button
  const handleDeleteProduct = (id: number) => {
    setProductToDelete(visibleProducts.find((p) => p.id === id) || null);
    setDeleteDialogOpen(true);
  };

  // Handle bulk delete - this will be called by the bulk delete button
  const handleBulkDelete = () => {
    if (selectedProductIds.length > 0) {
      setBulkDeleteDialogOpen(true);
    }
  };

  // Confirm delete product - this actually performs the delete
  const handleConfirmDelete = async () => {
    if (productToDelete) {
      try {
        await deleteMutation.mutateAsync([productToDelete.id]);
        refreshAfterMutation([productToDelete.group?.id]);
        toast.success(t("products.toast.deleted"));
      } catch (error) {
        console.error("Error deleting product:", error);
        toast.error(t("products.toast.deleteFailed"));
      } finally {
        setDeleteDialogOpen(false);
        setProductToDelete(null);
      }
    }
  };

  // Confirm bulk delete - this actually performs the bulk delete
  const handleConfirmBulkDelete = async () => {
    if (selectedProductIds.length > 0) {
      try {
        const affectedGroupIds = visibleProducts
          .filter((p) => selectedProductIds.includes(p.id))
          .map((p) => p.group?.id);
        await deleteMutation.mutateAsync(selectedProductIds);
        refreshAfterMutation(affectedGroupIds);
        setSelectedProductIds([]);
        toast.success(
          t("products.toast.bulkDeleted", "Đã xóa {count} sản phẩm.").replace(
            "{count}",
            String(selectedProductIds.length),
          ),
        );
      } catch (error) {
        console.error("Error bulk deleting products:", error);
        toast.error(t("products.toast.bulkDeleteFailed"));
      } finally {
        setBulkDeleteDialogOpen(false);
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      short_name: "",
      sku: "",
      is_active: true,
      packages: [EMPTY_PACKAGE(1)],
      group_id: null,
      pancake_sync_mode: "auto",
    });
    combo.reset();
    setFormErrors({});
    setActiveBookCode("");
  };

  // Open edit dialog
  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setActiveBookCode("");
    setFormData({
      name: product.name,
      short_name: product.short_name ?? "",
      sku: product.sku,
      is_active: product.is_active,
      packages: sortedPackageForms(product.packages),
      group_id: product.group?.id ?? null,
      pancake_sync_mode: product.pancake_sync_mode ?? "auto",
    });
    setEditDialogOpen(true);
  };

  const handleToggleProductStatus = async (product: Product, checked: boolean) => {
    if (product.is_active === checked) return;

    setTogglingProductIds((prev) => [...prev, product.id]);
    try {
      await updateMutation.mutateAsync({ id: product.id, data: { is_active: checked } });
      // Trang chỉ hiện sản phẩm active (server lọc) nên tắt active sẽ ẩn dòng sau refresh.
      refreshAfterMutation([product.group?.id]);
      toast.success(t("products.toast.updated"));
    } catch (error) {
      console.error("Error toggling product status:", error);
      toast.error(t("products.toast.updateFailed"));
    } finally {
      setTogglingProductIds((prev) => prev.filter((id) => id !== product.id));
    }
  };

  const allChecked =
    visibleProducts.length > 0 &&
    visibleProducts.every((product) => selectedProductIds.includes(product.id));

  const toggleSelectAllVisible = () =>
    setSelectedProductIds(
      allChecked
        ? selectedProductIds.filter((id) => !visibleProducts.some((p) => p.id === id))
        : [...new Set([...selectedProductIds, ...visibleProducts.map((p) => p.id)])],
    );

  const toggleSelectProduct = (id: number) =>
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return {
    searchTerm,
    setSearchTerm,
    normalizedSearchTerm,
    togglingProductIds,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    selectedProduct,
    combo,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    submitting,
    priceBooks,
    defaultBookCode,
    currentBookCode,
    setActiveBookCode,
    selectedProductIds,
    deleteDialogOpen,
    setDeleteDialogOpen,
    productToDelete,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    expandedGroupIds,
    groupVariants,
    loadingGroupIds,
    entries,
    totalPages,
    loading,
    toggleGroupExpanded,
    handleInputChange,
    updatePackage,
    updatePackagePrice,
    clearPackageZeroOnFocus,
    addPackageTier,
    removePackageTier,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleBulkDelete,
    handleConfirmDelete,
    handleConfirmBulkDelete,
    resetForm,
    openEditDialog,
    handleToggleProductStatus,
    allChecked,
    toggleSelectAllVisible,
    toggleSelectProduct,
  };
}

export type ProductsPageController = ReturnType<typeof useProductsPage>;
