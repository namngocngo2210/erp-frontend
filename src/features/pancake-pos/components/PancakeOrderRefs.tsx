import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { usePancakePosOrderRefs } from "@/features/pancake-pos/queries";

/**
 * Mã đơn Pancake của một đơn CRM (two-way-sync A2) — hiện ở thanh trên trang chi tiết
 * đơn. Chưa đẩy / không có quyền / lỗi → không hiện gì (không làm phiền luồng sale).
 */
export function PancakeOrderRefs({ orderId }: { orderId: number }) {
  const { t } = useI18n();
  const query = usePancakePosOrderRefs(orderId);
  const refs = (query.data ?? []).filter((r) => r.pancake_order_id);
  if (refs.length === 0) return null;
  return (
    <Badge
      variant="outline"
      className="hidden shrink-0 border-sky-200 bg-sky-50 font-mono text-xs text-sky-700 md:inline-flex"
      title={t("pancakePos.orderRefs.title")}
    >
      {t("pancakePos.orderRefs.label")} {refs.map((r) => r.pancake_order_id).join(", ")}
    </Badge>
  );
}
