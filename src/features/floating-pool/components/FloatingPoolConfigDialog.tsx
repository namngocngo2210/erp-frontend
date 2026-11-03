import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Switch } from "@/components/ui/switch";
import { useFloatingPoolConfig, useSaveFloatingPoolConfig } from "@/features/floating-pool/queries";

// Config dialog cho kho số thả nổi: 7 trường theo spec §6 (enabled, stale_days,
// saved_status_codes, max_float_count, daily_claim_limit, max_order_age_days, hide_phone).
export function FloatingPoolConfigDialog() {
  const [open, setOpen] = useState(false);
  const { data: config } = useFloatingPoolConfig();
  const save = useSaveFloatingPoolConfig();

  const [enabled, setEnabled] = useState(false);
  const [staleDays, setStaleDays] = useState(3);
  const [savedCodes, setSavedCodes] = useState<string[]>([]);
  const [maxFloat, setMaxFloat] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(10);
  const [maxAge, setMaxAge] = useState(0);
  const [hidePhone, setHidePhone] = useState(true);

  useEffect(() => {
    if (!config || !open) return;
    setEnabled(config.enabled);
    setStaleDays(config.stale_days);
    setSavedCodes(config.saved_status_codes);
    setMaxFloat(config.max_float_count);
    setDailyLimit(config.daily_claim_limit);
    setMaxAge(config.max_order_age_days);
    setHidePhone(config.hide_phone);
  }, [config, open]);

  const options = (config?.saved_status_options ?? []).map((o) => ({
    value: o.code,
    label: o.label,
  }));

  const handleSave = () => {
    save.mutate(
      {
        enabled,
        stale_days: staleDays,
        saved_status_codes: savedCodes,
        max_float_count: maxFloat,
        daily_claim_limit: dailyLimit,
        max_order_age_days: maxAge,
        hide_phone: hidePhone,
      },
      {
        onSuccess: () => {
          toast.success("Đã lưu cấu hình kho số.");
          setOpen(false);
        },
        onError: () => toast.error("Lưu cấu hình thất bại."),
      },
    );
  };

  const numberField = (
    id: string,
    label: string,
    value: number,
    set: (n: number) => void,
    hint?: string,
  ) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={0}
        value={value}
        onChange={(e) => set(Number(e.target.value) || 0)}
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Settings className="mr-1 h-4 w-4" />
        Cấu hình
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <FormDialogShell
          title="Cấu hình kho số thả nổi"
          description="Đơn không tác nghiệp và không có lịch hẹn sau X ngày sẽ bị đưa vào kho."
          footer={
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button onClick={handleSave} disabled={save.isPending}>
                Lưu
              </Button>
            </>
          }
        >
          <FormGrid columns={2}>
            <div className="col-span-full flex items-center gap-2">
              <Switch id="floating-pool-enabled" checked={enabled} onCheckedChange={setEnabled} />
              <label
                htmlFor="floating-pool-enabled"
                className="text-sm font-medium text-foreground"
              >
                Bật kho số thả nổi
              </label>
            </div>
            {numberField(
              "floating-pool-stale-days",
              "Số ngày không tác nghiệp thì thả nổi (X)",
              staleDays,
              setStaleDays,
            )}
            {numberField(
              "floating-pool-max-float",
              "Số lần nổi tối đa mỗi đơn (N)",
              maxFloat,
              setMaxFloat,
            )}
            {numberField(
              "floating-pool-daily-limit",
              "Lượt nhặt tối đa mỗi ngày mỗi sale (M)",
              dailyLimit,
              setDailyLimit,
              "0 = không giới hạn",
            )}
            {numberField(
              "floating-pool-max-age",
              "Tuổi đơn tối đa được thả (Z, ngày)",
              maxAge,
              setMaxAge,
              "0 = không giới hạn",
            )}
            <div className="col-span-full">
              <label className="mb-1 block text-sm text-muted-foreground">
                Trạng thái được cứu (không bị thả nổi)
              </label>
              <MultiSelect
                options={options}
                selected={savedCodes}
                onChange={setSavedCodes}
                placeholder="Chọn trạng thái sale"
                menuPortal
              />
            </div>
            <div className="col-span-full flex items-center gap-2">
              <Switch
                id="floating-pool-hide-phone"
                checked={hidePhone}
                onCheckedChange={setHidePhone}
              />
              <label
                htmlFor="floating-pool-hide-phone"
                className="text-sm font-medium text-foreground"
              >
                Ẩn số điện thoại trong kho
              </label>
            </div>
          </FormGrid>
        </FormDialogShell>
      </Dialog>
    </>
  );
}
