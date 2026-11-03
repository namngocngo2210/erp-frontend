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
import type { MediaTaxonomyItem, TaxonomyGroup } from "@/lib/api/media";

import { mediaCan, type MediaRole } from "../access";

type Props = {
  item: MediaTaxonomyItem;
  group: TaxonomyGroup;
  role: MediaRole | null;
  onEdit: (item: MediaTaxonomyItem) => void;
  onDelete: (item: MediaTaxonomyItem) => void;
};

/**
 * Menu Sửa/Xoá cho 1 dòng danh mục. Backend chỉ cho uploader POST riêng
 * `content-sources` — PATCH/DELETE luôn admin-only ở MỌI group, kể cả
 * content-sources — nên cả 2 nút cùng gate bằng 1 quyền `taxonomy.write`,
 * không phân biệt theo `group`.
 */
export function TaxonomyRowActions({ item, role, onEdit, onDelete }: Props) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canWrite = mediaCan(role, "taxonomy.write");

  if (!canWrite) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("media.taxonomy.action.menu")}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(item)}>{t("media.common.edit")}</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmOpen(true)}>
            {t("media.common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
                  onDelete(item);
                }}
              >
                {t("media.common.delete")}
              </Button>
            </>
          }
        >
          <p className="text-sm">{t("media.taxonomy.deleteConfirm")}</p>
        </FormDialogShell>
      </Dialog>
    </>
  );
}
