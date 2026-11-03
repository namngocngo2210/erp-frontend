import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardField, CardFields, MobileCard } from "@/features/inventory/components/mobile-cards";

/**
 * Đường mobile của hai dialog quét kho.
 *
 * Bảng trong dialog còn hỏng nặng hơn bảng trang: nó KHÔNG có vùng cuộn riêng,
 * nên cột dài (mô tả sản phẩm) đẩy tràn cả thân dialog — cột Trạng thái và nút
 * Xoá nằm ngoài màn hình. Ở điện thoại thay hẳn bằng thẻ.
 */

/** Thẻ 1 mã đã quét. `tone` đỏ cho mã chưa khớp đơn, giữ đúng quy ước màu của bảng. */
export function ScanRowCard({
  code,
  unmatched,
  badge,
  fields,
  onRemove,
  removeLabel,
  children,
}: {
  code: string;
  unmatched: boolean;
  badge?: ReactNode;
  fields: { label: string; value: ReactNode }[];
  onRemove: () => void;
  removeLabel: string;
  children?: ReactNode;
}) {
  return (
    <MobileCard tone={unmatched ? "danger" : "default"}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium">{code}</p>
          {unmatched && (
            <span className="mt-1 inline-block rounded-full bg-action-danger/10 px-2 py-0.5 text-xs font-medium text-action-danger">
              Chưa khớp đơn
            </span>
          )}
          {badge && <div className="mt-1">{badge}</div>}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 px-2"
          onClick={onRemove}
          aria-label={removeLabel}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <CardFields className="mt-2">
        {fields.map((f) => (
          <CardField key={f.label} label={f.label} value={f.value} />
        ))}
      </CardFields>

      {children}
    </MobileCard>
  );
}

/** Thẻ 1 dòng sản phẩm trong bảng tổng kết cuối dialog. */
export function ScanSummaryCard({
  sku,
  name,
  quantity,
}: {
  sku: string;
  name: string;
  quantity: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-border px-3 py-2 first:border-t-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{sku}</p>
        <p className="text-xs text-muted-foreground">{name}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold">{quantity}</span>
    </div>
  );
}
