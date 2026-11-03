import { useEffect, useMemo, useState } from "react";
import { Edit, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PaginationPages } from "@/components/ui/pagination";
import { DataTableShell } from "@/components/ui/data-table-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";
import {
  useAllProductOptions,
  useCreateProductCategory,
  useDeleteProductCategory,
  useProductCategoriesList,
  useUpdateProductCategory,
} from "@/features/products/queries";
import { ProductCategory } from "@/lib/api/product-categories";

interface ProductCategoriesPageProps {
  canManageUsers?: boolean;
}

const PAGE_MAX_SIZE = 100;
const PRODUCT_OPTION_LIMIT = 1000; // cỡ trang mỗi lần gọi (BE cho tới 10.000/request)
const PRODUCT_OPTION_MAX_TOTAL = 10000; // chặn an toàn khi nạp toàn bộ sản phẩm

type CategoryForm = {
  code: string;
  name: string;
  sort_order: number | "";
  is_active: boolean;
  product_ids: string[];
};

const EMPTY_FORM: CategoryForm = {
  code: "",
  name: "",
  sort_order: "",
  is_active: true,
  product_ids: [],
};

function ProductCategoriesPage({ canManageUsers = false }: ProductCategoriesPageProps) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingIds, setTogglingIds] = useState<number[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState<CategoryForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const normalizedSearchTerm = searchTerm.trim();
  const safePageSize = Math.max(1, Math.min(PAGE_MAX_SIZE, Math.trunc(pageSize)));

  const listQuery = useProductCategoriesList({
    limit: safePageSize,
    offset: (currentPage - 1) * safePageSize,
    q: normalizedSearchTerm || undefined,
  });
  const categories = listQuery.data?.items ?? [];
  const totalCategories = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCategories / safePageSize));
  const loading = listQuery.isFetching;

  const createMutation = useCreateProductCategory();
  const updateMutation = useUpdateProductCategory();
  const deleteMutation = useDeleteProductCategory();
  const submitting = createMutation.isPending || updateMutation.isPending;

  // Trang hiện tại rỗng (vd xoá hết bản ghi trang cuối) → lùi 1 trang.
  useEffect(() => {
    if (listQuery.data && listQuery.data.items.length === 0 && currentPage > 1) {
      setCurrentPage((prev) => Math.max(1, prev - 1));
    }
  }, [listQuery.data, currentPage]);

  // Toast mỗi lần tải danh sách thất bại.
  useEffect(() => {
    if (!listQuery.isError) return;
    console.error("Error fetching product categories:", listQuery.error);
    toast.error(t("productCategories.toast.fetchFailed", "Không tải được danh mục sản phẩm."));
  }, [listQuery.isError, listQuery.errorUpdatedAt, listQuery.error, t]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearchTerm]);

  // Load ALL product options for the multi-select (lần đầu mở dialog; staleTime
  // Infinity nên không refetch) bằng cách phân trang lặp — để có thể tìm theo
  // mọi SKU trong DB, không chỉ 100 SP đầu.
  const optionsQuery = useAllProductOptions(
    createDialogOpen || editDialogOpen,
    PRODUCT_OPTION_LIMIT,
    PRODUCT_OPTION_MAX_TOTAL,
  );

  useEffect(() => {
    if (!optionsQuery.isError) return;
    console.error("Error loading products for category dialog:", optionsQuery.error);
  }, [optionsQuery.isError, optionsQuery.error]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) {
      errors.code = t("productCategories.form.codeRequired", "Mã danh mục là bắt buộc.");
    }
    if (!formData.name.trim()) {
      errors.name = t("productCategories.form.nameRequired", "Tên danh mục là bắt buộc.");
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setSelectedCategory(null);
  };

  const buildPayload = () => ({
    code: formData.code.trim(),
    name: formData.name.trim(),
    sort_order: formData.sort_order === "" ? 0 : Number(formData.sort_order),
    is_active: formData.is_active,
    product_ids: formData.product_ids.map((id) => Number(id)),
  });

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      await createMutation.mutateAsync(buildPayload());
      setCurrentPage(1);
      setCreateDialogOpen(false);
      resetForm();
      toast.success(t("productCategories.toast.created", "Đã tạo danh mục sản phẩm."));
    } catch (error) {
      console.error("Error creating product category:", error);
      toast.error(t("productCategories.toast.createFailed", "Tạo danh mục thất bại."));
    }
  };

  const handleUpdate = async () => {
    if (!selectedCategory || !validateForm()) return;
    try {
      // Hook vá bản ghi đã cập nhật thẳng vào cache (hành vi cũ: map tại chỗ).
      await updateMutation.mutateAsync({ id: selectedCategory.id, data: buildPayload() });
      setEditDialogOpen(false);
      resetForm();
      toast.success(t("productCategories.toast.updated", "Đã cập nhật danh mục sản phẩm."));
    } catch (error) {
      console.error("Error updating product category:", error);
      toast.error(t("productCategories.toast.updateFailed", "Cập nhật danh mục thất bại."));
    }
  };

  const handleDelete = (category: ProductCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteMutation.mutateAsync(categoryToDelete.id);
      toast.success(t("productCategories.toast.deleted", "Đã xóa danh mục sản phẩm."));
    } catch (error) {
      console.error("Error deleting product category:", error);
      toast.error(t("productCategories.toast.deleteFailed", "Xóa danh mục thất bại."));
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleToggleStatus = async (category: ProductCategory, checked: boolean) => {
    if (category.is_active === checked) return;
    setTogglingIds((prev) => [...prev, category.id]);
    try {
      await updateMutation.mutateAsync({ id: category.id, data: { is_active: checked } });
      toast.success(t("productCategories.toast.updated", "Đã cập nhật danh mục sản phẩm."));
    } catch (error) {
      console.error("Error toggling category status:", error);
      toast.error(t("productCategories.toast.updateFailed", "Cập nhật danh mục thất bại."));
    } finally {
      setTogglingIds((prev) => prev.filter((id) => id !== category.id));
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (category: ProductCategory) => {
    setSelectedCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      sort_order: category.sort_order ?? "",
      is_active: category.is_active,
      product_ids: category.products.map((p) => String(p.id)),
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  // Sản phẩm của danh mục đang sửa luôn có mặt trong options, kể cả khi nằm
  // ngoài danh sách đã nạp (hành vi cũ: merge missing vào productOptions).
  // Chỉ hiện SKU (không hiện tên SP) — SKU rỗng thì fallback tên để không mù option.
  // `keywords: name` để vẫn tìm được theo TÊN dù label chỉ hiện SKU (nếu không, bỏ
  // trường tên khỏi option làm mất hẳn tìm-kiếm-theo-tên — audit 2026-07-15).
  const productSelectOptions = useMemo(() => {
    const toOption = (p: { id: number; sku: string; name: string }) => ({
      value: String(p.id),
      label: p.sku || p.name,
      keywords: p.name,
    });
    const loaded = optionsQuery.data ?? [];
    const base = loaded.map(toOption);
    if (!selectedCategory) return base;
    const known = new Set(loaded.map((p) => p.id));
    const missing = selectedCategory.products.filter((p) => !known.has(p.id)).map(toOption);
    return missing.length > 0 ? [...base, ...missing] : base;
  }, [optionsQuery.data, selectedCategory]);

  const renderDialogBody = (idPrefix: string) => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-code`}
            className="mb-1 block text-sm font-medium text-muted-foreground"
          >
            {t("productCategories.form.code", "Mã")}
          </label>
          <Input
            id={`${idPrefix}-code`}
            value={formData.code}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, code: e.target.value }));
              if (formErrors.code) setFormErrors((prev) => ({ ...prev, code: "" }));
            }}
            className={formErrors.code ? "border-action-danger" : ""}
          />
          {formErrors.code && <p className="mt-1 text-xs text-action-danger">{formErrors.code}</p>}
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-name`}
            className="mb-1 block text-sm font-medium text-muted-foreground"
          >
            {t("productCategories.form.name", "Tên")}
          </label>
          <Input
            id={`${idPrefix}-name`}
            value={formData.name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }));
              if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: "" }));
            }}
            className={formErrors.name ? "border-action-danger" : ""}
          />
          {formErrors.name && <p className="mt-1 text-xs text-action-danger">{formErrors.name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-sort`}
            className="mb-1 block text-sm font-medium text-muted-foreground"
          >
            {t("productCategories.form.sortOrder", "Thứ tự")}
          </label>
          <Input
            id={`${idPrefix}-sort`}
            type="number"
            min="0"
            value={formData.sort_order}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                sort_order: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
          />
        </div>
        <div className="flex items-end gap-3">
          <label
            htmlFor={`${idPrefix}-active`}
            className="text-sm font-medium text-muted-foreground"
          >
            {t("productCategories.form.status", "Trạng thái")}
          </label>
          <Switch
            id={`${idPrefix}-active`}
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
          />
          <span className="text-sm">
            {formData.is_active
              ? t("productCategories.status.active", "Hoạt động")
              : t("productCategories.status.inactive", "Ngừng")}
          </span>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted-foreground">
          {t("productCategories.form.products", "Sản phẩm trong danh mục")}
        </label>
        <MultiSelect
          options={productSelectOptions}
          selected={formData.product_ids}
          onChange={(values) => setFormData((prev) => ({ ...prev, product_ids: values }))}
          placeholder={t("productCategories.form.productsPlaceholder", "Chọn sản phẩm")}
        />
      </div>
    </div>
  );

  return (
    <>
      <DataTableShell
        loading={loading && categories.length === 0}
        toolbar={
          <div className="w-full flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="relative flex-1 md:max-w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("productCategories.search.placeholder", "Tìm theo mã hoặc tên")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            {canManageUsers && (
              <Button
                className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={openCreateDialog}
              >
                {t("productCategories.management.create", "Thêm danh mục")}
              </Button>
            )}
          </div>
        }
      >
        <ResponsiveList
          items={categories}
          getKey={(category: ProductCategory) => category.id}
          loading={loading}
          loadingText={t("common.loading", "Đang tải...")}
          emptyText={
            normalizedSearchTerm
              ? t("productCategories.list.emptyFiltered", "Không tìm thấy danh mục phù hợp.")
              : t("productCategories.list.empty", "Chưa có danh mục sản phẩm.")
          }
          table={
            <Table className="min-w-[640px] [&_td]:px-3 [&_th]:px-3">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("productCategories.columns.code", "Mã")}
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("productCategories.columns.name", "Tên")}
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("productCategories.columns.productCount", "Số SP")}
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("productCategories.columns.status", "Trạng thái")}
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("common.actions", "Hành động")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {normalizedSearchTerm
                        ? t(
                            "productCategories.list.emptyFiltered",
                            "Không tìm thấy danh mục phù hợp.",
                          )
                        : t("productCategories.list.empty", "Chưa có danh mục sản phẩm.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium text-foreground">{category.code}</TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-foreground">{category.product_count}</TableCell>
                      <TableCell>
                        <Switch
                          checked={category.is_active}
                          disabled={!canManageUsers || togglingIds.includes(category.id)}
                          onCheckedChange={(checked) => handleToggleStatus(category, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {canManageUsers && (
                          <>
                            <Button
                              title={t("common.edit", "Sửa")}
                              aria-label={t("common.edit", "Sửa")}
                              size="icon-sm"
                              variant="outline"
                              className="border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                              onClick={() => openEditDialog(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              title={t("common.delete", "Xóa")}
                              aria-label={t("common.delete", "Xóa")}
                              size="icon-sm"
                              variant="outline"
                              className="border-border bg-background text-destructive hover:bg-accent hover:text-destructive-foreground ml-1"
                              onClick={() => handleDelete(category)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          }
          renderCard={(category: ProductCategory) => (
            <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{category.code}</p>
                  <p className="font-medium text-foreground">{category.name}</p>
                </div>
                <Switch
                  checked={category.is_active}
                  disabled={!canManageUsers || togglingIds.includes(category.id)}
                  onCheckedChange={(checked) => handleToggleStatus(category, checked)}
                />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {t("productCategories.columns.productCount", "Số SP")}:{" "}
                </span>
                <span>{category.product_count}</span>
              </div>
              {canManageUsers && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                    onClick={() => openEditDialog(category)}
                  >
                    <Edit className="mr-2 w-4 h-4" /> {t("common.edit", "Sửa")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-border bg-background text-destructive hover:bg-accent hover:text-destructive-foreground"
                    onClick={() => handleDelete(category)}
                  >
                    <Trash2 className="mr-2 w-4 h-4" /> {t("common.delete", "Xóa")}
                  </Button>
                </div>
              )}
            </div>
          )}
        />
        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {t(
                "productCategories.pagination.summary",
                "Danh mục trang hiện tại: {{count}}",
              ).replace("{{count}}", String(categories.length))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("products.pagination.pageSize", "Mỗi trang")}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  const next = Number(value);
                  const safe =
                    Number.isFinite(next) && next > 0
                      ? Math.min(PAGE_MAX_SIZE, Math.trunc(next))
                      : 20;
                  setPageSize(safe);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <PaginationPages
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </DataTableShell>

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-160">
          <DialogHeader>
            <DialogTitle>
              {t("productCategories.dialog.createTitle", "Thêm danh mục sản phẩm")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "productCategories.dialog.createDescription",
                "Tạo danh mục và thêm sản phẩm vào danh mục.",
              )}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!submitting) void handleCreate();
            }}
          >
            {renderDialogBody("create")}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {t("common.cancel", "Hủy")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("common.creating", "Đang tạo...") : t("common.create", "Tạo")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-160">
          <DialogHeader>
            <DialogTitle>
              {t("productCategories.dialog.editTitle", "Sửa danh mục sản phẩm")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "productCategories.dialog.editDescription",
                "Cập nhật thông tin và sản phẩm trong danh mục.",
              )}
            </DialogDescription>
          </DialogHeader>
          {renderDialogBody("edit")}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? t("common.updating", "Đang lưu...") : t("common.update", "Cập nhật")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("productCategories.confirm.delete.title", "Xóa danh mục")}</DialogTitle>
            <DialogDescription>
              {t(
                "productCategories.confirm.delete.message",
                "Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể hoàn tác.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t("common.delete", "Xóa")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProductCategoriesPage;
