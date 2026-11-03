import { type OrderCRMRow } from "@/features/orders/order-types";
import { type DynamicFieldValue } from "@/features/orders/DynamicAssessmentFields";

// Giá trị pending của field động được OrderDetailPage/Sheet3AssessmentPanel
// deep-merge phẳng vào `crm[code]` (top-level), không phải vào
// `crm.extra_fields[code]` (xem OrderDetailPage.tsx effectiveOrder và
// Sheet3AssessmentPanel.tsx effectiveOrder). Overlay pending phẳng lên
// extra_fields để field vừa sửa hiển thị ngay, không phải đợi tới khi bấm Lưu.
export function overlayPendingDynamicFieldValues(
  crm: OrderCRMRow | null | undefined,
  defs: Array<{ code: string }>,
): Record<string, DynamicFieldValue> {
  const result: Record<string, DynamicFieldValue> = {
    ...((crm?.extra_fields ?? {}) as Record<string, DynamicFieldValue>),
  };
  const crmRecord = crm as unknown as Record<string, DynamicFieldValue> | undefined;
  for (const def of defs) {
    if (crmRecord && Object.prototype.hasOwnProperty.call(crmRecord, def.code)) {
      result[def.code] = crmRecord[def.code];
    }
  }
  return result;
}
