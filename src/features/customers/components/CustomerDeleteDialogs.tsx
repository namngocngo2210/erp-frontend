import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

interface CustomerDeleteDialogsProps {
  deleteDialogOpen: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  bulkDeleteDialogOpen: boolean;
  onBulkDeleteDialogOpenChange: (open: boolean) => void;
  onConfirmBulkDelete: () => void;
  selectedCount: number;
}

export function CustomerDeleteDialogs({
  deleteDialogOpen,
  onDeleteDialogOpenChange,
  onConfirmDelete,
  bulkDeleteDialogOpen,
  onBulkDeleteDialogOpenChange,
  onConfirmBulkDelete,
  selectedCount,
}: CustomerDeleteDialogsProps) {
  const { t } = useI18n();
  return (
    <>
      <Dialog open={deleteDialogOpen} onOpenChange={onDeleteDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("customers.confirm.deleteTitle", "Xác nhận xóa")}</DialogTitle>
            <DialogDescription>
              {t(
                "customers.confirm.deleteDescription",
                "Bạn có chắc muốn xóa khách hàng này? Hành động này không thể hoàn tác.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onDeleteDialogOpenChange(false)}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete}>
              {t("common.delete", "Xóa")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteDialogOpen} onOpenChange={onBulkDeleteDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("customers.confirm.bulkDeleteTitle", "Xác nhận xóa hàng loạt")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "customers.confirm.bulkDeleteDescription",
                "Bạn có chắc muốn xóa {count} khách hàng đã chọn? Hành động này không thể hoàn tác.",
              ).replace("{count}", String(selectedCount))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onBulkDeleteDialogOpenChange(false)}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button variant="destructive" onClick={onConfirmBulkDelete}>
              {t("common.delete", "Xóa")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
