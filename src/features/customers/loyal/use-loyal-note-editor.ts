import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import type { LoyalCustomer, LoyalCustomerListResult } from "@/lib/api/customers";
import { customerKeys, useUpdateLoyalCustomerNote } from "@/features/customers/queries";
import {
  EMPTY_NOTE_FORM,
  buildNotePayload,
  noteFormFromRow,
  type LoyalNoteForm,
} from "./loyal-format";

/** Dialog sửa hành động sale / ghi chú / sale phụ trách của một khách thân thiết. */
export function useLoyalNoteEditor(
  listKey: ReturnType<typeof customerKeys.loyal>,
  canAssignSale: boolean,
) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<LoyalCustomer | null>(null);
  const [editForm, setEditForm] = useState<LoyalNoteForm>(EMPTY_NOTE_FORM);
  const noteMutation = useUpdateLoyalCustomerNote();
  const saving = noteMutation.isPending;

  const openEdit = (row: LoyalCustomer) => {
    setEditing(row);
    setEditForm(noteFormFromRow(row));
  };

  const handleSaveNote = async () => {
    if (!editing) return;
    try {
      const updated = await noteMutation.mutateAsync({
        customerId: editing.customer_id,
        payload: buildNotePayload(editForm, canAssignSale),
      });
      // Vá row trong cache của trang hiện tại (không refetch bảng, giữ vị trí cuộn).
      queryClient.setQueryData<LoyalCustomerListResult>(listKey, (prev) =>
        prev
          ? {
              ...prev,
              results: prev.results.map((row) =>
                row.customer_id === editing.customer_id
                  ? {
                      ...row,
                      sale_action: updated.sale_action,
                      special_note: updated.special_note,
                      sale_staff_id: updated.sale_staff_id,
                      sale_staff_name: updated.sale_staff_name,
                      last_care_call_at: updated.last_care_call_at,
                    }
                  : row,
              ),
            }
          : prev,
      );
      setEditing(null);
      toast.success(t("loyalCustomers.toast.noteSaved", "Đã lưu ghi chú."));
    } catch (error) {
      console.error("Error saving loyal customer note:", error);
      toast.error(t("loyalCustomers.toast.noteSaveFailed", "Lưu ghi chú thất bại."));
    }
  };

  return {
    editing,
    editForm,
    setEditForm,
    saving,
    openEdit,
    close: () => setEditing(null),
    handleSaveNote,
  };
}
