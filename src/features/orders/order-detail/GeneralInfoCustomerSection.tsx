import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AddressFields, ERow, InfoRow } from "../order-detail-shared";
import type { OrderRow } from "../order-types";
import { useAddressAutofill } from "./use-address-autofill";

const GENDER_OPTIONS = [
  { label: "Nam", value: "1" },
  { label: "Nữ", value: "0" },
];

type Props = {
  order: OrderRow;
  patch: (p: Partial<OrderRow>) => void;
  t: (k: string, f?: string) => string;
};

/** Nhóm "Khách hàng" trong khối Thông tin đơn hàng. */
export function GeneralInfoCustomerSection({ order, patch, t }: Props) {
  const { applyRawAddress, applyAddressLevel2 } = useAddressAutofill(patch);

  return (
    <section className="py-3 border-b border-border/50">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Khách hàng
      </h4>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <ERow
          stacked
          label="Tên khách hàng"
          rawValue={order.name}
          onSave={(v) => patch({ name: String(v) })}
        />
        <ERow
          stacked
          label="Số điện thoại"
          rawValue={order.phone || order.customer_phone}
          onSave={(v) => patch({ phone: String(v) })}
        />
        <ERow
          stacked
          label="Giới tính"
          rawValue={order.customer_gender != null ? String(order.customer_gender) : ""}
          display={
            order.customer_gender === 1 ? (
              <span className="text-sm font-medium">{t("gender.male", "Nam")}</span>
            ) : order.customer_gender === 0 ? (
              <span className="text-sm font-medium">{t("gender.female", "Nữ")}</span>
            ) : undefined
          }
          type="select"
          options={GENDER_OPTIONS}
          onSave={(v) => patch({ customer_gender: v === "" ? null : Number(v) })}
        />
        <InfoRow stacked label="Mã khách hàng" value={order.customer_code} />
        <InfoRow
          stacked
          label="Loại khách"
          value={
            order.customer_is_new == null
              ? ""
              : order.customer_is_new
                ? t("orders.customerType.new", "Khách mới")
                : t("orders.customerType.old", "Khách cũ")
          }
        />
        <ERow
          stacked
          label="Địa chỉ thô"
          rawValue={order.raw_address}
          onSave={(v) => applyRawAddress(String(v))}
          multiline
        />
        {/* 3 cấp chỉ đọc: suy từ Địa chỉ thô, từ 09/2026 sale chỉ sửa 2 cấp. */}
        <InfoRow stacked label="Địa chỉ 3 cấp" value={order.address} />
        <ERow
          stacked
          label="Địa chỉ 2 cấp"
          labelAdornment={
            order.raw_address?.trim() ? (
              // Đơn tạo trước 09/2026 không được backfill 2 cấp: bấm để parse
              // lại từ Địa chỉ thô (điền cả Khu vực/Phường xã), rồi bấm Lưu.
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-1 h-5 w-5 align-middle"
                aria-label="Quy đổi 2 cấp"
                title="Quy đổi 2 cấp từ Địa chỉ thô (nhớ bấm Lưu)"
                onClick={() => applyRawAddress(order.raw_address ?? "")}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            ) : null
          }
          rawValue={order.address_level2}
          onSave={(v) => applyAddressLevel2(String(v))}
        />
        <div className="col-span-1 sm:col-span-2">
          <AddressFields stacked order={order} onSave={patch} />
        </div>
      </div>
    </section>
  );
}
