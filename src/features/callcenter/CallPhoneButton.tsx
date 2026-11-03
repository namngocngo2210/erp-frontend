import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useWebphone } from "./webphone-context";

/**
 * Nút click-to-call cạnh SĐT (trang đơn landing). Hiện với mọi user có quyền
 * tổng đài; khi webphone chưa sẵn sàng (chưa cấu hình Zenify, đang kết nối...)
 * bấm sẽ toast lý do thay vì ẩn nút. User không có quyền thì không thấy gì.
 */
export function CallPhoneButton({ phone }: { phone: string }) {
  const { canUse, dialCall } = useWebphone();
  // SĐT đã bị che (091****678 — đơn của sale khác, xem quyền `customer-phone:view`)
  // không gọi được: ẩn nút thay vì để webphone quay một số vô nghĩa.
  if (!canUse || !phone || phone.includes("*")) return null;
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      title={`Gọi ${phone}`}
      aria-label={`Gọi ${phone}`}
      onClick={(event) => {
        event.stopPropagation();
        dialCall(phone);
      }}
      className="size-5 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
    >
      <Phone className="h-3.5 w-3.5" />
    </Button>
  );
}
