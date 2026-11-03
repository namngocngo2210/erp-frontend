import { useState } from "react";
import { PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";
import { LEG_LABEL, type BestLeg } from "./best-order-form";
import { BestCreateOrderDialog } from "./BestCreateOrderDialog";

/**
 * Nút "Tạo đơn Best" cạnh ô mã vận đơn — chỉ render khi ô đang TRỐNG (đã có mã
 * thì tạo thêm vận đơn cho chặng đó là vô nghĩa). Mở dialog tạo đơn theo chặng.
 */
export function BestCreateOrderButton({
  journey,
  leg,
  currentCode,
  onCreated,
}: {
  journey: WarrantyJourney;
  leg: BestLeg;
  currentCode: string;
  /** Mã Best đã lưu xuống server — form hành trình đổ vào bản nháp. */
  onCreated?: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (currentCode.trim() !== "") return null;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`Tạo đơn Best (${LEG_LABEL[leg]})`}
        title={`Tạo đơn Best (${LEG_LABEL[leg]})`}
        onClick={() => setOpen(true)}
      >
        <PackagePlus className="h-4 w-4" />
      </Button>
      {open && (
        <BestCreateOrderDialog
          journey={journey}
          leg={leg}
          open={open}
          onOpenChange={setOpen}
          onCreated={onCreated}
        />
      )}
    </>
  );
}
