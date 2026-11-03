import { useState } from "react";
import { CircleCheck, Mailbox, Send, ShieldCheck, Warehouse } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormGrid } from "@/components/ui/form-dialog-content";

import {
  CARRIER_OPTIONS,
  CARRIER_RESPONSE_OPTIONS,
  COMPENSATION_STATUS_OPTIONS,
  FEEDBACK_AGREE_OPTIONS,
  FEEDBACK_RATING_OPTIONS,
  INSPECTION_OPTIONS,
  RESOLUTION_OPTIONS,
} from "@/features/warranty-claims/journey-enums";
import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";
import { BestOrderFormBody } from "../best/BestOrderFormBody";
import { useBestOrderForm } from "../best/useBestOrderForm";
import { EnumSelect, Field, VcGroupBadge, SectionTitle } from "./journey-fields";
import { journeyFieldId, type JourneySectionProps } from "./journey-form";

/** §5 Kho nhận hàng BH. */
export function WarehouseSection({ journey, form, set }: JourneySectionProps) {
  const fieldId = (name: string) => journeyFieldId(journey.id, name);
  // Tình trạng nhận thực KHÔNG có field riêng: suy từ trạng thái nội bộ do quét
  // kho đặt, tránh 2 nguồn sự thật lệch nhau (xem spec §Model).
  const received = journey.status === "returned";
  return (
    <section>
      <SectionTitle icon={Warehouse}>Kho nhận hàng BH</SectionTitle>
      <FormGrid>
        <Field label="Tình trạng nhận thực">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              received ? "bg-teal-100 text-teal-700" : "bg-gray-200 text-gray-600"
            }`}
          >
            {received ? "Đã nhận" : "Chưa nhận"}
          </span>
        </Field>
        <Field label="Ngày nhận hàng hoàn" htmlFor={fieldId("warehouse_received_at")}>
          <Input
            id={fieldId("warehouse_received_at")}
            type="date"
            value={form.warehouse_received_at}
            onChange={(e) => set("warehouse_received_at", e.target.value)}
          />
        </Field>
        <Field label="Kết quả kiểm tra" htmlFor={fieldId("inspection_result")}>
          <EnumSelect
            id={fieldId("inspection_result")}
            value={form.inspection_result}
            onValueChange={(v) => set("inspection_result", v)}
            options={INSPECTION_OPTIONS}
          />
        </Field>
      </FormGrid>
    </section>
  );
}

/** §6 CSKH chốt phương án. */
export function ResolutionSection({ journey, form, set }: JourneySectionProps) {
  const fieldId = (name: string) => journeyFieldId(journey.id, name);
  return (
    <section>
      <SectionTitle icon={Send}>CSKH chốt phương án</SectionTitle>
      <FormGrid>
        <Field label="Phương án" htmlFor={fieldId("resolution")}>
          <EnumSelect
            id={fieldId("resolution")}
            value={form.resolution}
            onValueChange={(v) => set("resolution", v)}
            options={RESOLUTION_OPTIONS}
          />
        </Field>
        <Field label="Giá trị khai giá (đơn mới)" htmlFor={fieldId("resolution_declared_value")}>
          <Input
            id={fieldId("resolution_declared_value")}
            type="number"
            step="0.01"
            value={form.resolution_declared_value}
            onChange={(e) => set("resolution_declared_value", e.target.value)}
          />
        </Field>
        <Field label="COD (đơn mới)" htmlFor={fieldId("resolution_cod")}>
          <Input
            id={fieldId("resolution_cod")}
            type="number"
            step="0.01"
            value={form.resolution_cod}
            onChange={(e) => set("resolution_cod", e.target.value)}
          />
        </Field>
        <Field label="Ghi chú CSKH" htmlFor={fieldId("resolution_note")}>
          <Textarea
            id={fieldId("resolution_note")}
            value={form.resolution_note}
            onChange={(e) => set("resolution_note", e.target.value)}
            rows={2}
          />
        </Field>
      </FormGrid>
    </section>
  );
}

/** §7 Gửi đơn mới về khách — bung form tạo đơn Best ngay tại chỗ. */
export function ReturnSection({ journey, form, set, setSynced }: JourneySectionProps) {
  const fieldId = (name: string) => journeyFieldId(journey.id, name);
  const [expanded, setExpanded] = useState(false);

  // Form Best phải đọc BẢN NHÁP, không phải bản ghi SERVER (`journey`): CSKH
  // thường chốt phương án + khai giá/COD ở §6 rồi bấm "Tạo đơn Best" ngay tại
  // §7 — đúng luồng mà thiết kế inline khuyến khích — mà CHƯA kịp bấm "Lưu
  // hành trình". Đọc `journey` thẳng sẽ tạo đơn Best với COD = 0 và địa chỉ
  // khách chưa sửa, mất tiền và im lặng không cảnh báo (review finding 1).
  // Field nào chỉ có ở server (product_sku/product_name) thì giữ nguyên.
  const journeyForBest: WarrantyJourney = {
    ...journey,
    receiver_name: form.receiver_name,
    receiver_phone: form.receiver_phone,
    receiver_raw_address: form.receiver_raw_address,
    resolution_declared_value: form.resolution_declared_value,
    resolution_cod: form.resolution_cod,
  };

  const best = useBestOrderForm({
    journey: journeyForBest,
    leg: "return",
    active: expanded,
    onCreated: (code, patch) => {
      // Ba field này VỪA được PATCH xuống server trong cùng một lệnh (xem
      // useBestOrderForm) — đổ vào bản nháp bằng setSynced để không bật cờ
      // "chưa lưu". Ngày đọc lại từ CHÍNH `patch` vừa gửi, KHÔNG gọi lại
      // `todayIso()` ở đây — gọi 2 lần có thể lệch ngày với server nếu chạy
      // qua nửa đêm giữa hai lần tính (review finding 7).
      setSynced("return_tracking_code", code);
      setSynced("return_carrier", "best");
      setSynced("return_order_date", patch.return_order_date);
      setExpanded(false);
    },
  });

  return (
    <section>
      <SectionTitle icon={ShieldCheck}>Gửi đơn mới về khách</SectionTitle>
      {expanded && best.form ? (
        <div className="space-y-4">
          <BestOrderFormBody
            form={best.form}
            setForm={best.setForm}
            accounts={best.accounts}
            accountId={best.accountId}
            setAccountId={best.setAccountId}
            customReturn={best.customReturn}
            setCustomReturn={best.setCustomReturn}
            // Nhiều hành trình có thể cùng bung §7 độc lập trên một phiếu —
            // prefix theo journey.id để id DOM không trùng nhau (review finding 3).
            idPrefix={`best-j${journey.id}`}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setExpanded(false)}>
              Hủy
            </Button>
            <Button type="button" onClick={best.submit} disabled={best.isPending}>
              {best.isPending ? "Đang tạo..." : "Tạo đơn"}
            </Button>
          </div>
        </div>
      ) : (
        <FormGrid>
          <Field label="Đơn vị vận chuyển (hàng về)" htmlFor={fieldId("return_carrier")}>
            <EnumSelect
              id={fieldId("return_carrier")}
              value={form.return_carrier}
              onValueChange={(v) => set("return_carrier", v)}
              options={CARRIER_OPTIONS}
            />
          </Field>
          <Field label="Phí vận chuyển (hàng về)" htmlFor={fieldId("return_shipping_fee")}>
            <Input
              id={fieldId("return_shipping_fee")}
              type="number"
              step="0.01"
              value={form.return_shipping_fee}
              onChange={(e) => set("return_shipping_fee", e.target.value)}
            />
          </Field>
          <Field label="Ngày lên đơn (hàng về)" htmlFor={fieldId("return_order_date")}>
            <Input
              id={fieldId("return_order_date")}
              type="date"
              value={form.return_order_date}
              onChange={(e) => set("return_order_date", e.target.value)}
            />
          </Field>
          <Field label="Mã vận đơn (hàng về)" htmlFor={fieldId("return_tracking_code")}>
            {/* Trạng thái giao chặng gửi lại đọc tự động từ mã Best (badge). */}
            <div className="flex items-center gap-2">
              <Input
                id={fieldId("return_tracking_code")}
                value={form.return_tracking_code}
                onChange={(e) => set("return_tracking_code", e.target.value)}
              />
              {form.return_tracking_code.trim() === "" && (
                <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)}>
                  Tạo đơn Best
                </Button>
              )}
              <VcGroupBadge group={journey.vc_groups?.return} />
            </div>
          </Field>
        </FormGrid>
      )}
    </section>
  );
}

/** Khách nhận hàng — cảm nhận. Hiện khi chặng giao tới khách đã GTC. */
export function FeedbackSection({ journey, form, set }: JourneySectionProps) {
  const fieldId = (name: string) => journeyFieldId(journey.id, name);
  return (
    <section>
      <SectionTitle icon={CircleCheck}>Khách nhận hàng — Cảm nhận</SectionTitle>
      <FormGrid>
        <Field label="Đồng ý để lại review?" htmlFor={fieldId("feedback_agree_review")}>
          <EnumSelect
            id={fieldId("feedback_agree_review")}
            value={form.feedback_agree_review}
            onValueChange={(v) => set("feedback_agree_review", v)}
            options={FEEDBACK_AGREE_OPTIONS}
          />
        </Field>
        <Field label="Đánh giá về trải nghiệm BH" htmlFor={fieldId("feedback_rating")}>
          <EnumSelect
            id={fieldId("feedback_rating")}
            value={form.feedback_rating}
            onValueChange={(v) => set("feedback_rating", v)}
            options={FEEDBACK_RATING_OPTIONS}
          />
        </Field>
        <Field label="Note cảm nhận của khách" htmlFor={fieldId("feedback_note")}>
          <Textarea
            id={fieldId("feedback_note")}
            value={form.feedback_note}
            onChange={(e) => set("feedback_note", e.target.value)}
            rows={2}
          />
        </Field>
      </FormGrid>
    </section>
  );
}

/** Khiếu nại & đền bù — hiện khi có mã vận đơn rơi vào nhóm thất lạc. */
export function ClaimSection({ journey, form, set }: JourneySectionProps) {
  const fieldId = (name: string) => journeyFieldId(journey.id, name);
  return (
    <section>
      <SectionTitle icon={Mailbox}>Khiếu nại & đền bù</SectionTitle>
      <FormGrid>
        <Field label="Ngày khiếu nại" htmlFor={fieldId("claim_date")}>
          <Input
            id={fieldId("claim_date")}
            type="date"
            value={form.claim_date}
            onChange={(e) => set("claim_date", e.target.value)}
          />
        </Field>
        <Field label="Phản hồi của ĐVVC" htmlFor={fieldId("carrier_response")}>
          <EnumSelect
            id={fieldId("carrier_response")}
            value={form.carrier_response}
            onValueChange={(v) => set("carrier_response", v)}
            options={CARRIER_RESPONSE_OPTIONS}
          />
        </Field>
        <Field label="Tình trạng đền bù" htmlFor={fieldId("compensation_status")}>
          <EnumSelect
            id={fieldId("compensation_status")}
            value={form.compensation_status}
            onValueChange={(v) => set("compensation_status", v)}
            options={COMPENSATION_STATUS_OPTIONS}
          />
        </Field>
        <Field label="Số tiền đền bù" htmlFor={fieldId("compensation_amount")}>
          <Input
            id={fieldId("compensation_amount")}
            type="number"
            step="0.01"
            value={form.compensation_amount}
            onChange={(e) => set("compensation_amount", e.target.value)}
          />
        </Field>
        <Field label="Ghi chú" htmlFor={fieldId("claim_note")}>
          <Textarea
            id={fieldId("claim_note")}
            value={form.claim_note}
            onChange={(e) => set("claim_note", e.target.value)}
            rows={2}
          />
        </Field>
      </FormGrid>
    </section>
  );
}
