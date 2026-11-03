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
import type { MediaContent } from "@/lib/api/media";

import { mediaCan, type MediaRole } from "../access";

type Props = {
  content: MediaContent;
  role: MediaRole | null;
  onDuplicate: (content: MediaContent) => void;
  onDelete: (content: MediaContent) => void;
};

/** Menu hành động cuối hàng bảng: nhân bản (content.create) + xoá (content.delete,
 * qua dialog xác nhận vì xoá là soft-delete ẩn khỏi mọi danh sách). */
export function ContentRowActions({ content, role, onDuplicate, onDelete }: Props) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canDuplicate = mediaCan(role, "content.create");
  const canDelete = mediaCan(role, "content.delete");

  if (!canDuplicate && !canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("media.contents.action.menu")}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canDuplicate ? (
            <DropdownMenuItem onClick={() => onDuplicate(content)}>
              {t("media.contents.action.duplicate")}
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem className="text-destructive" onClick={() => setConfirmOpen(true)}>
              {t("media.contents.action.delete")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {canDelete ? (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <FormDialogShell
            title={t("media.contents.action.delete")}
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
                    onDelete(content);
                  }}
                >
                  {t("media.common.delete")}
                </Button>
              </>
            }
          >
            <p className="text-sm">{t("media.contents.action.deleteConfirm")}</p>
          </FormDialogShell>
        </Dialog>
      ) : null}
    </>
  );
}
