import { AlertTriangle, Undo2 } from "lucide-react";

import { CarrierBadge } from "@/components/ui/carrier-badge";
import { CallPhoneButton } from "@/features/callcenter/CallPhoneButton";

/** Cảnh báo trùng đơn ĐANG VẬN CHUYỂN: cùng SĐT + cùng sản phẩm, hai đơn cách
 * nhau ≤30 ngày. Backend chấm (order_duplicate_warning_service) và trả
 * `duplicate_order_ids` ở payload list — nên bắt được cả đơn nằm ngoài trang
 * đang xem. */
function DuplicatePhoneWarning({ duplicateIds }: { duplicateIds: number[] }) {
  if (duplicateIds.length === 0) return null;
  const codes = duplicateIds.map((id) => `#${id}`).join(", ");
  return (
    <span
      data-testid="duplicate-phone-warning"
      role="img"
      aria-label={`Trùng ${duplicateIds.length} đơn đang vận chuyển`}
      // title trên <span> chứ không trên icon: lucide không nhận prop `title`.
      title={`Trùng: SĐT này đã có ${duplicateIds.length} đơn đang vận chuyển cùng sản phẩm trong 30 ngày (${codes})`}
      className="inline-flex"
    >
      <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
    </span>
  );
}

/** Cảnh báo khách ĐANG/VỪA HOÀN đơn cùng sản phẩm — rủi ro bom hàng, khác hẳn
 * nghiệp vụ với cảnh báo trùng ở trên nên cố ý là icon + màu riêng: sale phải
 * phân biệt được "gọi khách gộp đơn" với "cân nhắc trước khi chốt". */
function ReturningOrderWarning({ returningIds }: { returningIds: number[] }) {
  if (returningIds.length === 0) return null;
  const codes = returningIds.map((id) => `#${id}`).join(", ");
  return (
    <span
      data-testid="returning-order-warning"
      role="img"
      aria-label={`Có ${returningIds.length} đơn hoàn`}
      title={`Cảnh báo: SĐT này có ${returningIds.length} đơn đang hoàn cùng sản phẩm trong 30 ngày (${codes})`}
      className="inline-flex"
    >
      <Undo2 className="size-3.5 shrink-0 text-amber-600" />
    </span>
  );
}

/** SĐT + nhãn nhà mạng dưới số + hai cảnh báo + nút gọi (trang landing). */
export function PhoneWithCall({
  phone,
  canCall,
  duplicateIds = [],
  returningIds = [],
}: {
  phone: string;
  canCall: boolean;
  duplicateIds?: number[];
  returningIds?: number[];
}) {
  if (!phone) return <>-</>;
  // SĐT bị che (091****678): đơn của sale khác và người xem không có quyền
  // `customer-phone:view` — nói rõ lý do thay vì để sale tưởng dữ liệu lỗi.
  const isMasked = phone.includes("*");
  const phoneWithCarrier = (
    <span className="inline-block leading-tight">
      {/* `flex` (không phải inline-flex): giữ nguyên bố cục cũ — số ở một dòng,
          nhãn nhà mạng xuống dòng dưới; icon cảnh báo nằm cạnh số. */}
      <span
        className="flex items-center gap-1"
        title={isMasked ? "SĐT được ẩn vì đơn này không do bạn phụ trách" : undefined}
      >
        {phone}
        <DuplicatePhoneWarning duplicateIds={duplicateIds} />
        <ReturningOrderWarning returningIds={returningIds} />
      </span>
      <CarrierBadge phone={phone} />
    </span>
  );
  if (!canCall) return phoneWithCarrier;
  // Icon gọi ghim sát mép phải của ô (kiểu tổng đài CRM), số nằm bên trái.
  return (
    <span className="flex w-full min-w-[110px] items-center justify-between gap-2">
      {phoneWithCarrier}
      <CallPhoneButton phone={phone} />
    </span>
  );
}
