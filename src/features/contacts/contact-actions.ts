import { type DateFilterValue, getDateRange } from "@/components/ui/date-filter";

/**
 * Bộ lọc ngày mặc định khi vào trang Danh sách contact = THÁNG NÀY. Bắt buộc có
 * khoảng ngày ngay từ đầu: nếu để trống, list query phải materialize TOÀN BỘ
 * khách để đếm chip (seq-scan cả bảng orders, ~7s prod). Khoảng ngày hẹp cho
 * phép dùng index created_at. Đổi mặc định ở đây nếu nghiệp vụ muốn khác.
 */
export function defaultDateFilter(): DateFilterValue {
  const range = getDateRange("this_month");
  return { option: "this_month", from: range.from, to: range.to };
}

/**
 * Danh mục "Tác nghiệp cần" cho trang Danh sách contact — key mirror BE
 * (apps/sale/contacts). Đổi nhãn/mã ở đây, đổi enum values phải sửa cả BE.
 */
export type ContactActionKey =
  | "new_customer"
  | "new_lead"
  | "call_2"
  | "call_3"
  | "call_4"
  | "call_5"
  | "call_6"
  | "recheck_phone"
  | "nurture"
  | "follow_up"
  | "awaiting_delivery"
  | "post_sale"
  | "none";

export const CONTACT_ACTIONS: Record<ContactActionKey, { label: string; badgeClass: string }> = {
  new_customer: { label: "KH mới", badgeClass: "bg-red-500 text-white border-transparent" },
  new_lead: { label: "Lead mới", badgeClass: "bg-rose-500 text-white border-transparent" },
  call_2: { label: "Gọi lần 2", badgeClass: "bg-emerald-600 text-white border-transparent" },
  call_3: { label: "Gọi lần 3", badgeClass: "bg-emerald-700 text-white border-transparent" },
  call_4: { label: "Gọi lần 4", badgeClass: "bg-emerald-800 text-white border-transparent" },
  call_5: { label: "Gọi lần 5", badgeClass: "bg-emerald-900 text-white border-transparent" },
  call_6: { label: "Gọi lần 6", badgeClass: "bg-emerald-950 text-white border-transparent" },
  recheck_phone: {
    label: "Check lại số",
    badgeClass: "bg-amber-500 text-white border-transparent",
  },
  nurture: { label: "Chăm sóc thêm", badgeClass: "bg-teal-600 text-white border-transparent" },
  follow_up: { label: "Gọi theo hẹn", badgeClass: "bg-blue-600 text-white border-transparent" },
  awaiting_delivery: {
    label: "Chờ giao",
    badgeClass: "bg-sky-100 text-sky-700 border-transparent",
  },
  post_sale: {
    label: "Chăm sóc sau bán",
    badgeClass: "bg-violet-600 text-white border-transparent",
  },
  none: { label: "—", badgeClass: "bg-muted text-muted-foreground border-transparent" },
};

/** Thứ tự chip trên thanh lọc (không gồm none). */
export const CHIP_ORDER: ContactActionKey[] = [
  "new_customer",
  "new_lead",
  "call_2",
  "call_3",
  "call_4",
  "call_5",
  "call_6",
  "recheck_phone",
  "nurture",
  "follow_up",
  "awaiting_delivery",
  "post_sale",
];

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Humanize thời gian chờ từ `waiting_since` (ISO) tới `now` (mặc định thời
 * điểm gọi hàm — truyền tay để test được). Mốc: <1h dưới 1 giờ, `Xh` dưới 1
 * ngày, `Xd` từ 1 ngày trở lên. `null`/ISO không hợp lệ → "—".
 */
export function humanizeWaiting(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "<1h";
  if (diffMs < MS_PER_HOUR) return "<1h";
  if (diffMs < MS_PER_DAY) return `${Math.floor(diffMs / MS_PER_HOUR)}h`;
  return `${Math.floor(diffMs / MS_PER_DAY)}d`;
}

/**
 * Class màu cho ô "Thời gian chờ". Bộ đếm GTC (basis "gtc"/"gtc_estimated")
 * tính từ mốc giao hàng và KHÔNG reset theo tương tác CSKH — dùng thang giờ
 * (thiết kế cho bộ đếm reset-được) sẽ khiến mọi dòng chăm sóc sau bán đỏ đậm
 * vĩnh viễn ngay khi qua 72h, mất hết tác dụng phân loại. Basis "activity" giữ
 * nguyên thang giờ cũ.
 */
export function waitingUrgencyClass(
  iso: string | null,
  basis: string,
  now: Date = new Date(),
): string {
  if (!iso) return "text-muted-foreground";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "text-muted-foreground";

  if (basis === "gtc" || basis === "gtc_estimated") {
    const diffDays = (now.getTime() - date.getTime()) / MS_PER_DAY;
    if (diffDays >= 14) return "text-action-danger font-semibold";
    if (diffDays >= 7) return "text-action-danger font-medium";
    if (diffDays >= 3) return "text-action-warning";
    return "text-foreground";
  }

  const diffHours = (now.getTime() - date.getTime()) / MS_PER_HOUR;
  if (diffHours >= 72) return "text-action-danger font-semibold";
  if (diffHours >= 24) return "text-action-danger font-medium";
  if (diffHours >= 3) return "text-action-warning";
  return "text-foreground";
}

/**
 * Nội dung tooltip cho ô "Thời gian chờ". Cột này mang nhiều ngữ nghĩa tuỳ
 * dòng: đơn đã giao thành công có journey event đếm từ mốc GTC chính xác
 * ("gtc"); đơn GTC không có event chỉ có Order.updated_at — một mốc ƯỚC TÍNH
 * có thể bị đẩy muộn bởi thao tác ghi khác lên đơn ("gtc_estimated"); còn lại
 * đếm từ ngày data về / lần tương tác cuối ("activity"). Không nói ra thì
 * người dùng không có cách nào phân biệt mốc thật với mốc ước lượng.
 */
export function waitingTooltip(iso: string | null, basis: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (basis === "gtc") return `Chờ từ lúc giao thành công ${stamp}`;
  if (basis === "gtc_estimated") return `Chờ từ lúc giao thành công (ước tính) ${stamp}`;
  return `Chờ từ ${stamp}`;
}
