import { Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import type { ProductsPageController } from "@/features/products/hooks/useProductsPage";

/** Ô tìm kiếm + nút xoá đã chọn / tạo mới (nút quản trị chỉ hiện khi có quyền). */
export function ProductsToolbar({
  ctrl,
  canManageUsers,
}: {
  ctrl: ProductsPageController;
  canManageUsers: boolean;
}) {
  const { t } = useI18n();
  const { searchTerm, setSearchTerm, selectedProductIds, handleBulkDelete, setCreateDialogOpen } =
    ctrl;
  return (
    <div className="w-full flex flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative flex-1 md:max-w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("products.search.placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      {canManageUsers && (
        <Button
          variant="destructive"
          size="sm"
          className="inline-flex items-center gap-1.5"
          onClick={handleBulkDelete}
          disabled={selectedProductIds.length === 0}
          aria-label={t("common.deleteSelected", "Xóa đã chọn ({count})").replace(
            "{count}",
            String(selectedProductIds.length),
          )}
          title={t("common.deleteSelected", "Xóa đã chọn ({count})").replace(
            "{count}",
            String(selectedProductIds.length),
          )}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">
            {t("common.deleteSelected", "Xóa đã chọn ({count})").replace(
              "{count}",
              String(selectedProductIds.length),
            )}
          </span>
        </Button>
      )}
      {canManageUsers && (
        <Button
          className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setCreateDialogOpen(true)}
        >
          {t("products.management.create")}
        </Button>
      )}
    </div>
  );
}
