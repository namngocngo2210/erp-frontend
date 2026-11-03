import { DataTableShell } from "@/components/ui/data-table-shell";
import { ProductDeleteDialogs } from "@/features/products/components/ProductDeleteDialogs";
import { ProductFormDialog } from "@/features/products/components/ProductFormDialog";
import { ProductsTable } from "@/features/products/components/ProductsTable";
import { ProductsToolbar } from "@/features/products/components/ProductsToolbar";
import { useProductsPage } from "@/features/products/hooks/useProductsPage";

interface ProductsPageProps {
  canManageUsers?: boolean;
}

/**
 * Trang Sản phẩm — chỉ ghép khối (audit 2026-09-23 P1-4). Toàn bộ state/handler
 * ở `useProductsPage`; toolbar, bảng, form tạo/sửa, hộp xoá là component riêng.
 */
function ProductsPage({ canManageUsers = false }: ProductsPageProps) {
  const ctrl = useProductsPage();
  return (
    <>
      <DataTableShell
        toolbar={<ProductsToolbar ctrl={ctrl} canManageUsers={canManageUsers} />}
        loading={ctrl.loading && ctrl.entries.length === 0}
      >
        <ProductsTable ctrl={ctrl} />
      </DataTableShell>
      <ProductFormDialog ctrl={ctrl} mode="create" />
      <ProductFormDialog ctrl={ctrl} mode="edit" />
      <ProductDeleteDialogs ctrl={ctrl} />
    </>
  );
}

export default ProductsPage;
