import { type Dispatch, type SetStateAction } from "react";

import { FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { kocPrepaidOnOrderTypeChange } from "@/features/orders/koc-order-form";
import { type OrderSource, type OrderVat } from "@/features/orders/order-types";
import { type CreateOrderPayload } from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";

import {
  NO_FIELD_PERMISSION_TITLE,
  ORDER_TYPE_VALUES,
  type OrderSelectOption,
} from "./order-form-helpers";
import { OrderFormStockSummary } from "./OrderFormStockSummary";
import { type OrderFormStockState } from "./use-order-form-stock";
import { type KiotVietChannelOption } from "./use-order-form";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Khối "Thông tin chung" của form đơn: kênh bán, nhân viên phụ trách (kèm cờ chia
 * đơn tự động), kênh KiotViet + mã kho, trạng thái, thời gian tạo, loại đơn,
 * nguồn đơn, VAT và kho xuất.
 */
export function OrderFormBasicSection({
  t,
  form,
  setForm,
  isCreateMode,
  kocMode,
  canAssignSale,
  isFieldLocked,
  markChannelChangedByUser,
  channelSelectOptions,
  staffSelectOptions,
  kiotvietSelectOptions,
  kiotvietOptions,
  branchSelectOptions,
  orderSourceOptions,
  vatOptions,
  warehouseSelectOptions,
  selectedWarehouseName,
  stock,
}: {
  t: Translate;
  form: CreateOrderPayload;
  setForm: Dispatch<SetStateAction<CreateOrderPayload>>;
  isCreateMode: boolean;
  /** Trang đơn KOC — chọn loại đơn "không trả lại" tự điền prepaid. */
  kocMode: boolean;
  canAssignSale: boolean;
  /** Quyền sửa-theo-field (đã tính isCreateMode) — nhánh tạo luôn trả false. */
  isFieldLocked: (field: string) => boolean;
  /** Báo cho hook biết NGƯỜI DÙNG vừa đổi kênh (xem docblock ở use-order-form.ts). */
  markChannelChangedByUser: () => void;
  channelSelectOptions: OrderSelectOption[];
  staffSelectOptions: OrderSelectOption[];
  kiotvietSelectOptions: OrderSelectOption[];
  /** Danh sách kênh KiotViet gốc — tra branch_id mặc định khi đổi kênh KiotViet. */
  kiotvietOptions: KiotVietChannelOption[];
  branchSelectOptions: OrderSelectOption[];
  orderSourceOptions: OrderSelectOption[];
  vatOptions: OrderSelectOption[];
  warehouseSelectOptions: OrderSelectOption[];
  /** Tên kho đang chọn — nhãn khối tồn kho; rỗng = chưa chọn kho. */
  selectedWarehouseName: string;
  /** Tồn bán được của các sản phẩm trên đơn tại kho đang chọn. */
  stock: OrderFormStockState;
}) {
  const statusLabel = (value: string | number) => t(`status.${String(value)}`, String(value));
  const orderTypeLabel = (value: string) => t(`orderType.${value}`, value);

  return (
    <FormGrid columns={3}>
      <div title={isFieldLocked("channel_code") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label htmlFor="order-form-channel" className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.salesChannel")}
        </label>
        <SearchableSelect
          id="order-form-channel"
          controlClassName="h-10"
          clearable
          disabled={isFieldLocked("channel_code")}
          placeholder={t("orders.placeholders.selectChannel")}
          options={channelSelectOptions}
          value={channelSelectOptions.find((item) => item.value === form.channel_code)?.value ?? ""}
          // KHÔNG reset nhân viên khi đổi kênh: danh sách nhân viên do BE
          // scope theo phòng ban của trang, mọi kênh dùng chung (xem
          // buildChannelStaffByCode) nên đổi kênh không làm sale sai đi —
          // reset chỉ khiến đơn bị xoá sale im lặng lúc lưu.
          onChange={(value) => {
            // Đánh dấu đây là do NGƯỜI DÙNG đổi kênh (không phải do nạp dữ liệu
            // đơn cũ) để effect tính lại giá theo bảng giá mới được phép chạy.
            markChannelChangedByUser();
            setForm((prev) => ({
              ...prev,
              channel_code: value ?? "",
            }));
          }}
        />
      </div>
      <div>
        <label htmlFor="order-form-staff" className="mb-1 block text-sm text-muted-foreground">
          {t("orders.columns.staff")}
        </label>
        <SearchableSelect
          id="order-form-staff"
          controlClassName="h-10"
          clearable
          disabled={!form.channel_code || !canAssignSale || Boolean(form.auto_assign_staff)}
          placeholder={t("orders.placeholders.selectStaff")}
          options={staffSelectOptions}
          value={
            staffSelectOptions.find((item) => item.value === String(form.staff_id ?? ""))?.value ??
            ""
          }
          // Xoá lựa chọn = `null` (ý định rõ ràng "bỏ nhân viên"), khác với
          // `undefined` = form chưa từng đụng tới → buildPatchPayload bỏ qua.
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              staff_id: value ? Number(value) : null,
            }))
          }
        />
        {isCreateMode && (
          <label
            htmlFor="order-auto-assign-staff"
            className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <input
              id="order-auto-assign-staff"
              type="checkbox"
              checked={Boolean(form.auto_assign_staff)}
              // Bật cờ thì XOÁ nhân viên đang chọn: backend chỉ chia khi đơn
              // còn trống sale, gửi kèm staff_id sẽ vô hiệu hoá việc chia.
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  auto_assign_staff: event.target.checked,
                  staff_id: event.target.checked ? null : prev.staff_id,
                }))
              }
            />
            <span>{t("orders.fields.autoAssignStaff", "Chia đơn tự động theo cấu hình")}</span>
          </label>
        )}
      </div>
      <div title={isFieldLocked("kiotviet_channel_id") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label
          htmlFor="order-form-kiotviet-channel"
          className="mb-1 block text-sm text-muted-foreground"
        >
          {t("orders.fields.kiotvietChannel", "Kênh KiotViet")}
        </label>
        <SearchableSelect
          id="order-form-kiotviet-channel"
          controlClassName="h-10"
          clearable
          disabled={isFieldLocked("kiotviet_channel_id")}
          placeholder={t("orders.placeholders.selectKiotvietChannel", "Chọn kênh KiotViet")}
          options={kiotvietSelectOptions}
          value={
            kiotvietSelectOptions.find(
              (item) => item.value === String(form.kiotviet_channel_id ?? ""),
            )?.value ?? ""
          }
          onChange={(value) => {
            const kvId = value ? Number(value) : undefined;
            const kv = kiotvietOptions.find((item) => item.id === kvId);
            setForm((prev) => ({
              ...prev,
              kiotviet_channel_id: kvId,
              branch_id: kv?.branch_id || "",
            }));
          }}
        />
      </div>
      <div title={isFieldLocked("branch_id") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label htmlFor="order-form-branch" className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.branchId", "Mã kho")}
        </label>
        {branchSelectOptions.length > 0 ? (
          <SearchableSelect
            id="order-form-branch"
            controlClassName="h-10"
            clearable
            disabled={isFieldLocked("branch_id")}
            placeholder={t("orders.placeholders.selectBranch", "Chọn kho")}
            options={branchSelectOptions}
            value={
              branchSelectOptions.find((item) => item.value === (form.branch_id || ""))?.value ?? ""
            }
            onChange={(value) => setForm((prev) => ({ ...prev, branch_id: value ?? "" }))}
          />
        ) : (
          <Input
            className="h-10"
            value={form.branch_id || ""}
            disabled={isFieldLocked("branch_id")}
            title={isFieldLocked("branch_id") ? NO_FIELD_PERMISSION_TITLE : undefined}
            placeholder={t("orders.placeholders.enterBranchId", "Nhập mã kho")}
            onChange={(e) => setForm((prev) => ({ ...prev, branch_id: e.target.value }))}
          />
        )}
      </div>
      <div title={isFieldLocked("status") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.orderStatus")}
        </label>
        <Select
          value={String(form.status ?? 0)}
          disabled={isFieldLocked("status")}
          onValueChange={(value) =>
            setForm((prev) => ({
              ...prev,
              status: Number.isNaN(Number(value)) ? 0 : Number(value),
            }))
          }
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{statusLabel(form.status ?? 0)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((statusValue) => (
              <SelectItem key={statusValue} value={String(statusValue)}>
                {statusLabel(statusValue)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isCreateMode && (
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">
            {t("orders.columns.createdAt", "Thời gian tạo")}
          </label>
          <Input
            className="h-10"
            type="datetime-local"
            value={form.created_at_override || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, created_at_override: e.target.value }))}
          />
        </div>
      )}
      <div title={isFieldLocked("order_type") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.orderType")}
        </label>
        <Select
          value={form.order_type || "normal"}
          disabled={isFieldLocked("order_type")}
          onValueChange={(value) =>
            setForm((prev) => {
              const nextType = value || "normal";
              const prepaid = kocPrepaidOnOrderTypeChange(
                nextType,
                kocMode,
                prev.total_after_discount,
                prev.total_amount,
              );
              return prepaid === null
                ? { ...prev, order_type: nextType }
                : { ...prev, order_type: nextType, customer_prepaid: prepaid };
            })
          }
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{orderTypeLabel(form.order_type || "normal")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ORDER_TYPE_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {orderTypeLabel(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div title={isFieldLocked("order_source") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label
          htmlFor="order-form-order-source"
          className="mb-1 block text-sm text-muted-foreground"
        >
          {t("orders.fields.orderSource", "Nguồn đơn")}
        </label>
        <SearchableSelect
          id="order-form-order-source"
          controlClassName="h-10"
          clearable
          disabled={isFieldLocked("order_source")}
          placeholder={t("orders.placeholders.selectOrderSource", "Chọn nguồn")}
          options={orderSourceOptions}
          value={
            orderSourceOptions.find((item) => item.value === (form.order_source || ""))?.value ?? ""
          }
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              order_source: value ? (value as OrderSource) : null,
            }))
          }
        />
      </div>
      <div title={isFieldLocked("vat") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label htmlFor="order-form-vat" className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.vat", "VAT")}
        </label>
        <SearchableSelect
          id="order-form-vat"
          controlClassName="h-10"
          disabled={isFieldLocked("vat")}
          placeholder={t("orders.placeholders.selectVat", "Chọn VAT")}
          options={vatOptions}
          value={vatOptions.find((item) => item.value === (form.vat || "no"))?.value ?? ""}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              vat: value ? (value as OrderVat) : "no",
            }))
          }
        />
      </div>
      <div title={isFieldLocked("fulfillment_warehouse") ? NO_FIELD_PERMISSION_TITLE : undefined}>
        <label
          htmlFor="order-form-fulfillment-warehouse"
          className="mb-1 block text-sm text-muted-foreground"
        >
          {t("orders.fields.fulfillmentWarehouse", "Kho xuất")}
        </label>
        <SearchableSelect
          id="order-form-fulfillment-warehouse"
          controlClassName="h-10"
          clearable
          disabled={isFieldLocked("fulfillment_warehouse")}
          placeholder={t("orders.placeholders.selectFulfillmentWarehouse", "Chọn kho xuất")}
          options={warehouseSelectOptions}
          value={
            warehouseSelectOptions.find(
              (item) => item.value === String(form.fulfillment_warehouse ?? ""),
            )?.value ?? ""
          }
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              fulfillment_warehouse: value ? Number(value) : null,
            }))
          }
        />
      </div>
      <OrderFormStockSummary t={t} warehouseName={selectedWarehouseName} stock={stock} />
    </FormGrid>
  );
}
