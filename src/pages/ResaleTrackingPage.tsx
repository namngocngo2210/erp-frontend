import { Button } from "@/components/ui/button";
import { PaginationPages } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { ResaleAppointmentDialog } from "@/features/customers/resale/ResaleAppointmentDialog";
import { ResaleContactDialog } from "@/features/customers/resale/ResaleContactDialog";
import { ResaleFilterBar } from "@/features/customers/resale/ResaleFilterBar";
import { ResaleKpiCards } from "@/features/customers/resale/ResaleKpiCards";
import { ResaleOrderDialog } from "@/features/customers/resale/ResaleOrderDialog";
import { ResaleTrackingList } from "@/features/customers/resale/ResaleTrackingList";
import { useResaleRowActions } from "@/features/customers/resale/use-resale-row-actions";
import { useResaleTrackingList } from "@/features/customers/resale/use-resale-tracking-list";

function ResaleTrackingPage() {
  const { t } = useI18n();
  const list = useResaleTrackingList();
  const actions = useResaleRowActions(list.patchRow);
  const saving = !!actions.savingKey;

  return (
    <div className="space-y-4">
      <ResaleFilterBar filters={list.filters} facets={list.facets} />

      <ResaleKpiCards total={list.total} kpis={list.kpis} />

      <div data-main-content>
        <ResaleTrackingList
          rows={list.rows}
          loading={list.loading}
          savingKey={actions.savingKey}
          onContact={actions.contact.open}
          onAppointment={actions.appointment.open}
          onResale={actions.resale.open}
        />
      </div>

      {(list.rows.length > 0 || list.currentPage > 1) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Hiển thị {list.rows.length}/{list.total} dòng
            </span>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={list.resetFilters}>
              Xóa lọc
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("customers.pagination.pageSize", "Mỗi trang")}
            </span>
            <Select value={String(list.pageSize)} onValueChange={list.changePageSize}>
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

      <ResaleContactDialog
        row={actions.contact.row}
        form={actions.contact.form}
        setForm={actions.contact.setForm}
        saving={saving}
        onClose={actions.contact.close}
        onSubmit={actions.contact.submit}
      />
      <ResaleAppointmentDialog
        row={actions.appointment.row}
        form={actions.appointment.form}
        setForm={actions.appointment.setForm}
        saving={saving}
        onClose={actions.appointment.close}
        onSubmit={actions.appointment.submit}
      />
      <ResaleOrderDialog
        row={actions.resale.row}
        form={actions.resale.form}
        setForm={actions.resale.setForm}
        saving={saving}
        onClose={actions.resale.close}
        onSubmit={actions.resale.submit}
      />
    </div>
  );
}

export default ResaleTrackingPage;
