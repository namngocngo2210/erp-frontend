import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";

import { LocationFormDialog } from "../components/LocationFormDialog";
import type { AttendanceLocation, LocationPayload } from "../attendance-types";
import { useCreateLocation, useDeleteLocation, useLocations, useUpdateLocation } from "../queries";
import { useConfirm } from "@/hooks/use-confirm";

const COLUMN_COUNT = 6;

export default function AttendanceLocationsPage() {
  const { t } = useI18n();
  const { data, isLoading } = useLocations();
  const items = data ?? [];

  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();
  const deleteMutation = useDeleteLocation();
  const confirm = useConfirm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceLocation | null>(null);

  const headerClass = "h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: AttendanceLocation) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const handleSubmit = (payload: LocationPayload) => {
    const onError = (err: unknown) =>
      toast.error(
        err instanceof Error ? err.message : t("hr.location.toast.failed", "Thao tác thất bại."),
      );
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, p: payload },
        {
          onSuccess: () => {
            toast.success(t("hr.location.toast.updated", "Đã cập nhật vị trí."));
            setDialogOpen(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t("hr.location.toast.created", "Đã tạo vị trí."));
          setDialogOpen(false);
        },
        onError,
      });
    }
  };

  const handleDelete = async (row: AttendanceLocation) => {
    if (
      !(await confirm({
        title: t("hr.location.confirm.delete", "Xoá vị trí này?"),
        destructive: true,
      }))
    )
      return;
    deleteMutation.mutate(row.id, {
      onSuccess: () => toast.success(t("hr.location.toast.deleted", "Đã xoá vị trí.")),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : t("hr.location.toast.failed", "Thao tác thất bại."),
        ),
    });
  };

  // Nút Sửa/Xoá dùng chung cho bảng desktop và card mobile.
  const renderRowActions = (row: AttendanceLocation) => (
    <>
      <Button
        title={t("common.edit", "Sửa")}
        aria-label={t("common.edit", "Sửa")}
        size="icon-sm"
        variant="outline"
        className="border-border bg-background text-primary hover:bg-accent"
        onClick={() => openEdit(row)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        title={t("common.delete", "Xoá")}
        aria-label={t("common.delete", "Xoá")}
        size="icon-sm"
        variant="outline"
        className="ml-1 border-border bg-background text-destructive hover:bg-accent"
        disabled={deleteMutation.isPending}
        onClick={() => handleDelete(row)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );

  const renderStatusBadge = (row: AttendanceLocation) => (
    <Badge variant={row.is_active === false ? "secondary" : "default"}>
      {row.is_active === false
        ? t("hr.location.status.inactive", "Tạm ngưng")
        : t("hr.location.status.active", "Hoạt động")}
    </Badge>
  );

  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Button
        className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={openCreate}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("hr.location.create", "Thêm vị trí")}
      </Button>
    </div>
  );

  const table = (
    <Table className="min-w-[760px] [&_td]:px-3 [&_th]:px-3">
      <TableHeader>
        <TableRow>
          <TableHead className={headerClass}>{t("hr.location.col.name", "Tên")}</TableHead>
          <TableHead className={headerClass}>{t("hr.location.col.latitude", "Vĩ độ")}</TableHead>
          <TableHead className={headerClass}>{t("hr.location.col.longitude", "Kinh độ")}</TableHead>
          <TableHead className={headerClass}>
            {t("hr.location.col.radius", "Bán kính (m)")}
          </TableHead>
          <TableHead className={headerClass}>{t("hr.location.col.status", "Trạng thái")}</TableHead>
          <TableHead className={`${headerClass} text-right`}>
            {t("common.actions", "Hành động")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center">
              <LogoSpinner label={t("common.loading", "Đang tải...")} className="mx-auto" />
            </TableCell>
          </TableRow>
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center text-muted-foreground">
              {t("hr.location.empty", "Chưa có vị trí chấm công nào.")}
            </TableCell>
          </TableRow>
        ) : (
          items.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-foreground">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.latitude}</TableCell>
              <TableCell className="text-muted-foreground">{row.longitude}</TableCell>
              <TableCell className="text-muted-foreground">{row.radius_m}</TableCell>
              <TableCell>{renderStatusBadge(row)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {renderRowActions(row)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <DataTableShell loading={isLoading && items.length === 0} toolbar={toolbar}>
        <ResponsiveList
          items={items}
          table={table}
          getKey={(row: AttendanceLocation) => row.id}
          loading={isLoading}
          loadingText={t("common.loading", "Đang tải...")}
          emptyText={t("hr.location.empty", "Chưa có vị trí chấm công nào.")}
          renderCard={(row: AttendanceLocation) => (
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-semibold text-foreground">{row.name}</p>
                {renderStatusBadge(row)}
              </div>
              <dl className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {t("hr.location.col.latitude", "Vĩ độ")} /{" "}
                    {t("hr.location.col.longitude", "Kinh độ")}
                  </dt>
                  <dd className="text-right">
                    {row.latitude}, {row.longitude}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {t("hr.location.col.radius", "Bán kính (m)")}
                  </dt>
                  <dd className="text-right">{row.radius_m}</dd>
                </div>
              </dl>
              <div className="mt-3 flex justify-end">{renderRowActions(row)}</div>
            </div>
          )}
        />
      </DataTableShell>

      <LocationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        location={editing}
        isPending={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </>
  );
}
