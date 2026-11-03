import type { ProductContent } from "@/features/warranty-portal/product-types";
import type {
  ProfileImage,
  ProfileSectionKey,
  ProductProfileUpdate,
} from "@/lib/api/product-profiles";

/**
 * Map field cục bộ của form → key section mà BE chấp nhận trong `visible_sections`
 * (`PROFILE_SECTIONS` — backend/apps/catalog/models.py). Gửi key ngoài danh sách
 * này là ăn 400 từ `ProductProfileSerializer.validate_visible_sections`.
 */
export const SECTION_OF = {
  highlights: "diem_noi_bat",
  specs: "thong_so",
  audience: "doi_tuong",
  usage_steps: "huong_dan",
  troubleshooting: "su_co",
  faqs: "faq",
  videos: "video",
} as const satisfies Record<string, ProfileSectionKey>;

/** Phần nội dung form tự quản; cờ hiển thị và cờ công khai đi state riêng. */
export type EditableFields = Omit<ProductProfileUpdate, "visible_sections" | "is_published">;

export const EMPTY_EDITABLE: EditableFields = {
  display_name: "",
  short_description: "",
  highlights: [],
  specs: [],
  audience: { suitable: [], caution: [] },
  usage_steps: [],
  troubleshooting: [],
  faqs: [],
  videos: [],
};

export type PreviewInput = {
  /** Tên KiotViet của sản phẩm — chỉ dùng khi `form.display_name` để trống. */
  productName: string;
  form: EditableFields;
  visibleSections: ReadonlySet<ProfileSectionKey>;
  isPublished: boolean;
  images: ProfileImage[];
};

/**
 * Dựng payload mà trang public `/sp/<mã>` SẼ nhận, từ nội dung đang gõ dở trong
 * CRM — không cần lưu, không cần mã bảo hành thật, không cộng lượt quét nào.
 *
 * Đây là bản soi gương của `_product_payload()` / `_section()` ở
 * `backend/apps/warranty_codes/application/services/product_page_service.py`.
 * Ba luật lọc phải khớp từng chữ, sửa một bên thì sửa cả hai:
 *   1. `is_published` tắt → MỌI khối rỗng (kể cả mô tả ngắn và ảnh), chỉ còn tên
 *      sản phẩm — vì trang public vẫn in `<h1>` cho mã hợp lệ chưa có nội dung.
 *   2. Khối không nằm trong `visible_sections` → trả container RỖNG CÙNG KIỂU
 *      (`[]` cho danh sách, `{}` cho `audience`), không phải `null`/`undefined`.
 *   3. FAQ lọc HAI tầng: cả khối, rồi tới cờ `visible` của từng dòng.
 *
 * Không tái hiện các khối ngoài phạm vi cấu hình này (xác thực, bảo hành, chân
 * trang công ty) — chúng do backend/env quyết định, `ProductContentPreview` tự
 * gắn dữ liệu mẫu và dán nhãn rõ.
 */
export function buildPreviewContent({
  productName,
  form,
  visibleSections,
  isPublished,
  images,
}: PreviewInput): ProductContent {
  const on = (key: keyof typeof SECTION_OF) => isPublished && visibleSections.has(SECTION_OF[key]);
  const list = <T>(key: keyof typeof SECTION_OF, items: T[]): T[] => (on(key) ? items : []);

  return {
    sku: "",
    // Khớp `_product_payload`: tên riêng KHÔNG gác sau `is_published` — trang
    // ẩn vẫn in `<h1>`, và đã đặt tên đọc được thì đừng quay về tên KiotViet.
    name: form.display_name.trim() || productName,
    short_description: isPublished ? form.short_description : "",
    images: isPublished ? images.map((image) => image.url) : [],
    highlights: list("highlights", form.highlights),
    specs: list("specs", form.specs),
    audience: on("audience") ? form.audience : {},
    usage_steps: list("usage_steps", form.usage_steps),
    troubleshooting: list("troubleshooting", form.troubleshooting),
    faqs: list("faqs", form.faqs)
      .filter((faq) => faq.visible)
      .map(({ question, answer }) => ({ question, answer })),
    videos: list("videos", form.videos),
  };
}
