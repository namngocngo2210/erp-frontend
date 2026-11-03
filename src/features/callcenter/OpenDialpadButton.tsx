import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { useWebphone } from "./webphone-context";

/**
 * Nút "Quay số" trên toolbar trang đơn: mở panel tổng đài (đang idle → hiện bàn
 * phím). Panel tự ẩn sau mỗi cuộc gọi nên đây là đường vào chính để gọi số lạ;
 * gọi khách của đơn vẫn dùng icon cạnh SĐT (CallPhoneButton).
 */
export function OpenDialpadButton() {
  const { canUse, setVisible } = useWebphone();
  if (!canUse) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs"
      onClick={() => setVisible(true)}
      aria-label="Quay số"
      title="Quay số"
    >
      <Phone className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Quay số</span>
    </Button>
  );
}

/** Bản mục menu của nút "Quay số" — menu "⋯" trên toolbar điện thoại. */
export function OpenDialpadMenuItem({ className }: { className?: string }) {
  const { canUse, setVisible } = useWebphone();
  if (!canUse) return null;
  return (
    <DropdownMenuItem className={className} onClick={() => setVisible(true)}>
      <Phone className="h-4 w-4" />
      Quay số
    </DropdownMenuItem>
  );
}
