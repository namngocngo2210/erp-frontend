import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import type {
  ContentUploadPayload,
  MediaContent,
  MediaTaxonomyItem,
  TaxonomyGroup,
} from "@/lib/api/media";
import { todayLocalDate } from "@/lib/datetime-local";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có giá trị khi sửa thông tin upload — ẩn loại/sản phẩm/danh mục (§3.4). */
  initial?: MediaContent;
  taxonomy: Record<TaxonomyGroup, MediaTaxonomyItem[]>;
  onSubmit: (payload: ContentUploadPayload) => void | Promise<void>;
};

const toOptions = (items: MediaTaxonomyItem[]) =>
  items.map((i) => ({ value: String(i.id), label: i.code ? `${i.code} – ${i.name}` : i.name }));

/** Form tạo/sửa thông tin upload 1 nội dung. Khi `initial` có: chỉ sửa ngày/tiêu
 * đề/URL/nguồn — loại nội dung + tag sản phẩm/danh mục sửa qua ContentTagsDialog. */
export function ContentFormDialog({ open, onOpenChange, initial, taxonomy, onSubmit }: Props) {
  const { t } = useI18n();
  const [uploadedAt, setUploadedAt] = useState(
    initial ? initial.uploaded_at.slice(0, 10) : todayLocalDate(),
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [source, setSource] = useState(initial ? String(initial.source_id) : "");
  const [type, setType] = useState(initial?.content_type_id ? String(initial.content_type_id) : "");
  const [productIds, setProductIds] = useState<string[]>(
    initial ? initial.products.map((p) => String(p.id)) : [],
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initial ? initial.categories.map((c) => String(c.id)) : [],
  );
  const [errors, setErrors] = useState<{ title?: string; url?: string; source?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const nextErrors: typeof errors = {};
    if (!title.trim()) nextErrors.title = t("media.contents.form.err.title");
    if (!/^https?:\/\/[^/\s]+/.test(url)) nextErrors.url = t("media.contents.form.err.url");
    if (!source) nextErrors.source = t("media.contents.form.err.source");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Sửa thông tin upload: loại nội dung/sản phẩm/danh mục bị ẩn trên form (sửa
    // qua ContentTagsDialog) nên KHÔNG gửi 3 field này — tránh ghi đè tag hiện có
    // bằng giá trị rỗng của form ẩn.
    const payload: ContentUploadPayload = initial
      ? {
          uploaded_at: uploadedAt,
          title: title.trim(),
          url,
          source_id: Number(source),
        }
      : {
          uploaded_at: uploadedAt,
          title: title.trim(),
          url,
          source_id: Number(source),
          content_type_id: type ? Number(type) : null,
          product_ids: productIds.map(Number),
          category_ids: categoryIds.map(Number),
        };
    setSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={t(initial ? "media.contents.form.edit" : "media.contents.form.create")}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("media.common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t("media.common.save")}
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <div>
            <label
              htmlFor="content-form-uploaded-at"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.contents.form.uploadedAt")}
            </label>
            <Input
              id="content-form-uploaded-at"
              type="date"
              value={uploadedAt}
              onChange={(e) => setUploadedAt(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="content-form-source"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.contents.form.source")}
            </label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="content-form-source" className="h-9 w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {taxonomy["content-sources"].map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source ? (
              <p className="mt-1 text-xs text-destructive">{errors.source}</p>
            ) : null}
          </div>
          <div className="col-span-full">
            <label
              htmlFor="content-form-title"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.contents.form.title")}
            </label>
            <Input
              id="content-form-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title ? <p className="mt-1 text-xs text-destructive">{errors.title}</p> : null}
          </div>
          <div className="col-span-full">
            <label htmlFor="content-form-url" className="mb-1 block text-sm text-muted-foreground">
              {t("media.contents.form.url")}
            </label>
            <Input id="content-form-url" value={url} onChange={(e) => setUrl(e.target.value)} />
            {errors.url ? <p className="mt-1 text-xs text-destructive">{errors.url}</p> : null}
          </div>
          {!initial ? (
            <>
              <div>
                <label
                  htmlFor="content-form-type"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("media.contents.form.type")}
                </label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="content-form-type" className="h-9 w-full">
                    <SelectValue placeholder={t("media.contents.form.typeNone")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("media.contents.form.typeNone")}</SelectItem>
                    {taxonomy["content-types"].map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-full">
                <label
                  htmlFor="content-form-products"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("media.contents.filter.product")}
                </label>
                <MultiSelect
                  id="content-form-products"
                  options={toOptions(taxonomy.products)}
                  selected={productIds}
                  onChange={setProductIds}
                  placeholder={t("media.contents.filter.product")}
                  menuPortal
                />
              </div>
              <div className="col-span-full">
                <label
                  htmlFor="content-form-categories"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("media.contents.filter.category")}
                </label>
                <MultiSelect
                  id="content-form-categories"
                  options={toOptions(taxonomy["product-categories"])}
                  selected={categoryIds}
                  onChange={setCategoryIds}
                  placeholder={t("media.contents.filter.category")}
                  menuPortal
                />
              </div>
            </>
          ) : null}
        </FormGrid>
      </FormDialogShell>
    </Dialog>
  );
}
