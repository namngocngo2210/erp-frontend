import { useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { useI18n } from "@/i18n";
import type { MediaProposal } from "@/lib/api/media";

import { mediaCan, type MediaRole } from "../access";

type Props = {
  proposal: MediaProposal;
  role: MediaRole | null;
  onEdit: (proposal: MediaProposal) => void;
  onDelete: (proposal: MediaProposal) => void;
};

/** Menu hành động cuối hàng bảng đề xuất: sửa (proposal.edit) + xoá
 * (proposal.delete, qua dialog xác nhận). Quyền sở hữu do backend quyết —
 * nút vẫn hiện theo role, lỗi (nếu có) hiện qua toast. */
export function ProposalRowActions({ proposal, role, onEdit, onDelete }: Props) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canEdit = mediaCan(role, "proposal.edit");
  const canDelete = mediaCan(role, "proposal.delete");

  if (!canEdit && !canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("media.proposals.action.menu")}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(proposal)}>
              {t("media.common.edit")}
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem className="text-destructive" onClick={() => setConfirmOpen(true)}>
              {t("media.common.delete")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {canDelete ? (
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
                  onClick={() => {
                    setConfirmOpen(false);
                    onDelete(proposal);
                  }}
                >
                  {t("media.common.delete")}
                </Button>
              </>
            }
          >
            <p className="text-sm">{t("media.proposals.deleteConfirm")}</p>
          </FormDialogShell>
        </Dialog>
      ) : null}
    </>
  );
}
