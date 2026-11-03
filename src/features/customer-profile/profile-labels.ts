import type {
  BuyerRole,
  CustomerEra,
  FieldSource,
  PriceTier,
  PurchaseRhythm,
  RecencyBucket,
} from "@/lib/api/customer-profile";

/** Nhãn tiếng Việt cho các mã suy ra từ hành vi (migration 0006 của mart).
 *
 * Giữ ở một chỗ vì cùng bộ mã này xuất hiện ở ô tìm khách lẫn thân hồ sơ; tách
 * đôi là cách nhanh nhất để hai nơi gọi cùng một khách bằng hai cái tên. */
export const ERA_LABELS: Record<CustomerEra, string> = {
  legacy: "Dòng cũ",
  current: "Dòng hiện tại",
  both: "Cả hai dòng",
};

export const ERA_HINTS: Record<CustomerEra, string> = {
  legacy: "Chỉ mua các sản phẩm trước 2025 — chưa từng mua dòng máy massage hiện tại",
  current: "Chỉ mua dòng sản phẩm hiện tại",
  both: "Mua cả dòng cũ lẫn dòng hiện tại — nhóm hiếm, chỉ khoảng 1 trên 700 khách",
};

export const RECENCY_LABELS: Record<RecencyBucket, string> = {
  active: "Đang hoạt động",
  cooling: "Đang nguội",
  at_risk: "Nguy cơ rời bỏ",
  dormant: "Ngủ đông",
};

export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  low: "Giá thấp",
  mid: "Giá trung",
  high: "Giá cao",
};

export const RHYTHM_LABELS: Record<PurchaseRhythm, string> = {
  one_time: "Mua một lần",
  repeat: "Mua lại",
};

export const BUYER_ROLE_LABELS: Record<BuyerRole, string> = {
  self: "Mua cho bản thân",
  gift: "Mua làm quà",
  mixed: "Cả hai",
};

/** Nguồn của một trường chân dung. Phân biệt hai nguồn này là bắt buộc: giá trị
 * do AI suy ra KHÔNG có cùng độ tin cậy với giá trị sale hỏi trực tiếp, và trộn
 * chúng lại là cách biến một phỏng đoán thành một sự thật trong mắt người đọc. */
export const SOURCE_LABELS: Record<FieldSource, string> = {
  declared: "sale nhập",
  ai: "AI suy ra",
};

export const GENDER_LABELS: Record<string, string> = {
  "1": "Nam",
  "2": "Nữ",
};

export function eraLabel(era: CustomerEra | null): string | null {
  return era ? ERA_LABELS[era] : null;
}
