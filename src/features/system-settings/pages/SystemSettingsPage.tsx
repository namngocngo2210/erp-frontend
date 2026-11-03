import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";
import type { SystemSettingOut, SystemSettingsGroup } from "@/lib/api/systemSettings";
import { formatDateTime } from "@/lib/utils";
import {
  useSystemSettingHistory,
  useSystemSettings,
  useUpdateSystemSettings,
} from "@/features/system-settings/queries";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";

/**
 * Cài đặt → Cấu hình hệ thống (superuser-only). Tab dọc trái = nhóm registry; mỗi
 * tab một form, Lưu chỉ gửi khóa đã đổi. Secret: không bao giờ hiện giá trị —
 * gõ = thay, Xoá = gửi null. Bool gửi "1"/"0" (BE ép kiểu theo registry).
 */

/** Trạng thái chỉnh sửa: chuỗi = giá trị mới; null = xoá/về mặc định. */
type Draft = Record<string, string | null>;

function initialValue(s: SystemSettingOut): string {
  if (s.is_secret) return "";
  if (s.value !== null) return s.value;
  if (s.type === "bool") return s.default ? "1" : "0";
  return String(s.default);
}

function currentValue(s: SystemSettingOut, draft: Draft): string {
  const d = draft[s.key];
  return d === undefined || d === null ? initialValue(s) : d;
}

export default function SystemSettingsPage() {
  const { t } = useI18n();
  const query = useSystemSettings();
  const mutation = useUpdateSystemSettings();
  // useMemo (không phải `query.data?.groups ?? []` trực tiếp): mảng rỗng fallback
  // tạo mới mỗi render làm identity đổi liên tục, kéo theo effect/useMemo bên
  // dưới chạy lại mỗi lần re-render dù data không đổi (react-hooks/exhaustive-deps).
  const groups = useMemo(() => query.data?.groups ?? [], [query.data]);

  const [active, setActive] = useState<string>("");
  const [draft, setDraft] = useState<Draft>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const historyQuery = useSystemSettingHistory(historyKey);

  useEffect(() => {
    if (!active && groups.length > 0) setActive(groups[0].key);
  }, [active, groups]);

  const group: SystemSettingsGroup | undefined = useMemo(
    () => groups.find((g) => g.key === active),
    [groups, active],
  );
  const dirty = Object.keys(draft).length > 0;
  const confirmLeave = useUnsavedGuard(dirty, t("systemSettings.unsavedPrompt"));

  const switchTab = async (key: string) => {
    if (key === active) return;
    if (!(await confirmLeave())) return;
    setDraft({});
    setErrors({});
    setActive(key);
  };

  const setValue = (s: SystemSettingOut, value: string | null) => {
    setDraft((prev) => {
      const next = { ...prev };
      // Trở về giá trị ban đầu → bỏ khỏi draft để nút Lưu tự disable. Với
      // secret, initialValue() luôn là "" — chuỗi rỗng nghĩa là "không đổi",
      // KHÔNG phải "xoá"; chỉ nút Xoá mới gửi null (fix round 1: Hoàn tác gõ
      // "" trước đây không xoá khỏi draft nên Lưu gửi "" → BE xoá nhầm secret
      // đang sống).
      if (value !== null && value === initialValue(s)) delete next[s.key];
      else next[s.key] = value;
      return next;
    });
    setErrors((prev) => {
      const { [s.key]: _omit, ...rest } = prev;
      return rest;
    });
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync(draft);
      setDraft({});
      setErrors({});
      toast.success(t("systemSettings.saved"));
    } catch (error) {
      // fetchJson (src/services/http.ts) ném Error & {status, body}; body là JSON
      // đã parse của response — lỗi validate 400 nằm ở body.errors, không phải
      // trực tiếp trên error.
      const fieldErrors = (error as { body?: { errors?: Record<string, string> } })?.body?.errors;
      if (fieldErrors) setErrors(fieldErrors);
      else toast.error((error as Error)?.message || t("systemSettings.saveFailed"));
    }
  };

  const renderControl = (s: SystemSettingOut) => {
    const value = currentValue(s, draft);
    if (s.is_secret) {
      const clearing = draft[s.key] === null;
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={s.key}
            type="password"
            autoComplete="new-password"
            placeholder={t("systemSettings.secret.placeholder")}
            value={clearing ? "" : value}
            disabled={clearing}
            onChange={(e) => setValue(s, e.target.value)}
            className="max-w-md"
          />
          {clearing ? (
            <>
              <Badge variant="destructive">{t("systemSettings.secret.willClear")}</Badge>
              <Button type="button" variant="ghost" size="sm" onClick={() => setValue(s, "")}>
                {t("systemSettings.secret.undo")}
              </Button>
            </>
          ) : s.is_set ? (
            <>
              <Badge variant="secondary">
                {t("systemSettings.secret.set").replace("{hint}", s.hint ?? "")}
              </Badge>
              <Button type="button" variant="outline" size="sm" onClick={() => setValue(s, null)}>
                {t("systemSettings.secret.clear")}
              </Button>
            </>
          ) : (
            <Badge variant="outline">{t("systemSettings.secret.unset")}</Badge>
          )}
        </div>
      );
    }
    if (s.type === "bool") {
      return (
        <Switch
          id={s.key}
          role="switch"
          aria-label={s.label}
          checked={value === "1"}
          onCheckedChange={(checked) => setValue(s, checked ? "1" : "0")}
        />
      );
    }
    return (
      <Input
        id={s.key}
        type={s.type === "int" || s.type === "float" ? "number" : "text"}
        step={s.type === "float" ? "any" : undefined}
        value={value}
        onChange={(e) => setValue(s, e.target.value)}
        className="max-w-md"
      />
    );
  };

  if (query.isError) {
    return (
      <PageHeader title={t("systemSettings.title")} description={t("systemSettings.loadFailed")} />
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t("systemSettings.title")} description={t("systemSettings.description")} />
      <div className="flex min-h-0 flex-1 gap-4">
        <nav className="w-56 shrink-0 space-y-1" aria-label="groups">
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => switchTab(g.key)}
              className={[
                "w-full rounded-md px-3 py-2 text-left text-sm",
                g.key === active ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted",
              ].join(" ")}
            >
              {g.label}
            </button>
          ))}
        </nav>
        <Card className="min-w-0 flex-1">
          <CardContent className="space-y-6 p-6">
            {group?.settings.map((s) => (
              <div key={s.key} className="grid gap-2 border-b pb-4 last:border-b-0">
                <label htmlFor={s.key} className="text-sm font-medium">
                  {s.label}
                </label>
                {renderControl(s)}
                {errors[s.key] && <p className="text-sm text-destructive">{errors[s.key]}</p>}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {s.help && <span>{s.help}</span>}
                  {!s.is_secret && (
                    <span>{t("systemSettings.default").replace("{value}", String(s.default))}</span>
                  )}
                  {s.updated_at && (
                    <span>
                      {t("systemSettings.lastEdited")
                        .replace("{user}", s.updated_by?.name ?? "—")
                        .replace("{time}", formatDateTime(s.updated_at))}
                    </span>
                  )}
                  <Popover
                    open={historyKey === s.key}
                    onOpenChange={(open) => setHistoryKey(open ? s.key : null)}
                  >
                    {/*
                      Popover.tsx ở repo này không hỗ trợ `asChild` — PopoverTrigger
                      luôn tự render <button>, lồng thêm <Button> vào trong sẽ ra
                      <button> trong <button> (HTML không hợp lệ). Style trực tiếp
                      trigger bằng className thay vì bọc component Button.
                    */}
                    <PopoverTrigger className="h-6 gap-1 rounded-lg border-0 bg-transparent px-2 text-xs font-medium hover:bg-muted">
                      <History className="h-3 w-3" />
                      {t("systemSettings.history")}
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-3 text-xs">
                      {(historyQuery.data ?? []).length === 0 ? (
                        <p>{t("systemSettings.history.empty")}</p>
                      ) : (
                        <ul className="space-y-1">
                          {historyQuery.data!.map((h) => (
                            <li key={h.changed_at}>
                              {formatDateTime(h.changed_at)} · {h.changed_by?.name ?? "—"} ·{" "}
                              <code>{h.old_value || "∅"}</code> → <code>{h.new_value || "∅"}</code>
                            </li>
                          ))}
                        </ul>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button type="button" onClick={handleSave} disabled={!dirty || mutation.isPending}>
                {t("systemSettings.save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
