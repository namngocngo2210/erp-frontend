import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type ProductProfileData,
  type ProductProfileUpdate,
  deleteProductProfileImage,
  getProductProfile,
  reorderProductProfileImages,
  saveProductProfile,
  uploadProductProfileImage,
} from "@/lib/api/product-profiles";

export const productProfileKeys = {
  detail: (productId: number) => ["product-profile", productId] as const,
};

/** GET /api/orders/products/{id}/profile — nội dung trang public của 1 sản phẩm. */
export function useProductProfile(productId: number) {
  return useQuery({
    queryKey: productProfileKeys.detail(productId),
    queryFn: () => getProductProfile(productId),
    enabled: Number.isFinite(productId) && productId > 0,
  });
}

/**
 * PUT /api/orders/products/{id}/profile — lưu toàn bộ nội dung text (không gồm
 * ảnh, ảnh đi qua endpoint riêng ở dưới). Vá thẳng response mới nhất vào cache
 * thay vì chỉ invalidate: response PUT đã là bản mới nhất, refetch thêm 1 lần
 * là dư round-trip.
 */
export function useSaveProductProfile(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductProfileUpdate) => saveProductProfile(productId, payload),
    onSuccess: (data: ProductProfileData) => {
      qc.setQueryData(productProfileKeys.detail(productId), data);
    },
  });
}

/** POST /api/orders/products/{id}/profile/images — upload 1 ảnh (multipart). */
export function useUploadProductProfileImage(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadProductProfileImage(productId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productProfileKeys.detail(productId) });
    },
  });
}

/** DELETE /api/orders/products/{id}/profile/images/{imageId}. */
export function useDeleteProductProfileImage(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: number) => deleteProductProfileImage(productId, imageId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productProfileKeys.detail(productId) });
    },
  });
}

/** PUT /api/orders/products/{id}/profile/images/order — sắp xếp lại thứ tự ảnh. */
export function useReorderProductProfileImages(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: number[]) => reorderProductProfileImages(productId, imageIds),
    onSuccess: (data: ProductProfileData) => {
      qc.setQueryData(productProfileKeys.detail(productId), data);
    },
  });
}
