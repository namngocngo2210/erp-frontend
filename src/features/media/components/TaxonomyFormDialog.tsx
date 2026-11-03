import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";
import type { MediaTaxonomyItem, TaxonomyGroup, TaxonomyPayload } from "@/lib/api/media";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: TaxonomyGroup;
  /** Có giá trị khi sửa — hiện thêm Switch is_active, ẩn khi tạo mới. */
  initial?: MediaTaxonomyItem;
  onSubmit: (payload: TaxonomyPayload) => void | Promise<void>;
};

type TaxGroupValue = "" | "video" | "image";

/**
 * Form tạo/sửa 1 bản ghi danh mục. Field theo group (§3.6 tài liệu ads-crm):
 * `content-types` cần Tên + chọn Nhóm video/image; `products` cần Mã (Tên tuỳ
 * chọn); các group còn lại chỉ cần Tên. Khi tạo mới KHÔNG gửi `is_active`
 * (backend tự mặc định true) — chỉ gửi khi sửa, theo giá trị Switch.
 */
export function TaxonomyFormDialog({ open, onOpenChange, group, initial, onSubmit }: Props) {
  const { t } = useI18n();
  const isProducts = group === "products";
  const isContentTypes = group === "content-types";

  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [taxGroup, setTaxGroup] = useState<TaxGroupValue>(initial?.group ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [errors, setErrors] = useState<{ name?: string; code?: string; group?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const nextErrors: typeof errors = {};
    if (isProducts) {
      if (!code.trim()) nextErrors.code = t("media.taxonomy.form.err.code");
    } else if (!name.trim()) {
      nextErrors.name = t("media.taxonomy.form.err.name");
    }
    if (isContentTypes && !taxGroup) nextErrors.group = t("media.taxonomy.form.err.group");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: TaxonomyPayload = {};
    if (isProducts) {
      payload.code = code.trim();
      if (name.trim()) payload.name = name.trim();
    } else {
      payload.name = name.trim();
    }
    if (isContentTypes) payload.group = taxGroup as "video" | "image";
    if (initial) payload.is_active = isActive;

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
        title={t(initial ? "media.taxonomy.form.edit" : "media.taxonomy.form.create")}
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
          {isProducts ? (
            <div>
              <label
                htmlFor="taxonomy-form-code"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("media.taxonomy.form.code")}
              </label>
              <Input
                id="taxonomy-form-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {errors.code ? <p className="mt-1 text-xs text-destructive">{errors.code}</p> : null}
            </div>
          ) : null}
          <div>
            <label
              htmlFor="taxonomy-form-name"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.taxonomy.form.name")}
            </label>
            <Input id="taxonomy-form-name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
          </div>
          {isContentTypes ? (
            <div>
              <label
                htmlFor="taxonomy-form-group"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("media.taxonomy.form.group")}
              </label>
              <select
                id="taxonomy-form-group"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={taxGroup}
                onChange={(e) => setTaxGroup(e.target.value as TaxGroupValue)}
              >
                <option value="">—</option>
                <option value="video">{t("media.taxonomy.form.group.video")}</option>
                <option value="image">{t("media.taxonomy.form.group.image")}</option>
              </select>
              {errors.group ? (
                <p className="mt-1 text-xs text-destructive">{errors.group}</p>
              ) : null}
            </div>
          ) : null}
          {initial ? (
            <div className="col-span-full flex items-center gap-2 pt-2">
              <Switch id="taxonomy-form-active" checked={isActive} onCheckedChange={setIsActive} />
              <label htmlFor="taxonomy-form-active" className="text-sm font-medium text-foreground">
                {t("media.taxonomy.form.active")}
              </label>
            </div>
          ) : null}
        </FormGrid>
      </FormDialogShell>
    </Dialog>
  );
}
