import { Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MAX_PROFILE_IMAGES,
  MAX_PROFILE_IMAGE_SIZE_MB,
  type ProfileImage,
} from "@/lib/api/product-profiles";

import {
  useDeleteProductProfileImage,
  useReorderProductProfileImages,
  useUploadProductProfileImage,
} from "../profile-queries";

/**
 * Upload/xoá/sắp xếp ảnh sản phẩm.
 *
 * Ảnh đi qua 3 endpoint multipart/JSON riêng (`.../profile/images`,
 * `.../images/{id}`, `.../images/order`) chứ không nằm trong payload PUT của
 * form nội dung: ảnh là dữ liệu nhị phân lớn, gộp vào JSON sẽ phải base64
 * (phình 33%) và làm mỗi lần lưu text cũng đẩy lại toàn bộ ảnh.
 *
 * Gọi qua hook react-query (`profile-queries.ts`) dùng `fetchJson` như mọi
 * màn CRM khác — KHÔNG gọi `fetch` trần. Mẫu `fetch` trần trong plan gốc là
 * của portal public (`warranty-portal/portal-api.ts`), nơi không có route
 * refresh token trên domain đó nên không dùng được `fetchJson`; màn này có
 * đăng nhập nên phải đi qua client chung.
 *
 * Giới hạn 8 ảnh / 5MB mỗi ảnh do BE enforce (ProductProfileService) — hiện
 * rõ ở UI (đếm ảnh, disable nút khi đầy, thông báo lỗi trả về nguyên văn từ
 * BE) thay vì để user chỉ biết giới hạn khi dính 400.
 */
export function ProductImageUploader({
  productId,
  images,
  disabled = false,
}: {
  productId: number;
  images: ProfileImage[];
  /** `products:view`-only: xem ảnh được, khoá upload/xoá/sắp xếp (BE cũng chặn
   * ở cả 3 endpoint ảnh — `require_permission("products:edit")`). */
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const uploadMutation = useUploadProductProfileImage(productId);
  const deleteMutation = useDeleteProductProfileImage(productId);
  const reorderMutation = useReorderProductProfileImages(productId);

  const busy =
    disabled || uploadMutation.isPending || deleteMutation.isPending || reorderMutation.isPending;

  async function handleUpload(file: File) {
    setError("");
    try {
      await uploadMutation.mutateAsync(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được ảnh lên.");
    }
  }

  async function handleRemove(imageId: number) {
    setError("");
    try {
      await deleteMutation.mutateAsync(imageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được ảnh.");
    }
  }

  async function handleMove(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    setError("");
    try {
      await reorderMutation.mutateAsync(next.map((img) => img.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không sắp xếp lại được ảnh.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Ảnh sản phẩm ({images.length}/{MAX_PROFILE_IMAGES})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ảnh đầu tiên là ảnh đại diện. JPG/PNG/WebP, tối đa {MAX_PROFILE_IMAGE_SIZE_MB}MB mỗi ảnh,
          tối đa {MAX_PROFILE_IMAGES} ảnh.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {images.map((image, index) => (
            <div key={image.id} className="w-24">
              <img
                src={image.url}
                alt={image.alt_text}
                className="size-24 rounded-lg border border-border object-cover"
              />
              <div className="mt-1 flex items-center justify-between">
                <button
                  type="button"
                  aria-label={`Chuyển ảnh ${index + 1} lên trước`}
                  disabled={busy || index === 0}
                  onClick={() => void handleMove(index, -1)}
                  className="px-1 text-xs text-muted-foreground disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label={`Xoá ảnh ${index + 1}`}
                  disabled={busy}
                  onClick={() => void handleRemove(image.id)}
                  className="px-1 disabled:opacity-30"
                >
                  <Trash2 className="size-3.5 text-destructive" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Chuyển ảnh ${index + 1} ra sau`}
                  disabled={busy || index === images.length - 1}
                  onClick={() => void handleMove(index, 1)}
                  className="px-1 text-xs text-muted-foreground disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>

        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={busy || images.length >= MAX_PROFILE_IMAGES}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-1 size-4" aria-hidden />
          {uploadMutation.isPending ? "Đang tải lên..." : "Thêm ảnh"}
        </Button>
      </CardContent>
    </Card>
  );
}
