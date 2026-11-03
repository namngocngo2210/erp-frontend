import { formatDateVi } from "@/lib/format";
import { Settings2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import type { ChannelRow } from "@/features/channels/types";

type Props = {
  channels: ChannelRow[];
  canManage: boolean;
  selectedIds: number[];
  onClearSelection: () => void;
  onToggleAll: () => void;
  onToggleOne: (id: number, shiftKey: boolean) => void;
  onBulkDelete: () => void;
  onManage: (row: ChannelRow) => void;
  togglingIds: number[];
  onToggleStatus: (row: ChannelRow, checked: boolean) => void;
  emptyText: string;
};

export function ChannelsTable({
  channels,
  canManage,
  selectedIds,
  onClearSelection,
  onToggleAll,
  onToggleOne,
  onBulkDelete,
  onManage,
  togglingIds,
  onToggleStatus,
  emptyText,
}: Props) {
  const { t } = useI18n();
  const allChecked = channels.length > 0 && channels.every((row) => selectedIds.includes(row.id));

  return (
    <DataTableShell
      toolbar={
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onClearSelection}
            disabled={selectedIds.length === 0}
          >
            {t("common.clearSelection")}
          </Button>
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
        items={channels}
        getKey={(row: ChannelRow) => row.id}
        emptyText={emptyText}
        table={
          <Table className="min-w-[1150px] [&_td]:px-3 [&_th]:px-3">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 h-11 w-8 px-1! bg-muted/40 text-center shadow-[1px_0_0_0_var(--border)]">
                  <input
                    className="size-3.5"
                    type="checkbox"
                    checked={allChecked}
                    onChange={onToggleAll}
                    aria-label={t("common.selectAll", "Select all")}
                  />
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("common.code")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("channels.fields.kiotvietMappings", "Mapping KiotViet")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("channels.fields.name")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("channels.fields.channelType", "Loại kênh")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("channels.fields.owner")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("channels.fields.landingSource")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("common.status")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("channels.fields.assignees")}
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
              {channels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                    {emptyText}
                  </TableCell>
                </TableRow>
              )}
              {channels.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="sticky left-0 z-10 w-8 px-1! bg-card text-center shadow-[1px_0_0_0_var(--border)]">
                    <input
                      className="size-3.5"
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onClick={(e) => onToggleOne(row.id, e.shiftKey)}
                      onChange={() => {}}
                      aria-label={t("channels.actions.selectRow", "Select channel {code}").replace(
                        "{code}",
                        row.code,
                      )}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell className="text-foreground">
                    {row.kiotviet_mappings?.length ? (
                      <div className="flex flex-col gap-1">
                        {row.kiotviet_mappings.map((m) => (
                          <span key={`${row.id}-${m.kiotviet_channel_id}`} className="text-xs">
                            {m.kiotviet_channel_name ?? `KV#${m.kiotviet_channel_id}`}:{" "}
                            <span className="font-medium">{m.external_sale_channel_id}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                  <TableCell className="text-foreground">
                    {row.channel_type ? (
                      <Badge className="w-fit border-0 bg-primary/15 text-primary">
                        {row.channel_type.name}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-foreground">{row.owner || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.landingpage_source?.length ? (
                      <div className="flex flex-col gap-1">
                        {row.landingpage_source.map((source) => (
                          <span key={`${row.id}-${source}`}>{source}</span>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.is_active}
                        disabled={!canManage || togglingIds.includes(row.id)}
                        onCheckedChange={(checked) => onToggleStatus(row, checked)}
                        aria-label={t(
                          "channels.actions.toggleStatus",
                          "Toggle status for channel {code}",
                        ).replace("{code}", row.code)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.assigned_users?.length ? (
                      <div className="flex flex-col gap-1">
                        {row.assigned_users.map((username) => (
                          <Badge
                            key={`${row.id}-${username}`}
                            className="w-fit border-0 bg-primary/15 text-primary"
                          >
                            {username}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t("common.empty")}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateVi(row.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      title={t("channels.actions.manage")}
                      aria-label={t("channels.actions.manage")}
                      size="icon-sm"
                      variant="outline"
                      className="border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                      disabled={!canManage}
                      onClick={() => onManage(row)}
                    >
                      <Settings2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
        renderCard={(row: ChannelRow) => (
          <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{row.code}</p>
                <p className="font-medium text-foreground">{row.name}</p>
              </div>
              <input
                type="checkbox"
                checked={selectedIds.includes(row.id)}
                onClick={(e) => onToggleOne(row.id, e.shiftKey)}
                onChange={() => {}}
                aria-label={t("channels.actions.selectRow", "Select channel {code}").replace(
                  "{code}",
                  row.code,
                )}
              />
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t("channels.fields.channelType", "Loại kênh")}:{" "}
                </span>
                <span>{row.channel_type?.name ?? "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("channels.fields.owner")}: </span>
                <span>{row.owner || "-"}</span>
              </div>
              <div>
                <p className="text-muted-foreground">{t("channels.fields.landingSource")}:</p>
                {row.landingpage_source?.length ? (
                  <div className="mt-1 flex flex-col gap-1">
                    {row.landingpage_source.map((source) => (
                      <span key={`${row.id}-mobile-${source}`}>{source}</span>
                    ))}
                  </div>
                ) : (
                  <span>-</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.status")}: </span>
                <span className="ml-1 inline-flex items-center align-middle">
                  <Switch
                    checked={row.is_active}
                    disabled={!canManage || togglingIds.includes(row.id)}
                    onCheckedChange={(checked) => onToggleStatus(row, checked)}
                    aria-label={t(
                      "channels.actions.toggleStatus",
                      "Toggle status for channel {code}",
                    ).replace("{code}", row.code)}
                  />
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">{t("channels.fields.assignees")}:</p>
                {row.assigned_users?.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.assigned_users.map((username) => (
                      <Badge
                        key={`${row.id}-mobile-user-${username}`}
                        className="w-fit border-0 bg-primary/15 text-primary"
                      >
                        {username}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span>{t("common.empty")}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.createdAt")}: </span>
                <span>{formatDateVi(row.created_at)}</span>
              </div>
            </div>

            <div className="mt-3">
              <Button
                title={t("channels.actions.manage")}
                aria-label={t("channels.actions.manage")}
                size="sm"
                variant="outline"
                className="w-full border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                disabled={!canManage}
                onClick={() => onManage(row)}
              >
                <Settings2 className="mr-2" />
                {t("channels.actions.manage")}
              </Button>
            </div>
          </div>
        )}
      />
    </DataTableShell>
  );
}
