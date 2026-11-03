import { MultiSelectCell } from "../MultiSelectCell";
import { SalesStatusInlineEditor } from "../SalesStatusInlineEditor";
import { toOpts } from "../crm-catalog";
import {
  BOMB_REASON_GROUPS,
  BOMB_REASON_TYPE_TO_GROUP,
  DELIVERY_BUSINESS_STATUS_OPTIONS,
  SALES_STATUS_OPTIONS,
} from "../constants";
import type { OrderCRMRow, OrderColumnKey, OrderRow } from "@/features/orders/order-types";
import { partnerDeliverySummary } from "@/features/orders/partner-delivery";

import type { CellRenderer, OrderPatchHandler } from "./types";
import { NativeCellSelect } from "@/components/ui/native-cell-select";

// ─────────────────────────────────────────────────────────────
// Behavior/CRM cells — các cột "hành vi đơn hàng" và trạng thái
// nghiệp vụ. Logic case-by-case giữ nguyên từ cell-renderers.tsx
// cũ (trước nữa là components/OrdersTable.tsx).
// ─────────────────────────────────────────────────────────────

// ── CRM helper renderers — share inline-edit logic giữa các cột ──

function renderCrmSelect(
  row: OrderRow,
  onPatch: OrderPatchHandler | undefined,
  field: keyof OrderCRMRow,
  options: Array<{ value: string; label: string }>,
) {
  const canEdit = !!row.can_edit && !!onPatch;
  const current = String(
    (row.crm as Record<string, unknown> | null | undefined)?.[field as string] ?? "",
  );
  const labelByValue = new Map(options.map((o) => [o.value, o.label]));
  const display = current ? (labelByValue.get(current) ?? current) : "-";
  if (!canEdit) {
    return <span className="text-xs">{display}</span>;
  }
  return (
    <NativeCellSelect
      className="min-w-[140px]"
      value={current}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        const raw = e.target.value;
        onPatch?.(row.id, {
          crm: { ...row.crm, [field]: raw || null },
        } as Partial<OrderRow>);
      }}
    >
      <option value="">-</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      {/* Giữ giá trị hiện tại nếu không có trong options (catalog chưa kịp load) */}
      {current && !labelByValue.has(current) && <option value={current}>{current}</option>}
    </NativeCellSelect>
  );
}

function renderCrmText(
  row: OrderRow,
  onPatch: OrderPatchHandler | undefined,
  field: keyof OrderCRMRow,
  current: string | null | undefined,
  minWidthClass = "min-w-[150px]",
) {
  const canEdit = !!row.can_edit && !!onPatch;
  const value = current ?? "";
  return (
    <input
      type="text"
      className={`h-7 w-full ${minWidthClass} rounded border border-border bg-transparent px-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-default disabled:opacity-60`}
      defaultValue={value}
      disabled={!canEdit}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => {
        const next = e.target.value.trim();
        if (next === (value || "").trim()) return;
        onPatch?.(row.id, {
          crm: { ...row.crm, [field]: next || null },
        } as Partial<OrderRow>);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function renderCrmMulti(
  row: OrderRow,
  onPatch: OrderPatchHandler | undefined,
  field: keyof OrderCRMRow,
  current: string[] | null | undefined,
  options: Array<{ value: string; label: string }>,
) {
  const canEdit = !!row.can_edit && !!onPatch;
  return (
    <MultiSelectCell
      values={current ?? []}
      options={options}
      canEdit={canEdit}
      onChange={(next) =>
        onPatch?.(row.id, {
          crm: { ...row.crm, [field]: next },
        } as Partial<OrderRow>)
      }
    />
  );
}

export const CRM_CELL_RENDERERS: Partial<Record<OrderColumnKey, CellRenderer>> = {
  delivery_business_status: ({ row, onPatch }) => {
    const code = row.crm?.delivery_business_status_code || "";
    const canEdit = !!row.can_edit && !!onPatch;
    // Dòng phụ: trạng thái thô từ đối tác (Pancake / ĐVVC) — chỉ đọc.
    const partner = partnerDeliverySummary(row);
    const select = (
      <NativeCellSelect
        className="min-w-[120px]"
        value={code}
        disabled={!canEdit}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const newCode = e.target.value;
          const opt = DELIVERY_BUSINESS_STATUS_OPTIONS.find((o) => o.value === newCode);
          onPatch?.(row.id, {
            crm: {
              ...row.crm,
              delivery_business_status_code: newCode || null,
              delivery_business_status_label: opt?.label || null,
            },
          } as Partial<OrderRow>);
        }}
      >
        <option value="">-</option>
        {DELIVERY_BUSINESS_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeCellSelect>
    );
    if (!partner) return select;
    return (
      <div className="flex min-w-[120px] flex-col gap-0.5">
        {select}
        <span
          className="max-w-[220px] truncate text-xs leading-tight text-muted-foreground"
          title={partner.title}
          data-testid="partner-delivery-line"
        >
          {partner.line}
        </span>
      </div>
    );
  },

  sales_status: ({ row, onPatch }) => {
    const canEdit = !!row.can_edit && !!onPatch;
    return (
      <SalesStatusInlineEditor
        row={row}
        options={SALES_STATUS_OPTIONS}
        canEdit={canEdit}
        onPatch={onPatch}
      />
    );
  },

  bomb_reason: ({ row, onPatch }) => {
    const typeCode = row.crm?.bomb_reason_type_code || "";
    const canEdit = !!row.can_edit && !!onPatch;
    return (
      <NativeCellSelect
        className="min-w-[140px]"
        value={typeCode}
        disabled={!canEdit}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const newTypeCode = e.target.value;
          const groupCode = BOMB_REASON_TYPE_TO_GROUP[newTypeCode] || null;
          onPatch?.(row.id, {
            crm: {
              ...row.crm,
              bomb_reason_type_code: newTypeCode || null,
              bomb_reason_group_code: groupCode,
            },
          } as Partial<OrderRow>);
        }}
      >
        <option value="">-</option>
        {BOMB_REASON_GROUPS.map((group) => (
          <optgroup key={group.code} label={group.label}>
            {group.types
              .filter((type) => !type.legacy || type.code === typeCode)
              .map((type) => (
                <option key={type.code} value={type.code}>
                  {type.label}
                </option>
              ))}
          </optgroup>
        ))}
      </NativeCellSelect>
    );
  },

  internal_note: ({ row, onPatch }) => {
    const note = row.crm?.internal_note || "";
    const canEdit = !!row.can_edit && !!onPatch;
    return (
      <input
        type="text"
        className="h-7 w-full min-w-[150px] rounded border border-border bg-transparent px-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-default disabled:opacity-60"
        defaultValue={note}
        disabled={!canEdit}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => {
          const newValue = e.target.value.trim();
          if (newValue === (row.crm?.internal_note || "")) return;
          onPatch?.(row.id, {
            crm: {
              ...row.crm,
              internal_note: newValue || null,
            },
          } as Partial<OrderRow>);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    );
  },

  // ── Hành vi đơn hàng (CRM) — inline editable ────────────
  customer_classification: ({ row, onPatch }) =>
    renderCrmSelect(row, onPatch, "customer_classification_code", [
      { value: "easy_close", label: "Dễ tính - chốt ngay" },
      { value: "hesitant", label: "Do dự" },
      { value: "difficult", label: "Khó tính" },
      { value: "purchased_delivered", label: "Đã mua - giao thành công" },
      { value: "purchased_shipping", label: "Đã mua - đang giao" },
      { value: "bombed", label: "Bom hàng" },
      { value: "spam", label: "Spam" },
      { value: "no_pickup", label: "Không nhấc máy" },
    ]),

  customer_attitude: ({ row, onPatch }) =>
    renderCrmText(
      row,
      onPatch,
      "customer_attitude_raw",
      row.crm?.customer_attitude_raw,
      "min-w-[140px]",
    ),

  not_closed_reason: ({ row, crmCatalog, onPatch }) =>
    renderCrmSelect(
      row,
      onPatch,
      "not_closed_reason_code",
      toOpts(crmCatalog?.not_closed_reason_options) || [
        { value: "too_expensive", label: "Đắt" },
        { value: "competitor_cheaper", label: "Mua bên khác rẻ" },
        { value: "china_product", label: "Hàng Trung Quốc" },
        { value: "wants_bundle_with_chair", label: "Muốn mua bộ có sẵn ghế" },
        { value: "family_disapproved", label: "Người thân không cho mua" },
        { value: "kids_playing", label: "Trẻ con nghịch" },
        { value: "family_already_bought", label: "Người thân mua rồi" },
        { value: "wrong_phone_number", label: "Số không đúng" },
        { value: "competitor_closed_first", label: "Bên khác chốt trước" },
      ],
    ),

  potential_level: ({ row, onPatch }) => {
    const canEdit = !!row.can_edit && !!onPatch;
    const value = row.crm?.potential_level ?? null;
    const display = value ? "⭐".repeat(Math.min(5, Math.max(1, Number(value)))) : "-";
    if (!canEdit) return <span className="text-xs">{display}</span>;
    return (
      <NativeCellSelect
        className="min-w-[110px]"
        value={value != null ? String(value) : ""}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const raw = e.target.value;
          const next = raw ? Number(raw) : null;
          onPatch?.(row.id, {
            crm: { ...row.crm, potential_level: next },
          } as Partial<OrderRow>);
        }}
      >
        <option value="">-</option>
        <option value="1">⭐ Rất thấp</option>
        <option value="2">⭐⭐ Thấp</option>
        <option value="3">⭐⭐⭐ Trung bình</option>
        <option value="4">⭐⭐⭐⭐ Cao</option>
        <option value="5">⭐⭐⭐⭐⭐ Rất cao</option>
      </NativeCellSelect>
    );
  },

  age_text: ({ row, crmCatalog, onPatch }) =>
    renderCrmSelect(row, onPatch, "age_text", toOpts(crmCatalog?.age_group_options)),

  occupation: ({ row, crmCatalog, onPatch }) =>
    renderCrmSelect(row, onPatch, "occupation_code", toOpts(crmCatalog?.occupation_options)),

  pain_level: ({ row, crmCatalog, onPatch }) =>
    renderCrmSelect(row, onPatch, "pain_level_code", toOpts(crmCatalog?.pain_level_options)),

  pain_duration: ({ row, crmCatalog, onPatch }) =>
    renderCrmSelect(row, onPatch, "pain_duration_code", toOpts(crmCatalog?.pain_duration_options)),

  used_massage_before: ({ row, onPatch }) => {
    const canEdit = !!row.can_edit && !!onPatch;
    const value = row.crm?.used_massage_before;
    const current = value === true ? "yes" : value === false ? "no" : "";
    if (!canEdit) {
      return (
        <span className="text-xs">
          {current === "yes" ? "Có" : current === "no" ? "Chưa" : "-"}
        </span>
      );
    }
    return (
      <NativeCellSelect
        className="min-w-[80px]"
        value={current}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const raw = e.target.value;
          const next = raw === "yes" ? true : raw === "no" ? false : null;
          onPatch?.(row.id, {
            crm: { ...row.crm, used_massage_before: next },
          } as Partial<OrderRow>);
        }}
      >
        <option value="">-</option>
        <option value="yes">Có</option>
        <option value="no">Chưa</option>
      </NativeCellSelect>
    );
  },

  call_duration: ({ row, crmCatalog, onPatch }) =>
    renderCrmSelect(row, onPatch, "call_duration_code", toOpts(crmCatalog?.call_duration_options)),

  post_purchase_rating: ({ row, crmCatalog, onPatch }) =>
    renderCrmSelect(
      row,
      onPatch,
      "post_purchase_rating_code",
      toOpts(crmCatalog?.post_purchase_rating_options),
    ),

  post_purchase_feedback: ({ row, onPatch }) =>
    renderCrmText(
      row,
      onPatch,
      "post_purchase_feedback_text",
      row.crm?.post_purchase_feedback_text,
      "min-w-[140px]",
    ),

  comparing_brand: ({ row, onPatch }) =>
    renderCrmText(
      row,
      onPatch,
      "comparing_brand_text",
      row.crm?.comparing_brand_text,
      "min-w-[150px]",
    ),

  bomb_reason_text: ({ row, onPatch }) =>
    renderCrmText(row, onPatch, "bomb_reason_text", row.crm?.bomb_reason_text, "min-w-[140px]"),

  needs: ({ row, crmCatalog, onPatch }) => {
    const canEdit = !!row.can_edit && !!onPatch;
    const needTypes = crmCatalog?.need_types ?? [];
    const options = needTypes.map((t) => ({ value: t.code, label: t.name_vi }));
    const groupByType = new Map(needTypes.map((t) => [t.code, t.group_code]));
    const currentValues = (row.crm?.needs ?? []).map((n) => n.type_code);
    return (
      <MultiSelectCell
        values={currentValues}
        options={options}
        canEdit={canEdit}
        onChange={(next) =>
          onPatch?.(row.id, {
            crm: {
              ...row.crm,
              needs: next.map((typeCode) => ({
                type_code: typeCode,
                group_code: groupByType.get(typeCode) ?? "",
              })),
            },
          } as Partial<OrderRow>)
        }
      />
    );
  },

  delax_sources: ({ row, crmCatalog, onPatch }) =>
    renderCrmMulti(
      row,
      onPatch,
      "delax_source_codes",
      row.crm?.delax_source_codes,
      toOpts(crmCatalog?.delax_source_options),
    ),

  lifestyle_habits: ({ row, crmCatalog, onPatch }) =>
    renderCrmMulti(
      row,
      onPatch,
      "lifestyle_habit_codes",
      row.crm?.lifestyle_habit_codes,
      toOpts(crmCatalog?.lifestyle_habit_options),
    ),

  relax_times: ({ row, crmCatalog, onPatch }) =>
    renderCrmMulti(
      row,
      onPatch,
      "relax_time_codes",
      row.crm?.relax_time_codes,
      toOpts(crmCatalog?.relax_time_options),
    ),

  purchase_barriers: ({ row, crmCatalog, onPatch }) =>
    renderCrmMulti(
      row,
      onPatch,
      "purchase_barrier_codes",
      row.crm?.purchase_barrier_codes,
      toOpts(crmCatalog?.purchase_barrier_options),
    ),
};
