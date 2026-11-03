import { memo, useEffect, useMemo, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type OrderItemRow, type OrderRow, type ProductRow } from "@/features/orders/order-types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { InfoRow, ERow, SectionCard } from "@/features/orders/order-detail-shared";
import { fmt, normalizeNumericInput, parseAmount } from "@/features/orders/order-detail-format";
import { INVOICE_LOCK_HINT } from "@/features/orders/invoice-lock";
import { LineDiscountInput } from "@/features/orders/order-form/LineDiscountInput";
import {
  applyTwoUnitLineDiscount,
  lineUnitDiscount,
} from "@/features/orders/order-form/order-form-helpers";
import { formatNumber } from "@/lib/format";

const LINE_DISCOUNT_LABELS = {
  input: "Giảm giá",
  byAmount: "Giảm theo số tiền (mỗi sản phẩm)",
  byPercent: "Giảm theo phần trăm",
};

/** Item đang soạn trong bảng sản phẩm — item mới thêm chưa có id/line_total từ backend. */
type DraftOrderItem = Partial<OrderItemRow> & Pick<OrderItemRow, "quantity" | "unit_price">;

function BlockProductsImpl({
  order,
  products,
  patch,
  className,
  contentLocked = false,
}: {
  order: OrderRow;
  products: ProductRow[];
  patch: (p: Partial<OrderRow>) => void;
  className?: string;
  /**
   * Đơn đã có mã hóa đơn → cả khối hàng hoá là chỉ đọc. Không dựa vào `fieldset
   * disabled` của trang: ô click-to-edit không phải form control nên
   * fieldset không chặn được (xem invoice-lock.ts).
   */
  contentLocked?: boolean;
}) {
  const lockProps = contentLocked ? { disabled: true, disabledHint: INVOICE_LOCK_HINT } : {};
  const hasItems = Array.isArray(order.items) && order.items.length > 0;

  const dimParts = (() => {
    const raw = String(order.dimensions || "").trim();
    if (!raw) return ["", "", ""];
    const t = raw
      .split(/(?:x|X|×|\*)/g)
      .map((s) => s.trim())
      .slice(0, 3);
    return [t[0] || "", t[1] || "", t[2] || ""];
  })();

  const productOptions = useMemo(() => {
    return products.map((k) => ({ value: String(k.id), label: k.sku || "" }));
  }, [products]);

  // Keep a local copy to avoid losing focus if the server hasn't responded yet
  const [localItems, setLocalItems] = useState<DraftOrderItem[]>(order.items || []);

  useEffect(() => {
    setLocalItems(order.items || []);
  }, [order.items]);

  const calcTotalAfterDiscount = (overrides: {
    total_amount?: string | number;
    discount_amount?: string | number;
    booking_voucher_discount?: string | number;
  }) => {
    const total = parseAmount(overrides.total_amount ?? order.total_amount);
    const discount = parseAmount(overrides.discount_amount ?? order.discount_amount);
    const booking = parseAmount(
      overrides.booking_voucher_discount ?? order.booking_voucher_discount,
    );
    return String(total - discount - booking);
  };

  const commitItems = (newItems: DraftOrderItem[]) => {
    const newTotal = newItems.reduce((sum, item) => {
      // Cùng công thức backend: (đơn giá − giảm/sản phẩm) × SL.
      const lineTotal =
        (parseAmount(item.unit_price) - lineUnitDiscount(item)) * (item.quantity || 1);
      item.line_total = String(lineTotal);
      return sum + lineTotal;
    }, 0);
    setLocalItems(newItems); // Optimistic UI
    patch({
      // Item mới tạo chưa có id/line_total — backend tự sinh khi lưu.
      items: newItems as OrderItemRow[],
      total_amount: String(newTotal),
      total_after_discount: calcTotalAfterDiscount({ total_amount: newTotal }),
    }); // Send to API
  };

  const updateItem = (index: number, field: string, value: unknown) => {
    const newItems = [...localItems];
    newItems[index] = { ...newItems[index], [field]: value };
    // Optionally recalculate line_total if needed, but backend usually does this.
    commitItems(newItems);
  };

  const dimsPart = (v: unknown) => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? String(n) : "";
  };

  const findPackageForQty = (product: ProductRow | undefined, qty: number) => {
    if (!product || !Array.isArray(product.packages)) return undefined;
    const q = Math.max(1, Math.trunc(Number(qty) || 1));
    return product.packages.find((pkg) => Number(pkg.quantity) === q);
  };

  const applyPackageToOrder = (
    product: ProductRow,
    pkg: NonNullable<ProductRow["packages"]>[number] | undefined,
  ) => {
    const extraPatch: Partial<OrderRow> = {};
    const weight =
      pkg && Number(pkg.weight ?? 0) > 0 ? Number(pkg.weight) : Number(product.weight ?? 0);
    if (weight > 0) extraPatch.weight = String(weight);
    const dims = pkg
      ? [dimsPart(pkg.length), dimsPart(pkg.width), dimsPart(pkg.height)].filter(Boolean).join("x")
      : [dimsPart(product.length), dimsPart(product.width), dimsPart(product.height)]
          .filter(Boolean)
          .join("x");
    if (dims) extraPatch.dimensions = dims;
    if (Object.keys(extraPatch).length > 0) patch(extraPatch);
  };

  const unitPriceFromPackage = (pkg: NonNullable<ProductRow["packages"]>[number]): string => {
    const totalPrice = Number(pkg.price ?? 0);
    const qty = Math.max(1, Number(pkg.quantity ?? 1));
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) return "0";
    return String(totalPrice / qty);
  };

  const handleProductChange = (index: number, option: { value: string; label: string } | null) => {
    const newItems = [...localItems];
    const selectedProductId = option?.value ? Number(option.value) : undefined;
    const selectedProduct = products.find((p) => p.id === selectedProductId);

    if (selectedProduct) {
      const currentQty = Math.max(1, Number(newItems[index]?.quantity) || 1);
      const pkg = findPackageForQty(selectedProduct, currentQty);
      const nextUnitPrice = pkg
        ? unitPriceFromPackage(pkg)
        : String(selectedProduct.price || newItems[index].unit_price || "0");
      newItems[index] = {
        ...newItems[index],
        product_id: selectedProduct.id,
        sku: selectedProduct.sku,
        product_name: selectedProduct.name,
        unit_price: nextUnitPrice,
      };
      applyPackageToOrder(selectedProduct, pkg);
    } else {
      newItems[index] = { ...newItems[index], product_id: 0, sku: "", product_name: "" };
    }
    commitItems(newItems);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...localItems];
    const current = newItems[index];
    if (!current) return;
    const product = current.product_id
      ? products.find((p) => p.id === current.product_id)
      : undefined;
    const pkg = findPackageForQty(product, quantity);
    // `current.quantity` đã bị onChange ghi đè bằng số đang gõ — so với số đã lưu.
    const savedQuantity = order.items?.[index]?.quantity ?? current.quantity;
    newItems[index] = applyTwoUnitLineDiscount(
      {
        ...current,
        quantity,
        unit_price: pkg ? unitPriceFromPackage(pkg) : current.unit_price,
      },
      savedQuantity,
      quantity,
    );
    if (product) applyPackageToOrder(product, pkg);
    commitItems(newItems);
  };

  const handleAddItem = () => {
    const p = products[0];
    const newItem = p
      ? {
          product_id: p.id,
          sku: p.sku,
          product_name: p.name,
          quantity: 1,
          unit_price: String(p.price || 0),
        }
      : { quantity: 1, sku: "", product_name: "", unit_price: "0" };
    commitItems([...localItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = localItems.filter((_, i) => i !== index);
    commitItems(newItems);
  };

  return (
    <SectionCard
      icon={<Package className="h-4 w-4" />}
      title="Sản phẩm & thông số hàng hóa"
      className={className}
    >
      {order.product_raw ? (
        <div className="px-4 pb-3">
          <InfoRow label="Sản phẩm (mô tả)" value={order.product_raw} />
        </div>
      ) : null}
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] -mx-4 pb-2">
        {!hasItems && localItems.length === 0 ? (
          <div className="px-4 py-2">
            <InfoRow label="Sản phẩm" value={order.product} />
            <InfoRow label="SKU" value={order.sku} />
            <InfoRow label="Số lượng" value={order.quantity} />
          </div>
        ) : (
          <table data-slot="table" className="w-full text-sm min-w-[820px]">
            <thead className="border-y border-border/40">
              <tr>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-left w-[30%]">
                  Sản phẩm
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-center w-[12%]">
                  SL
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right w-[18%]">
                  Đơn giá
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right w-[18%]">
                  Giảm giá
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right w-[15%]">
                  Thành tiền
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-center w-[7%]"></th>
              </tr>
            </thead>
            <tbody>
              {localItems.map((item, idx) => (
                <tr
                  key={item.id || `temp-${idx}`}
                  className="border-b border-border/40 hover:bg-muted/10"
                >
                  <td className="px-4 py-2">
                    <SearchableSelect
                      size="sm"
                      clearable
                      aria-label={`Sản phẩm dòng ${idx + 1}`}
                      options={productOptions}
                      // Chỉ hiện khi product_id có trong danh mục (như trước) — id lạ để trống.
                      value={
                        productOptions.some((o) => o.value === String(item.product_id ?? ""))
                          ? String(item.product_id)
                          : ""
                      }
                      onSelectOption={(opt) => handleProductChange(idx, opt ?? null)}
                      disabled={contentLocked}
                      placeholder="Chọn sản phẩm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-20 mx-auto text-center"
                      disabled={contentLocked}
                      value={item.quantity || ""}
                      onChange={(e) => {
                        const newItems = [...localItems];
                        newItems[idx] = { ...newItems[idx], quantity: Number(e.target.value) || 1 };
                        setLocalItems(newItems);
                      }}
                      onBlur={(e) => handleQuantityChange(idx, Number(e.target.value) || 1)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Input
                      className="h-8 w-full text-right"
                      disabled={contentLocked}
                      value={fmt(item.unit_price).replace(/₫/g, "").trim()}
                      onFocus={() => {
                        if (parseAmount(item.unit_price || 0) === 0) {
                          const newItems = [...localItems];
                          newItems[idx] = { ...newItems[idx], unit_price: "" };
                          setLocalItems(newItems);
                        }
                      }}
                      onChange={(e) => {
                        const val = normalizeNumericInput(e.target.value);
                        const newItems = [...localItems];
                        newItems[idx] = { ...newItems[idx], unit_price: val };
                        setLocalItems(newItems);
                      }}
                      onBlur={(e) =>
                        updateItem(idx, "unit_price", normalizeNumericInput(e.target.value))
                      }
                    />
                  </td>
                  <td className="px-4 py-2">
                    <LineDiscountInput
                      value={item}
                      disabled={contentLocked}
                      labels={LINE_DISCOUNT_LABELS}
                      className="h-8"
                      inputClassName="text-right"
                      onChange={(next) => {
                        const newItems = [...localItems];
                        newItems[idx] = { ...newItems[idx], ...next };
                        // Bấm ₫/% xoá số đang nhập → ghi ngay; gõ số thì đợi blur.
                        if (next.discount === "" && !next.discount_percent) {
                          commitItems(newItems);
                        } else {
                          setLocalItems(newItems);
                        }
                      }}
                      onBlur={() => commitItems([...localItems])}
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-primary">
                    {fmt(
                      item.line_total ||
                        (parseAmount(item.unit_price) - lineUnitDiscount(item)) *
                          (item.quantity || 1),
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={contentLocked || localItems.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            disabled={contentLocked}
            className="gap-1 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      <div className="mt-4 border-t border-border/50 pt-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Thông số hàng hóa
        </h4>
        <ERow
          {...lockProps}
          label="Khối lượng"
          rawValue={order.weight}
          display={
            order.weight ? (
              <span className="text-sm font-medium">
                {!isNaN(parseFloat(String(order.weight)))
                  ? formatNumber(parseFloat(String(order.weight)), {
                      locale: "en-US",
                      maximumFractionDigits: 1,
                    })
                  : order.weight}{" "}
                g
              </span>
            ) : undefined
          }
          onSave={(v) => patch({ weight: String(v) })}
        />
        <ERow
          {...lockProps}
          label="Kích thước"
          rawValue={order.dimensions}
          onSave={(v) => patch({ dimensions: String(v) })}
          display={
            dimParts[0] || dimParts[1] || dimParts[2] ? (
              <div className="flex items-center gap-2">
                {dimParts.map((p, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="rounded-md bg-muted px-2.5 py-1 text-sm font-mono">
                      {p || "—"}
                    </span>
                    {i < 2 && <span className="text-muted-foreground text-xs">×</span>}
                  </span>
                ))}
                <span className="text-xs text-muted-foreground">cm</span>
              </div>
            ) : undefined
          }
        />
      </div>
    </SectionCard>
  );
}

export const BlockProducts = memo(BlockProductsImpl);
