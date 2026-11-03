import { useCallback, useMemo, useState } from "react";
import { CalendarPlus, Check, Phone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BlockCrmRating, type CrmCatalogPayload } from "@/features/orders/BlockCrmRating";
import type { OrderCRMRow, OrderRow } from "@/features/orders/order-types";
import { Sheet3ContactTimeline } from "./Sheet3ContactTimeline";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderRow | null;
  crmCatalog: CrmCatalogPayload | null;
  /** Persists the assessment changes. silent=false so backend errors surface a toast. */
  onSave: (orderId: number, payload: Partial<OrderRow>) => Promise<void>;
  /** Mở dialog ghi liên hệ cho khách. */
  onLogContact?: (order: OrderRow) => void;
  /** Mở dialog đặt hẹn follow-up. */
  onSchedule?: (order: OrderRow) => void;
  /** Đóng case (archive / win-back) — thường cho khách lạnh. */
  onCloseCase?: (order: OrderRow) => void;
  /** Chốt đơn / chuyển sang trang chi tiết để lên đơn. */
  onConvert?: (order: OrderRow) => void;
};

/**
 * Side panel để xem & note nhanh order assessment (đánh giá CRM) của một khách
 * ngay trong board Tư vấn — tái dùng đúng editor BlockCrmRating ở trang chi tiết.
 *
 * Thay đổi gom vào `pending` (deep-merge crm) và chỉ gửi khi bấm "Lưu", giống
 * MANUAL_SAVE_MODE của OrderDetailPage — tránh patch từng field lên server.
 */
export function Sheet3AssessmentPanel({
  open,
  onOpenChange,
  order,
  crmCatalog,
  onSave,
  onLogContact,
  onSchedule,
  onCloseCase,
  onConvert,
}: Props) {
  const [pendingCrm, setPendingCrm] = useState<Partial<OrderCRMRow>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset pending khi đổi sang khách khác.
  const [trackedId, setTrackedId] = useState<number | null>(null);
  if (order && order.id !== trackedId) {
    setTrackedId(order.id);
    setPendingCrm({});
  }

  // BlockCrmRating gọi patch({ crm: {...} }) cho mỗi field user sửa.
  const patch = useCallback((payload: Partial<OrderRow>) => {
    const incomingCrm = (payload as { crm?: unknown }).crm;
    if (incomingCrm && typeof incomingCrm === "object") {
      setPendingCrm((prev) => ({ ...prev, ...(incomingCrm as Partial<OrderCRMRow>) }));
    }
  }, []);

  const hasChanges = Object.keys(pendingCrm).length > 0;
  const confirmDiscard = useUnsavedGuard(hasChanges, "Đóng sẽ bỏ các thay đổi chưa lưu.");

  // Merge pending vào order để editor hiển thị giá trị mới nhất.
  const effectiveOrder = useMemo<OrderRow | null>(() => {
    if (!order) return null;
    if (!hasChanges) return order;
    return { ...order, crm: { ...(order.crm ?? {}), ...pendingCrm } };
  }, [order, pendingCrm, hasChanges]);

  const handleSave = useCallback(async () => {
    if (!order || !hasChanges) return;
    setIsSaving(true);
    try {
      await onSave(order.id, { crm: pendingCrm as OrderCRMRow });
      setPendingCrm({});
    } catch {
      // onSave (silent=false) đã hiện toast lỗi.
    } finally {
      setIsSaving(false);
    }
  }, [order, hasChanges, onSave, pendingCrm]);

  const handleOpenChange = useCallback(
    async (next: boolean) => {
      if (!next && !(await confirmDiscard())) return;
      onOpenChange(next);
    },
    [confirmDiscard, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
        <SheetHeader className="pr-10">
          <SheetTitle>Đánh giá khách — {order?.name || order?.phone || "—"}</SheetTitle>
          <div className="text-xs text-muted-foreground">
            {order?.phone || "—"}
            {order?.sku ? ` · ${order.sku}` : ""}
          </div>
        </SheetHeader>
        <SheetBody>
          {effectiveOrder ? (
            <>
              {(onLogContact || onSchedule || onCloseCase || onConvert) && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {onLogContact && (
                    <Button size="sm" onClick={() => onLogContact(effectiveOrder)}>
                      <Phone className="mr-1.5 h-4 w-4" /> Ghi liên hệ
                    </Button>
                  )}
                  {onSchedule && (
                    <Button size="sm" variant="outline" onClick={() => onSchedule(effectiveOrder)}>
                      <CalendarPlus className="mr-1.5 h-4 w-4" /> Đặt hẹn
                    </Button>
                  )}
                  {onConvert && effectiveOrder.temperature !== "cold" && (
                    <Button
                      size="sm"
                      className="bg-action-success hover:bg-action-success/90"
                      onClick={() => onConvert(effectiveOrder)}
                    >
                      <Check className="mr-1.5 h-4 w-4" /> Chốt đơn
                    </Button>
                  )}
                  {onCloseCase && effectiveOrder.temperature === "cold" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-action-danger/30 text-action-danger hover:bg-action-danger/10"
                      onClick={() => onCloseCase(effectiveOrder)}
                    >
                      <X className="mr-1.5 h-4 w-4" /> Đóng case
                    </Button>
                  )}
                </div>
              )}
              <Sheet3ContactTimeline orderId={order?.id ?? null} active={open} />
              <BlockCrmRating order={effectiveOrder} patch={patch} crmCatalog={crmCatalog} />
            </>
          ) : (
            <div className="flex justify-center py-6">
              <LogoSpinner size={24} label="Đang tải..." className="mx-auto" />
            </div>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Đóng
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? "Đang lưu…" : "Lưu"}
            {hasChanges ? (
              <span className="ml-1 text-xs">({Object.keys(pendingCrm).length})</span>
            ) : null}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
