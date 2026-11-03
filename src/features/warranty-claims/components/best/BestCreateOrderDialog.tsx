import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";

import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";
import { LEG_LABEL, type BestLeg } from "./best-order-form";
import { BestOrderFormBody } from "./BestOrderFormBody";
import { useBestOrderForm } from "./useBestOrderForm";

type Props = {
  journey: WarrantyJourney;
  leg: BestLeg;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mã Best đã lưu xuống server — để form hành trình đổ vào bản nháp. */
  onCreated?: (code: string) => void;
};

/**
 * Dialog tạo vận đơn Best cho 1 chặng của hành trình BH. Thành công → PATCH
 * ngay mã Best (`code_best`) vào field mã tương ứng (không đợi bấm Lưu hành
 * trình — draft các field khác giữ nguyên, cùng pattern lưu tên ở JourneyCard).
 *
 * Dialog CHỈ đóng sau khi PATCH mã xong: nút cha unmount dialog theo `open`,
 * đóng sớm thì mutation lưu mã chết theo component và mã Best mất trắng dù
 * vận đơn đã tạo thật phía Best.
 *
 * Chỉ còn là VỎ — state + nghiệp vụ nằm ở `useBestOrderForm`, thân form ở
 * `BestOrderFormBody`, dùng chung với khối §7 bung inline.
 */
export function BestCreateOrderDialog({ journey, leg, open, onOpenChange, onCreated }: Props) {
  const best = useBestOrderForm({
    journey,
    leg,
    active: open,
    onCreated: (code) => {
      onCreated?.(code);
      // Chỉ đóng SAU khi PATCH xong: nút cha unmount dialog theo `open`, đóng
      // sớm thì mutation lưu mã chết theo component và mã Best mất trắng.
      onOpenChange(false);
    },
  });

  if (!best.form) return <Dialog open={open} onOpenChange={onOpenChange} />;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={`Tạo đơn Best — ${LEG_LABEL[leg]}`}
        description={`Hành trình #${journey.seq}. Tạo vận đơn thật phía Best; lỗi từ Best hiển thị nguyên văn.`}
        onSubmit={(e) => {
          e.preventDefault();
          best.submit();
        }}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={best.isPending}>
              {best.isPending ? "Đang tạo..." : "Tạo đơn"}
            </Button>
          </>
        }
      >
        <BestOrderFormBody
          form={best.form}
          setForm={best.setForm}
          accounts={best.accounts}
          accountId={best.accountId}
          setAccountId={best.setAccountId}
          customReturn={best.customReturn}
          setCustomReturn={best.setCustomReturn}
        />
      </FormDialogShell>
    </Dialog>
  );
}
