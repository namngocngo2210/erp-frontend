import { useEffect, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n";
import type { KshipNotePreset } from "./use-kship-note-presets";

type Props = {
  presets: KshipNotePreset[];
  loading: boolean;
  onSelect: (text: string) => void;
  onEnsureLoaded: () => void;
  onOpenManage: () => void;
  /** Compact = icon-only trigger (good for table cells); default shows label too. */
  compact?: boolean;
};

export function KshipNotePresetPicker({
  presets,
  loading,
  onSelect,
  onEnsureLoaded,
  onOpenManage,
  compact,
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) onEnsureLoaded();
  }, [open, onEnsureLoaded]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={
          compact
            ? "shrink-0 rounded-md! border-input! bg-background! px-1.5! py-1.5! text-muted-foreground hover:text-foreground"
            : "shrink-0 rounded-md! border-input! bg-background! px-2! py-1.5! text-xs text-muted-foreground hover:text-foreground"
        }
        title={t("orders.kiotviet.kshipNotePresetsPick", "Chọn mẫu ghi chú")}
      >
        {compact ? null : <span>{t("orders.kiotviet.kshipNotePresetsLabel", "Mẫu")}</span>}
        <ChevronDown className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-70 p-1" side="bottom">
        <div className="max-h-65 overflow-y-auto">
          {loading && presets.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {t("common.loading", "Đang tải...")}
            </div>
          ) : presets.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {t("orders.kiotviet.kshipNotePresetsEmpty", "Chưa có mẫu nào.")}
            </div>
          ) : (
            presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  onSelect(preset.text);
                  setOpen(false);
                }}
                title={preset.text}
              >
                {preset.text}
              </button>
            ))
          )}
        </div>
        <div className="mt-1 border-t border-border pt-1">
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              setOpen(false);
              onOpenManage();
            }}
          >
            <Pencil className="h-3 w-3" />
            {t("orders.kiotviet.kshipNotePresetsManage", "Quản lý mẫu...")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type ManageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: KshipNotePreset[];
  loading: boolean;
  onCreate: (text: string) => Promise<KshipNotePreset>;
  onUpdate: (id: number, patch: { text?: string }) => Promise<KshipNotePreset>;
  onDelete: (id: number) => Promise<void>;
};

export function KshipNotePresetManageDialog({
  open,
  onOpenChange,
  presets,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: ManageDialogProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraft("");
      setEditingId(null);
      setEditingText("");
      setBusy(false);
    }
  }, [open]);

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text) {
      toast.error(
        t("orders.kiotviet.kshipNotePresetsEmptyText", "Nội dung ghi chú không được để trống."),
      );
      return;
    }
    setBusy(true);
    try {
      await onCreate(text);
      setDraft("");
      toast.success(t("orders.kiotviet.kshipNotePresetsAdded", "Đã thêm mẫu."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.unknownError", "Có lỗi xảy ra."));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    const text = editingText.trim();
    if (!text) {
      toast.error(
        t("orders.kiotviet.kshipNotePresetsEmptyText", "Nội dung ghi chú không được để trống."),
      );
      return;
    }
    setBusy(true);
    try {
      await onUpdate(id, { text });
      setEditingId(null);
      setEditingText("");
      toast.success(t("orders.kiotviet.kshipNotePresetsUpdated", "Đã cập nhật mẫu."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.unknownError", "Có lỗi xảy ra."));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    setBusy(true);
    try {
      await onDelete(id);
      if (editingId === id) {
        setEditingId(null);
        setEditingText("");
      }
      toast.success(t("orders.kiotviet.kshipNotePresetsDeleted", "Đã xóa mẫu."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.unknownError", "Có lỗi xảy ra."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] w-[calc(100vw-2rem)]! max-w-140! overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-2">
          <DialogTitle>
            {t("orders.kiotviet.kshipNotePresetsTitle", "Quản lý mẫu ghi chú KShip")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              placeholder={t(
                "orders.kiotviet.kshipNotePresetsAddPlaceholder",
                "Nhập nội dung mẫu mới...",
              )}
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
            />
            <Button size="sm" onClick={handleAdd} disabled={busy || !draft.trim()}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("common.add", "Thêm")}
            </Button>
          </div>

          <div className="rounded-md border border-border">
            {loading && presets.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                {t("common.loading", "Đang tải...")}
              </div>
            ) : presets.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                {t("orders.kiotviet.kshipNotePresetsEmpty", "Chưa có mẫu nào.")}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {presets.map((preset) => {
                  const isEditing = editingId === preset.id;
                  return (
                    <li key={preset.id} className="flex items-center gap-2 px-2 py-1.5">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                            value={editingText}
                            maxLength={500}
                            autoFocus
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !busy) {
                                e.preventDefault();
                                void handleSaveEdit(preset.id);
                              } else if (e.key === "Escape") {
                                setEditingId(null);
                                setEditingText("");
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(preset.id)}
                            disabled={busy}
                          >
                            {t("common.save", "Lưu")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(null);
                              setEditingText("");
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 truncate text-sm" title={preset.text}>
                            {preset.text}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(preset.id);
                              setEditingText(preset.text);
                            }}
                            title={t("common.edit", "Sửa")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(preset.id)}
                            disabled={busy}
                            title={t("common.delete", "Xóa")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close", "Đóng")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
