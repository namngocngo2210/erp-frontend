import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ProductContentForm } from "@/features/products/components/ProductContentForm";

/**
 * Route /catalog/products/:id/content — màn biên tập nội dung trang public
 * `/sp/<mã>` cho 1 sản phẩm (mô tả, thông số, hướng dẫn, FAQ, ảnh...).
 * Full-page thay vì dialog, theo mẫu `EmployeeDetailPage.tsx`: nội dung khá
 * dài (7 khối lặp + uploader ảnh), nhét vào dialog sẽ phải cuộn lồng cuộn.
 */
export default function ProductContentPage({ canEdit }: { canEdit: boolean }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const productId = Number(id);
  const validId = Number.isFinite(productId) && productId > 0;

  return (
    // KHÔNG dùng `h-full` / `overflow-y-auto` ở đây. Route này không thuộc nhóm
    // "orders-like" nên `RootLayout` bọc `<Outlet/>` trong một div thường
    // (`animate-in fade-in-0`) có chiều cao `auto`, và `<main>` mới là vùng cuộn
    // (`overflow-y-auto p-3 sm:p-4`). Đặt `h-full` = 100% của một cha cao `auto`
    // làm hộp co lại, cộng thêm cuộn lồng cuộn → nội dung bị cắt ngang chừng.
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Quay lại"
          onClick={() => navigate("/catalog/products")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Nội dung trang sản phẩm</h1>
          <p className="text-sm text-muted-foreground">
            Nội dung hiển thị trên trang public khi khách quét mã QR trên sản phẩm.
          </p>
        </div>
      </div>

      {validId ? (
        <ProductContentForm productId={productId} canEdit={canEdit} />
      ) : (
        <p className="text-sm text-destructive">Thiếu ID sản phẩm hợp lệ.</p>
      )}
    </div>
  );
}
