/**
 * Nhóm kênh bán của Báo cáo tổng — GƯƠNG của hằng số cùng tên ở
 * `apps/orders/reporting/shared.py` (BE trả key, FE quyết định nhãn/màu).
 *
 * NHÓM THEO TẦNG (user chốt 2026-08-23): biểu đồ chia theo đúng tầng dưới của
 * thứ đang lọc, không sâu hơn.
 *
 *   Tất cả     → Nội sàn · Ngoại sàn
 *   Nội sàn    → Shopee · TikTok
 *   Ngoại sàn  → Facebook · Web · Ngoại sàn khác
 *
 * BE đã gộp sẵn về đúng tầng rồi mới trả, nên FE chỉ cần biết THỨ TỰ của tầng để
 * sắp lát — dùng `saleChannelSeriesFor(nguồn, kênh)`, đừng tự đoán từ dữ liệu.
 * Thứ tự cố định (không sort theo giá trị) để một nhóm luôn nằm cùng vị trí và
 * cùng màu ở cả 3 donut lẫn biểu đồ diễn biến.
 *
 * HAI Ô LỌC (user chốt 2026-08-24): ô "Nguồn" chọn tầng (bảng trên), ô "Kênh
 * bán" chọn MỘT nhóm trong tầng đó — khi đó biểu đồ co lại còn đúng nhóm ấy.
 */
const SALE_CHANNEL_ORDER_ALL = ["marketplace", "off_marketplace"] as const;
const SALE_CHANNEL_ORDER_MARKETPLACE = ["shopee", "tiktok"] as const;
const SALE_CHANNEL_ORDER_OFF_MARKETPLACE = ["facebook", "web", "off_other"] as const;

/** Mọi khóa nhóm có thể xuất hiện, mọi tầng gộp lại. */
export const SALE_CHANNEL_ORDER = [
  ...SALE_CHANNEL_ORDER_ALL,
  ...SALE_CHANNEL_ORDER_MARKETPLACE,
  ...SALE_CHANNEL_ORDER_OFF_MARKETPLACE,
] as const;

export type SaleChannelKey = (typeof SALE_CHANNEL_ORDER)[number];

/** Thứ tự lát của tầng ứng với ô "Nguồn" đang chọn. "" hoặc giá trị lạ = tầng Tất cả. */
export function saleChannelOrderFor(saleChannel: string): readonly string[] {
  if (saleChannel === "marketplace") return SALE_CHANNEL_ORDER_MARKETPLACE;
  if (saleChannel === "off_marketplace") return SALE_CHANNEL_ORDER_OFF_MARKETPLACE;
  return SALE_CHANNEL_ORDER_ALL;
}

/**
 * Giá trị hợp lệ của ô "Kênh bán" ứng với Nguồn đang chọn; "" = không lọc sâu.
 *
 * GƯƠNG của `sale_channel_group_filter` ở BE: nhóm không thuộc tầng đang chọn
 * bị bỏ qua ở CẢ HAI phía. FE kiểm ở đây để không gửi đi tổ hợp mâu thuẫn khi
 * người dùng đổi Nguồn (vd đang chọn "Facebook" rồi đổi Nguồn sang Nội sàn).
 */
export function saleChannelGroupFor(saleChannel: string, saleChannelGroup: string): string {
  return saleChannelOrderFor(saleChannel).includes(saleChannelGroup) ? saleChannelGroup : "";
}

/**
 * Thứ tự lát THỰC SỰ được vẽ. Đang lọc một nhóm thì chỉ còn nhóm đó — donut một
 * lát 100%, biểu đồ diễn biến một series, đúng bằng dữ liệu BE trả về.
 */
export function saleChannelSeriesFor(
  saleChannel: string,
  saleChannelGroup: string,
): readonly string[] {
  const group = saleChannelGroupFor(saleChannel, saleChannelGroup);
  return group ? [group] : saleChannelOrderFor(saleChannel);
}

export const SALE_CHANNEL_LABELS: Record<string, string> = {
  marketplace: "Nội sàn",
  off_marketplace: "Ngoại sàn",
  shopee: "Shopee",
  tiktok: "TikTok",
  facebook: "Facebook",
  web: "Web",
  off_other: "Ngoại sàn khác",
};

/** Giá trị + nhãn của ô lọc "NGUỒN" — luôn 2 nhóm lớn, không đổi theo tầng. */
export const SALE_CHANNEL_SOURCE_LABELS: Record<string, string> = {
  marketplace: "Nội sàn",
  off_marketplace: "Ngoại sàn",
};

/**
 * Màu cố định theo nhóm. Mỗi TẦNG là một bảng phân loại riêng và đã chạy
 * validator ở light mode theo đúng thứ tự vẽ:
 *
 *   Tất cả (2 màu)     — CVD ΔE 24.7 · thị lực thường ΔE 33.6 · tương phản ≥3:1
 *   Nội sàn (2 màu)    — CVD ΔE 29.5 · thị lực thường ΔE 37.6 · tương phản ≥3:1
 *   Ngoại sàn (3 màu)  — CVD ΔE 9.1 · thị lực thường ΔE 22.9
 *
 * Ở tầng Ngoại sàn, `#1baf7a` và `#eda100` dưới 3:1 tương phản với nền — được
 * phép vì mỗi donut luôn kèm BẢNG CHI TIẾT có nhãn chữ, và biểu đồ diễn biến
 * luôn có legend + tooltip. Bỏ những thứ đó đi là vi phạm.
 *
 * `marketplace` dùng lại hex của `facebook`, `off_marketplace` dùng lại hex của
 * `shopee` — KHÔNG sao vì hai tầng không bao giờ hiện cùng lúc, và cặp
 * xanh/cam này đúng là cặp màu nội/ngoại sàn của trang trước 2026-08-20 nên
 * người xem cũ thấy quen. Đổi màu hoặc đổi thứ tự thì phải validate lại.
 */
const SALE_CHANNEL_COLORS: Record<string, string> = {
  marketplace: "#2a78d6",
  off_marketplace: "#eb6834",
  shopee: "#eb6834",
  tiktok: "#4a3aa7",
  facebook: "#2a78d6",
  web: "#1baf7a",
  off_other: "#eda100",
};

const FALLBACK_COLOR = "#64748b";

export function colorForSaleChannel(key: string): string {
  return SALE_CHANNEL_COLORS[key] ?? FALLBACK_COLOR;
}

export function labelForSaleChannel(key: string): string {
  return SALE_CHANNEL_LABELS[key] ?? key;
}
