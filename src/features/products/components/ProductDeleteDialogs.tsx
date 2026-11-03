import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import type { ProductsPageController } from "@/features/products/hooks/useProductsPage";

/** Hai hộp xác nhận xoá: một sản phẩm và xoá hàng loạt. */
export function ProductDeleteDialogs({ ctrl }: { ctrl: ProductsPageController }) {
  const { t } = useI18n();
  const {
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleConfirmDelete,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    handleConfirmBulkDelete,
    selectedProductIds,
  } = ctrl;
  return (
    <>
      {/* Delete Product Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("products.confirm.delete.title")}</DialogTitle>
            <DialogDescription>{t("products.confirm.delete.message")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("products.confirm.bulkDelete.title")}</DialogTitle>
            <DialogDescription>
              {t(
                "products.confirm.bulkDelete.message",
                "Bạn có chắc chắn muốn xóa {count} sản phẩm đã chọn? Hành động này không thể hoàn tác.",
              ).replace("{count}", String(selectedProductIds.length))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmBulkDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
