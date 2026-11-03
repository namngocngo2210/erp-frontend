import { useCallback } from "react";
import { Settings, ShoppingCart, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormGrid } from "@/components/ui/form-dialog-content";

import { useProductSearch } from "@/features/products/queries";
import {
  CARRIER_OPTIONS,
  CLASSIFICATION_OPTIONS,
  ERROR_CATEGORY_OPTIONS,
  SHIPPING_FORM_OPTIONS,
  WAREHOUSE_CHECK_OPTIONS,
} from "@/features/warranty-claims/journey-enums";
import { BestCreateOrderButton } from "../best/BestCreateOrderButton";
import { EnumSelect, Field, VcGroupBadge, SectionTitle } from "./journey-fields";
import { journeyFieldId, type JourneySectionProps } from "./journey-form";

/** §2 Người nhận. */
export function ReceiverSection({ journey, form, set }: JourneySectionProps) {
  const fieldId = (name: string) => journeyFieldId(journey.id, name);
  return (
    <section>
      <SectionTitle icon={User}>Người nhận</SectionTitle>
      <FormGrid>
        <Field label="Tên người nhận" htmlFor={fieldId("receiver_name")}>
          <Input
            id={fieldId("receiver_name")}
            value={form.receiver_name}
            onChange={(e) => set("receiver_name", e.target.value)}
          />
        </Field>
        <Field label="SĐT người nhận" htmlFor={fieldId("receiver_phone")}>
          <Input
            id={fieldId("receiver_phone")}
            value={form.receiver_phone}
            onChange={(e) => set("receiver_phone", e.target.value)}
          />
        </Field>
      </FormGrid>
      <div className="mt-4">
        <Field label="Địa chỉ" htmlFor={fieldId("receiver_raw_address")}>
          <Textarea
            id={fieldId("receiver_raw_address")}
            value={form.receiver_raw_address}
            onChange={(e) => set("receiver_raw_address", e.target.value)}
            rows={2}
            placeholder="Nhập địa chỉ..."
          />
        </Field>
      </div>
    </section>
  );
}

/** §3 Sản phẩm & lý do. */
export function ProductSection({ journey, form, set }: JourneySectionProps) {
  const fieldId = (name: string) => journeyFieldId(journey.id, name);
  // Tìm theo SKU trực tiếp trên server (như form tạo đơn) — tránh tải toàn bộ
  // catalog về client. Chỉ hiển thị SKU, không hiện tên sản phẩm.
  const searchProducts = useProductSearch();
  const searchSkuOptions = useCallback(
    async (q: string) => {
      const list = await searchProducts(q);
      return list.map((p) => ({ value: String(p.id), label: p.sku }));
    },
    [searchProducts],
  );
  return (
    <section>
      <SectionTitle icon={Settings}>Sản phẩm & lý do</SectionTitle>
      <FormGrid>
        <Field label="Sản phẩm">
          <SearchableSelect
            onSearch={searchSkuOptions}
            selectedLabel={journey.product_sku || undefined}
            value={form.product != null ? String(form.product) : ""}
            onChange={(v) => set("product", v ? Number(v) : null)}
            placeholder="Chọn SKU..."
          />
        </Field>
        <Field label="Phân loại" htmlFor={fieldId("classification")}>
          <EnumSelect
            id={fieldId("classification")}
            value={form.classification}
            onValueChange={(v) => set("classification", v)}
            options={CLASSIFICATION_OPTIONS}
          />
        </Field>
        <Field label="Nhóm lỗi" htmlFor={fieldId("error_category")}>
          <EnumSelect
            id={fieldId("error_category")}
            value={form.error_category}
            onValueChange={(v) => set("error_category", v)}
            options={ERROR_CATEGORY_OPTIONS}
          />
        </Field>
        <Field label="Giá trị khai giá" htmlFor={fieldId("declared_value")}>
          <Input
            id={fieldId("declared_value")}
            type="number"
            step="0.01"
            value={form.declared_value}
            onChange={(e) => set("declared_value", e.target.value)}
          />
        </Field>
        <Field label="Tiền thu hộ (COD)" htmlFor={fieldId("cod_amount")}>
          <Input
            id={fieldId("cod_amount")}
            type="number"
            step="0.01"
            value={form.cod_amount}
            onChange={(e) => set("cod_amount", e.target.value)}
          />
        </Field>
        <Field label="Lý do gửi" htmlFor={fieldId("send_reason")}>
          <Textarea
            id={fieldId("send_reason")}
            value={form.send_reason}
            onChange={(e) => set("send_reason", e.target.value)}
            rows={2}
          />
        </Field>
      </FormGrid>
    </section>
  );
}

/** §4 Vận chuyển & chi phí. */
export function ShippingSection({ journey, form, set, setSynced }: JourneySectionProps) {
  const fieldId = (name: string) => journeyFieldId(journey.id, name);
  return (
    <section>
      <SectionTitle icon={ShoppingCart}>Vận chuyển & chi phí</SectionTitle>
      <FormGrid>
        <Field label="Trạng thái vận chuyển (tự động theo Best)">
          {/* Read-only: nhóm VC tự động theo mã Best (cron 10' cập nhật) + trạng
              thái nội bộ kho (quét xuất/hoàn đặt) để tham khảo. */}
          <div className="flex flex-wrap items-center gap-2">
            <VcGroupBadge group={journey.vc_groups?.main ?? "created"} />
            <Badge variant="outline" className="shrink-0">
              {journey.status_label}
            </Badge>
          </div>
        </Field>
        <Field label="Hình thức gửi" htmlFor={fieldId("shipping_form")}>
          <EnumSelect
            id={fieldId("shipping_form")}
            value={form.shipping_form}
            onValueChange={(v) => set("shipping_form", v)}
            options={SHIPPING_FORM_OPTIONS}
          />
        </Field>
        <Field label="Đơn vị vận chuyển" htmlFor={fieldId("carrier")}>
          <EnumSelect
            id={fieldId("carrier")}
            value={form.carrier}
            onValueChange={(v) => set("carrier", v)}
            options={CARRIER_OPTIONS}
          />
        </Field>
        <Field label="Phí vận chuyển" htmlFor={fieldId("shipping_fee")}>
          <Input
            id={fieldId("shipping_fee")}
            type="number"
            step="0.01"
            value={form.shipping_fee}
            onChange={(e) => set("shipping_fee", e.target.value)}
          />
        </Field>
        <Field label="Ngày lên đơn" htmlFor={fieldId("order_date")}>
          <Input
            id={fieldId("order_date")}
            type="date"
            value={form.order_date}
            onChange={(e) => set("order_date", e.target.value)}
          />
        </Field>
        <Field label="Mã vận đơn mới" htmlFor={fieldId("new_tracking_code")}>
          <div className="flex items-center gap-2">
            <Input
              id={fieldId("new_tracking_code")}
              value={form.new_tracking_code}
              onChange={(e) => set("new_tracking_code", e.target.value)}
            />
            <BestCreateOrderButton
              journey={journey}
              leg="new"
              currentCode={form.new_tracking_code}
              onCreated={(code) => setSynced("new_tracking_code", code)}
            />
            <VcGroupBadge group={journey.vc_groups?.new} />
          </div>
        </Field>
        <Field label="Mã thu hồi" htmlFor={fieldId("recall_code")}>
          <div className="flex items-center gap-2">
            <Input
              id={fieldId("recall_code")}
              value={form.recall_code}
              onChange={(e) => set("recall_code", e.target.value)}
            />
            <BestCreateOrderButton
              journey={journey}
              leg="recall"
              currentCode={form.recall_code}
              onCreated={(code) => setSynced("recall_code", code)}
            />
            <VcGroupBadge group={journey.vc_groups?.recall} />
          </div>
        </Field>
        {/* Kho check hàng — chỉ hiện khi đã nhận hàng hoàn (trạng thái nội bộ,
            quét hoàn/cron đặt — form không còn sửa status). */}
        {journey.status === "returned" && (
          <Field label="Kho check hàng" htmlFor={fieldId("warehouse_check")}>
            <EnumSelect
              id={fieldId("warehouse_check")}
              value={form.warehouse_check}
              onValueChange={(v) => set("warehouse_check", v)}
              options={WAREHOUSE_CHECK_OPTIONS}
            />
          </Field>
        )}
        <Field label="Ghi chú" htmlFor={fieldId("note")}>
          <Textarea
            id={fieldId("note")}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            rows={2}
          />
        </Field>
      </FormGrid>
    </section>
  );
}
