import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
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
import {
  createChannelType,
  deleteChannelType,
  listChannelTypes,
  updateChannelType,
  type ChannelType,
} from "@/lib/api/channels";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Gọi sau mỗi thay đổi để trang kênh nạp lại danh mục cho các dropdown. */
  onChanged: () => void;
};

/** Chuẩn hoá mã: BE cũng lower()+trim, làm sớm ở client để người dùng thấy ngay. */
function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Quản lý danh mục loại kênh bán (Shopee/TikTok/Facebook/Web/...).
 *
 * Ba ràng buộc nghiệp vụ đến từ BE, UI phải phản ánh đúng để người dùng không
 * thao tác vào chỗ không có tác dụng:
 * - `code` chỉ đặt được LÚC TẠO. Nó là khoá nghiệp vụ (báo cáo + reverse của
 *   migration 0024) nên PATCH cố ý bỏ qua field này.
 * - Xoá loại đang được kênh dùng bị chặn (FK PROTECT) — cột "Số kênh" cho thấy
 *   trước con số, và nút xoá bị khoá thay vì để người dùng bấm rồi ăn lỗi.
 * - Tắt (`is_active`) là cách "nghỉ dùng" đúng: ẩn khỏi mọi dropdown mà không
 *   đụng vào kênh đã gán.
 */
export function ChannelTypesDialog({ open, onOpenChange, onChanged }: Props) {
  const { t } = useI18n();
  const [rows, setRows] = useState<ChannelType[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ code: "", name: "", sortOrder: "" });
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // include_inactive: màn quản lý phải thấy cả loại đã tắt, khác dropdown.
      setRows(await listChannelTypes(true));
    } catch {
      toast.error(t("channels.types.toast.loadFailed", "Không tải được danh mục loại kênh."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  const patchRow = (id: number, patch: Partial<ChannelType>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const submitCreate = async () => {
    const code = normalizeCode(draft.code);
    const name = draft.name.trim();
    if (!code || !name) {
      toast.error(t("channels.types.toast.required", "Vui lòng nhập đủ mã và tên loại kênh."));
      return;
    }
    setCreating(true);
    try {
      await createChannelType({
        code,
        name,
        sort_order: Number(draft.sortOrder) || 0,
      });
      setDraft({ code: "", name: "", sortOrder: "" });
      await reload();
      onChanged();
      toast.success(t("channels.types.toast.created", "Đã thêm loại kênh."));
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : t("channels.types.toast.failed", "Thao tác thất bại."),
      );
    } finally {
      setCreating(false);
    }
  };

  const saveRow = async (row: ChannelType) => {
    const name = (row.name ?? "").trim();
    if (!name) {
      toast.error(t("channels.types.toast.nameRequired", "Tên loại kênh không được rỗng."));
      return;
    }
    setBusyId(row.id);
    try {
      await updateChannelType(row.id, { name, sort_order: row.sort_order ?? 0 });
      await reload();
      onChanged();
      toast.success(t("channels.types.toast.saved", "Đã lưu loại kênh."));
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : t("channels.types.toast.failed", "Thao tác thất bại."),
      );
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (row: ChannelType, isActive: boolean) => {
    setBusyId(row.id);
    // Optimistic: Switch phải nhảy ngay, reload() phía dưới mới là nguồn sự thật.
    patchRow(row.id, { is_active: isActive });
    try {
      await updateChannelType(row.id, { is_active: isActive });
      onChanged();
    } catch (err) {
      patchRow(row.id, { is_active: !isActive });
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : t("channels.types.toast.failed", "Thao tác thất bại."),
      );
    } finally {
      setBusyId(null);
    }
  };

  const removeRow = async (row: ChannelType) => {
    setBusyId(row.id);
    try {
      await deleteChannelType(row.id);
      await reload();
      onChanged();
      toast.success(t("channels.types.toast.deleted", "Đã xoá loại kênh."));
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : t("channels.types.toast.failed", "Thao tác thất bại."),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={t("channels.types.title", "Quản lý loại kênh")}
        description={t(
          "channels.types.description",
          "Mã loại kênh chỉ đặt được lúc tạo. Loại đang có kênh sử dụng không xoá được — hãy tắt thay vì xoá.",
        )}
        footer={
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close", "Đóng")}
          </Button>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_7rem_auto]">
          <Input
            aria-label={t("channels.types.fields.code", "Mã")}
            placeholder="lazada"
            value={draft.code}
            onChange={(e) => setDraft((p) => ({ ...p, code: e.target.value }))}
          />
          <Input
            aria-label={t("channels.types.fields.name", "Tên")}
            placeholder="Lazada"
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            aria-label={t("channels.types.fields.sortOrder", "Thứ tự")}
            type="number"
            placeholder="50"
            value={draft.sortOrder}
            onChange={(e) => setDraft((p) => ({ ...p, sortOrder: e.target.value }))}
          />
          <Button onClick={submitCreate} disabled={creating} className="inline-flex gap-1.5">
            <Plus className="h-4 w-4" />
            {t("channels.types.actions.add", "Thêm")}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("channels.types.fields.code", "Mã")}</TableHead>
                <TableHead>{t("channels.types.fields.name", "Tên")}</TableHead>
                <TableHead className="w-24">
                  {t("channels.types.fields.sortOrder", "Thứ tự")}
                </TableHead>
                <TableHead className="w-24">
                  {t("channels.types.fields.channelCount", "Số kênh")}
                </TableHead>
                <TableHead className="w-20">{t("common.status")}</TableHead>
                <TableHead className="w-32">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {loading
                      ? t("common.loading", "Đang tải...")
                      : t("channels.types.empty", "Chưa có loại kênh nào.")}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.code}
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={t("channels.types.fields.nameOf", "Tên loại kênh {code}").replace(
                        "{code}",
                        row.code,
                      )}
                      value={row.name}
                      onChange={(e) => patchRow(row.id, { name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={t(
                        "channels.types.fields.sortOrderOf",
                        "Thứ tự loại kênh {code}",
                      ).replace("{code}", row.code)}
                      type="number"
                      value={String(row.sort_order ?? 0)}
                      onChange={(e) =>
                        patchRow(row.id, { sort_order: Number(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{row.channel_count}</TableCell>
                  <TableCell>
                    <Switch
                      checked={row.is_active ?? true}
                      disabled={busyId === row.id}
                      onCheckedChange={(checked) => toggleActive(row, checked)}
                      aria-label={t(
                        "channels.types.actions.toggle",
                        "Bật/tắt loại kênh {code}",
                      ).replace("{code}", row.code)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => saveRow(row)}
                      >
                        {t("common.save")}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        // Còn kênh dùng thì BE chặn (FK PROTECT) — khoá nút luôn để
                        // không đẩy người dùng vào một cú bấm chắc chắn lỗi.
                        disabled={busyId === row.id || (row.channel_count ?? 0) > 0}
                        title={
                          (row.channel_count ?? 0) > 0
                            ? t(
                                "channels.types.actions.deleteBlocked",
                                "Còn kênh đang dùng loại này",
                              )
                            : t("common.delete")
                        }
                        aria-label={t(
                          "channels.types.actions.delete",
                          "Xoá loại kênh {code}",
                        ).replace("{code}", row.code)}
                        onClick={() => removeRow(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
