import { useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import type { MediaProposal, ProposalPayload } from "@/lib/api/media";

import { useCreateProposal, useDeleteProposal, useUpdateProposal } from "./queries";

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Thao tác thất bại.";
}

/**
 * Wire các mutation tạo/sửa/xoá đề xuất (task 18) vào state dialog + toast.
 * Tách khỏi MediaProposalsPage cho gọn — trang chỉ cắm props.
 */
export function useProposalActions() {
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MediaProposal | null>(null);

  const createMutation = useCreateProposal();
  const updateMutation = useUpdateProposal();
  const deleteMutation = useDeleteProposal();

  async function submitCreate(payload: ProposalPayload) {
    try {
      await createMutation.mutateAsync(payload);
      toast.success(t("media.toast.saved"));
      setCreateOpen(false);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function submitEdit(payload: ProposalPayload) {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, payload });
      toast.success(t("media.toast.saved"));
      setEditTarget(null);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function remove(proposal: MediaProposal) {
    try {
      await deleteMutation.mutateAsync(proposal.id);
      toast.success(t("media.toast.deleted"));
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return { createOpen, setCreateOpen, editTarget, setEditTarget, submitCreate, submitEdit, remove };
}
