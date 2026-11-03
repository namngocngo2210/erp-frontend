import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";
import { ComboComponentsEditor } from "@/features/products/components/ComboComponentsEditor";
import { PackagesEditor } from "@/features/products/components/PackagesEditor";
import type { ProductsPageController } from "@/features/products/hooks/useProductsPage";
import type { PancakeSyncMode } from "@/lib/api/products";

const PANCAKE_SYNC_MODES: PancakeSyncMode[] = ["auto", "always", "never"];
// Tên ngắn: DB cho tới 120 ký tự, nhưng gợi ý ≤ 60 để hiển thị gọn trên Pancake POS.
const SHORT_NAME_MAX = 120;
const SHORT_NAME_SUGGESTED = 60;

/**
 * Form tạo/sửa sản phẩm — một component cho cả hai chế độ. Khác nhau đúng ba
 * chỗ như bản gốc: tiền tố id ô nhập ("edit-"), tiêu đề/nhãn nút, và ở chế độ
 * sửa nút Lưu còn bị khoá khi `combo.loading` (xem ghi chú tại nút).
 */
export function ProductFormDialog({
  ctrl,
  mode,
}: {
  ctrl: ProductsPageController;
  mode: "create" | "edit";
}) {
  const { t } = useI18n();
  const {
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
    handleInputChange,
    updatePackage,
    updatePackagePrice,
    clearPackageZeroOnFocus,
    addPackageTier,
    removePackageTier,
    handleCreateProduct,
    handleUpdateProduct,
    resetForm,
  } = ctrl;
  const isEdit = mode === "edit";
  const open = isEdit ? editDialogOpen : createDialogOpen;
  const setOpen = isEdit ? setEditDialogOpen : setCreateDialogOpen;
  const idPrefix = isEdit ? "edit-" : "";

  // Khối khai thành phần combo — DÙNG CHUNG cho form tạo và form sửa; hai form
  // chỉ khác nhau ở chỗ form sửa có bước GET danh sách hiện có (hook lo).
  const comboSection = (
    <div className="col-span-full rounded-lg border border-border p-4">
      <p className="text-sm font-medium">
        {t("products.form.comboTitle", "Thành phần combo (tùy chọn)")}
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        {t(
          "products.form.comboHint",
          "Chỉ khai khi SKU này là combo. Để trống nếu là sản phẩm rời.",
        )}
      </p>
      {combo.loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading", "Đang tải...")}</p>
      ) : (
        <>
          {/* GET hỏng thì danh sách rỗng vì TẢI THẤT BẠI, không phải vì combo
              không có thành phần. Khoá hẳn phần soạn thảo (hook cũng đã từ chối
              ghi) để không ai sửa trên một bảng trống rồi bấm Lưu và xoá sạch
              BOM hiện có. */}
          {combo.loadFailed ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            >
              {t(
                "products.form.comboLoadFailed",
                "Không tải được thành phần combo. Vẫn lưu được sản phẩm, nhưng phần thành phần combo sẽ giữ nguyên như cũ.",
              )}
            </p>
          ) : (
            <>
              <ComboComponentsEditor
                rows={combo.rows}
                onRowsChange={(rows) => {
                  combo.setRows(rows);
                  setFormErrors((prev) => {
                    if (!prev.combo) return prev;
                    const { combo: _removed, ...rest } = prev;
                    return rest;
                  });
                }}
                excludeProductId={editDialogOpen ? selectedProduct?.id : undefined}
                disabled={submitting}
              />
              {formErrors.combo && (
                <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                  {formErrors.combo}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );

  const fields = (
    <FormGrid columns={2}>
      <div>
        <label
          htmlFor={`${idPrefix}name`}
          className="mb-1 block text-sm font-medium text-muted-foreground"
        >
          {t("products.form.name")}
        </label>
        <Input
          id={`${idPrefix}name`}
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={formErrors.name ? "border-action-danger" : ""}
        />
        {formErrors.name && <p className="mt-1 text-xs text-action-danger">{formErrors.name}</p>}
      </div>
      <div>
        <label
          htmlFor={`${idPrefix}sku`}
          className="mb-1 block text-sm font-medium text-muted-foreground"
        >
          {t("products.form.sku")}
        </label>
        <Input
          id={`${idPrefix}sku`}
          name="sku"
          value={formData.sku}
          onChange={handleInputChange}
          className={formErrors.sku ? "border-action-danger" : ""}
        />
        {formErrors.sku && <p className="mt-1 text-xs text-action-danger">{formErrors.sku}</p>}
      </div>

      <div className="col-span-full">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <label
            htmlFor={`${idPrefix}short_name`}
            className="block text-sm font-medium text-muted-foreground"
          >
            {t("products.form.shortName")}
          </label>
          <span
            data-testid="short-name-counter"
            className={`text-xs tabular-nums ${
              formData.short_name.length > SHORT_NAME_SUGGESTED
                ? "font-medium text-action-danger"
                : "text-muted-foreground"
            }`}
          >
            {formData.short_name.length}/{SHORT_NAME_SUGGESTED}
          </span>
        </div>
        <Input
          id={`${idPrefix}short_name`}
          name="short_name"
          value={formData.short_name}
          maxLength={SHORT_NAME_MAX}
          onChange={handleInputChange}
          aria-describedby={`${idPrefix}short_name-hint`}
        />
        <p id={`${idPrefix}short_name-hint`} className="mt-1 text-xs text-muted-foreground">
          {t("products.form.shortNameHint").replace("{max}", String(SHORT_NAME_SUGGESTED))}
        </p>
      </div>

      <div className="col-span-full">
        <PackagesEditor
          packages={formData.packages}
          priceBooks={priceBooks}
          activeBookCode={currentBookCode}
          defaultBookCode={defaultBookCode}
          onSelectBook={setActiveBookCode}
          errors={formErrors}
          onUpdate={updatePackage}
          onUpdatePrice={updatePackagePrice}
          onFocusClearZero={clearPackageZeroOnFocus}
          onAdd={addPackageTier}
          onRemove={removePackageTier}
          t={t}
        />
      </div>

      {comboSection}

      <div className="col-span-full flex items-center gap-3">
        <label
          htmlFor={`${idPrefix}is_active`}
          className="text-sm font-medium text-muted-foreground"
        >
          {t("products.form.status")}
        </label>
        <Switch
          id={`${idPrefix}is_active`}
          name="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
        />
        <span className="text-sm">
          {formData.is_active ? t("products.status.active") : t("products.status.inactive")}
        </span>
      </div>

      <div className="col-span-full flex flex-wrap items-center gap-3">
        <label
          htmlFor={`${idPrefix}pancake_sync_mode`}
          className="text-sm font-medium text-muted-foreground"
        >
          {t("pancakePos.productForm.label")}
        </label>
        <Select
          value={formData.pancake_sync_mode}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, pancake_sync_mode: value as PancakeSyncMode }))
          }
        >
          <SelectTrigger id={`${idPrefix}pancake_sync_mode`} className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PANCAKE_SYNC_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {t(`pancakePos.productForm.${mode}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FormGrid>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      {isEdit ? (
        <FormDialogShell
          title={t("products.dialog.editTitle")}
          description={t("products.dialog.editDescription")}
          footer={
            <>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              {/* `combo.loading` phải nằm trong điều kiện disable: bấm Lưu khi
                  GET thành phần chưa về thì bảng combo còn rỗng, người dùng
                  tưởng combo trống và lưu đè lên danh sách thật. */}
              <Button onClick={handleUpdateProduct} disabled={submitting || combo.loading}>
                {submitting ? t("common.updating") : t("common.update")}
              </Button>
            </>
          }
        >
          {fields}
        </FormDialogShell>
      ) : (
        <FormDialogShell
          title={t("products.dialog.createTitle")}
          description={t("products.dialog.createDescription")}
          onSubmit={(event) => {
            event.preventDefault();
            if (!submitting) {
              void handleCreateProduct();
            }
          }}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("common.creating") : t("common.create")}
              </Button>
            </>
          }
        >
          {fields}
        </FormDialogShell>
      )}
    </Dialog>
  );
}
