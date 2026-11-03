import { Eye, Info, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type ProfileAudience,
  type ProfileFaq,
  type ProfileSectionKey,
} from "@/lib/api/product-profiles";

import {
  type EditableFields,
  EMPTY_EDITABLE,
  SECTION_OF,
  buildPreviewContent,
} from "../preview-content";
import { useProductProfile, useSaveProductProfile } from "../profile-queries";
import { ProductContentPreview } from "./ProductContentPreview";
import { ProductImageUploader } from "./ProductImageUploader";
import { RepeatableBlock } from "./RepeatableBlock";

export function ProductContentForm({
  productId,
  canEdit = true,
}: {
  productId: number;
  /**
   * `products:edit` — mặc định `true` để không phá vỡ hành vi/test cũ khi
   * component được dùng độc lập. `ProductContentPage` (route thật) LUÔN
   * truyền tường minh giá trị tính từ `usePermission()`; `products:view`-only
   * chỉ đọc được, không lưu được — BE đã có test 403 riêng cho PUT profile
   * và cả 3 endpoint ảnh (`test_product_profile_api.py`), FE phải khớp chứ
   * không được để user gõ cả trang rồi ăn 403 lúc bấm Lưu.
   */
  canEdit?: boolean;
}) {
  const profileQuery = useProductProfile(productId);
  const saveMutation = useSaveProductProfile(productId);

  const [form, setForm] = useState<EditableFields>(EMPTY_EDITABLE);
  const [visibleSections, setVisibleSections] = useState<Set<ProfileSectionKey>>(new Set());
  const [isPublished, setIsPublished] = useState(false);
  // Nạp state cục bộ khi GET trả dữ liệu, đúng MỘT LẦN cho mỗi `productId` —
  // theo dõi bằng "đã hydrate CHO id nào" (không phải boolean trơn) để đổi
  // `productId` (đổi sản phẩm mà không unmount component, vd điều hướng giữa
  // 2 trang nội dung) tự nạp lại đúng dữ liệu mới thay vì giữ dữ liệu sản
  // phẩm cũ rồi lỡ tay lưu đè lên sản phẩm mới — sau đó form tự quản state
  // riêng, không sync lại theo query mỗi lần React Query refetch nền (tránh
  // ghi đè nội dung user đang gõ dở).
  const [hydratedFor, setHydratedFor] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  /** Tên KiotViet — dùng làm placeholder và làm tên thật khi bỏ trống ô tên riêng. */
  const originalName = profileQuery.data?.product_name ?? "";

  // Đổi sản phẩm: xoá sạch state cục bộ NGAY (không đợi query mới về) — tránh
  // 1 khung hình hiển thị nội dung sản phẩm CŨ dưới nhãn sản phẩm MỚI.
  useEffect(() => {
    setForm(EMPTY_EDITABLE);
    setVisibleSections(new Set());
    setIsPublished(false);
    setHydratedFor(null);
  }, [productId]);

  useEffect(() => {
    const data = profileQuery.data;
    if (!data || hydratedFor === productId) return;
    setForm({
      // `?? ""` không thừa: trong lúc deploy, FE mới có thể chạy trước khi BE
      // có field này — `undefined` lọt vào state là mọi chỗ gọi `.trim()` nổ.
      display_name: data.display_name ?? "",
      short_description: data.short_description,
      highlights: data.highlights,
      specs: data.specs,
      audience: data.audience,
      usage_steps: data.usage_steps,
      troubleshooting: data.troubleshooting,
      faqs: data.faqs,
      videos: data.videos,
    });
    setVisibleSections(new Set(data.visible_sections));
    setIsPublished(data.is_published);
    setHydratedFor(productId);
  }, [profileQuery.data, productId, hydratedFor]);

  const toggleSection = (formKey: keyof typeof SECTION_OF, on: boolean) => {
    const sectionKey = SECTION_OF[formKey];
    setVisibleSections((prev) => {
      const next = new Set(prev);
      if (on) next.add(sectionKey);
      else next.delete(sectionKey);
      return next;
    });
  };

  const handleSave = async () => {
    // Phòng thủ thêm ngoài việc disable nút Lưu: user chỉ có `products:view`
    // không được gửi PUT dù bằng cách nào (vd bấm Enter trong 1 ô input).
    if (!canEdit) return;
    try {
      await saveMutation.mutateAsync({
        ...form,
        visible_sections: Array.from(visibleSections),
        is_published: isPublished,
      });
      toast.success("Đã lưu nội dung trang sản phẩm.");
    } catch (error) {
      console.error("Error saving product profile:", error);
      toast.error(error instanceof Error ? error.message : "Không lưu được nội dung.");
    }
  };

  if (profileQuery.isLoading && hydratedFor !== productId) {
    return (
      <div className="flex justify-center py-12">
        <LogoSpinner label="Đang tải..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="rounded-lg border border-action-warning/30 bg-action-warning/10 px-3 py-2 text-sm text-action-warning">
          Bạn chỉ có quyền xem nội dung này (products:view) — cần quyền chỉnh sửa sản phẩm để lưu
          thay đổi hoặc thao tác với ảnh.
        </div>
      )}

      {/* Nút Xem trước ở ĐẦU màn, không nằm cạnh nút Lưu ở đáy: trang này dài
          (uploader ảnh + 7 khối lặp), biên tập viên muốn soi lại kết quả sau mỗi
          lần sửa mà phải cuộn xuống tận cuối mới bấm được thì sẽ không bấm. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-2xl items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p>
            Xem trước dựng lại trang /sp/&lt;mã&gt; ngay tại đây từ nội dung đang chỉnh, chưa cần
            bấm Lưu. Không dùng mã bảo hành thật nên không cộng lượt quét cho mã nào (khách hàng
            nhìn thấy số lượt quét trên trang).
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
          <Eye className="mr-1 size-4" aria-hidden />
          Xem trước
        </Button>
      </div>

      {/* Tên + mô tả ngắn đứng chung một thẻ ở ĐẦU trang: đó là hai dòng đầu
          tiên khách đọc sau khi quét mã, biên tập chúng cạnh nhau mới thấy được
          cả cặp có ăn nhập không. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tên và mô tả ngắn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label
              htmlFor="profile-display-name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Tên hiển thị trên trang public
            </label>
            <Input
              id="profile-display-name"
              maxLength={255}
              placeholder={originalName || "Tên hiển thị thay cho tên trong kho..."}
              value={form.display_name}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, display_name: event.target.value }))
              }
            />
            {/* Tên trong kho do KiotViet làm chủ và thường là cả chuỗi mô tả kỹ
                thuật; sửa thẳng nó sẽ bị sync ghi đè và đổi luôn tên trong đơn
                hàng/báo cáo — nên phải nói rõ ở đây là hai thứ khác nhau. */}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Chỉ đổi tiêu đề trang khách quét mã, không đổi tên sản phẩm trong kho, đơn hàng hay
              KiotViet. Để trống thì dùng tên trong kho:{" "}
              <span className="text-foreground">{originalName || "(chưa có)"}</span>
            </p>
          </div>

          <div>
            <label
              htmlFor="profile-short-description"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Mô tả ngắn
            </label>
            <Textarea
              id="profile-short-description"
              rows={3}
              maxLength={500}
              placeholder="Mô tả ngắn hiển thị ngay đầu trang sản phẩm..."
              value={form.short_description}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, short_description: event.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <ProductImageUploader
        productId={productId}
        images={profileQuery.data?.images ?? []}
        disabled={!canEdit}
      />

      <RepeatableBlock
        title="Điểm nổi bật"
        addLabel="Thêm điểm nổi bật"
        items={form.highlights}
        onChange={(next) => setForm((prev) => ({ ...prev, highlights: next }))}
        makeEmpty={() => ({ title: "", detail: "" })}
        fields={[
          { key: "title", placeholder: "Tiêu đề" },
          { key: "detail", placeholder: "Chi tiết", multiline: true },
        ]}
        visible={visibleSections.has("diem_noi_bat")}
        onVisibleChange={(on) => toggleSection("highlights", on)}
        disabled={!canEdit}
      />

      <RepeatableBlock
        title="Thông số kỹ thuật"
        addLabel="Thêm thông số"
        items={form.specs}
        onChange={(next) => setForm((prev) => ({ ...prev, specs: next }))}
        makeEmpty={() => ({ label: "", value: "" })}
        fields={[
          { key: "label", placeholder: "Nhãn" },
          { key: "value", placeholder: "Giá trị" },
        ]}
        visible={visibleSections.has("thong_so")}
        onVisibleChange={(on) => toggleSection("specs", on)}
        disabled={!canEdit}
      />

      <RepeatableBlock
        title="Hướng dẫn sử dụng"
        addLabel="Thêm bước"
        items={form.usage_steps}
        onChange={(next) => setForm((prev) => ({ ...prev, usage_steps: next }))}
        makeEmpty={() => ({ title: "", detail: "" })}
        fields={[
          { key: "title", placeholder: "Bước" },
          { key: "detail", placeholder: "Nội dung", multiline: true },
        ]}
        visible={visibleSections.has("huong_dan")}
        onVisibleChange={(on) => toggleSection("usage_steps", on)}
        disabled={!canEdit}
      />

      <RepeatableBlock
        title="Xử lý sự cố"
        addLabel="Thêm sự cố"
        items={form.troubleshooting}
        onChange={(next) => setForm((prev) => ({ ...prev, troubleshooting: next }))}
        makeEmpty={() => ({ symptom: "", cause: "", fix: "" })}
        fields={[
          { key: "symptom", placeholder: "Hiện tượng" },
          { key: "cause", placeholder: "Nguyên nhân" },
          { key: "fix", placeholder: "Cách xử lý" },
        ]}
        visible={visibleSections.has("su_co")}
        onVisibleChange={(on) => toggleSection("troubleshooting", on)}
        disabled={!canEdit}
      />

      <FaqBlock
        items={form.faqs}
        onChange={(next) => setForm((prev) => ({ ...prev, faqs: next }))}
        visible={visibleSections.has("faq")}
        onVisibleChange={(on) => toggleSection("faqs", on)}
        disabled={!canEdit}
      />

      <RepeatableBlock
        title="Video"
        addLabel="Thêm video"
        items={form.videos}
        onChange={(next) => setForm((prev) => ({ ...prev, videos: next }))}
        makeEmpty={() => ({ label: "", url: "" })}
        fields={[
          { key: "label", placeholder: "Nhãn" },
          { key: "url", placeholder: "URL (http:// hoặc https://)" },
        ]}
        visible={visibleSections.has("video")}
        onVisibleChange={(on) => toggleSection("videos", on)}
        disabled={!canEdit}
      />

      <AudienceBlock
        audience={form.audience}
        onChange={(next) => setForm((prev) => ({ ...prev, audience: next }))}
        visible={visibleSections.has("doi_tuong")}
        onVisibleChange={(on) => toggleSection("audience", on)}
        disabled={!canEdit}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={isPublished}
              onCheckedChange={setIsPublished}
              aria-label="Công khai trang sản phẩm"
              disabled={!canEdit}
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                {isPublished ? "Đang công khai" : "Đang ẩn"}
              </p>
              <p className="text-xs text-muted-foreground">
                Tắt để ẩn toàn bộ trang public, kể cả khi các khối bên trên đang bật.
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end border-t border-border pt-4">
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductContentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        isPublished={isPublished}
        content={buildPreviewContent({
          productName: originalName,
          form,
          visibleSections,
          isPublished,
          images: profileQuery.data?.images ?? [],
        })}
      />
    </div>
  );
}

function StringListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  itemLabel,
  disabled = false,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
  itemLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {items.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            className="flex-1"
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            onChange={(event) =>
              onChange(items.map((v, i) => (i === index ? event.target.value : v)))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Xoá ${itemLabel} ${index + 1}`}
            disabled={disabled}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="mr-1 size-4" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}

/**
 * Khối "Đối tượng sử dụng" — 2 danh sách chuỗi ĐỘC LẬP, không phải danh sách
 * object nhiều field nên không dùng `RepeatableBlock`.
 *
 * `caution` chứa chống chỉ định y tế (mang thai, máy trợ tim, vết thương hở...)
 * — cố tình tách khung màu cảnh báo riêng biệt với `suitable` để không ai lỡ
 * dán nhầm nội dung giữa hai danh sách.
 */
function AudienceBlock({
  audience,
  onChange,
  visible,
  onVisibleChange,
  disabled = false,
}: {
  audience: ProfileAudience;
  onChange: (next: ProfileAudience) => void;
  visible: boolean;
  onVisibleChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Đối tượng sử dụng</CardTitle>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={visible}
            onCheckedChange={onVisibleChange}
            aria-label="Hiện khối Đối tượng sử dụng"
            disabled={disabled}
          />
          Hiện trên trang
        </label>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Phù hợp với</p>
          <StringListEditor
            items={audience.suitable}
            onChange={(next) => onChange({ ...audience, suitable: next })}
            placeholder="Vd: Người bị đau lưng, dân văn phòng..."
            addLabel="Thêm đối tượng phù hợp"
            itemLabel="đối tượng phù hợp"
            disabled={disabled}
          />
        </div>
        <div className="rounded-lg border border-action-warning/30 bg-action-warning/10 p-3">
          <p className="mb-1 text-sm font-medium text-action-warning">
            Chống chỉ định / Cần thận trọng
          </p>
          <p className="mb-2 text-xs text-action-warning">
            Danh sách y tế (mang thai, máy trợ tim, vết thương hở...). KHÔNG dán nhầm nội dung từ
            danh sách "Phù hợp với" sang đây.
          </p>
          <StringListEditor
            items={audience.caution}
            onChange={(next) => onChange({ ...audience, caution: next })}
            placeholder="Vd: Phụ nữ mang thai, người mang máy trợ tim..."
            addLabel="Thêm lưu ý"
            itemLabel="lưu ý"
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Khối FAQ — cần thêm 1 toggle hiện/ẩn RIÊNG cho từng dòng nên không dùng
 * `RepeatableBlock` (chỉ hỗ trợ field text/multiline đồng nhất).
 *
 * Dòng FAQ MỚI luôn khởi tạo `visible: false`: dữ liệu FAQ import từ file
 * Excel là kịch bản tư vấn qua điện thoại ("Dạ Anh/Chị yên tâm ạ...") — không
 * phù hợp hiển thị thẳng cho khách, biên tập viên phải viết lại giọng văn rồi
 * mới bật public. Giữ đúng quy tắc đó cho cả dòng tự thêm ở CRM.
 */
function FaqBlock({
  items,
  onChange,
  visible,
  onVisibleChange,
  disabled = false,
}: {
  items: ProfileFaq[];
  onChange: (next: ProfileFaq[]) => void;
  visible: boolean;
  onVisibleChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Câu hỏi thường gặp</CardTitle>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={visible}
            onCheckedChange={onVisibleChange}
            aria-label="Hiện khối FAQ"
            disabled={disabled}
          />
          Hiện trên trang
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-lg border border-border p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Câu hỏi"
                  value={item.question}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(
                      items.map((row, i) =>
                        i === index ? { ...row, question: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Textarea
                  rows={2}
                  placeholder="Trả lời"
                  value={item.answer}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(
                      items.map((row, i) =>
                        i === index ? { ...row, answer: event.target.value } : row,
                      ),
                    )
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Xoá dòng ${index + 1}`}
                disabled={disabled}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
            <label className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
              <Switch
                checked={item.visible}
                onCheckedChange={(checked) =>
                  onChange(
                    items.map((row, i) => (i === index ? { ...row, visible: checked } : row)),
                  )
                }
                aria-label={`Hiện câu hỏi ${index + 1} trên trang`}
                className="mt-0.5"
                disabled={disabled}
              />
              <span>
                Hiện câu trả lời này trên trang. Dữ liệu FAQ nhập từ kịch bản tư vấn nên mặc định ẩn
                — chỉ bật sau khi biên tập lại giọng văn cho phù hợp trang public.
              </span>
            </label>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...items, { question: "", answer: "", visible: false }])}
        >
          <Plus className="mr-1 size-4" aria-hidden />
          Thêm câu hỏi
        </Button>
      </CardContent>
    </Card>
  );
}
