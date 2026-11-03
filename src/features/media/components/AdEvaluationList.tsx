import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import type { EvaluationPayload, MediaAdEvaluation } from "@/lib/api/media";

import { mediaCan, type MediaRole } from "../access";
import {
  useCreateEvaluation,
  useDeleteEvaluation,
  useEvaluations,
  useUpdateEvaluation,
} from "../queries";
import { StarRating } from "./StarRating";

type Props = { contentId: number; role: MediaRole | null };

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Thao tác thất bại.";
}

/**
 * Form thêm/sửa 1 đánh giá; dùng chung cho hàng thêm mới và hàng đang sửa.
 * `onSubmit` tự bắt lỗi + báo toast (giống pattern `useContentActions`), chỉ
 * trả `true` khi lưu thành công — form dựa vào đó để tự xoá trắng khi cần.
 */
function EvaluationForm({
  idPrefix,
  submitLabel,
  pending,
  initialRating = 0,
  initialNote = "",
  resetOnSuccess = false,
  onCancel,
  onSubmit,
}: {
  idPrefix: string;
  submitLabel: string;
  pending: boolean;
  initialRating?: number;
  initialNote?: string;
  resetOnSuccess?: boolean;
  onCancel?: () => void;
  onSubmit: (payload: EvaluationPayload) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(initialRating);
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (rating === 0 && !note.trim()) {
      setError(t("media.eval.err.empty"));
      return;
    }
    setError("");
    const ok = await onSubmit({ rating, note });
    if (ok && resetOnSuccess) {
      setRating(0);
      setNote("");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id={`${idPrefix}-rating-label`} className="text-sm font-medium">
          {t("media.eval.rating")}
        </span>
        <StarRating value={rating} onChange={setRating} />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-note`} className="text-xs text-muted-foreground">
          {t("media.eval.note")}
        </label>
        <Textarea
          id={`${idPrefix}-note`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={t("media.eval.notePlaceholder")}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={handleSubmit}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onCancel}>
            {t("media.common.cancel")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** 1 dòng đánh giá: hiển thị (sao đọc-thôi), hoặc chuyển sang form sửa inline khi bấm "Sửa". */
function EvaluationRow({
  evaluation,
  canWrite,
  contentId,
}: {
  evaluation: MediaAdEvaluation;
  canWrite: boolean;
  contentId: number;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateMutation = useUpdateEvaluation(contentId);
  const deleteMutation = useDeleteEvaluation(contentId);

  async function submitEdit(payload: EvaluationPayload): Promise<boolean> {
    try {
      await updateMutation.mutateAsync({ id: evaluation.id, payload });
      toast.success(t("media.toast.saved"));
      setEditing(false);
      return true;
    } catch (err) {
      toast.error(errMessage(err));
      return false;
    }
  }

  async function confirmDelete() {
    setConfirmOpen(false);
    try {
      await deleteMutation.mutateAsync(evaluation.id);
      toast.success(t("media.toast.deleted"));
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  if (editing) {
    return (
      <EvaluationForm
        idPrefix={`ev-edit-${evaluation.id}`}
        submitLabel={t("media.common.save")}
        pending={updateMutation.isPending}
        initialRating={evaluation.rating}
        initialNote={evaluation.note}
        onCancel={() => setEditing(false)}
        onSubmit={submitEdit}
      />
    );
  }

  const byline = t("media.eval.byline")
    .replace("{name}", evaluation.evaluator_name)
    .replace("{date}", evaluation.evaluated_at.slice(0, 10));

  return (
    <li className="rounded border px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StarRating value={evaluation.rating} readOnly />
            <span className="text-muted-foreground">{byline}</span>
          </div>
          {evaluation.note ? <p className="text-muted-foreground">{evaluation.note}</p> : null}
        </div>
        {canWrite ? (
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              {t("media.common.edit")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              {t("media.common.delete")}
            </Button>
          </div>
        ) : null}
      </div>
      {canWrite ? (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <FormDialogShell
            title={t("media.common.delete")}
            footer={
              <>
                <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                  {t("media.common.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={confirmDelete}
                >
                  {t("media.common.delete")}
                </Button>
              </>
            }
          >
            <p className="text-sm">{t("media.eval.deleteConfirm")}</p>
          </FormDialogShell>
        </Dialog>
      ) : null}
    </li>
  );
}

/**
 * Card "Đánh giá ads (N)" trong panel chi tiết — form thêm mới (chấm sao + ghi
 * chú) rồi tới danh sách đánh giá đã có. Chỉ role có quyền `evaluation.write`
 * (marketing/admin) mới thấy form thêm và nút Sửa/Xoá; viewer/uploader chỉ xem.
 */
export function AdEvaluationList({ contentId, role }: Props) {
  const { t } = useI18n();
  const { data, isLoading } = useEvaluations(contentId);
  const createMutation = useCreateEvaluation(contentId);
  const canWrite = mediaCan(role, "evaluation.write");

  async function handleCreate(payload: EvaluationPayload): Promise<boolean> {
    try {
      await createMutation.mutateAsync(payload);
      toast.success(t("media.toast.saved"));
      return true;
    } catch (err) {
      toast.error(errMessage(err));
      return false;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {data
            ? `${t("media.contents.detail.evaluations")} (${data.items.length})`
            : t("media.contents.detail.evaluations")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canWrite ? (
          <EvaluationForm
            idPrefix="ev"
            submitLabel={t("media.eval.submit")}
            pending={createMutation.isPending}
            resetOnSuccess
            onSubmit={handleCreate}
          />
        ) : null}
        {isLoading || !data ? (
          <LogoSpinner />
        ) : data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("media.contents.detail.noEvaluations")}
          </p>
        ) : (
          <ul className="space-y-1">
            {data.items.map((e) => (
              <EvaluationRow key={e.id} evaluation={e} canWrite={canWrite} contentId={contentId} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
