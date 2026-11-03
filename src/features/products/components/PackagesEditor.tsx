import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackageForm, PackageFormNumField } from "@/features/products/package-form";
import { PriceBook } from "@/lib/api/price-books";

type PackagesEditorProps = {
  packages: PackageForm[];
  priceBooks: PriceBook[];
  activeBookCode: string;
  defaultBookCode: string;
  onSelectBook: (code: string) => void;
  errors: Record<string, string>;
  onUpdate: (index: number, field: PackageFormNumField, raw: string) => void;
  onUpdatePrice: (index: number, bookCode: string, raw: string) => void;
  onFocusClearZero: (index: number, field: PackageFormNumField) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  t: (key: string, fallback?: string) => string;
};

export function PackagesEditor({
  packages,
  priceBooks,
  activeBookCode,
  defaultBookCode,
  onSelectBook,
  errors,
  onUpdate,
  onUpdatePrice,
  onFocusClearZero,
  onAdd,
  onRemove,
  t,
}: PackagesEditorProps) {
  const isDefaultTab = activeBookCode === defaultBookCode;
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("products.form.packagesTitle", "Gói theo số lượng")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(
              "products.form.packagesHint",
              "Mỗi dòng = 1 gói. Bắt buộc có gói số lượng 1. Thêm gói để khai báo giá/KL/KT khác khi mua nhiều.",
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={!isDefaultTab}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          {t("products.form.addPackage", "Thêm gói")}
        </Button>
      </div>
      {priceBooks.length > 1 && (
        <div className="mb-3 inline-flex rounded-md border border-border bg-muted/30 p-0.5">
          {priceBooks.map((book) => (
            <button
              key={book.code}
              type="button"
              onClick={() => onSelectBook(book.code)}
              className={
                book.code === activeBookCode
                  ? "rounded px-3 py-1 text-sm font-medium bg-background text-foreground shadow-sm"
                  : "rounded px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              {book.name}
            </button>
          ))}
        </div>
      )}
      {!isDefaultTab && (
        <p className="mb-2 text-xs text-muted-foreground">
          {t(
            "products.form.secondaryBookHint",
            "Số lượng gói và cân nặng/kích thước dùng chung mọi nền tảng — sửa ở tab mặc định.",
          )}
        </p>
      )}
      {errors["packages._base"] && (
        <p className="mb-2 text-xs text-action-danger">{errors["packages._base"]}</p>
      )}
      <div className="space-y-2">
        {packages.map((pkg, index) => {
          const isBase = Number(pkg.quantity) === 1;
          const qtyErr = errors[`packages.${index}.quantity`];
          const priceErr = errors[`packages.${index}.price`];
          const priceValue = pkg.prices[activeBookCode] ?? "";
          const inheritedPrice = pkg.prices[defaultBookCode];
          return (
            <div
              key={`pkg-${index}`}
              className="rounded-md border border-border/70 bg-muted/20 p-2"
            >
              {/* <640px: lưới 2 cột; dense để nút xoá lấp chỗ trống cạnh ô KL, KT chiếm cả hàng. */}
              <div className="grid grid-flow-row-dense grid-cols-2 items-end gap-2 sm:grid-flow-row sm:grid-cols-12">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {t("products.form.packageQuantity", "Số lượng")}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={pkg.quantity}
                    disabled={isBase || !isDefaultTab}
                    onChange={(e) => onUpdate(index, "quantity", e.target.value)}
                    onFocus={() => onFocusClearZero(index, "quantity")}
                    className={qtyErr ? "border-action-danger" : ""}
                  />
                  {qtyErr && <p className="mt-1 text-xs text-action-danger">{qtyErr}</p>}
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {t("products.form.packagePrice", "Giá (cả gói)")}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={priceValue}
                    placeholder={
                      !isDefaultTab && inheritedPrice
                        ? t("products.form.inheritedPrice", "Kế thừa {price}").replace(
                            "{price}",
                            String(inheritedPrice),
                          )
                        : undefined
                    }
                    onChange={(e) => onUpdatePrice(index, activeBookCode, e.target.value)}
                    className={priceErr && isDefaultTab ? "border-action-danger" : ""}
                  />
                  {priceErr && isDefaultTab && (
                    <p className="mt-1 text-xs text-action-danger">{priceErr}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {t("products.form.packageWeight", "KL (g)")}
                  </label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={pkg.weight}
                    disabled={!isDefaultTab}
                    onChange={(e) => onUpdate(index, "weight", e.target.value)}
                    onFocus={() => onFocusClearZero(index, "weight")}
                  />
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {t("products.form.packageDimensions", "KT (Dài × Rộng × Cao, cm)")}
                  </label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Dài"
                      value={pkg.length}
                      disabled={!isDefaultTab}
                      onChange={(e) => onUpdate(index, "length", e.target.value)}
                      onFocus={() => onFocusClearZero(index, "length")}
                    />
                    <span className="text-muted-foreground">x</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Rộng"
                      value={pkg.width}
                      disabled={!isDefaultTab}
                      onChange={(e) => onUpdate(index, "width", e.target.value)}
                      onFocus={() => onFocusClearZero(index, "width")}
                    />
                    <span className="text-muted-foreground">x</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Cao"
                      value={pkg.height}
                      disabled={!isDefaultTab}
                      onChange={(e) => onUpdate(index, "height", e.target.value)}
                      onFocus={() => onFocusClearZero(index, "height")}
                    />
                  </div>
                </div>
                <div className="flex justify-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(index)}
                    disabled={isBase || !isDefaultTab}
                    title={
                      isBase
                        ? t("products.form.cannotRemoveBase", "Không thể xoá gói số lượng 1")
                        : t("products.form.removePackage", "Xoá gói")
                    }
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
