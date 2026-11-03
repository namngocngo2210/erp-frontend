import { PaginationPages } from "@/components/ui/pagination";
import { DataTableShell } from "@/components/ui/data-table-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import type { StaffUserOption } from "@/lib/api/customers";
import { useStaffUsers } from "@/features/customers/queries";
import { LoyalCustomersList } from "@/features/customers/loyal/LoyalCustomersList";
import { LoyalFilterToolbar } from "@/features/customers/loyal/LoyalFilterToolbar";
import { LoyalNoteDialog } from "@/features/customers/loyal/LoyalNoteDialog";
import { useLoyalCustomersList } from "@/features/customers/loyal/use-loyal-customers-list";
import { useLoyalNoteEditor } from "@/features/customers/loyal/use-loyal-note-editor";
import { usePermission } from "@/hooks/usePermission";

function LoyalCustomersPage() {
  const { t } = useI18n();
  const can = usePermission();
  const canAssignSale = can("sale-assignment:edit");
  const canEditLoyalNote = can("loyal-customers:edit");

  const list = useLoyalCustomersList();
  const editor = useLoyalNoteEditor(list.listKey, canAssignSale);

  const staffUsersData = useStaffUsers().data;
  const staffUsers: StaffUserOption[] = Array.isArray(staffUsersData) ? staffUsersData : [];

  return (
    <>
      <DataTableShell
        loading={list.loading && list.rows.length === 0}
        toolbar={<LoyalFilterToolbar filters={list.filters} />}
      >
        <LoyalCustomersList
          rows={list.rows}
          loading={list.loading}
          canEditNote={canEditLoyalNote}
          onEdit={editor.openEdit}
        />

        {(list.rows.length > 0 || list.currentPage > 1) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-3 pb-3">
            <span className="text-sm text-muted-foreground">
              {t("loyalCustomers.pagination.total", "Tổng {count} khách hàng").replace(
                "{count}",
                String(list.total),
              )}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("customers.pagination.pageSize", "Mỗi trang")}
              </span>
              <Select value={String(list.pageSize)} onValueChange={list.changePageSize}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <PaginationPages
                page={list.currentPage}
                totalPages={list.totalPages}
                onPageChange={list.changePage}
              />
            </div>
          </div>
        )}
      </DataTableShell>

      <LoyalNoteDialog
        editing={editor.editing}
        form={editor.editForm}
        setForm={editor.setEditForm}
        staffUsers={staffUsers}
        canAssignSale={canAssignSale}
        canEditNote={canEditLoyalNote}
        saving={editor.saving}
        onClose={editor.close}
        onSave={editor.handleSaveNote}
      />
    </>
  );
}

export default LoyalCustomersPage;
