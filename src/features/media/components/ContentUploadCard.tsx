import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import type {
  ContentUploadPayload,
  MediaContent,
  MediaTaxonomyItem,
  TaxonomyGroup,
} from "@/lib/api/media";

import { mediaCan, type MediaRole } from "../access";
import { useUpdateUploadInfo } from "../queries";
import { DetailRow } from "./DetailRow";

type Props = {
  content: MediaContent;
  role: MediaRole | null;
  taxonomy: Record<TaxonomyGroup, MediaTaxonomyItem[]>;
  /** Nút "Sửa thông tin"/"Sửa tag" (dialog cũ của trang Thư viện) + VideoActions. */
  actions?: ReactNode;
};

type FormState = { uploadedAt: string; title: string; url: string; source: string };

function toFormState(content: MediaContent): FormState {
  return {
    uploadedAt: content.uploaded_at.slice(0, 10),
    title: content.title,
    url: content.url,
    source: String(content.source_id),
  };
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Thao tác thất bại.";
}

/**
 * Card "Thông tin upload" trong panel chi tiết — sửa tại chỗ khi role có
 * `content.edit_upload` (validate mirror `ContentFormDialog`); không có quyền
 * thì hiện dạng đọc (không input, không nút lưu). Dialog `ContentFormDialog`
 * cũ (mở qua nút trong `actions`) vẫn hoạt động song song theo yêu cầu chủ sở hữu.
 */
export function ContentUploadCard({ content, role, taxonomy, actions }: Props) {
  const { t } = useI18n();
  const canEdit = mediaCan(role, "content.edit_upload");
  const mutation = useUpdateUploadInfo();
  const initial = useMemo(() => toFormState(content), [content]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<{ title?: string; url?: string; source?: string }>({});

  // Nội dung đổi (lưu thành công hoặc chuyển sang sibling khác qua ▲/▼) → nạp lại
  // form từ dữ liệu mới nhất, xoá mọi lỗi/chỉnh sửa dở dang của nội dung trước.
  useEffect(() => {
    setForm(initial);
    setErrors({});
  }, [initial]);

  async function handleSave() {
    const nextErrors: typeof errors = {};
    if (!form.title.trim()) nextErrors.title = t("media.contents.form.err.title");
    if (!/^https?:\/\/[^/\s]+/.test(form.url)) nextErrors.url = t("media.contents.form.err.url");
    if (!form.source) nextErrors.source = t("media.contents.form.err.source");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: ContentUploadPayload = {
      uploaded_at: form.uploadedAt,
      title: form.title.trim(),
      url: form.url,
      source_id: Number(form.source),
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
    setErrors({});
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("media.contents.detail.uploadInfo")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canEdit ? (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="upload-card-uploaded-at"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("media.contents.form.uploadedAt")}
              </label>
              <Input
                id="upload-card-uploaded-at"
                type="date"
                value={form.uploadedAt}
                onChange={(e) => setForm({ ...form, uploadedAt: e.target.value })}
              />
            </div>
            <div>
              <label
                htmlFor="upload-card-title"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("media.contents.form.title")}
              </label>
              <Input
                id="upload-card-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              {errors.title ? (
                <p className="mt-1 text-xs text-destructive">{errors.title}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="upload-card-url" className="mb-1 block text-sm text-muted-foreground">
                {t("media.contents.form.url")}
              </label>
              <Input
                id="upload-card-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
              {errors.url ? <p className="mt-1 text-xs text-destructive">{errors.url}</p> : null}
            </div>
            <div>
              <label
                htmlFor="upload-card-source"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("media.contents.form.source")}
              </label>
              <select
                id="upload-card-source"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="">—</option>
                {taxonomy["content-sources"].map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.source ? (
                <p className="mt-1 text-xs text-destructive">{errors.source}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <DetailRow label={t("media.contents.form.uploadedAt")}>
              {content.uploaded_at.slice(0, 10)}
            </DetailRow>
            <DetailRow label={t("media.contents.form.title")}>{content.title}</DetailRow>
            <DetailRow label={t("media.contents.form.url")}>
              <a
                href={content.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                {content.url}
              </a>
            </DetailRow>
            <DetailRow label={t("media.contents.form.source")}>
              {content.source?.name ?? "—"}
            </DetailRow>
          </div>
        )}
        <DetailRow label={t("media.proposals.col.creator")}>
          {content.creator?.name ?? "—"}
        </DetailRow>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {canEdit ? (
            <>
              <Button type="button" size="sm" disabled={mutation.isPending} onClick={handleSave}>
                {t("media.contents.detail.saveUpload")}
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
            </>
          ) : null}
          {actions}
        </div>
      </CardContent>
    </Card>
  );
}
