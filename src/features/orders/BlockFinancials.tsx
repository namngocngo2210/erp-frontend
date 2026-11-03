import { memo } from "react";
import { Banknote } from "lucide-react";
import { type OrderRow } from "@/features/orders/order-types";
import { ERow, SectionCard } from "@/features/orders/order-detail-shared";
import { INVOICE_LOCK_HINT } from "@/features/orders/invoice-lock";
import { fmt, parseAmount } from "@/features/orders/order-detail-format";

function BlockFinancialsImpl({
  order,
  patch,
  className,
  contentLocked = false,
}: {
  order: OrderRow;
  patch: (p: Partial<OrderRow>) => void;
  className?: string;
  /** Đơn đã có mã hóa đơn → toàn bộ khối tiền là chỉ đọc (xem invoice-lock.ts). */
  contentLocked?: boolean;
}) {
  const lockProps = contentLocked ? { disabled: true, disabledHint: INVOICE_LOCK_HINT } : {};
  const calcTotalAfterDiscount = (overrides: {
    total_amount?: string | number;
    discount_amount?: string | number;
    booking_voucher_discount?: string | number;
  }) => {
    const total = parseAmount(overrides.total_amount ?? order.total_amount);
    const discount = parseAmount(overrides.discount_amount ?? order.discount_amount);
    const booking = parseAmount(
      overrides.booking_voucher_discount ?? order.booking_voucher_discount,
    );
    return String(total - discount - booking);
  };

  return (
    <SectionCard icon={<Banknote className="h-4 w-4" />} title="Tài chính" className={className}>
      <ERow
        {...lockProps}
        label="Tổng tiền"
        rawValue={order.total_amount}
        display={
          <span className="text-base font-bold text-primary">{fmt(order.total_amount)}</span>
        }
        onSave={(v) =>
          patch({
            total_amount: String(v),
            total_after_discount: calcTotalAfterDiscount({ total_amount: String(v) }),
          })
        }
      />
      <ERow
        {...lockProps}
        label="Giảm giá"
        rawValue={order.discount_amount}
        display={<span className="text-sm font-medium">{fmt(order.discount_amount)}</span>}
        onSave={(v) =>
          patch({
            discount_amount: String(v),
            total_after_discount: calcTotalAfterDiscount({ discount_amount: String(v) }),
          })
        }
      />
      <ERow
        {...lockProps}
        label="Voucher booking"
        rawValue={order.booking_voucher_discount}
        display={<span className="text-sm font-medium">{fmt(order.booking_voucher_discount)}</span>}
        onSave={(v) =>
          patch({
            booking_voucher_discount: String(v),
            total_after_discount: calcTotalAfterDiscount({ booking_voucher_discount: String(v) }),
          })
        }
      />
      <ERow
        {...lockProps}
        label="Phụ phí khác"
        rawValue={order.other_price}
        display={<span className="text-sm font-medium">{fmt(order.other_price)}</span>}
        onSave={(v) => patch({ other_price: String(v) })}
      />
      <ERow
        {...lockProps}
        label="Khách ứng trước"
        rawValue={order.customer_prepaid}
        display={<span className="text-sm font-medium">{fmt(order.customer_prepaid)}</span>}
        onSave={(v) => patch({ customer_prepaid: String(v) })}
      />
      <ERow
        {...lockProps}
        label="Sau giảm giá"
        rawValue={order.total_after_discount}
        display={
          <span className="font-semibold text-emerald-600">{fmt(order.total_after_discount)}</span>
        }
        onSave={(v) => patch({ total_after_discount: String(v) })}
      />
    </SectionCard>
  );
}

export const BlockFinancials = memo(BlockFinancialsImpl);
