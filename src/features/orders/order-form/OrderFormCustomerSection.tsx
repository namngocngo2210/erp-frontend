import { type Dispatch, type SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CreateOrderPayload } from "@/features/orders/use-orders-data";
import { parseAddress } from "@/lib/api/orders";
import { useI18n } from "@/i18n";

import { NO_FIELD_PERMISSION_TITLE, type OrderSelectOption } from "./order-form-helpers";
import { swallowError } from "@/lib/errors";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Khối "Khách hàng" của form đơn: mã khách (chỉ đọc, tự tra theo SĐT), tên, SĐT,
 * giới tính và cụm địa chỉ (địa chỉ thô tự parse + khu vực/phường xã KiotViet).
 */
export function OrderFormCustomerSection({
  t,
  form,
  setForm,
  isFieldLocked,
  displayCustomerCode,
  onPhoneBlurLookup,
  locationOptions,
  wardOptions,
}: {
  t: Translate;
  form: CreateOrderPayload;
  setForm: Dispatch<SetStateAction<CreateOrderPayload>>;
  /** Quyền sửa-theo-field (đã tính isCreateMode) — nhánh tạo luôn trả false. */
  isFieldLocked: (field: string) => boolean;
  displayCustomerCode: string;
  onPhoneBlurLookup: () => void;
  locationOptions: OrderSelectOption[];
  wardOptions: OrderSelectOption[];
}) {
  const genderLabel = (value: string) => t(`gender.${value}`, value);

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
      <div className="md:col-span-3">
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.columns.customerCode", "Mã khách hàng")}
        </label>
        <Input value={displayCustomerCode} readOnly disabled aria-readonly="true" />
      </div>
      <div
        className="md:col-span-4"
        title={isFieldLocked("name") ? NO_FIELD_PERMISSION_TITLE : undefined}
      >
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.customerName")}
        </label>
        <Input
          value={form.name}
          disabled={isFieldLocked("name")}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>
      <div
        className="md:col-span-3"
        title={isFieldLocked("phone") ? NO_FIELD_PERMISSION_TITLE : undefined}
      >
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.phone")}
        </label>
        <Input
          value={form.phone}
          disabled={isFieldLocked("phone")}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          onBlur={onPhoneBlurLookup}
          inputMode="tel"
          autoComplete="tel"
        />
      </div>
      <div
        className="md:col-span-2"
        title={isFieldLocked("customer_gender") ? NO_FIELD_PERMISSION_TITLE : undefined}
      >
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.gender")}
        </label>
        <Select
          value={form.customer_gender?.toString() || "1"}
          disabled={isFieldLocked("customer_gender")}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, customer_gender: parseInt(value, 10) }))
          }
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{genderLabel(form.customer_gender === 0 ? "female" : "male")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{genderLabel("male")}</SelectItem>
            <SelectItem value="0">{genderLabel("female")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div
        className="md:col-span-12"
        title={isFieldLocked("raw_address") ? NO_FIELD_PERMISSION_TITLE : undefined}
      >
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.columns.rawAddress")}
        </label>
        <Input
          value={form.raw_address || ""}
          disabled={isFieldLocked("raw_address")}
          onChange={(e) => setForm((prev) => ({ ...prev, raw_address: e.target.value }))}
          onBlur={async (e) => {
            const nextRaw = e.target.value.trim();
            if (!nextRaw) return;
            try {
              const data = await parseAddress(nextRaw);
              setForm((prev) => ({
                ...prev,
                address: data.address ?? prev.address ?? "",
                kiotviet_location: data.kiotviet_location ?? prev.kiotviet_location ?? "",
                kiotviet_ward: data.kiotviet_ward ?? prev.kiotviet_ward ?? "",
                ward_code: data.ward_code ?? prev.ward_code ?? "",
                district_code: data.district_code ?? prev.district_code ?? "",
                province_code: data.province_code ?? prev.province_code ?? "",
              }));
            } catch (err) {
              // ignore — backend sẽ parse lại lúc save
              swallowError(err, "orders.form.parseAddress");
            }
          }}
        />
      </div>
      <div
        className="md:col-span-4"
        title={isFieldLocked("address") ? NO_FIELD_PERMISSION_TITLE : undefined}
      >
        <label className="mb-1 block text-sm text-muted-foreground">
          {t("orders.fields.address")}
        </label>
        <Input
          value={form.address || ""}
          disabled={isFieldLocked("address")}
          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
        />
      </div>
      <div
        className="md:col-span-4"
        title={isFieldLocked("kiotviet_location") ? NO_FIELD_PERMISSION_TITLE : undefined}
      >
        <label
          htmlFor="order-form-kiotviet-location"
          className="mb-1 block text-sm text-muted-foreground"
        >
          {t("orders.fields.kiotvietLocation", "Khu vực")}
        </label>
        <SearchableSelect
          id="order-form-kiotviet-location"
          controlClassName="h-10"
          creatable
          clearable
          disabled={isFieldLocked("kiotviet_location")}
          placeholder="Chọn hoặc nhập khu vực..."
          options={locationOptions}
          value={form.kiotviet_location || ""}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              kiotviet_location: value,
              kiotviet_ward: "",
            }))
          }
        />
      </div>
      <div
        className="md:col-span-4"
        title={isFieldLocked("kiotviet_ward") ? NO_FIELD_PERMISSION_TITLE : undefined}
      >
        <label
          htmlFor="order-form-kiotviet-ward"
          className="mb-1 block text-sm text-muted-foreground"
        >
          {t("orders.fields.kiotvietWard", "Phường/Xã")}
        </label>
        <SearchableSelect
          id="order-form-kiotviet-ward"
          controlClassName="h-10"
          creatable
          clearable
          placeholder="Chọn hoặc nhập phường/xã..."
          options={wardOptions}
          value={form.kiotviet_ward || ""}
          disabled={!form.kiotviet_location || isFieldLocked("kiotviet_ward")}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              kiotviet_ward: value,
            }))
          }
        />
      </div>
    </div>
  );
}
