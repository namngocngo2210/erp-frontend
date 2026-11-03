import React from "react";

import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CustomerProfile } from "@/lib/api/customers";
import { orderDetailPath } from "@/lib/routes";
import type { ColumnGroupKey } from "@/pages/customers/profile-columns";
import { useI18n } from "@/i18n";

import {
  CODE_COL_WIDTH,
  NAME_COL_WIDTH,
  ORDER_ROW_STICKY_TINT,
  type EditingResale,
  type ResaleField,
  type StickyOffsets,
} from "../customer-types";
import { formatCurrency, formatDate, labelOrDash } from "../customer-utils";
import { ChipList } from "./ChipList";

export interface PersonaLabels {
  delax_source: Record<string, string>;
  lifestyle_habit: Record<string, string>;
  relax_time: Record<string, string>;
  purchase_barrier: Record<string, string>;
}

interface CustomerGroupCellsProps {
  profile: CustomerProfile;
  groupKey: ColumnGroupKey;
  variant?: "profile" | "order";
  stickyOffsets: StickyOffsets;
  personaLabels: PersonaLabels;
  editingResale: EditingResale | null;
  resaleDraft: string;
  onResaleDraftChange: (value: string) => void;
  onSaveResale: () => void;
  onCancelResale: () => void;
  onStartResaleEdit: (id: number, field: ResaleField, current: string) => void;
}

/** Render các ô dữ liệu của một nhóm cho một profile. */
export function CustomerGroupCells({
  profile,
  groupKey: key,
  variant = "profile",
  stickyOffsets,
  personaLabels,
  editingResale,
  resaleDraft,
  onResaleDraftChange,
  onSaveResale,
  onCancelResale,
  onStartResaleEdit,
}: CustomerGroupCellsProps): React.ReactElement | null {
  const { t } = useI18n();
  const p = profile;
  const isOrder = variant === "order";
  switch (key) {
    case "identity":
      return (
        <>
          <TableCell
            style={{ left: stickyOffsets.code, width: CODE_COL_WIDTH, minWidth: CODE_COL_WIDTH }}
            className={cn(
              "sticky-col font-medium text-muted-foreground shadow-[1px_0_0_0_var(--border)]",
              isOrder && ORDER_ROW_STICKY_TINT,
            )}
          >
            {isOrder ? (
              <a
                href={orderDetailPath(p.identity.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {p.identity.code}
              </a>
            ) : (
              p.identity.code || "-"
            )}
          </TableCell>
          <TableCell
            style={{ left: stickyOffsets.name, width: NAME_COL_WIDTH, minWidth: NAME_COL_WIDTH }}
            className={cn(
              "sticky-col sticky-col-edge whitespace-nowrap font-medium text-foreground",
              isOrder && ORDER_ROW_STICKY_TINT,
            )}
          >
            {isOrder ? p.identity.full_name || "" : p.identity.full_name || "-"}
          </TableCell>
          <TableCell className="whitespace-nowrap text-foreground">
            {p.identity.phone || "-"}
          </TableCell>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {p.channel.channel_name || "—"}
          </TableCell>
        </>
      );
    case "sale_status":
      return (
        <>
          <TableCell className="whitespace-nowrap">
            {labelOrDash(p.latest_order.sales_status_label, p.latest_order.sales_status_code)}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {labelOrDash(
              p.latest_order.not_closed_reason_label,
              p.latest_order.not_closed_reason_code,
            )}
          </TableCell>
        </>
      );
    case "segment":
      return (
        <>
          <TableCell className="whitespace-nowrap">
            {isOrder ? (
              <span className="text-muted-foreground">—</span>
            ) : p.segment.segment_code ? (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                {p.segment.segment_name
                  ? `${p.segment.segment_code} - ${p.segment.segment_name}`
                  : p.segment.segment_code}
              </Badge>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {labelOrDash(p.needs.need_group_name)}
          </TableCell>
        </>
      );
    case "purchase":
      return (
        <>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {isOrder ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              formatDate(p.purchase.first_purchase_at)
            )}
          </TableCell>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {formatDate(p.purchase.last_purchase_at)}
          </TableCell>
          <TableCell className="text-right tabular-nums text-foreground">
            {isOrder ? <span className="text-muted-foreground">—</span> : p.purchase.total_orders}
          </TableCell>
          <TableCell className="text-right tabular-nums font-semibold text-foreground">
            {formatCurrency(p.purchase.total_spent)}
          </TableCell>
        </>
      );
    case "demographics":
      return (
        <>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {p.demographics.gender_label || "-"}
          </TableCell>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {p.demographics.province || "-"}
          </TableCell>
          <TableCell className="max-w-[220px] text-muted-foreground">
            {p.demographics.address || "-"}
          </TableCell>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {labelOrDash(p.demographics.age_group_label, p.demographics.age_text)}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {labelOrDash(p.demographics.occupation_label, p.demographics.occupation_code)}
          </TableCell>
        </>
      );
    case "products":
      return (
        <>
          <TableCell className="whitespace-nowrap text-foreground">
            {p.latest_order.sku || p.latest_order.product || "-"}
          </TableCell>
          <TableCell className="text-right tabular-nums text-foreground">
            {formatCurrency(p.latest_order.last_order_amount)}
          </TableCell>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {p.latest_order.last_order_status != null
              ? t(`status.${p.latest_order.last_order_status}`, "-")
              : "-"}
          </TableCell>
          <TableCell className="max-w-[260px]">
            {p.purchase.distinct_skus.length > 0 ? (
              <ChipList codes={p.purchase.distinct_skus} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        </>
      );
    case "persona":
      return (
        <>
          <TableCell className="whitespace-nowrap">
            {labelOrDash(
              p.persona.customer_classification_label,
              p.persona.customer_classification_code,
            )}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {labelOrDash(p.persona.pain_level_label, p.persona.pain_level_code)}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {labelOrDash(p.persona.pain_duration_label, p.persona.pain_duration_code)}
          </TableCell>
          <TableCell>
            <ChipList
              codes={p.persona.lifestyle_habit_codes}
              labels={personaLabels.lifestyle_habit}
            />
          </TableCell>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {p.persona.used_massage_before == null
              ? "-"
              : p.persona.used_massage_before
                ? t("common.yes", "Có")
                : t("common.no", "Không")}
          </TableCell>
          <TableCell>
            <ChipList codes={p.persona.relax_time_codes} labels={personaLabels.relax_time} />
          </TableCell>
          <TableCell>
            <ChipList
              codes={p.persona.purchase_barrier_codes}
              labels={personaLabels.purchase_barrier}
            />
          </TableCell>
          <TableCell>
            <ChipList codes={p.persona.delax_source_codes} labels={personaLabels.delax_source} />
          </TableCell>
          <TableCell className="max-w-[180px] text-muted-foreground">
            {p.persona.comparing_brand_text || "-"}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {labelOrDash(p.persona.call_duration_label, p.persona.call_duration_code)}
          </TableCell>
          <TableCell className="max-w-[180px] text-muted-foreground">
            {p.persona.post_purchase_feedback_text || "-"}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {labelOrDash(p.persona.post_purchase_rating_label, p.persona.post_purchase_rating_code)}
          </TableCell>
          <TableCell>
            <ChipList
              codes={[...new Set(p.needs.items.map((item) => item.type_name).filter(Boolean))]}
            />
          </TableCell>
        </>
      );
    case "resale":
      if (isOrder) {
        return (
          <>
            <TableCell className="whitespace-nowrap text-muted-foreground">—</TableCell>
            <TableCell className="min-w-[180px] max-w-[240px] text-muted-foreground">—</TableCell>
            <TableCell className="min-w-[180px] max-w-[240px] text-muted-foreground">—</TableCell>
          </>
        );
      }
      return (
        <>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {formatDate(p.resale.last_resale_at)}
          </TableCell>
          {(["resale_status", "resale_suggestion"] as const).map((field) => {
            const isEditing = editingResale?.id === p.identity.id && editingResale.field === field;
            const value = p.resale[field];
            return (
              <TableCell key={field} className="min-w-[180px] max-w-[240px] align-top">
                {isEditing ? (
                  <Textarea
                    autoFocus
                    rows={2}
                    value={resaleDraft}
                    onChange={(event) => onResaleDraftChange(event.target.value)}
                    onBlur={onSaveResale}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        onSaveResale();
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        onCancelResale();
                      }
                    }}
                    className="min-h-[44px] text-sm"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onStartResaleEdit(p.identity.id, field, value)}
                    className="block w-full whitespace-pre-wrap rounded px-1 py-0.5 text-left text-foreground hover:bg-muted/50"
                    title={t("customers.resale.editHint", "Bấm để sửa")}
                  >
                    {value || <span className="text-muted-foreground">-</span>}
                  </button>
                )}
              </TableCell>
            );
          })}
        </>
      );
    default:
      return null;
  }
}
