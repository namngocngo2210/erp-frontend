import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { useI18n } from "@/i18n";
import type {
  ContentTagsPayload,
  MediaContent,
  MediaTaxonomyItem,
  TaxonomyGroup,
} from "@/lib/api/media";

import { mediaCan, type MediaRole } from "../access";
import { useUpdateMarketingInfo } from "../queries";
import { DetailRow } from "./DetailRow";

type Props = {
  content: MediaContent;
  role: MediaRole | null;
  taxonomy: Record<TaxonomyGroup, MediaTaxonomyItem[]>;
};

type FormState = { type: string; productIds: string[]; categoryIds: string[] };

function toFormState(content: MediaContent): FormState {
  return {
    type: content.content_type_id ? String(content.content_type_id) : "",
    productIds: content.products.map((p) => String(p.id)),
    categoryIds: content.categories.map((c) => String(c.id)),
  };
}

const toOptions = (items: MediaTaxonomyItem[]) =>
  items.map((i) => ({ value: String(i.id), label: i.code ? `${i.code} – ${i.name}` : i.name }));

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Thao tác thất bại.";
}

/**
 * Card "Thông tin marketing" trong panel chi tiết — sửa tại chỗ khi role có
 * `content.edit_marketing`. Lưu thay TOÀN BỘ loại/sản phẩm/danh mục (giống
 * `ContentTagsDialog` cũ — marketing-info API không cộng dồn tag).
 */
export function ContentMarketingCard({ content, role, taxonomy }: Props) {
  const { t } = useI18n();
  const canEdit = mediaCan(role, "content.edit_marketing");
  const mutation = useUpdateMarketingInfo();
  const initial = useMemo(() => toFormState(content), [content]);
  const [form, setForm] = useState(initial);

  useEffect(() => setForm(initial), [initial]);

  async function handleSave() {
    const payload: ContentTagsPayload = {
      content_type_id: form.type ? Number(form.type) : null,
      product_ids: form.productIds.map(Number),
      category_ids: form.categoryIds.map(Number),
    };
    try {
      await mutation.mutateAsync({ id: content.id, payload });
      toast.success(t("media.toast.saved"));
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  function handleDiscard() {
    setForm(initial);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("media.contents.detail.marketingInfo")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canEdit ? (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="marketing-card-type"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("media.contents.form.type")}
              </label>
              <select
                id="marketing-card-type"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                htmlFor="marketing-card-products"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("media.contents.filter.product")}
              </label>
              <MultiSelect
                id="marketing-card-products"
                options={toOptions(taxonomy.products)}
                selected={form.productIds}
                onChange={(v) => setForm({ ...form, productIds: v })}
                placeholder={t("media.contents.filter.product")}
                menuPortal
              />
            </div>
            <div>
              <label
                htmlFor="marketing-card-categories"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("media.contents.filter.category")}
              </label>
              <MultiSelect
                id="marketing-card-categories"
                options={toOptions(taxonomy["product-categories"])}
                selected={form.categoryIds}
                onChange={(v) => setForm({ ...form, categoryIds: v })}
                placeholder={t("media.contents.filter.category")}
                menuPortal
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <DetailRow label={t("media.contents.form.type")}>
              {content.content_type?.name ?? "—"}
            </DetailRow>
            <DetailRow label={t("media.contents.filter.product")}>
              {content.products.length === 0
                ? "—"
                : content.products.map((p) => (
                    <Badge key={p.id} variant="secondary" className="mr-1">
                      {p.code || p.name}
                    </Badge>
                  ))}
            </DetailRow>
            <DetailRow label={t("media.contents.filter.category")}>
              {content.categories.length === 0
                ? "—"
                : content.categories.map((k) => (
                    <Badge key={k.id} variant="secondary" className="mr-1">
                      {k.name}
                    </Badge>
                  ))}
            </DetailRow>
          </div>
        )}
        {canEdit ? (
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" disabled={mutation.isPending} onClick={handleSave}>
              {t("media.contents.detail.saveMarketing")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={mutation.isPending}
              onClick={handleDiscard}
            >
              {t("media.contents.detail.discardChanges")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
