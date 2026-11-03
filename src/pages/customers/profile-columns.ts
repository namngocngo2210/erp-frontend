import {
  IdCard,
  MessageSquare,
  Package,
  RefreshCw,
  ShoppingCart,
  Tags,
  User,
  type LucideIcon,
} from "lucide-react";

export type ColumnGroupKey =
  | "identity"
  | "sale_status"
  | "demographics"
  | "segment"
  | "purchase"
  | "products"
  | "persona"
  | "resale";

/** Mô tả một cột con: key i18n + nhãn mặc định (tiếng Việt). */
export interface ColumnDescriptor {
  i18nKey: string;
  fallback: string;
}

export interface ColumnGroup {
  key: ColumnGroupKey;
  label: string;
  /** Icon trang trí cạnh nhãn nhóm ở header bảng (aria-hidden). */
  icon?: LucideIcon;
  defaultVisible: boolean;
  /** Các cột con của nhóm — NGUỒN SỰ THẬT DUY NHẤT cho thứ tự, nhãn và số lượng cột. */
  columns: ColumnDescriptor[];
}

// 8 nhóm theo database.xlsx. Mặc định hiện nhóm cốt lõi, còn lại bật qua menu.
// `columns` là nguồn sự thật duy nhất: header tầng 2, colSpan tầng 1 và tổng số cột
// đều suy ra từ đây (xem GROUP_COLUMN_COUNTS).
export const COLUMN_GROUPS: ColumnGroup[] = [
  {
    key: "identity",
    label: "Định danh",
    icon: IdCard,
    defaultVisible: true,
    columns: [
      { i18nKey: "common.code", fallback: "Mã KH" },
      { i18nKey: "customers.columns.name", fallback: "Họ tên" },
      { i18nKey: "customers.columns.phone", fallback: "SĐT" },
      { i18nKey: "customers.profile.channel", fallback: "Kênh bán" },
    ],
  },
  {
    key: "sale_status",
    label: "Trạng thái xử lý",
    defaultVisible: true,
    columns: [
      { i18nKey: "customers.profile.salesStatus", fallback: "Trạng thái sale" },
      { i18nKey: "customers.profile.notClosedReason", fallback: "Lý do không chốt" },
    ],
  },
  {
    key: "segment",
    label: "Phân khúc & nhu cầu",
    icon: Tags,
    defaultVisible: true,
    columns: [
      { i18nKey: "customers.profile.segment", fallback: "Phân khúc" },
      { i18nKey: "customers.profile.needGroup", fallback: "Nhóm nhu cầu chính" },
    ],
  },
  {
    key: "purchase",
    label: "Hành vi mua",
    icon: ShoppingCart,
    defaultVisible: true,
    columns: [
      { i18nKey: "customers.profile.firstPurchase", fallback: "Ngày mua đầu" },
      { i18nKey: "customers.profile.lastPurchase", fallback: "Ngày mua cuối" },
      { i18nKey: "customers.profile.totalOrders", fallback: "Tổng đơn" },
      { i18nKey: "customers.profile.totalSpent", fallback: "Tổng chi tiêu" },
    ],
  },
  {
    key: "demographics",
    label: "Nhân khẩu học",
    icon: User,
    defaultVisible: false,
    columns: [
      { i18nKey: "customers.columns.gender", fallback: "Giới tính" },
      { i18nKey: "customers.profile.province", fallback: "Tỉnh/TP" },
      { i18nKey: "customers.profile.address", fallback: "Địa chỉ" },
      { i18nKey: "customers.profile.ageText", fallback: "Nhóm tuổi" },
      { i18nKey: "customers.profile.occupation", fallback: "Nghề nghiệp" },
    ],
  },
  {
    key: "products",
    label: "Sản phẩm",
    icon: Package,
    defaultVisible: false,
    columns: [
      { i18nKey: "customers.profile.lastProduct", fallback: "SP mua gần nhất" },
      { i18nKey: "customers.profile.lastOrderAmount", fallback: "Giá đơn gần nhất" },
      { i18nKey: "customers.profile.lastOrderStatus", fallback: "Trạng thái đơn gần nhất" },
      { i18nKey: "customers.profile.purchasedSkus", fallback: "SP đã mua" },
    ],
  },
  {
    key: "persona",
    label: "Chân dung",
    icon: MessageSquare,
    defaultVisible: false,
    columns: [
      { i18nKey: "customers.profile.classification", fallback: "Phân loại KH" },
      { i18nKey: "customers.profile.painLevel", fallback: "Mức độ đau" },
      { i18nKey: "customers.profile.painDuration", fallback: "Thời gian đau" },
      { i18nKey: "customers.profile.lifestyle", fallback: "Thói quen sinh hoạt" },
      { i18nKey: "customers.profile.usedMassage", fallback: "Đã dùng massage" },
      { i18nKey: "customers.profile.relaxTime", fallback: "Thời điểm thư giãn" },
      { i18nKey: "customers.profile.purchaseBarrier", fallback: "Rào cản khi mua" },
      { i18nKey: "customers.profile.delaxSource", fallback: "Nguồn biết đến" },
      { i18nKey: "customers.profile.comparingBrand", fallback: "Hãng đang so" },
      { i18nKey: "customers.profile.callDuration", fallback: "Thời lượng cuộc gọi" },
      { i18nKey: "customers.profile.postPurchaseFeedback", fallback: "Cảm nhận sau dùng" },
      { i18nKey: "customers.profile.postPurchaseRating", fallback: "Đánh giá SP" },
      { i18nKey: "customers.profile.needDetails", fallback: "Chi tiết nhu cầu" },
    ],
  },
  {
    key: "resale",
    label: "Resale",
    icon: RefreshCw,
    defaultVisible: false,
    columns: [
      { i18nKey: "customers.profile.lastResale", fallback: "Lần resale gần nhất" },
      { i18nKey: "customers.profile.resaleStatus", fallback: "Trạng thái resale" },
      { i18nKey: "customers.profile.resaleSuggestion", fallback: "Gợi ý SP resale" },
    ],
  },
];

/**
 * Số cột con của mỗi nhóm — suy ra từ `columns` để colSpan header tầng 1,
 * header tầng 2 và tổng số cột luôn nhất quán (một nguồn sự thật duy nhất).
 */
export const GROUP_COLUMN_COUNTS: Record<ColumnGroupKey, number> = COLUMN_GROUPS.reduce(
  (acc, group) => {
    acc[group.key] = group.columns.length;
    return acc;
  },
  {} as Record<ColumnGroupKey, number>,
);
