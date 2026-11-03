import { ArrowLeft, ChevronDown, ChevronUp, Copy, PackageCheck, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PancakeOrderRefs } from "@/features/pancake-pos/components/PancakeOrderRefs";
import type { OrderRow } from "../order-types";

type Props = {
  orderId: number;
  /** Đơn gốc (null khi chưa tải / không tìm thấy). */
  order: OrderRow | null;
  /** Đơn đã gộp thay đổi chờ lưu — dùng để hiển thị tên/kênh. */
  displayOrder: OrderRow | null;
  hasPrev: boolean;
  hasNext: boolean;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDuplicate?: (id: number) => Promise<void>;
  isReadOnly: boolean;
  canDispatch: boolean;
  onDispatch: () => void;
  hasUnsavedChanges: boolean;
  pendingCount: number;
  isSaving: boolean;
  onSave: () => void;
  t: (k: string, f?: string) => string;
};

/** Thanh trên cùng: quay lại, đơn trước/sau, tiêu đề, Nhân bản / Xuất kho / Lưu. */
export function OrderDetailTopbar({
  orderId,
  order,
  displayOrder,
  hasPrev,
  hasNext,
  onBack,
  onPrev,
  onNext,
  onDuplicate,
  isReadOnly,
  canDispatch,
  onDispatch,
  hasUnsavedChanges,
  pendingCount,
  isSaving,
  onSave,
  t,
}: Props) {
  const shown = displayOrder || order;
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2.5">
      {/* Back + Prev/Next */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Danh sách</span>
        </Button>
        <div className="h-4 w-px bg-border mx-1" />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={!hasPrev}
          onClick={onPrev}
          title="Đơn trước"
          aria-label="Đơn trước"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={!hasNext}
          onClick={onNext}
          title="Đơn sau"
          aria-label="Đơn sau"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Title */}
      <div className="flex flex-1 min-w-0 items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground shrink-0">#{orderId}</span>
        {order && shown && (
          <>
            {shown.name && (
              <h1 className="truncate text-sm font-semibold text-foreground">{shown.name}</h1>
            )}
            {shown.channel_name && (
              <Badge variant="outline" className="hidden md:inline-flex shrink-0 text-xs">
                {shown.channel_name}
              </Badge>
            )}
            <PancakeOrderRefs orderId={orderId} />
          </>
        )}
      </div>

      {/* Actions — Hóa đơn + Nhân bản + Lưu */}
      {order && (
        <>
          {onDuplicate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDuplicate(order.id).catch(() => null)}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nhân bản</span>
            </Button>
          )}
          {!isReadOnly && canDispatch && (
            <Button size="sm" variant="outline" onClick={onDispatch} className="gap-1.5">
              <PackageCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{t("orders.detail.dispatch", "Xuất kho")}</span>
            </Button>
          )}
          {!isReadOnly && (
            <Button
              size="sm"
              variant={hasUnsavedChanges ? "default" : "outline"}
              onClick={onSave}
              disabled={!hasUnsavedChanges && !isSaving}
              className={hasUnsavedChanges ? "bg-action-warning hover:bg-action-warning/90" : ""}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lưu</span>
              {hasUnsavedChanges && <span className="ml-1 text-xs">({pendingCount})</span>}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
