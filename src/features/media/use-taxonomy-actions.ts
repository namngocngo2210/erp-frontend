import { useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import type { MediaTaxonomyItem, TaxonomyGroup, TaxonomyPayload } from "@/lib/api/media";

import { useCreateTaxonomy, useDeleteTaxonomy, useUpdateTaxonomy } from "./queries";

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Thao tác thất bại.";
}

/**
 * Wire các mutation tạo/sửa/xoá 1 bản ghi danh mục (task 19) vào state dialog
 * + toast. Nhận `group` của tab đang mở — trang gọi lại hook này mỗi khi đổi
 * tab nên mutation luôn trỏ đúng endpoint `/api/media/<group>`.
 */
export function useTaxonomyActions(group: TaxonomyGroup) {
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MediaTaxonomyItem | null>(null);

  const createMutation = useCreateTaxonomy(group);
  const updateMutation = useUpdateTaxonomy(group);
  const deleteMutation = useDeleteTaxonomy(group);

  async function submitCreate(payload: TaxonomyPayload) {
    try {
      await createMutation.mutateAsync(payload);
      toast.success(t("media.toast.saved"));
      setCreateOpen(false);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function submitEdit(payload: TaxonomyPayload) {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, payload });
      toast.success(t("media.toast.saved"));
      setEditTarget(null);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function remove(item: MediaTaxonomyItem) {
    try {
      await deleteMutation.mutateAsync(item.id);
      toast.success(t("media.toast.deleted"));
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return { createOpen, setCreateOpen, editTarget, setEditTarget, submitCreate, submitEdit, remove };
}
