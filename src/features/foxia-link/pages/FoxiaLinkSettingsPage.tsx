import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useI18n } from "@/i18n";
import {
  addLinkChannels,
  deleteLinkChannel,
  saveLinkCells,
  type FoxiaLinkCellInput,
  type FoxiaLinkGrid,
} from "@/lib/api/foxia-link";
import { foxiaLinkKeys, useFoxiaLinkGrid } from "@/features/foxia-link/queries";
import { ChannelPickerDialog } from "@/features/foxia-link/components/ChannelPickerDialog";
import { useConfirm } from "@/hooks/use-confirm";

/**
 * Trang "Cấu hình liên kết Foxia" (superuser-only).
 *
 * Bảng: hàng = kênh bán, cột = loại nguồn cố định do BE trả (`kinds`: landing,
 * messenger, hotline, zalo, resale — nguồn chủ hệ thống đã tạo bên Foxia), ô =
 * `idnguonkhachhang`. Đơn của kênh được đẩy vào id ở cột trùng `order_source`
 * của đơn — spec 2026-09-09, đổi trục 2026-09-16.
 *
 * Ô đang gõ giữ ở `draft` dạng CHUỖI, không ép số ngay: gõ dở "12" rồi ép số sẽ
 * làm con trỏ nhảy và không phân biệt được "đang xoá trắng" với "số 0".
 */
const cellKey = (rowId: number, kind: string) => `${rowId}:${kind}`;
const parseKey = (key: string): [rowId: number, kind: string] => {
  const [row, kind] = key.split(":");
  return [Number(row), kind];
};

export default function FoxiaLinkSettingsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const gridQuery = useFoxiaLinkGrid();
  const grid: FoxiaLinkGrid = gridQuery.data ?? { channels: [], kinds: [], cells: [] };

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  /** Giá trị đã lưu trên server, tra theo hàng:cột. */
  const saved = useMemo(() => {
    const map: Record<string, { id: number; sourceName: string }> = {};
    for (const cell of grid.cells) {
      map[cellKey(cell.link_channel_id, cell.kind)] = {
        id: cell.foxia_source_id,
        sourceName: cell.source_name,
      };
    }
    return map;
  }, [grid.cells]);

  /** Chỉ những ô THỰC SỰ khác server mới được gửi đi (kể cả sửa rồi sửa lại về cũ). */
  const changed: FoxiaLinkCellInput[] = useMemo(() => {
    const out: FoxiaLinkCellInput[] = [];
    for (const [key, raw] of Object.entries(draft)) {
      const [rowId, kind] = parseKey(key);
      const current = saved[key]?.id ?? null;
      const next = raw.trim() === "" ? null : Number(raw.trim());
      if (next !== null && !Number.isFinite(next)) continue;
      if (next === current) continue;
      out.push({ link_channel_id: rowId, kind, foxia_source_id: next });
    }
    return out;
  }, [draft, saved]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: foxiaLinkKeys.grid });

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveLinkCells(changed);
      setDraft({});
      await refresh();
      toast.success(t("foxiaLink.saved"));
    } catch (error) {
      toast.error((error as Error)?.message || t("foxiaLink.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  /** Số ô ĐANG có id trong một hàng — con số đưa vào hộp xác nhận. */
  const countCells = (rowId: number) =>
    grid.cells.filter((cell) => cell.link_channel_id === rowId).length;

  /** Xoá khỏi `draft` chỉ những ô thuộc hàng vừa bị xoá server — giữ nguyên
   * các ô đang sửa dở ở hàng khác (deferred #6, review 2026-09-09). */
  const clearDraftForRow = (rowId: number) => {
    setDraft((prev) => {
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (parseKey(key)[0] !== rowId) next[key] = value;
      }
      return next;
    });
  };

  const handleRemoveChannel = async (rowId: number, name: string) => {
    const message = t("foxiaLink.confirmRemoveChannel")
      .replace("{name}", name)
      .replace("{count}", String(countCells(rowId)));
    if (!(await confirm({ title: message, confirmText: t("common.delete"), destructive: true })))
      return;
    try {
      await deleteLinkChannel(rowId);
      clearDraftForRow(rowId);
      await refresh();
    } catch (error) {
      toast.error((error as Error)?.message || t("foxiaLink.removeChannelFailed"));
    }
  };

  const isEmpty = grid.channels.length === 0;

  const renderCell = (rowId: number, kind: string, label: string) => {
    const key = cellKey(rowId, kind);
    const current = saved[key];
    const value = draft[key] ?? (current ? String(current.id) : "");
    const dirty = key in draft && value !== (current ? String(current.id) : "");
    return (
      <td key={kind} className="border-b border-r p-2 align-top">
        <Input
          inputMode="numeric"
          aria-label={label}
          value={value}
          onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
          className={dirty ? "bg-action-warning/10" : undefined}
        />
        {current?.sourceName ? (
          <div className="mt-1 text-xs text-muted-foreground">{current.sourceName}</div>
        ) : null}
      </td>
    );
  };

  return (
    <div className="space-y-4 p-4">
      <PageHeader title={t("foxiaLink.title")} description={t("foxiaLink.description")} />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setPickerOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t("foxiaLink.addChannel")}
        </Button>
        <div className="ml-auto flex items-center gap-3">
          {changed.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {t("foxiaLink.pendingCount").replace("{count}", String(changed.length))}
            </span>
          )}
          <Button onClick={handleSave} disabled={changed.length === 0 || saving}>
            {t("foxiaLink.save")}
          </Button>
        </div>
      </div>

      {gridQuery.isLoading && <div className="p-8 text-center text-sm">{t("common.loading")}</div>}
      {gridQuery.isError && (
        <div className="p-8 text-center text-sm text-destructive">
          {(gridQuery.error as Error)?.message}
        </div>
      )}

      {!gridQuery.isLoading && isEmpty && (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          {t("foxiaLink.empty")}
        </div>
      )}

      {!gridQuery.isLoading && !isEmpty && (
        // Bảng có thể rộng hơn màn hình nhỏ — cuộn NGANG bên trong khung, không đẩy cả trang.
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-background">
              <tr>
                <th className="sticky left-0 z-30 min-w-56 border-b border-r bg-background p-2 text-left">
                  {t("foxiaLink.columnChannel")}
                </th>
                {grid.kinds.map((kind) => (
                  <th key={kind.value} className="min-w-40 border-b border-r p-2 text-left">
                    {kind.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.channels.map((row) => (
                <tr key={row.id}>
                  <th className="sticky left-0 z-10 border-b border-r bg-background p-2 text-left align-top font-normal">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.code}</div>
                      </div>
                      <button
                        type="button"
                        aria-label={`${t("foxiaLink.removeChannel")} ${row.name}`}
                        onClick={() => handleRemoveChannel(row.id, row.name)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                  {grid.kinds.map((kind) =>
                    renderCell(row.id, kind.value, `${row.name} × ${kind.label}`),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pickerOpen && (
        <ChannelPickerDialog
          excludeIds={grid.channels.map((c) => c.channel_id)}
          onClose={() => setPickerOpen(false)}
          onConfirm={async (ids) => {
            if (ids.length > 0) {
              await addLinkChannels(ids);
              await refresh();
            }
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
