/**
 * Dòng phụ "trạng thái đối tác" dưới cột Trạng thái vận chuyển thực.
 *
 * `partner_delivery_status` = trạng thái đơn bên hệ đối tác (Pancake POS: tên tiếng
 * Việt, vd "Đã gửi hàng"), `partner_dvvc_delivery_status` = trạng thái ĐVVC đối tác
 * đọc được. Chỉ hiển thị — nguồn sự thật nghiệp vụ vẫn là `delivery_business_status`.
 */
export type PartnerDeliverySummary = {
  /** Dòng ngắn hiển thị trong ô: "Đã gửi hàng · Đang giao hàng". */
  line: string;
  /** Tooltip đầy đủ: "Pancake: … / ĐVVC: …". */
  title: string;
};

type PartnerFields = {
  partner_delivery_status?: string | null;
  partner_dvvc_delivery_status?: string | null;
};

export function partnerDeliverySummary(row: PartnerFields): PartnerDeliverySummary | null {
  const status = String(row.partner_delivery_status ?? "").trim();
  const dvvc = String(row.partner_dvvc_delivery_status ?? "").trim();
  if (!status && !dvvc) return null;
  const parts: string[] = [];
  if (status) parts.push(`Pancake: ${status}`);
  if (dvvc) parts.push(`ĐVVC: ${dvvc}`);
  return {
    line: [status, dvvc].filter(Boolean).join(" · "),
    title: parts.join(" / "),
  };
}
