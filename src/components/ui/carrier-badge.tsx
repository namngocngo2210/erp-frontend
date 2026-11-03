import { CARRIER_TEXT_CLASS, getCarrier } from "@/lib/phone-carrier";
import { cn } from "@/lib/utils";

/**
 * Nhãn nhà mạng in hoa nhỏ hiển thị ngay dưới SĐT (VIETTEL, MOBI, VINA...).
 * Không nhận diện được (số bàn, số rác) thì không render gì.
 */
export function CarrierBadge({ phone, className }: { phone: string; className?: string }) {
  const carrier = getCarrier(phone);
  if (!carrier) return null;
  return (
    <span
      className={cn(
        "block text-xs font-bold leading-tight tracking-wide",
        CARRIER_TEXT_CLASS[carrier.key],
        className,
      )}
    >
      {carrier.shortLabel}
    </span>
  );
}
