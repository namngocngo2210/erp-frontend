import { ShippingCodeLink } from "@/features/orders/ShippingCodeLink";
import { type OrderRow } from "@/features/orders/order-types";
import { useI18n } from "@/i18n";

import { formatDateTime, parseAmount } from "./order-form-helpers";
import { formatNumber } from "@/lib/format";

type Translate = ReturnType<typeof useI18n>["t"];

/** Khối "Lịch sử mua hàng theo SĐT" — chỉ hiện khi sửa đơn. */
export function OrderFormPurchaseHistory({
  t,
  currentPhone,
  purchaseHistory,
  historyCount,
  historyLoading,
  historyError,
  historyTotalAmount,
}: {
  t: Translate;
  currentPhone: string;
  purchaseHistory: OrderRow[];
  historyCount: number;
  historyLoading: boolean;
  historyError: string | null;
  historyTotalAmount: number;
}) {
  const statusLabel = (value: string | number) => t(`status.${String(value)}`, String(value));
  return (
    <div className="-mt-6 rounded-lg border border-border p-2.5 lg:order-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {t("orders.history.title", "Lịch sử mua hàng theo SĐT")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("orders.history.count", "Số đơn")}:{" "}
          <span className="font-medium text-foreground">{historyCount}</span>
        </p>
      </div>
      <div className="space-y-2">
        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-foreground">
          {t("orders.history.totalSpent", "Tổng giá trị đơn")}:{" "}
          <span className="font-semibold">{formatNumber(historyTotalAmount)}</span>
        </div>
        <div className="max-h-56 overflow-y-auto rounded-md border border-border">
          <table data-slot="table" className="w-full text-xs">
            <thead className="sticky top-0 text-left text-muted-foreground">
              <tr>
                <th className="px-2 py-2">{t("orders.columns.createdAt")}</th>
                <th className="px-2 py-2">{t("orders.columns.orderStatus")}</th>
                <th className="px-2 py-2">{t("orders.columns.totalAmount")}</th>
                <th className="px-2 py-2">{t("orders.columns.shippingCode")}</th>
              </tr>
            </thead>
            <tbody>
              {!currentPhone ? (
                <tr className="border-t border-border/60">
                  <td className="px-2 py-3 text-muted-foreground" colSpan={4}>
                    {t("orders.history.enterPhone", "Nhập số điện thoại để xem lịch sử mua hàng.")}
                  </td>
                </tr>
              ) : historyLoading ? (
                <tr className="border-t border-border/60">
                  <td className="px-2 py-3 text-muted-foreground" colSpan={4}>
                    {t("common.loading", "Đang tải...")}
                  </td>
                </tr>
              ) : historyError ? (
                <tr className="border-t border-border/60">
                  <td className="px-2 py-3 text-destructive" colSpan={4}>
                    {historyError}
                  </td>
                </tr>
              ) : historyCount === 0 ? (
                <tr className="border-t border-border/60">
                  <td className="px-2 py-3 text-muted-foreground" colSpan={4}>
                    {t("orders.history.empty", "Chưa có lịch sử mua hàng cho số điện thoại này.")}
                  </td>
                </tr>
              ) : (
                purchaseHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-border/60 transition-colors hover:bg-muted/50"
                  >
                    <td className="px-2 py-2 text-foreground">{formatDateTime(item.created_at)}</td>
                    <td className="px-2 py-2 text-foreground">{statusLabel(item.status ?? 0)}</td>
                    <td className="px-2 py-2 text-foreground">
                      {formatNumber(parseAmount(item.total_amount))}
                    </td>
                    <td className="px-2 py-2 text-foreground">
                      <ShippingCodeLink
                        shippingCode={item.shipping_code}
                        providerCode={item.shipping_provider}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
