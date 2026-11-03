import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import type { ChannelKiotvietMapping } from "@/features/channels/types";

type KiotvietOption = { id: number; name: string };

type Props = {
  value: ChannelKiotvietMapping[];
  onChange: (next: ChannelKiotvietMapping[]) => void;
  kiotvietChannels: KiotvietOption[];
  idPrefix?: string;
};

export function KiotvietMappingsEditor({
  value,
  onChange,
  kiotvietChannels,
  idPrefix = "kvmap",
}: Props) {
  const { t } = useI18n();

  const usedKvIds = new Set(value.map((m) => m.kiotviet_channel_id));
  const availableForNew = kiotvietChannels.filter((kv) => !usedKvIds.has(kv.id));

  const addRow = (kvId: number) => {
    const kv = kiotvietChannels.find((opt) => opt.id === kvId);
    if (!kv) return;
    onChange([
      ...value,
      { kiotviet_channel_id: kv.id, kiotviet_channel_name: kv.name, external_sale_channel_id: "" },
    ]);
  };

  const updateRow = (index: number, ext: string) => {
    onChange(value.map((m, i) => (i === index ? { ...m, external_sale_channel_id: ext } : m)));
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t("channels.fields.kiotvietMappingsEmpty", "Chưa có mapping nào.")}
        </p>
      )}
      {value.map((mapping, index) => {
        const kv = kiotvietChannels.find((opt) => opt.id === mapping.kiotviet_channel_id);
        const label =
          kv?.name ?? mapping.kiotviet_channel_name ?? `KV#${mapping.kiotviet_channel_id}`;
        return (
          <div key={`${mapping.kiotviet_channel_id}-${index}`} className="flex items-center gap-2">
            <span className="min-w-35 truncate text-sm">{label}</span>
            <Input
              id={`${idPrefix}-ext-${mapping.kiotviet_channel_id}`}
              value={mapping.external_sale_channel_id}
              onChange={(e) => updateRow(index, e.target.value)}
              placeholder={t(
                "channels.fields.externalSaleChannelIdPlaceholder",
                "Sale channel ID bên KV",
              )}
              className="flex-1"
            />
            <Button
              size="icon-sm"
              variant="outline"
              className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => removeRow(index)}
              title={t("common.delete", "Xóa")}
              aria-label={t("common.delete", "Xóa")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
      {availableForNew.length > 0 && (
        <Select value="" onValueChange={(v) => addRow(Number(v))}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={t(
                "channels.fields.kiotvietMappingsAdd",
                "Thêm mapping cho KiotViet channel...",
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {availableForNew.map((kv) => (
              <SelectItem key={kv.id} value={String(kv.id)}>
                {kv.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
