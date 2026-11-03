import { Truck } from "lucide-react";

import { useI18n } from "@/i18n";
import { formatDateTimeVi } from "@/lib/format";
import { partMilestones } from "@/features/pancake-pos/delivery-logic";
import { usePancakeOrderDelivery } from "@/features/pancake-pos/queries";

/**
 * Mục "Vận chuyển (Pancake)" ở chi tiết đơn (two-way-sync §5, MR D): trạng thái thô từ
 * Pancake + ĐVVC và mốc thời gian từng kiện. Đơn không có đơn Pancake / không có quyền /
 * lỗi → không hiện gì. Chỉ đọc: `Order.status` vẫn theo KiotViet.
 */
export function PancakeDeliverySection({ orderId }: { orderId: number }) {
  const { t } = useI18n();
  const query = usePancakeOrderDelivery(orderId);
  const data = query.data;
  if (!data || data.parts.length === 0) return null;

  return (
    <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/40 p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700">
        <Truck className="h-3.5 w-3.5" />
        {t("pancakePos.delivery.title")}
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{t("pancakePos.delivery.hint")}</p>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">{t("pancakePos.delivery.partnerStatus")}</dt>
        <dd className="font-medium">{data.partner_delivery_status || "—"}</dd>
        <dt className="text-muted-foreground">{t("pancakePos.delivery.dvvcStatus")}</dt>
        <dd className="font-medium">{data.partner_dvvc_delivery_status || "—"}</dd>
      </dl>
      <ul className="mt-2 space-y-2">
        {data.parts.map((part) => (
          <li key={part.pancake_order_id} className="border-t border-sky-100 pt-2 text-xs">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-mono font-medium">
                {t("pancakePos.delivery.part").replace("{id}", part.pancake_order_id)}
              </span>
              <span>{part.status_name || "—"}</span>
              {part.dvvc_status && (
                <span className="text-muted-foreground">· {part.dvvc_status}</span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-muted-foreground">
              {(part.partner_name || part.tracking_code) && (
                <span>
                  {t("pancakePos.delivery.carrier")}: {part.partner_name || "—"}
                  {part.tracking_code && <span className="font-mono"> {part.tracking_code}</span>}
                </span>
              )}
              {part.warehouse_name && (
                <span>
                  {t("pancakePos.delivery.warehouse")}: {part.warehouse_name}
                </span>
              )}
            </div>
            {partMilestones(part).length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-muted-foreground">
                {partMilestones(part).map((m) => (
                  <span key={m.key}>
                    {t(`pancakePos.delivery.milestone.${m.key}`)}: {formatDateTimeVi(m.at)}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
