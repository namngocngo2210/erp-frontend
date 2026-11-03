import { type Dispatch, type SetStateAction } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  normalizeDecimalInput as normalizeNumericInput,
  parseDimensions,
} from "@/features/orders/order-normalizers";
import { type ProductRow } from "@/features/orders/order-types";
import { type CreateOrderPayload } from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";

import { LineDiscountInput } from "./LineDiscountInput";
import { OrderFormDimensionsInput } from "./OrderFormDimensionsInput";
import {
  applyTwoUnitLineDiscount,
  buildDimensions,
  findPackageForQuantity,
  formatAmountValue,
  formatNumericDisplay,
  NO_FIELD_PERMISSION_TITLE,
  packageDimensions,
  packageUnitPrice,
  parseAmount,
  positiveDimPart,
  type EditableOrderItem,
  type ProductOption,
} from "./order-form-helpers";
import { type ClearZeroField } from "./use-order-form";

type Translate = ReturnType<typeof useI18n>["t"];

// Hiển thị nhãn option sản phẩm trong menu: làm đậm phần "biến thể" của SKU
// (phần đứng SAU mã nhóm) để dễ phân biệt; ô đã chọn vẫn hiển thị `label` như cũ.
function renderProductOptionLabel(option: ProductOption) {
  const product = option.product;
  if (!product) {
    return option.label;
  }
  const groupCode = product.group?.code ?? "";
  const sku = product.sku;
  const variant = groupCode && sku.startsWith(groupCode) ? sku.slice(groupCode.length) : "";
  if (!variant) {
    return option.label;
  }
  const prefix = sku.slice(0, sku.length - variant.length);
  return (
    <span>
      {product.name} ({prefix}
      <strong>{variant}</strong>)
    </span>
  );
}

/**
 * Khối "Sản phẩm" của form đơn: các dòng hàng (ô chọn sản phẩm async theo bảng giá,
 * số lượng, SKU, đơn giá, giảm giá ₫/%, nút xoá), nút thêm dòng và cặp ô khối
 * lượng / kích thước.
 */
export function OrderFormItemsSection({
  t,
  form,
  setForm,
  isFieldLocked,
  focusedPriceIndex,
  setFocusedPriceIndex,
  productById,
  productBySku,
  searchProductOptions,
  updateItems,
  addItem,
  removeItemAt,
  markItemPriceManuallyEdited,
  dimensionParts,
  setDimensionParts,
  clearZeroOnFocus,
}: {
  t: Translate;
  form: CreateOrderPayload;
  setForm: Dispatch<SetStateAction<CreateOrderPayload>>;
  /** Quyền sửa-theo-field (đã tính isCreateMode) — nhánh tạo luôn trả false. */
  isFieldLocked: (field: string) => boolean;
  focusedPriceIndex: number | null;
  setFocusedPriceIndex: Dispatch<SetStateAction<number | null>>;
  productById: Map<number, ProductRow>;
  productBySku: Map<string, ProductRow>;
  /** Từ khoá rỗng → gợi ý mặc định; có từ khoá → tìm trên server (đã gom nhóm). */
  searchProductOptions: (input: string) => Promise<ProductOption[]>;
  updateItems: (updater: (items: EditableOrderItem[]) => EditableOrderItem[]) => void;
  addItem: () => void;
  removeItemAt: (index: number) => void;
  /** Đánh dấu dòng đã sửa giá tay — effect tính lại giá khi đổi kênh sẽ bỏ qua. */
  markItemPriceManuallyEdited: (index: number) => void;
  dimensionParts: [string, string, string];
  setDimensionParts: Dispatch<SetStateAction<[string, string, string]>>;
  clearZeroOnFocus: (field: ClearZeroField) => void;
}) {
  return (
    <div className="space-y-3">
      {(Array.isArray(form.items) ? form.items : []).map((item, index) => {
        const selectedProduct = item.product_id
          ? productById.get(item.product_id)
          : item.sku
            ? productBySku.get(item.sku)
            : undefined;
        const displaySku = selectedProduct?.sku || item.sku || "";
        const rawPrice =
          item.unit_price != null && item.unit_price !== ""
            ? item.unit_price
            : selectedProduct?.price || "";
        const isPriceFocused = focusedPriceIndex === index;
        const displayPrice =
          item.unit_price === ""
            ? ""
            : isPriceFocused
              ? normalizeNumericInput(String(rawPrice))
              : formatNumericDisplay(formatAmountValue(parseAmount(rawPrice)));
        return (
          <div key={`order-item-${index}`} className="rounded-md border border-border p-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,4fr)_6rem_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_auto] md:items-end">
              <div
                className="min-w-0"
                title={isFieldLocked("items") ? NO_FIELD_PERMISSION_TITLE : undefined}
              >
                <label
                  htmlFor={`order-item-product-${index}`}
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  {t("orders.columns.product")}
                </label>
                <SearchableSelect<ProductOption>
                  id={`order-item-product-${index}`}
                  controlClassName="h-10"
                  clearable
                  disabled={isFieldLocked("items")}
                  placeholder={t("orders.placeholders.selectProduct", "Chọn sản phẩm")}
                  onSearch={searchProductOptions}
                  renderOption={renderProductOptionLabel}
                  emptyText={(query) =>
                    query
                      ? t("orders.placeholders.noProductFound", "Không tìm thấy sản phẩm")
                      : t("orders.placeholders.typeToSearchProduct", "Nhập để tìm sản phẩm")
                  }
                  // Dòng cũ có thể chỉ có SKU (chưa khớp product_id) — vẫn hiện SKU như trước.
                  value={
                    item.product_id ? String(item.product_id) : item.sku ? `sku:${item.sku}` : ""
                  }
                  selectedLabel={selectedProduct ? selectedProduct.sku || "" : displaySku || ""}
                  onSelectOption={(option) => {
                    const product = option?.product;
                    const currentQty = Math.max(1, Number(item.quantity) || 1);
                    const pkg = findPackageForQuantity(product, currentQty);
                    const nextUnitPrice = pkg
                      ? packageUnitPrice(pkg)
                      : product?.price || item.unit_price;
                    updateItems((items) =>
                      items.map((current, idx) =>
                        idx === index
                          ? {
                              ...current,
                              product_id: product?.id,
                              sku: product?.sku || current.sku,
                              product_name: product?.name ?? current.product_name,
                              unit_price: nextUnitPrice,
                            }
                          : current,
                      ),
                    );
                    if (product) {
                      const pkgWeight = pkg && Number(pkg.weight ?? 0) > 0 ? Number(pkg.weight) : 0;
                      const baseWeight = Number(product.weight ?? 0);
                      const weightToSet =
                        pkgWeight > 0 ? pkgWeight : baseWeight > 0 ? baseWeight : 0;
                      const dims = pkg
                        ? packageDimensions(pkg)
                        : buildDimensions([
                            positiveDimPart(product.length),
                            positiveDimPart(product.width),
                            positiveDimPart(product.height),
                          ]);
                      setForm((prev) => ({
                        ...prev,
                        ...(weightToSet > 0
                          ? { weight: normalizeNumericInput(String(weightToSet)) }
                          : {}),
                        ...(dims ? { dimensions: dims } : {}),
                      }));
                      if (dims) setDimensionParts(parseDimensions(dims));
                    }
                  }}
                />
              </div>
              <div
                className="min-w-0"
                title={isFieldLocked("items") ? NO_FIELD_PERMISSION_TITLE : undefined}
              >
                <label className="mb-1 block whitespace-nowrap text-xs text-muted-foreground">
                  {t("orders.fields.quantity")}
                </label>
                <Input
                  className="h-10"
                  type="number"
                  min={1}
                  value={item.quantity}
                  disabled={isFieldLocked("items")}
                  onChange={(e) => {
                    const quantity = Math.max(1, Number(e.target.value || 1));
                    const product = item.product_id
                      ? productById.get(item.product_id)
                      : item.sku
                        ? productBySku.get(item.sku)
                        : undefined;
                    const pkg = findPackageForQuantity(product, quantity);
                    updateItems((items) =>
                      items.map((current, idx) =>
                        idx === index
                          ? applyTwoUnitLineDiscount(
                              {
                                ...current,
                                quantity,
                                unit_price: pkg ? packageUnitPrice(pkg) : current.unit_price,
                              },
                              current.quantity,
                              quantity,
                            )
                          : current,
                      ),
                    );
                    if (pkg) {
                      const pkgWeight = Number(pkg.weight ?? 0);
                      const dims = packageDimensions(pkg);
                      setForm((prev) => ({
                        ...prev,
                        ...(pkgWeight > 0
                          ? { weight: normalizeNumericInput(String(pkg.weight)) }
                          : {}),
                        ...(dims ? { dimensions: dims } : {}),
                      }));
                      if (dims) setDimensionParts(parseDimensions(dims));
                    }
                  }}
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t("orders.fields.sku")}
                </label>
                <Input className="h-10" value={displaySku} readOnly />
              </div>
              <div
                className="min-w-0"
                title={isFieldLocked("items") ? NO_FIELD_PERMISSION_TITLE : undefined}
              >
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t("orders.fields.unitPrice", "Đơn giá")}
                </label>
                <Input
                  className="h-10"
                  value={displayPrice}
                  disabled={isFieldLocked("items")}
                  onFocus={() => {
                    setFocusedPriceIndex(index);
                    updateItems((items) =>
                      items.map((current, idx) =>
                        idx === index &&
                        normalizeNumericInput(String(current.unit_price ?? "")) === "0"
                          ? { ...current, unit_price: "" }
                          : current,
                      ),
                    );
                  }}
                  onBlur={() => setFocusedPriceIndex(null)}
                  onChange={(e) => {
                    const unitPrice = normalizeNumericInput(e.target.value);
                    // Sale tự gõ giá: đánh dấu dòng này để effect tính lại giá
                    // theo bảng giá kênh (khi đổi kênh) bỏ qua, giữ giá đã sửa tay.
                    markItemPriceManuallyEdited(index);
                    updateItems((items) =>
                      items.map((current, idx) =>
                        idx === index ? { ...current, unit_price: unitPrice } : current,
                      ),
                    );
                  }}
                />
              </div>
              <div
                className="min-w-0"
                title={isFieldLocked("items") ? NO_FIELD_PERMISSION_TITLE : undefined}
              >
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t("orders.fields.lineDiscount", "Giảm giá")}
                </label>
                <LineDiscountInput
                  value={item}
                  disabled={isFieldLocked("items")}
                  labels={{
                    input: t("orders.fields.lineDiscount", "Giảm giá"),
                    byAmount: t(
                      "orders.fields.lineDiscountByAmount",
                      "Giảm theo số tiền (mỗi sản phẩm)",
                    ),
                    byPercent: t("orders.fields.lineDiscountByPercent", "Giảm theo phần trăm"),
                  }}
                  onChange={(next) =>
                    updateItems((items) =>
                      items.map((current, idx) =>
                        idx === index ? { ...current, ...next } : current,
                      ),
                    )
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItemAt(index)}
                  disabled={(form.items?.length || 0) <= 1 || isFieldLocked("items")}
                  aria-label={t("orders.actions.removeItem", "Xóa sản phẩm")}
                  title={t("orders.actions.removeItem", "Xóa sản phẩm")}
                  className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={isFieldLocked("items")}
          title={isFieldLocked("items") ? NO_FIELD_PERMISSION_TITLE : undefined}
        >
          {t("orders.actions.addItem", "Thêm sản phẩm")}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div title={isFieldLocked("weight") ? NO_FIELD_PERMISSION_TITLE : undefined}>
          <label className="mb-1 block text-sm text-muted-foreground">
            {t("orders.columns.weight", "Khối lượng")}
          </label>
          <Input
            value={formatNumericDisplay(form.weight)}
            disabled={isFieldLocked("weight")}
            onFocus={() => clearZeroOnFocus("weight")}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                weight: normalizeNumericInput(e.target.value),
              }))
            }
          />
        </div>
        <div title={isFieldLocked("dimensions") ? NO_FIELD_PERMISSION_TITLE : undefined}>
          <label className="mb-1 block text-sm text-muted-foreground">
            {t("orders.columns.dimensions", "Kích thước")}
          </label>
          <OrderFormDimensionsInput
            dimensionParts={dimensionParts}
            setDimensionParts={setDimensionParts}
            setForm={setForm}
            disabled={isFieldLocked("dimensions")}
          />
        </div>
      </div>
    </div>
  );
}
