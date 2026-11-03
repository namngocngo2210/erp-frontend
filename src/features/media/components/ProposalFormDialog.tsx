import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import type {
  MediaProposal,
  MediaTaxonomyItem,
  ProposalPayload,
  ProposalStatus,
  TaxonomyGroup,
} from "@/lib/api/media";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có giá trị khi sửa — hiện thêm select trạng thái, ẩn khi tạo mới (mặc định pending). */
  initial?: MediaProposal;
  taxonomy: Record<TaxonomyGroup, MediaTaxonomyItem[]>;
  onSubmit: (payload: ProposalPayload) => void | Promise<void>;
};

const STATUSES: readonly ProposalStatus[] = ["pending", "in_progress", "done", "cancelled"];

/** Form tạo/sửa 1 đề xuất nội dung. PATCH ghi đè toàn bộ field nên submit luôn
 * gửi đủ dữ liệu hiện có trong form (§2.3 tài liệu ads-crm). */
export function ProposalFormDialog({ open, onOpenChange, initial, taxonomy, onSubmit }: Props) {
  const { t } = useI18n();
  const [mainKey, setMainKey] = useState(initial?.main_key ?? "");
  const [idea, setIdea] = useState(initial?.idea ?? "");
  const [dueDate, setDueDate] = useState(initial?.due_date ? initial.due_date.slice(0, 10) : "");
  const [product, setProduct] = useState(initial?.product_id ? String(initial.product_id) : "");
  const [contentId, setContentId] = useState(initial?.content_id ? String(initial.content_id) : "");
  const [status, setStatus] = useState<ProposalStatus>(initial?.status ?? "pending");
  const [errors, setErrors] = useState<{ mainKey?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const nextErrors: typeof errors = {};
    if (!mainKey.trim()) nextErrors.mainKey = t("media.proposals.form.err.mainKey");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: ProposalPayload = {
      main_key: mainKey.trim(),
      idea,
      due_date: dueDate || null,
      product_id: product ? Number(product) : null,
      content_id: contentId ? Number(contentId) : null,
      ...(initial ? { status } : {}),
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
        title={t(initial ? "media.proposals.form.edit" : "media.proposals.form.create")}
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
          <div className="col-span-full">
            <label
              htmlFor="proposal-form-main-key"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.proposals.form.mainKey")}
            </label>
            <Input
              id="proposal-form-main-key"
              value={mainKey}
              onChange={(e) => setMainKey(e.target.value)}
            />
            {errors.mainKey ? (
              <p className="mt-1 text-xs text-destructive">{errors.mainKey}</p>
            ) : null}
          </div>
          <div className="col-span-full">
            <label
              htmlFor="proposal-form-idea"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.proposals.form.idea")}
            </label>
            <Textarea
              id="proposal-form-idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="proposal-form-due" className="mb-1 block text-sm text-muted-foreground">
              {t("media.proposals.form.due")}
            </label>
            <Input
              id="proposal-form-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="proposal-form-product"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.proposals.form.product")}
            </label>
            <SearchableSelect
              id="proposal-form-product"
              clearable
              placeholder="—"
              value={product}
              onChange={setProduct}
              options={taxonomy.products
                .filter((p) => p.is_active)
                .map((p) => ({
                  value: String(p.id),
                  label: p.code ? `${p.code} – ${p.name}` : p.name,
                }))}
            />
          </div>
          <div>
            <label
              htmlFor="proposal-form-content-id"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.proposals.form.contentId")}
            </label>
            <Input
              id="proposal-form-content-id"
              type="number"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("media.proposals.form.contentIdHint")}
            </p>
          </div>
          {initial ? (
            <div>
              <label
                htmlFor="proposal-form-status"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("media.proposals.form.status")}
              </label>
              <Select value={status} onValueChange={(value) => setStatus(value as ProposalStatus)}>
                <SelectTrigger id="proposal-form-status" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`media.proposals.status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </FormGrid>
      </FormDialogShell>
    </Dialog>
  );
}
