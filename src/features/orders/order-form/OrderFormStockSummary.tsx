import { Boxes } from "lucide-react";

import { useI18n } from "@/i18n";

import { type OrderFormStockState } from "./use-order-form-stock";
import { formatNumber } from "@/lib/format";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Khối "tồn kho" ngay dưới ô Kho xuất của form đơn: tồn BÁN ĐƯỢC của từng sản
 * phẩm đang có trên đơn, tại kho vừa chọn.
 *
 * Con số hiển thị là tồn thô, KHÔNG so với số lượng đang đặt — cảnh báo vượt tồn
 * là quyết định nghiệp vụ riêng, cố ý để ngoài phạm vi.
 *
 * `pending_direct` (nếu > 0) hiện thêm số lượng đã lên hoá đơn nhưng sổ chưa trừ tồn
 * (đơn bán trực tiếp chờ kho quét mã hoá đơn hoặc bấm "Xuất kho") — CHỈ LÀ CẢNH BÁO
 * tham khảo, không chặn chọn hàng: hệ thống cố ý không có khái niệm giữ chỗ trong sổ.
 */
export function OrderFormStockSummary({
  t,
  warehouseName,
  stock,
}: {
  t: Translate;
  /** Tên kho đang chọn; rỗng = chưa chọn kho. */
  warehouseName: string;
  stock: OrderFormStockState;
}) {
  // Lỗi gọi API (thường gặp nhất: thiếu quyền) → ẩn hẳn, không chen ngang việc
  // tạo đơn bằng một dòng báo lỗi mà sale không xử lý được.
  if (stock.failed) return null;

  const heading = warehouseName
    ? `${t("orders.stock.heading", "Tồn kho")} ${warehouseName}`
    : t("orders.stock.heading", "Tồn kho");

  return (
    <div className="col-span-full rounded-md border border-border/70 bg-muted/30 px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Boxes className="size-3.5" aria-hidden="true" />
        {heading}
      </p>
      {!warehouseName ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {t("orders.stock.pickWarehouse", "Chọn kho xuất để xem tồn kho")}
        </p>
      ) : stock.loading ? (
        <p className="mt-1 text-xs text-muted-foreground">{t("common.loading", "Đang tải...")}</p>
      ) : stock.rows.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {t("orders.stock.pickProduct", "Thêm sản phẩm để xem tồn kho")}
        </p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {stock.rows.map((row) => (
            <li key={row.sku} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-foreground">
                <span className="font-medium">{row.sku}</span>
                {row.product_name ? (
                  <span className="text-muted-foreground"> — {row.product_name}</span>
                ) : null}
              </span>
              <span className="whitespace-nowrap">
                <span className="mr-1 font-normal text-muted-foreground">
                  {t("orders.stock.sellableLabel", "Tồn")}
                </span>
                <span
                  className={
                    row.sellable > 0
                      ? "font-semibold text-foreground"
                      : "font-semibold text-destructive"
                  }
                >
                  {formatNumber(row.sellable)}
                </span>
                {row.pending_direct > 0 ? (
                  <span className="ml-1 font-medium text-action-warning">
                    ({t("orders.stock.pendingDirectLabel", "đã lên HĐ, chưa xuất")}{" "}
                    {formatNumber(row.pending_direct)})
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
