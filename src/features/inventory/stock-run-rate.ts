import { formatNumber } from "@/lib/format";
/** Run-rate bán (chiếc/ngày), làm tròn 1 chữ số thập phân theo locale vi-VN. */
export function formatRate(rate: number): string {
  return formatNumber(rate, { maximumFractionDigits: 1 });
}
