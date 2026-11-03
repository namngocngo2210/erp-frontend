import { SALES_STATUS_TINT } from "./constants";

/**
 * Màu nền một dòng của bảng đơn.
 *
 * Tách khỏi OrderTableRow để thứ tự ưu tiên là thứ kiểm chứng được bằng test —
 * nó là quy ước đọc bảng của sale, không phải chi tiết render: dòng đang chọn >
 * khách đang có đơn hoàn > cảnh báo trùng SĐT > quá hạn SLA > dòng đang mở >
 * màu theo trạng thái sale.
 *
 * Cảnh báo hoàn (cam) đứng TRÊN cảnh báo trùng (đỏ): trùng đơn đang giao là việc
 * xử lý được (gọi khách gộp đơn), còn khách vừa hoàn hàng là rủi ro mất tiền ship
 * — anh chốt 21/08 rằng đó mới là màu sale cần thấy trước.
 *
 * Ngoại lệ: đơn ĐÃ CHỐT giữ nguyên màu xanh, hai cảnh báo trên không đè lên
 * (anh chốt 11/09). Sale đã quyết xong đơn thì màu xanh là thứ cần nhìn thấy
 * khi quét bảng; cảnh báo vẫn còn ở icon cột SĐT.
 *
 * `stickyBg` phải là màu ĐỤC: cột sticky (checkbox / cột khoá) không nhìn xuyên
 * được nền của `<tr>`, phải tự sơn lại đúng màu đó.
 */
export type RowTintInput = {
  isSelected: boolean;
  /** Hệ thống phát hiện trùng đơn ĐANG VẬN CHUYỂN (cùng SĐT + cùng sản phẩm, ≤30 ngày) — xem order_duplicate_warning_service. */
  hasDuplicatePhone: boolean;
  /** Khách đang/vừa hoàn một đơn cùng sản phẩm trong 30 ngày — nguy cơ bom hàng. */
  hasReturningOrder: boolean;
  slaBreach: boolean;
  isActiveRow: boolean;
  salesStatusCode: string;
};

export type RowTint = { row: string; stickyBg: string };

/** Các trạng thái sale tô xanh lá "Đã chốt" — xem SALES_STATUS_TINT. */
const CLOSED_SALES_STATUS_CODES = new Set(["closed", "closed_express", "closed_scheduled_date"]);

export function resolveRowTint({
  isSelected,
  hasDuplicatePhone,
  hasReturningOrder,
  slaBreach,
  isActiveRow,
  salesStatusCode,
}: RowTintInput): RowTint {
  if (isSelected) return { row: "bg-muted", stickyBg: "var(--muted)" };
  const isClosed = CLOSED_SALES_STATUS_CODES.has(salesStatusCode);
  if (hasReturningOrder && !isClosed) {
    // Đục, không dùng alpha: `stickyBg` phải khớp TUYỆT ĐỐI màu của <tr>, mà cột
    // sticky sơn trên nền card nên một nền trong suốt sẽ ra sắc khác.
    return { row: "bg-amber-100 hover:bg-amber-200", stickyBg: "#fef3c7" };
  }
  if (hasDuplicatePhone && !isClosed) {
    return {
      row: "bg-destructive/10 hover:bg-destructive/15",
      stickyBg: "color-mix(in srgb, var(--destructive) 10%, var(--card))",
    };
  }
  if (slaBreach) return { row: "bg-red-50 hover:bg-red-100", stickyBg: "#fef2f2" };
  if (isActiveRow) return { row: "bg-primary/5", stickyBg: "var(--card)" };
  const salesTint = SALES_STATUS_TINT[salesStatusCode];
  return {
    row: salesTint?.row || "hover:bg-muted/30",
    stickyBg: salesTint?.stickyBg || "var(--card)",
  };
}
