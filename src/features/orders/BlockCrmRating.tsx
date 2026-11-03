import { memo, useMemo, useState, type ReactNode } from "react";
import { Bell, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type OrderCRMRow, type OrderRow } from "@/features/orders/order-types";
import { MultiSelect } from "@/components/ui/multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ERow, SectionCard, type SectionVariant } from "@/features/orders/order-detail-shared";
import { AiFilledBadge, type AiFilledMap } from "@/features/orders/components/AiFilledBadge";
import { DynamicAssessmentFields } from "@/features/orders/DynamicAssessmentFields";
import { overlayPendingDynamicFieldValues } from "@/features/orders/dynamic-assessment-values";
import { AiOpenInsights } from "@/features/orders/AiOpenInsights";

// ─────────────────────────────────────────────────────────────
// CRM option constants
// ─────────────────────────────────────────────────────────────

const CRM_CUSTOMER_CLASSIFICATION_OPTIONS = [
  { value: "easy_close", label: "Dễ tính - chốt ngay" },
  { value: "hesitant", label: "Do dự" },
  { value: "difficult", label: "Khó tính" },
  { value: "purchased_delivered", label: "Đã mua - giao thành công" },
  { value: "purchased_shipping", label: "Đã mua - đang giao" },
  { value: "bombed", label: "Bom hàng" },
  { value: "spam", label: "Spam" },
  { value: "no_pickup", label: "Không nhấc máy" },
];

const CRM_SALES_STATUS_OPTIONS = [
  { value: "closed", label: "Đã chốt" },
  { value: "closed_express", label: "Đã chốt/Hỏa tốc" },
  { value: "closed_scheduled_date", label: "Đã chốt, hẹn ngày" },
  { value: "created_order", label: "Đã lên đơn" },
  { value: "no_answer_1", label: "Không nghe máy lần 1" },
  { value: "no_answer_2", label: "Không nghe máy lần 2" },
  { value: "no_answer_3", label: "Không nghe máy lần 3" },
  { value: "no_answer_4", label: "Không nghe máy lần 4" },
  { value: "no_answer_5", label: "Không nghe máy lần 5" },
  { value: "no_answer_6", label: "Không nghe máy lần 6" },
  { value: "unreachable", label: "Không liên hệ được" },
  { value: "wrong_number", label: "Sai số" },
  { value: "customer_bombed", label: "Khách bom hàng" },
  { value: "spam", label: "Spam" },
  { value: "duplicate", label: "Lặp" },
  { value: "poor_quality_data", label: "Data không chất lượng" },
  { value: "need_more_consulting", label: "Tư vấn thêm" },
  { value: "not_buying", label: "Không mua" },
  { value: "underlying_condition", label: "Khách bị bệnh nền" },
  { value: "scheduled", label: "Hẹn lịch" },
  { value: "call_back_later", label: "Gọi lại sau" },
  { value: "wants_store_visit", label: "Khách muốn đến cửa hàng" },
  { value: "cancelled", label: "Huỷ đơn" },
  { value: "warranty", label: "Bảo hành" },
];

const CRM_NOT_CLOSED_REASON_OPTIONS = [
  { value: "too_expensive", label: "Đắt" },
  { value: "competitor_cheaper", label: "Mua bên khác rẻ" },
  { value: "china_product", label: "Hàng Trung Quốc" },
  { value: "wants_bundle_with_chair", label: "Muốn mua bộ có sẵn ghế" },
  { value: "family_disapproved", label: "Người thân không cho mua" },
  { value: "kids_playing", label: "Trẻ con nghịch" },
  { value: "family_already_bought", label: "Người thân mua rồi" },
  { value: "wrong_phone_number", label: "Số không đúng" },
  { value: "competitor_closed_first", label: "Bên khác chốt trước" },
];

const CRM_DELIVERY_BUSINESS_STATUS_OPTIONS = [
  { value: "received", label: "Đã nhận" },
  { value: "not_received", label: "Chưa nhận" },
  { value: "stalled_complaint", label: "Đơn dừng hành trình nhiều ngày, đang khiếu nại" },
  { value: "post_office_lost", label: "Bưu cục làm mất" },
];

const CRM_POTENTIAL_LEVEL_OPTIONS = [
  { value: "1", label: "⭐ Rất thấp" },
  { value: "2", label: "⭐⭐ Thấp" },
  { value: "3", label: "⭐⭐⭐ Trung bình" },
  { value: "4", label: "⭐⭐⭐⭐ Cao" },
  { value: "5", label: "⭐⭐⭐⭐⭐ Rất cao" },
];

type CrmCatalogOption = { code: string; label: string };
type CrmNeedGroupOption = { code: string; name_vi: string; sort_order: number };
type CrmNeedTypeOption = { code: string; group_code: string; name_vi: string; sort_order: number };
type CrmBombReasonGroupOption = { code: string; name_vi: string; sort_order: number };
type CrmBombReasonTypeOption = {
  code: string;
  group_code: string;
  name_vi: string;
  sort_order: number;
  is_active?: boolean;
};

export type CrmCatalogPayload = {
  customer_classification_options?: CrmCatalogOption[];
  sales_status_options?: CrmCatalogOption[];
  not_closed_reason_options?: CrmCatalogOption[];
  delivery_business_status_options?: CrmCatalogOption[];
  potential_level_options?: Array<{ value: number; label: string }>;
  need_groups?: CrmNeedGroupOption[];
  need_types?: CrmNeedTypeOption[];
  bomb_reason_groups?: CrmBombReasonGroupOption[];
  bomb_reason_types?: CrmBombReasonTypeOption[];
  occupation_options?: CrmCatalogOption[];
  age_group_options?: CrmCatalogOption[];
  delax_source_options?: CrmCatalogOption[];
  pain_level_options?: CrmCatalogOption[];
  pain_duration_options?: CrmCatalogOption[];
  lifestyle_habit_options?: CrmCatalogOption[];
  relax_time_options?: CrmCatalogOption[];
  purchase_barrier_options?: CrmCatalogOption[];
  call_duration_options?: CrmCatalogOption[];
  post_purchase_rating_options?: CrmCatalogOption[];
  dynamic_fields?: Array<{
    code: string;
    label: string;
    kind: "single_choice" | "multi_choice" | "text" | "number" | "bool";
    options: CrmCatalogOption[];
    sort_order: number;
  }>;
};

const CRM_USED_MASSAGE_OPTIONS = [
  { value: "yes", label: "Có" },
  { value: "no", label: "Chưa" },
];

// ─────────────────────────────────────────────────────────────
// Tab Đánh giá (CRM)
// ─────────────────────────────────────────────────────────────

function BlockCrmRatingImpl({
  order,
  patch,
  crmCatalog,
  variant,
}: {
  order: OrderRow;
  patch: (p: Partial<OrderRow>) => void;
  crmCatalog?: CrmCatalogPayload | null;
  variant?: SectionVariant;
}) {
  const crm = order.crm;
  // Field nào AI đã tự điền từ transcript, dùng để hiện badge cạnh label.
  const aiFilled = (crm?.ai_filled_fields ?? undefined) as AiFilledMap | undefined;
  // Chỉ gửi đúng những field user vừa edit. Việc spread `crm` vào payload
  // gây ra 400 khi data hiện tại chứa code/label đã out-of-date so với catalog
  // (sales_status_code lỗi thời, needs có type_code inactive, code_array
  // chứa item ngoài whitelist, ...) — backend reject cả request, save lưu
  // không xong. Việc accumulate giữa nhiều lần edit do `patch` ở
  // OrderDetailPage deep-merge `crm` vào `pendingRows`.
  const patchCrm = (fields: Partial<OrderCRMRow>) => {
    patch({ crm: fields as OrderCRMRow });
  };

  const customerClassificationOptions = useMemo(
    () =>
      crmCatalog?.customer_classification_options?.map((item) => ({
        value: item.code,
        label: item.label,
      })) ?? CRM_CUSTOMER_CLASSIFICATION_OPTIONS,
    [crmCatalog],
  );
  const salesStatusOptions = useMemo(
    () =>
      crmCatalog?.sales_status_options?.map((item) => ({ value: item.code, label: item.label })) ??
      CRM_SALES_STATUS_OPTIONS,
    [crmCatalog],
  );
  const notClosedReasonOptions = useMemo(
    () =>
      crmCatalog?.not_closed_reason_options?.map((item) => ({
        value: item.code,
        label: item.label,
      })) ?? CRM_NOT_CLOSED_REASON_OPTIONS,
    [crmCatalog],
  );
  const deliveryBusinessStatusOptions = useMemo(
    () =>
      crmCatalog?.delivery_business_status_options?.map((item) => ({
        value: item.code,
        label: item.label,
      })) ?? CRM_DELIVERY_BUSINESS_STATUS_OPTIONS,
    [crmCatalog],
  );
  const potentialLevelOptions = useMemo(
    () =>
      crmCatalog?.potential_level_options?.map((item) => ({
        value: String(item.value),
        label: `${"⭐".repeat(item.value)} ${item.label}`,
      })) ?? CRM_POTENTIAL_LEVEL_OPTIONS,
    [crmCatalog],
  );
  const needGroupOptions = useMemo(
    () =>
      [...(crmCatalog?.need_groups ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({ value: item.code, label: item.name_vi })),
    [crmCatalog],
  );
  const needTypes = useMemo(
    () => [...(crmCatalog?.need_types ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [crmCatalog],
  );
  const bombReasonGroupOptions = useMemo(
    () =>
      [...(crmCatalog?.bomb_reason_groups ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({ value: item.code, label: item.name_vi })),
    [crmCatalog],
  );
  const bombReasonTypes = useMemo(
    () => [...(crmCatalog?.bomb_reason_types ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [crmCatalog],
  );
  const toOpts = (items?: CrmCatalogOption[]) =>
    (items ?? []).map((item) => ({ value: item.code, label: item.label }));
  const delaxSourceOptions = useMemo(() => toOpts(crmCatalog?.delax_source_options), [crmCatalog]);
  const painLevelOptions = useMemo(() => toOpts(crmCatalog?.pain_level_options), [crmCatalog]);
  const ageGroupOptions = useMemo(() => toOpts(crmCatalog?.age_group_options), [crmCatalog]);
  const painDurationOptions = useMemo(
    () => toOpts(crmCatalog?.pain_duration_options),
    [crmCatalog],
  );
  const lifestyleHabitOptions = useMemo(
    () => toOpts(crmCatalog?.lifestyle_habit_options),
    [crmCatalog],
  );
  const relaxTimeOptions = useMemo(() => toOpts(crmCatalog?.relax_time_options), [crmCatalog]);
  const purchaseBarrierOptions = useMemo(
    () => toOpts(crmCatalog?.purchase_barrier_options),
    [crmCatalog],
  );
  const callDurationOptions = useMemo(
    () => toOpts(crmCatalog?.call_duration_options),
    [crmCatalog],
  );
  const postPurchaseRatingOptions = useMemo(
    () => toOpts(crmCatalog?.post_purchase_rating_options),
    [crmCatalog],
  );

  const renderMultiSelect = (
    label: string,
    options: { value: string; label: string }[],
    selected: string[] | null | undefined,
    onChange: (codes: string[]) => void,
    adornment?: ReactNode,
  ) => {
    // Chỉ giữ mã có trong danh mục (như trước) — mã lạ không hiện và bị bỏ khi đổi.
    const value = (selected ?? []).filter((code) => options.some((o) => o.value === code));
    return (
      <div className="py-2 border-b border-border/40">
        <span className="mb-2 block text-sm text-muted-foreground">
          {label}
          {adornment}
        </span>
        <MultiSelect
          aria-label={label}
          options={options}
          selected={value}
          onChange={onChange}
          placeholder={label}
          menuPortal
        />
      </div>
    );
  };

  const needTypeOptionGroups = useMemo(
    () =>
      needGroupOptions
        .map((group) => ({
          label: group.label,
          options: needTypes
            .filter((type) => type.group_code === group.value)
            .map((type) => ({
              value: type.code,
              label: type.name_vi,
              group_code: group.value,
              group: group.label,
            })),
        }))
        .filter((g) => g.options.length > 0),
    [needGroupOptions, needTypes],
  );

  const flatNeedTypeOptions = useMemo(
    () => needTypeOptionGroups.flatMap((g) => g.options),
    [needTypeOptionGroups],
  );

  const selectedNeedOptions = useMemo(() => {
    const existing = Array.isArray(crm?.needs) ? crm.needs : [];
    return existing
      .map((n) => flatNeedTypeOptions.find((o) => o.value === n.type_code))
      .filter(Boolean) as { value: string; label: string; group_code: string }[];
  }, [crm?.needs, flatNeedTypeOptions]);

  const updateNeeds = (opts: readonly { value: string; group_code: string }[]) => {
    patchCrm({
      needs: opts.map((o) => ({ group_code: o.group_code, type_code: o.value })),
    });
  };

  const classifLabel = customerClassificationOptions.find(
    (o) => o.value === crm?.customer_classification_code,
  )?.label;
  const salesLabel = salesStatusOptions.find((o) => o.value === crm?.sales_status_code)?.label;
  const notClosedLabel = notClosedReasonOptions.find(
    (o) => o.value === crm?.not_closed_reason_code,
  )?.label;
  const deliveryLabel = deliveryBusinessStatusOptions.find(
    (o) => o.value === crm?.delivery_business_status_code,
  )?.label;
  const hasBombReason = Boolean(
    (crm?.bomb_reason_group_code && String(crm.bomb_reason_group_code).trim()) ||
    (crm?.bomb_reason_type_code && String(crm.bomb_reason_type_code).trim()) ||
    (crm?.bomb_reason_text && String(crm.bomb_reason_text).trim()),
  );
  const [isAddingBombReason, setIsAddingBombReason] = useState(false);

  const isLanding = order.kiotviet_channel_id == null;

  const SALES_STATUS_NEEDS_FOLLOWUP = new Set([
    "scheduled",
    "call_back_later",
    "closed_scheduled_date",
  ]);
  const currentSalesCode = crm?.sales_status_code ?? "";
  const needsFollowupAt = SALES_STATUS_NEEDS_FOLLOWUP.has(currentSalesCode);
  const formatLocalDateTime = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    // Mẫu "HH:mm dd/MM" (không năm) chỉ dùng ở đây — không có helper trong lib/format.
    // eslint-disable-next-line no-restricted-syntax
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const handleSalesStatusChange = (v: string) => {
    const code = v || null;
    const patch: Partial<OrderCRMRow> = { sales_status_code: code };
    // Clear next_followup_at when the new code doesn't use one. The
    // backend will cancel any pending reminders for this order.
    if (!code || !SALES_STATUS_NEEDS_FOLLOWUP.has(code)) {
      patch.next_followup_at = null;
    }
    patchCrm(patch);
  };
  const rowSalesStatus = (
    <ERow
      key="sales_status"
      label="Trạng thái sale"
      rawValue={crm?.sales_status_code ?? ""}
      display={
        <span className="text-sm font-medium">{salesLabel || crm?.sales_status_label || "—"}</span>
      }
      type="select"
      options={salesStatusOptions}
      onSave={(v) => handleSalesStatusChange(String(v))}
    />
  );

  const rowNextFollowupAt = needsFollowupAt ? (
    <ERow
      key="next_followup_at"
      label="Hẹn nhắc lúc"
      rawValue={crm?.next_followup_at ?? ""}
      display={
        crm?.next_followup_at ? (
          <span className="text-sm font-medium">{formatLocalDateTime(crm.next_followup_at)}</span>
        ) : (
          <span className="text-action-warning text-sm">Chọn giờ để bot Lark nhắc</span>
        )
      }
      type="datetime"
      onSave={(v) => patchCrm({ next_followup_at: v ? String(v) : null })}
    />
  ) : null;

  const rowNextReminderAt = crm?.next_reminder_at ? (
    <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
      <span className="w-[155px] shrink-0">Nhắc tiếp theo</span>
      <span className="inline-flex items-center gap-1">
        <Bell aria-hidden="true" className="size-4 shrink-0" />
        {formatLocalDateTime(crm.next_reminder_at)}
      </span>
    </div>
  ) : null;

  const rowNotClosedReason = (
    <ERow
      key="not_closed_reason"
      label="Lý do không chốt"
      rawValue={crm?.not_closed_reason_code ?? ""}
      display={
        <span className="text-sm font-medium">
          {notClosedLabel || crm?.not_closed_reason_label || "—"}
        </span>
      }
      type="select"
      options={notClosedReasonOptions}
      onSave={(v) => patchCrm({ not_closed_reason_code: v ? String(v) : null })}
    />
  );

  const rowInternalNote = (
    <ERow
      key="internal_note"
      label="Ghi chú nội bộ"
      rawValue={crm?.internal_note ?? ""}
      multiline
      onSave={(v) => patchCrm({ internal_note: String(v) || null })}
    />
  );

  const rowClassification = (
    <ERow
      key="classification"
      label="Phân loại KH"
      rawValue={crm?.customer_classification_code ?? ""}
      display={
        <span className="text-sm font-medium">
          {classifLabel || crm?.customer_classification_label || "—"}
        </span>
      }
      type="select"
      options={customerClassificationOptions}
      onSave={(v) => patchCrm({ customer_classification_code: v ? String(v) : null })}
    />
  );

  const rowAge = (
    <ERow
      key="age"
      label="Độ tuổi"
      labelAdornment={<AiFilledBadge info={aiFilled?.age_text} />}
      rawValue={crm?.age_text ?? ""}
      display={
        <span className="text-sm font-medium">
          {ageGroupOptions.find((o) => o.value === crm?.age_text)?.label ||
            crm?.age_text_label ||
            "—"}
        </span>
      }
      type="select"
      options={ageGroupOptions}
      onSave={(v) => patchCrm({ age_text: v ? String(v) : null })}
    />
  );

  const rowOccupation = (
    <ERow
      key="occupation"
      label="Nghề nghiệp"
      labelAdornment={<AiFilledBadge info={aiFilled?.occupation_code} />}
      rawValue={crm?.occupation_code ?? ""}
      onSave={(v) => patchCrm({ occupation_code: String(v) || null })}
    />
  );

  const rowNeeds = (
    <div key="needs" className="py-2 border-b border-border/40">
      <span className="mb-2 block text-sm text-muted-foreground">
        Nhóm nhu cầu
        <AiFilledBadge info={aiFilled?.needs} />
      </span>
      {needTypeOptionGroups.length === 0 ? (
        <div className="text-sm text-muted-foreground/60">—</div>
      ) : (
        <MultiSelect
          aria-label="Nhóm nhu cầu"
          options={flatNeedTypeOptions}
          selected={selectedNeedOptions.map((o) => o.value)}
          onChange={(codes) =>
            updateNeeds(
              codes.flatMap((code) => flatNeedTypeOptions.find((o) => o.value === code) ?? []),
            )
          }
          placeholder="Chọn một hoặc nhiều nhu cầu"
          menuPortal
        />
      )}
    </div>
  );

  const rowPainLevel = (
    <ERow
      key="pain_level"
      label="Mức độ đau"
      labelAdornment={<AiFilledBadge info={aiFilled?.pain_level_code} />}
      rawValue={crm?.pain_level_code ?? ""}
      display={
        <span className="text-sm font-medium">
          {painLevelOptions.find((o) => o.value === crm?.pain_level_code)?.label ||
            crm?.pain_level_label ||
            "—"}
        </span>
      }
      type="select"
      options={painLevelOptions}
      onSave={(v) => patchCrm({ pain_level_code: v ? String(v) : null })}
    />
  );

  const rowPainDuration = (
    <ERow
      key="pain_duration"
      label="Thời gian bị đau nhức"
      labelAdornment={<AiFilledBadge info={aiFilled?.pain_duration_code} />}
      rawValue={crm?.pain_duration_code ?? ""}
      display={
        <span className="text-sm font-medium">
          {painDurationOptions.find((o) => o.value === crm?.pain_duration_code)?.label ||
            crm?.pain_duration_label ||
            "—"}
        </span>
      }
      type="select"
      options={painDurationOptions}
      onSave={(v) => patchCrm({ pain_duration_code: v ? String(v) : null })}
    />
  );

  const rowLifestyle = renderMultiSelect(
    "Thói quen sinh hoạt",
    lifestyleHabitOptions,
    crm?.lifestyle_habit_codes,
    (codes) => patchCrm({ lifestyle_habit_codes: codes }),
    <AiFilledBadge info={aiFilled?.lifestyle_habit_codes} />,
  );

  const rowUsedMassage = (
    <ERow
      key="used_massage"
      label="Đã từng dùng massage"
      labelAdornment={<AiFilledBadge info={aiFilled?.used_massage_before} />}
      rawValue={crm?.used_massage_before == null ? "" : crm.used_massage_before ? "yes" : "no"}
      display={
        <span className="text-sm font-medium">
          {crm?.used_massage_before == null ? "—" : crm.used_massage_before ? "Có" : "Chưa"}
        </span>
      }
      type="select"
      options={CRM_USED_MASSAGE_OPTIONS}
      onSave={(v) =>
        patchCrm({ used_massage_before: v === "yes" ? true : v === "no" ? false : null })
      }
    />
  );

  const rowRelaxTime = renderMultiSelect(
    "Thời điểm thư giãn chính",
    relaxTimeOptions,
    crm?.relax_time_codes,
    (codes) => patchCrm({ relax_time_codes: codes }),
    <AiFilledBadge info={aiFilled?.relax_time_codes} />,
  );

  const rowPurchaseBarrier = renderMultiSelect(
    "Rào cản khi mua",
    purchaseBarrierOptions,
    crm?.purchase_barrier_codes,
    (codes) => patchCrm({ purchase_barrier_codes: codes }),
  );

  const rowDelaxSource = renderMultiSelect(
    "Nguồn biết đến Delax",
    delaxSourceOptions,
    crm?.delax_source_codes,
    (codes) => patchCrm({ delax_source_codes: codes }),
    <AiFilledBadge info={aiFilled?.delax_source_codes} />,
  );

  const rowComparingBrand = (
    <ERow
      key="comparing_brand"
      label="Hãng khách đang so"
      rawValue={crm?.comparing_brand_text ?? ""}
      multiline
      onSave={(v) => patchCrm({ comparing_brand_text: String(v) || null })}
    />
  );

  const rowCallDuration = (
    <ERow
      key="call_duration"
      label="Thời lượng cuộc gọi"
      rawValue={crm?.call_duration_code ?? ""}
      display={
        <span className="text-sm font-medium">
          {callDurationOptions.find((o) => o.value === crm?.call_duration_code)?.label ||
            crm?.call_duration_label ||
            "—"}
        </span>
      }
      type="select"
      options={callDurationOptions}
      onSave={(v) => patchCrm({ call_duration_code: v ? String(v) : null })}
    />
  );

  const rowPostPurchaseFeedback = (
    <ERow
      key="post_purchase_feedback"
      label="Cảm nhận về sản phẩm sau mua"
      rawValue={crm?.post_purchase_feedback_text ?? ""}
      multiline
      onSave={(v) => patchCrm({ post_purchase_feedback_text: String(v) || null })}
    />
  );

  const rowPostPurchaseRating = (
    <ERow
      key="post_purchase_rating"
      label="Đánh giá về sản phẩm sau mua"
      rawValue={crm?.post_purchase_rating_code ?? ""}
      display={
        <span className="text-sm font-medium">
          {postPurchaseRatingOptions.find((o) => o.value === crm?.post_purchase_rating_code)
            ?.label ||
            crm?.post_purchase_rating_label ||
            "—"}
        </span>
      }
      type="select"
      options={postPurchaseRatingOptions}
      onSave={(v) => patchCrm({ post_purchase_rating_code: v ? String(v) : null })}
    />
  );

  const rowDeliveryBusinessStatus = (
    <ERow
      key="delivery_business_status"
      label="Trạng thái GH CRM"
      rawValue={crm?.delivery_business_status_code ?? ""}
      display={
        <span className="text-sm font-medium">
          {deliveryLabel || crm?.delivery_business_status_label || "—"}
        </span>
      }
      type="select"
      options={deliveryBusinessStatusOptions}
      onSave={(v) => patchCrm({ delivery_business_status_code: v ? String(v) : null })}
    />
  );

  const rowPotential = (
    <ERow
      key="potential"
      label="Tiềm năng"
      rawValue={crm?.potential_level != null ? String(crm.potential_level) : ""}
      display={
        crm?.potential_level != null ? (
          <span className="inline-flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i <= (crm.potential_level ?? 0)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/20"
                }`}
              />
            ))}
          </span>
        ) : undefined
      }
      type="select"
      options={potentialLevelOptions}
      onSave={(v) => patchCrm({ potential_level: v ? Number(v) : null })}
    />
  );

  const rowCustomerAttitude = (
    <ERow
      key="customer_attitude"
      label="Thái độ KH"
      rawValue={crm?.customer_attitude_raw ?? ""}
      onSave={(v) => patchCrm({ customer_attitude_raw: String(v) || null })}
    />
  );

  const rowBombReason = (
    <div key="bomb_reason" className="py-2 border-b border-border/40">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="block text-sm text-muted-foreground">Lý do bom</span>
        {(hasBombReason || isAddingBombReason) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:text-destructive"
            onClick={() => {
              patchCrm({
                bomb_reason_group_code: null,
                bomb_reason_type_code: null,
                bomb_reason_text: null,
              });
              setIsAddingBombReason(false);
            }}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Xoá
          </Button>
        )}
      </div>
      {bombReasonGroupOptions.length === 0 || bombReasonTypes.length === 0 ? (
        <div className="text-sm text-muted-foreground/60">—</div>
      ) : !hasBombReason && !isAddingBombReason ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddingBombReason(true)}
        >
          Thêm
        </Button>
      ) : (
        (() => {
          const selectedBombGroupCode =
            crm?.bomb_reason_group_code ||
            (crm?.bomb_reason_type_code
              ? bombReasonTypes.find((type) => type.code === crm.bomb_reason_type_code)?.group_code
              : "") ||
            "";
          const selectedBombTypeCode = crm?.bomb_reason_type_code || "";
          // Mã cũ (is_active=false) chỉ hiện khi đơn đang mang mã đó.
          const bombTypeOptions = bombReasonTypes
            .filter((type) => !selectedBombGroupCode || type.group_code === selectedBombGroupCode)
            .filter((type) => type.is_active !== false || type.code === selectedBombTypeCode)
            .map((type) => ({ value: type.code, label: type.name_vi }));

          return (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <SearchableSelect
                size="sm"
                aria-label="Nhóm lý do bom"
                options={bombReasonGroupOptions}
                value={
                  bombReasonGroupOptions.some((option) => option.value === selectedBombGroupCode)
                    ? selectedBombGroupCode
                    : ""
                }
                onChange={(groupCode) => {
                  const firstTypeInGroup = bombReasonTypes.find(
                    (item) => item.group_code === groupCode && item.is_active !== false,
                  );
                  patchCrm({
                    bomb_reason_group_code: groupCode || null,
                    bomb_reason_type_code: firstTypeInGroup?.code || null,
                  });
                }}
                placeholder="Nhóm lý do bom"
              />
              <SearchableSelect
                size="sm"
                aria-label="Loại lý do bom"
                options={bombTypeOptions}
                value={
                  bombTypeOptions.some((option) => option.value === selectedBombTypeCode)
                    ? selectedBombTypeCode
                    : ""
                }
                onChange={(typeCode) => {
                  const foundType = bombReasonTypes.find((item) => item.code === typeCode);
                  patchCrm({
                    bomb_reason_group_code: foundType?.group_code || selectedBombGroupCode || null,
                    bomb_reason_type_code: typeCode || null,
                  });
                }}
                placeholder="Loại lý do bom"
              />
              <div className="md:col-span-2">
                <ERow
                  stacked
                  label="Ghi chú chi tiết lý do"
                  rawValue={crm?.bomb_reason_text ?? ""}
                  multiline
                  onSave={(v) => patchCrm({ bomb_reason_text: String(v) || null })}
                />
              </div>
            </div>
          );
        })()
      )}
    </div>
  );

  // Trường đánh giá động (định nghĩa trong assessment_field_defs, Task 1-6) +
  // giỏ mở "AI ghi nhận thêm" — đặt ở cuối danh sách row đánh giá hiện có.
  const dynamicDefs = useMemo(() => crmCatalog?.dynamic_fields ?? [], [crmCatalog]);
  const dynamicFieldValues = useMemo(
    () => overlayPendingDynamicFieldValues(crm, dynamicDefs),
    [crm, dynamicDefs],
  );
  const rowsDynamicFields = (
    <DynamicAssessmentFields
      defs={dynamicDefs}
      values={dynamicFieldValues}
      aiFilled={aiFilled}
      onPatch={(code, value) => patchCrm({ [code]: value } as Partial<OrderCRMRow>)}
    />
  );
  const openInsights = <AiOpenInsights items={crm?.ai_open_insights ?? []} variant={variant} />;

  return (
    // Plain: gạch phân cách giữa hai mục thay cho khung card. `divide-y` bám DOM
    // child nên khi AiOpenInsights rỗng (return null) sẽ không để lại gạch mồ côi.
    <div
      className={
        variant === "plain"
          ? "flex flex-col divide-y divide-border/60 [&>*+*]:pt-4 [&>*:not(:last-child)]:pb-4"
          : "flex flex-col gap-4"
      }
    >
      <SectionCard icon={<Star className="h-4 w-4" />} title="Hành vi mua hàng" variant={variant}>
        {rowSalesStatus}
        {rowNextFollowupAt}
        {rowNextReminderAt}
        {rowNotClosedReason}
        {rowInternalNote}
        {rowClassification}
        {rowAge}
        {rowOccupation}
        {rowNeeds}
        {rowPainLevel}
        {rowPainDuration}
        {rowLifestyle}
        {rowUsedMassage}
        {rowRelaxTime}
        {rowPurchaseBarrier}
        {rowDelaxSource}
        {rowComparingBrand}
        {!isLanding && rowCallDuration}
        {!isLanding && rowPostPurchaseFeedback}
        {!isLanding && rowPostPurchaseRating}
        {!isLanding && rowDeliveryBusinessStatus}
        {!isLanding && rowPotential}
        {!isLanding && rowCustomerAttitude}
        {!isLanding && rowBombReason}
        {rowsDynamicFields}
      </SectionCard>
      {openInsights}
    </div>
  );
}

export const BlockCrmRating = memo(BlockCrmRatingImpl);
