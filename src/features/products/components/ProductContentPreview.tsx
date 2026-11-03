import { EyeOff, Smartphone } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductPageView } from "@/features/warranty-portal/components/product/ProductPageView";
import type { ProductContent, ProductPageResponse } from "@/features/warranty-portal/product-types";

/**
 * Dữ liệu MẪU cho ba khối không thuộc cấu hình của màn này: dấu xác thực + số
 * lượt quét (backend đếm theo mã thật), khối bảo hành (theo mã thật), và chân
 * trang công ty (biến môi trường `PORTAL_COMPANY_*` phía server).
 *
 * Cố ý là dữ liệu bịa và có nhãn ghi rõ: dựng số thật ở đây thì biên tập viên
 * sẽ tưởng mình đang xem một mã cụ thể, và sẽ báo sai khi số không khớp.
 */
const SAMPLE = {
  code: "MAU123DEMO",
  serial: "DX-000000",
  scan: { count: 1, first_at: null },
  company: {
    name: "(Tên công ty lấy từ cấu hình hệ thống)",
    address: "(Địa chỉ lấy từ cấu hình hệ thống)",
    tax_code: "(Mã số thuế)",
    hotline: "(Hotline)",
    zalo_url: "",
    facebook_url: "",
  },
} as const;

export function ProductContentPreview({
  open,
  onOpenChange,
  content,
  isPublished,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  content: ProductContent;
  isPublished: boolean;
}) {
  const data: ProductPageResponse = {
    code: SAMPLE.code,
    serial: SAMPLE.serial,
    authentic: true,
    scan: { count: SAMPLE.scan.count, first_at: SAMPLE.scan.first_at },
    product: content,
    // `null` = mã chưa kích hoạt → khối hiện ra dưới dạng form đăng ký bảo hành,
    // đúng trạng thái khách gặp khi vừa cào tem. Form bị `inert` (xem
    // `canActivate={false}`) nên không thể submit từ màn xem trước.
    warranty: null,
    company: { ...SAMPLE.company },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Hẹp hơn `panel` mặc định (max-w-3xl): nội dung bên trong là khung điện
          thoại rộng `max-w-md`, để hộp thoại rộng gấp đôi chỉ tạo ra hai dải xám
          trống hai bên. */}
      <DialogContent size="panel" className="sm:max-w-xl" aria-label="Xem trước trang sản phẩm">
        <DialogHeader className="border-b border-border px-4 py-3 pr-12">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-4 text-primary" aria-hidden />
            Xem trước trang sản phẩm
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Dựng từ nội dung đang chỉnh (chưa cần bấm Lưu), bằng đúng giao diện của trang
            /sp/&lt;mã&gt;. Không cần mã bảo hành và không cộng lượt quét cho mã nào.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4">
          {!isPublished && (
            <div className="mx-auto mb-4 flex max-w-md items-start gap-2 rounded-lg border border-action-warning/30 bg-action-warning/10 px-3 py-2 text-xs text-action-warning">
              <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <p>
                Trang đang <strong>ẩn</strong> (công tắc "Đang ẩn" ở cuối màn). Khách quét mã sẽ
                thấy đúng như dưới đây — chỉ còn tên sản phẩm, mọi khối nội dung bị bỏ qua kể cả khi
                đang bật.
              </p>
            </div>
          )}

          {/* Khung hẹp mô phỏng điện thoại: khách quét QR gần như luôn xem trên
              điện thoại, xem trước ở bề rộng desktop sẽ cho cảm giác sai về độ
              dài trang và chỗ ngắt dòng. */}
          <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="px-4 pb-10">
              <ProductPageView data={data} canActivate={false} />
            </div>
          </div>

          <p className="mx-auto mt-3 max-w-md text-center text-xs text-muted-foreground">
            Dấu xác thực, số lượt quét, khối bảo hành và chân trang công ty là dữ liệu mẫu — chúng
            không lấy từ màn này mà từ mã bảo hành thật và cấu hình hệ thống.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
