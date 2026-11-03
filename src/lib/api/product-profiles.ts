// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 5 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

const API_BASE = "/api";

/**
 * Type khai THỦ CÔNG — KHÔNG derive từ OpenAPI (`components["schemas"][...]`
 * trong `@/api/typed`) như `lib/api/products.ts` làm cho `Product`.
 * `schema.yaml` hiện đã lệch sẵn ~444 dòng so với code thật (đã biết từ trước
 * Task 13); regen file đó trong MR này sẽ kéo theo nhiễu drift của các feature
 * khác không liên quan, khó review. Type dưới đây đối chiếu tay với
 * `ProductProfileSerializer`
 * (backend/apps/orders/transport/serializers/product_profile_serializers.py)
 * và model `ProductProfile` (backend/apps/orders/models.py) — đổi field ở BE
 * thì phải tự tay cập nhật lại đây, `tsc` không tự bắt được lệch.
 */

export type ProfileImage = {
  id: number;
  url: string;
  alt_text: string;
  sort_order: number;
};

export type ProfileHighlight = { title: string; detail: string };
export type ProfileSpec = { label: string; value: string };
export type ProfileAudience = { suitable: string[]; caution: string[] };
export type ProfileUsageStep = { title: string; detail: string };
export type ProfileTroubleshootingItem = { symptom: string; cause: string; fix: string };
export type ProfileFaq = { question: string; answer: string; visible: boolean };
export type ProfileVideo = { label: string; url: string };

// Khớp `PROFILE_SECTIONS` ở backend/apps/orders/models.py. `visible_sections`
// bị BE validate đúng danh sách này (ProductProfileSerializer.validate_visible_sections)
// — gửi key lạ là ăn 400.
export type ProfileSectionKey =
  | "diem_noi_bat"
  | "thong_so"
  | "doi_tuong"
  | "huong_dan"
  | "su_co"
  | "faq"
  | "video";

export type ProductProfileData = {
  /**
   * Tên hiển thị trên trang public. Rỗng = dùng `product_name` (tên KiotViet).
   * Cố tình KHÔNG sửa `Product.name`: sync KiotViet ghi đè tên đó mỗi lần lệch,
   * và tên đó còn hiện trong đơn hàng/báo cáo.
   */
  display_name: string;
  short_description: string;
  highlights: ProfileHighlight[];
  specs: ProfileSpec[];
  audience: ProfileAudience;
  usage_steps: ProfileUsageStep[];
  troubleshooting: ProfileTroubleshootingItem[];
  faqs: ProfileFaq[];
  videos: ProfileVideo[];
  visible_sections: ProfileSectionKey[];
  is_published: boolean;
  // read_only ở BE (ProductProfileSerializer.Meta.read_only_fields) — luôn có
  // mặt trong response nhưng không gửi lại trong payload PUT.
  images: ProfileImage[];
  updated_at: string | null;
  /** Tên sản phẩm (`source="product.name"`) — màn Xem trước in nó thành `<h1>`. */
  product_name: string;
};

export type ProductProfileUpdate = Omit<
  ProductProfileData,
  "images" | "updated_at" | "product_name"
>;

// Giới hạn phía BE (ProductProfileService / test_product_profile_api.py) —
// khai lại ở đây để UI chặn sớm thay vì để user ăn lỗi 400 mới biết.
export const MAX_PROFILE_IMAGES = 8;
export const MAX_PROFILE_IMAGE_SIZE_MB = 5;

function profileUrl(productId: number): string {
  return `${API_BASE}/orders/products/${productId}/profile`;
}

export async function getProductProfile(productId: number): Promise<ProductProfileData> {
  return fetchJson(profileUrl(productId));
}

export async function saveProductProfile(
  productId: number,
  data: ProductProfileUpdate,
): Promise<ProductProfileData> {
  return fetchJson(profileUrl(productId), {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function uploadProductProfileImage(
  productId: number,
  file: File,
): Promise<ProfileImage> {
  const form = new FormData();
  form.append("file", file);
  // FormData: KHÔNG set Content-Type thủ công — trình duyệt tự thêm boundary.
  // `fetchJson` đã tự bỏ qua header này khi `body instanceof FormData`.
  return fetchJson(`${profileUrl(productId)}/images`, {
    method: "POST",
    body: form,
  });
}

export async function deleteProductProfileImage(productId: number, imageId: number): Promise<void> {
  await fetchJson(`${profileUrl(productId)}/images/${imageId}`, { method: "DELETE" });
}

export async function reorderProductProfileImages(
  productId: number,
  imageIds: number[],
): Promise<ProductProfileData> {
  return fetchJson(`${profileUrl(productId)}/images/order`, {
    method: "PUT",
    body: JSON.stringify({ image_ids: imageIds }),
  });
}
