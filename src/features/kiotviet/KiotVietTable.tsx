import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
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
import type { KiotVietChannelRow } from "@/features/kiotviet/types";
import { formatDateVi } from "@/lib/format";

type Props = {
  rows: KiotVietChannelRow[];
  selectedIds: number[];
  allChecked: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: number, shiftKey: boolean) => void;
  onBulkDelete: () => void;
  onEdit: (row: KiotVietChannelRow) => void;
  onDelete: (rowId: number) => void;
  emptyText: string;
};

export function KiotVietTable({
  rows,
  selectedIds,
  allChecked,
  onToggleAll,
  onToggleOne,
  onBulkDelete,
  onEdit,
  onDelete,
  emptyText,
}: Props) {
  const { t } = useI18n();

  const renderBranchIds = (row: KiotVietChannelRow) => {
    const values =
      row.branch_ids && row.branch_ids.length > 0
        ? row.branch_ids
        : row.branch_id
          ? [row.branch_id]
          : [];
    if (values.length === 0) return "-";

    return (
      <div className="flex flex-col items-start gap-1">
        {values.map((value, index) => (
          <Badge key={`${value}-${index}`} variant="outline" className="font-normal">
            {value}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <DataTableShell
      toolbar={
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            disabled={selectedIds.length === 0}
            className="inline-flex items-center gap-1.5"
            aria-label={t("common.deleteSelected")}
            title={t("common.deleteSelected")}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t("common.deleteSelected", "Xóa đã chọn ({count})").replace(
                "{count}",
                String(selectedIds.length),
              )}
            </span>
          </Button>
        </div>
      }
    >
      <ResponsiveList
        items={rows}
        getKey={(row: KiotVietChannelRow) => row.id}
        emptyText={emptyText}
        table={
          <Table className="min-w-[980px] [&_td]:px-3 [&_th]:px-3">
            <TableHeader>
              <TableRow>
                <TableHead className="h-11 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={onToggleAll}
                    aria-label={t("common.selectAll", "Select all")}
                  />
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("kiotviet.fields.name")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("kiotviet.fields.branchId")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("kiotviet.fields.clientId")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("kiotviet.fields.clientSecret")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("kiotviet.fields.retailer")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("common.createdAt")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    {emptyText}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onClick={(e) => onToggleOne(row.id, e.shiftKey)}
                      onChange={() => {}}
                      aria-label={t(
                        "kiotviet.actions.selectRow",
                        "Select KiotViet row {name}",
                      ).replace("{name}", row.name)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                  <TableCell>{renderBranchIds(row)}</TableCell>
                  <TableCell>{row.client_id}</TableCell>
                  <TableCell className="max-w-52 truncate" title="****">
                    ****
                  </TableCell>
                  <TableCell>{row.retailer}</TableCell>
                  <TableCell>{formatDateVi(row.created_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Button
                        aria-label={t("common.edit")}
                        title={t("common.edit")}
                        size="icon-sm"
                        variant="outline"
                        className="border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        aria-label={t("common.delete")}
                        title={t("common.delete")}
                        size="icon-sm"
                        variant="outline"
                        className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                        onClick={() => onDelete(row.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
        renderCard={(row: KiotVietChannelRow) => (
          <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{row.name}</p>
                <p className="text-sm text-muted-foreground">{row.retailer}</p>
              </div>
              <input
                type="checkbox"
                checked={selectedIds.includes(row.id)}
                onClick={(e) => onToggleOne(row.id, e.shiftKey)}
                onChange={() => {}}
                aria-label={t("kiotviet.actions.selectRow", "Select KiotViet row {name}").replace(
                  "{name}",
                  row.name,
                )}
              />
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t("kiotviet.fields.branchId")}: </span>
                <div className="mt-1">{renderBranchIds(row)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t("kiotviet.fields.clientId")}: </span>
                <span>{row.client_id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("kiotviet.fields.clientSecret")}: </span>
                <span>****</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.createdAt")}: </span>
                <span>{formatDateVi(row.created_at)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button
                aria-label={t("common.edit")}
                title={t("common.edit")}
                size="sm"
                variant="outline"
                className="flex-1 border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                onClick={() => onEdit(row)}
              >
                <Pencil className="mr-2" />
                {t("common.edit")}
              </Button>
              <Button
                aria-label={t("common.delete")}
                title={t("common.delete")}
                size="sm"
                variant="outline"
                className="flex-1 border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={() => onDelete(row.id)}
              >
                <Trash2 className="mr-2" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        )}
      />
    </DataTableShell>
  );
}
