import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { listChannels } from "@/lib/api/channels";

type Props = {
  /** id kênh THẬT (channel_id) đã có sẵn trong bảng — ẩn khỏi danh sách chọn. */
  excludeIds: number[];
  onClose: () => void;
  onConfirm: (ids: number[]) => Promise<void>;
};

/**
 * Hộp chọn kênh để thêm hàng vào bảng. Ẩn kênh ĐÃ có trong bảng — thêm lại là
 * no-op ở BE, nhưng để chúng hiện ra chỉ làm người dùng tưởng mình quên.
 *
 * `listChannels()` trả trọn danh sách (không có tìm kiếm server) nên lọc theo
 * từ khoá ngay ở client.
 */
export function ChannelPickerDialog({ excludeIds, onClose, onConfirm }: Props) {
  const { t } = useI18n();
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const optionsQuery = useQuery({
    queryKey: ["foxia-link", "axis-options", "channel"],
    queryFn: async () =>
      (await listChannels()).map((row) => ({ id: row.id, label: row.name, hint: row.code })),
  });

  const excluded = new Set(excludeIds);
  const needle = term.trim().toLowerCase();
  const options = (optionsQuery.data ?? [])
    .filter((option) => !excluded.has(option.id))
    .filter(
      (option) => needle === "" || `${option.label} ${option.hint}`.toLowerCase().includes(needle),
    );

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(selected);
    } catch (error) {
      toast.error((error as Error)?.message || t("foxiaLink.addChannelFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="panel">
        <DialogHeader>
          <DialogTitle>{t("foxiaLink.pickChannel")}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 pt-0">
          <Input
            autoFocus
            placeholder={t("foxiaLink.search")}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
            {options.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 border-b p-2 last:border-b-0 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.includes(option.id)}
                  onCheckedChange={(checked) =>
                    setSelected((prev) =>
                      checked ? [...prev, option.id] : prev.filter((id) => id !== option.id),
                    )
                  }
                />
                <span>{option.label}</span>
                {option.hint ? (
                  <span className="text-xs text-muted-foreground">{option.hint}</span>
                ) : null}
              </label>
            ))}
            {optionsQuery.isSuccess && options.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("common.empty")}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={selected.length === 0 || submitting}>
            {t("foxiaLink.addChannel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
