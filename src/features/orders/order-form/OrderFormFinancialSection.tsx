import { type Dispatch, type SetStateAction } from "react";

import { FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { normalizeDecimalInput as normalizeNumericInput } from "@/features/orders/order-normalizers";
import { type CreateOrderPayload } from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";

import { formatNumericDisplay, parseAmount } from "./order-form-helpers";

type Translate = ReturnType<typeof useI18n>["t"];

/** Tooltip cho ô nhập bị khoá vì thiếu quyền sửa-theo-field — trùng với OrderFormDialog. */
const NO_FIELD_PERMISSION_TITLE = "Bạn không có quyền sửa trường này";

/** Các ô tiền của form đơn: tổng tiền, phí ship, chiết khấu, đã thanh toán... */
export function OrderFormFinancialSection({
  t,
  form,
  setForm,
  clearZeroOnFocus,
  isFieldLocked,
}: {
  t: Translate;
  form: CreateOrderPayload;
  setForm: Dispatch<SetStateAction<CreateOrderPayload>>;
  clearZeroOnFocus: (
    field:
      | "weight"
      | "total_amount"
      | "shipping_fee"
      | "discount_amount"
      | "booking_voucher_discount"
      | "total_after_discount"
      | "other_price",
  ) => void;
  /** Quyền sửa-theo-field (đã tính isCreateMode) — nhánh tạo luôn trả false. */
  isFieldLocked: (field: string) => boolean;
}) {
  return (
    <FormGrid columns={3}>
      <div title={isFieldLocked("total_amount") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.totalAmount")}
        </label>
        <Input
          value={formatNumericDisplay(form.total_amount)}
          disabled={isFieldLocked("total_amount")}
          onFocus={() => clearZeroOnFocus("total_amount")}
          onChange={(e) => {
            setForm((prev) => ({
              ...prev,
              total_amount: normalizeNumericInput(e.target.value),
            }));
          }}
        />
      </div>
      <div title={isFieldLocked("shipping_fee") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.columns.shippingFee")}
        </label>
        <Input
          value={formatNumericDisplay(form.shipping_fee)}
          disabled={isFieldLocked("shipping_fee")}
          onFocus={() => clearZeroOnFocus("shipping_fee")}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              shipping_fee: normalizeNumericInput(e.target.value),
            }))
          }
        />
      </div>
      <div title={isFieldLocked("discount_amount") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.columns.discountAmount")}
        </label>
        <Input
          value={formatNumericDisplay(form.discount_amount)}
          disabled={isFieldLocked("discount_amount")}
          onFocus={() => clearZeroOnFocus("discount_amount")}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              discount_amount: normalizeNumericInput(e.target.value),
            }))
          }
        />
      </div>
      <div
        title={isFieldLocked("booking_voucher_discount") ? NO_FIELD_PERMISSION_TITLE : undefined}
      >
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.columns.bookingVoucherDiscount")}
        </label>
        <Input
          value={formatNumericDisplay(form.booking_voucher_discount)}
          disabled={isFieldLocked("booking_voucher_discount")}
          onFocus={() => clearZeroOnFocus("booking_voucher_discount")}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              booking_voucher_discount: normalizeNumericInput(e.target.value),
            }))
          }
        />
      </div>
      <div title={isFieldLocked("total_after_discount") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.columns.totalAfterDiscount")}
        </label>
        <Input
          value={formatNumericDisplay(form.total_after_discount)}
          disabled={isFieldLocked("total_after_discount")}
          onFocus={() => clearZeroOnFocus("total_after_discount")}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              total_after_discount: normalizeNumericInput(e.target.value),
            }))
          }
        />
      </div>
      <div title={isFieldLocked("payment_method") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.paymentMethod", "Phương thức thanh toán")}
        </label>
        <Input
          value={form.payment_method || ""}
          disabled={isFieldLocked("payment_method")}
          onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))}
          placeholder="Cash"
        />
      </div>
      <div title={isFieldLocked("other_price") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.columns.otherPrice")}
        </label>
        <Input
          value={formatNumericDisplay(form.other_price)}
          disabled={isFieldLocked("other_price")}
          onFocus={() => clearZeroOnFocus("other_price")}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              other_price: normalizeNumericInput(e.target.value),
            }))
          }
        />
      </div>
      <div title={isFieldLocked("customer_prepaid") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <div className="mb-1 flex items-center gap-2">
          <label className="block text-sm text-muted-foreground">
            {t("orders.fields.customerPrepaid")}
          </label>
          <label className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground select-none">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-border accent-primary"
              disabled={isFieldLocked("customer_prepaid")}
              checked={
                parseAmount(form.customer_prepaid) > 0 &&
                parseAmount(form.customer_prepaid) >= parseAmount(form.total_after_discount)
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setForm((prev) => ({
                    ...prev,
                    customer_prepaid: prev.total_after_discount || prev.total_amount || "0",
                  }));
                } else {
                  setForm((prev) => ({ ...prev, customer_prepaid: "0" }));
                }
              }}
            />
            {t("orders.fields.fullyPaid", "Đã thanh toán")}
          </label>
        </div>
        <Input
          value={formatNumericDisplay(form.customer_prepaid)}
          disabled={isFieldLocked("customer_prepaid")}
          onFocus={() => {
            const cur = normalizeNumericInput(String(form.customer_prepaid ?? ""));
            if (cur === "0") setForm((prev) => ({ ...prev, customer_prepaid: "" }));
          }}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              customer_prepaid: normalizeNumericInput(e.target.value),
            }))
          }
        />
      </div>
    </FormGrid>
  );
}
