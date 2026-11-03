import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Bộ thẻ dùng chung cho đường mobile của phần kho.
 *
 * Mọi màn kho ở desktop vẫn là bảng; dưới 768px `ResponsiveList` đổi sang thẻ.
 * Gom các mảnh thẻ về một chỗ để 5 màn (Xuất hàng ra, Nhập hoàn, Chờ hàng hoàn,
 * Phiếu kho, 2 dialog quét) không mỗi nơi tự chế một kiểu thẻ khác nhau.
 *
 * Điểm mấu chốt so với bảng: thẻ KHÔNG có ô nào ăn theo chiều rộng của ô khác.
 * Bảng cũ hỏng trên điện thoại đúng vì thế — cột "Tên" chứa mô tả sản phẩm dài
 * kéo cả bảng rộng ra và đẩy các cột sau khỏi màn hình.
 */

export type CardTone = "default" | "amber" | "green" | "danger";

const TONE_CLASSES: Record<CardTone, string> = {
  default: "border-border bg-card",
  amber: "border-action-warning/30 bg-action-warning/10",
  green: "border-action-success/30 bg-action-success/10",
  danger: "border-action-danger/30 bg-action-danger/10",
};

export function MobileCard({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: CardTone;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${TONE_CLASSES[tone]} ${className}`}>
      {children}
    </div>
  );
}

/** Khối nhãn–giá trị trong thẻ. Luôn bọc `CardField` bằng cái này (dt/dd cần dl). */
export function CardFields({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={`space-y-1 ${className}`}>{children}</dl>;
}

/**
 * Một dòng nhãn–giá trị. Nhãn không co (`shrink-0`), giá trị chiếm phần còn lại và
 * được phép xuống dòng — chuỗi dài (mô tả sản phẩm, mã vận đơn) vì thế wrap trong
 * thẻ thay vì đẩy ngang.
 */
export function CardField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 text-xs ${className}`}>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right">{value}</dd>
    </div>
  );
}

/** Hàng nút thao tác dưới đáy thẻ. */
export function CardActions({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap justify-end gap-2">{children}</div>;
}

/**
 * Thẻ SKU bung được ở chế độ "xem theo SKU".
 *
 * Nút bung mang `aria-expanded` giống hệt hàng bảng ở desktop, nên hành vi bàn
 * phím / trợ năng và cả test đều đi chung một đường.
 */
export function SkuCard({
  sku,
  name,
  countLabel,
  count,
  qtyLabel,
  qty,
  qtyNote,
  expanded,
  onToggle,
  children,
}: {
  sku: string;
  name: string;
  countLabel: string;
  count: ReactNode;
  qtyLabel: string;
  qty: ReactNode;
  qtyNote?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <MobileCard>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex w-full items-start gap-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{sku}</p>
          {/* 2 dòng là đủ nhận ra sản phẩm; mô tả prod dài tới ~200 ký tự nên
              không kẹp lại thì thẻ nào cũng cao bằng nửa màn hình. */}
          <p className="line-clamp-2 text-xs text-muted-foreground">{name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-foreground">{qty}</p>
          <p className="text-xs text-muted-foreground">{qtyLabel}</p>
        </div>
      </button>

      {qtyNote && <div className="mt-1 text-right text-xs text-muted-foreground">{qtyNote}</div>}

      <CardFields className="mt-2">
        <CardField label={countLabel} value={count} />
      </CardFields>

      {expanded && children}
    </MobileCard>
  );
}

/**
 * Một dòng chi tiết bên trong thẻ SKU đã bung (1 đơn / 1 phiếu).
 *
 * Thay cho bảng lồng trong `<td colSpan>` của bản desktop — chính chỗ hỏng trên
 * điện thoại: bảng lồng `w-full` giãn theo bảng ngoài nên Kho và SL bị đẩy ra
 * ngoài viewport.
 */
export function SkuDetailCard({
  title,
  qty,
  qtyLabel,
  fields,
}: {
  title: ReactNode;
  qty: ReactNode;
  qtyLabel: string;
  fields: { label: string; value: ReactNode }[];
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 break-words text-xs font-medium text-foreground">{title}</div>
        <div className="shrink-0 text-right text-xs">
          <span className="font-semibold">{qty}</span>{" "}
          <span className="text-muted-foreground">{qtyLabel}</span>
        </div>
      </div>
      <CardFields className="mt-1">
        {fields.map((f) => (
          <CardField key={f.label} label={f.label} value={f.value} />
        ))}
      </CardFields>
    </div>
  );
}

/** Khung danh sách chi tiết dưới thẻ SKU đã bung. */
export function SkuDetailList({ children }: { children: ReactNode }) {
  return <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2">{children}</div>;
}
