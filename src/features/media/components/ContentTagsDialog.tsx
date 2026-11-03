import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { MultiSelect } from "@/components/ui/multi-select";
import { useI18n } from "@/i18n";
import type {
  ContentTagsPayload,
  MediaContent,
  MediaTaxonomyItem,
  TaxonomyGroup,
} from "@/lib/api/media";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MediaContent;
  taxonomy: Record<TaxonomyGroup, MediaTaxonomyItem[]>;
  onSubmit: (payload: ContentTagsPayload) => void | Promise<void>;
};

const toOptions = (items: MediaTaxonomyItem[]) =>
  items.map((i) => ({ value: String(i.id), label: i.code ? `${i.code} – ${i.name}` : i.name }));

/** Form nhỏ để marketing sửa loại nội dung + tag sản phẩm/danh mục. Lưu ý:
 * marketing-info thay TOÀN BỘ tag hiện có (không cộng dồn) — hiện rõ note. */
export function ContentTagsDialog({ open, onOpenChange, content, taxonomy, onSubmit }: Props) {
  const { t } = useI18n();
  const [type, setType] = useState(content.content_type_id ? String(content.content_type_id) : "");
  const [productIds, setProductIds] = useState<string[]>(content.products.map((p) => String(p.id)));
  const [categoryIds, setCategoryIds] = useState<string[]>(
    content.categories.map((c) => String(c.id)),
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const payload: ContentTagsPayload = {
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
        title={t("media.contents.tags.title")}
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
        <div className="space-y-4">
          <div>
            <label htmlFor="content-tags-type" className="mb-1 block text-sm text-muted-foreground">
              {t("media.contents.form.type")}
            </label>
            <select
              id="content-tags-type"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">{t("media.contents.form.typeNone")}</option>
              {taxonomy["content-types"].map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="content-tags-products"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.contents.filter.product")}
            </label>
            <MultiSelect
              id="content-tags-products"
              options={toOptions(taxonomy.products)}
              selected={productIds}
              onChange={setProductIds}
              placeholder={t("media.contents.filter.product")}
              menuPortal
            />
          </div>
          <div>
            <label
              htmlFor="content-tags-categories"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.contents.filter.category")}
            </label>
            <MultiSelect
              id="content-tags-categories"
              options={toOptions(taxonomy["product-categories"])}
              selected={categoryIds}
              onChange={setCategoryIds}
              placeholder={t("media.contents.filter.category")}
              menuPortal
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("media.contents.tags.replaceNote")}</p>
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
