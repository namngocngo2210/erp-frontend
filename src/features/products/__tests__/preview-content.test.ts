import { describe, expect, it } from "vitest";

import type { ProfileSectionKey } from "@/lib/api/product-profiles";

import { EMPTY_EDITABLE, SECTION_OF, buildPreviewContent } from "../preview-content";

/**
 * `buildPreviewContent` là bản soi gương của `_section()` /`_product_payload()`
 * ở backend (`apps/warranty_codes/application/services/product_page_service.py`).
 * Lệch một nhánh ở đây là màn "Xem trước" nói dối biên tập viên — tệ hơn không
 * có xem trước, vì họ sẽ tin nó. Vì vậy mỗi luật lọc của backend có đúng một
 * test tương ứng dưới đây.
 */
const FULL = {
  ...EMPTY_EDITABLE,
  short_description: "Bồn ngâm chân cao cấp",
  highlights: [{ title: "24 bi lăn", detail: "Massage huyệt đạo" }],
  specs: [{ label: "Công suất", value: "800W" }],
  audience: { suitable: ["Dân văn phòng"], caution: ["Phụ nữ mang thai"] },
  usage_steps: [{ title: "Bước 1", detail: "Đổ nước ấm" }],
  troubleshooting: [{ symptom: "Không lên nguồn", cause: "Chưa cắm", fix: "Cắm lại" }],
  faqs: [
    { question: "Bảo hành mấy tháng?", answer: "12 tháng", visible: true },
    { question: "Kịch bản tư vấn", answer: "Dạ Anh/Chị yên tâm ạ...", visible: false },
  ],
  videos: [{ label: "Hướng dẫn", url: "https://example.com/v" }],
};

const ALL_SECTIONS: ProfileSectionKey[] = [
  "diem_noi_bat",
  "thong_so",
  "doi_tuong",
  "huong_dan",
  "su_co",
  "faq",
  "video",
];

const IMAGES = [
  { id: 7, url: "/api/warranty-portal/product-images/7", alt_text: "", sort_order: 0 },
];

function build(overrides: {
  visibleSections?: ProfileSectionKey[];
  isPublished?: boolean;
  form?: typeof FULL;
}) {
  return buildPreviewContent({
    productName: "Bồn ngâm chân",
    form: overrides.form ?? FULL,
    visibleSections: new Set(overrides.visibleSections ?? ALL_SECTIONS),
    isPublished: overrides.isPublished ?? true,
    images: IMAGES,
  });
}

describe("buildPreviewContent", () => {
  it("bật đủ 7 khối và đã công khai thì trả về đủ nội dung", () => {
    const content = build({});

    expect(content.name).toBe("Bồn ngâm chân");
    expect(content.short_description).toBe("Bồn ngâm chân cao cấp");
    expect(content.images).toEqual(["/api/warranty-portal/product-images/7"]);
    expect(content.highlights).toHaveLength(1);
    expect(content.specs).toHaveLength(1);
    expect(content.audience.suitable).toEqual(["Dân văn phòng"]);
    expect(content.usage_steps).toHaveLength(1);
    expect(content.troubleshooting).toHaveLength(1);
    expect(content.videos).toHaveLength(1);
  });

  it("tắt một khối thì đúng khối đó rỗng, các khối khác giữ nguyên", () => {
    const content = build({ visibleSections: ALL_SECTIONS.filter((s) => s !== "thong_so") });

    expect(content.specs).toEqual([]);
    expect(content.highlights).toHaveLength(1);
  });

  it('khối "Đối tượng sử dụng" tắt thì trả về object rỗng, không phải mảng', () => {
    const content = build({ visibleSections: ALL_SECTIONS.filter((s) => s !== "doi_tuong") });

    expect(content.audience).toEqual({});
  });

  it("khối FAQ bật vẫn chỉ lấy những dòng được bật riêng", () => {
    const content = build({});

    expect(content.faqs).toEqual([{ question: "Bảo hành mấy tháng?", answer: "12 tháng" }]);
  });

  it("khối FAQ tắt thì bỏ hết dòng dù từng dòng đang bật", () => {
    const content = build({ visibleSections: ALL_SECTIONS.filter((s) => s !== "faq") });

    expect(content.faqs).toEqual([]);
  });

  it("chưa công khai thì rỗng sạch kể cả khi cả 7 khối đang bật", () => {
    // Khớp `_product_payload`: nhánh `if published else` xoá MỌI khối, kể cả
    // mô tả ngắn và ảnh — nhưng vẫn giữ tên sản phẩm, vì trang public vẫn in
    // `<h1>{name}</h1>` cho mã hợp lệ chưa có nội dung.
    const content = build({ isPublished: false });

    expect(content.name).toBe("Bồn ngâm chân");
    expect(content.short_description).toBe("");
    expect(content.images).toEqual([]);
    expect(content.highlights).toEqual([]);
    expect(content.specs).toEqual([]);
    expect(content.audience).toEqual({});
    expect(content.usage_steps).toEqual([]);
    expect(content.troubleshooting).toEqual([]);
    expect(content.faqs).toEqual([]);
    expect(content.videos).toEqual([]);
  });

  it("dùng tên riêng khi có, rơi về tên KiotViet khi để trống", () => {
    // Tên KiotViet là chuỗi mô tả kỹ thuật, in thành `<h1>` thì không đọc nổi.
    expect(build({ form: { ...FULL, display_name: "  Delax DX-2000  " } }).name).toBe(
      "Delax DX-2000",
    );
    expect(build({ form: { ...FULL, display_name: "   " } }).name).toBe("Bồn ngâm chân");
    expect(build({ form: { ...FULL, display_name: "" } }).name).toBe("Bồn ngâm chân");
  });

  it("tên riêng vẫn dùng khi trang đang ẩn", () => {
    // Khớp `_product_payload`: `<h1>` không nằm sau cổng `is_published`.
    const content = build({ isPublished: false, form: { ...FULL, display_name: "Delax DX-2000" } });

    expect(content.name).toBe("Delax DX-2000");
    expect(content.short_description).toBe("");
  });

  it("SECTION_OF phủ đúng 7 key backend chấp nhận, không thừa không thiếu", () => {
    // `PROFILE_SECTIONS` — backend/apps/catalog/models.py. Gửi key ngoài danh
    // sách này là ăn 400 từ `validate_visible_sections`.
    expect([...Object.values(SECTION_OF)].sort()).toEqual([...ALL_SECTIONS].sort());
  });
});
