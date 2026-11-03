import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import {
  useMediaSettings,
  useTestMediaSettings,
  useUpdateMediaSettings,
} from "@/features/media/queries";
import { useI18n } from "@/i18n";

/**
 * Trang Kết nối Media (admin-only, KHÔNG bọc `MediaAccessGate` — gate theo
 * `requires: "users"` ở registry, không phụ thuộc provisioning cá nhân).
 * Cấu hình base_url ads-crm + shared API key dùng chung cho user chưa có key
 * riêng, cộng nút gọi thử ads-crm để xác nhận key còn hiệu lực.
 */
export default function MediaSettingsPage() {
  const { t } = useI18n();
  const settingsQuery = useMediaSettings();
  const settings = settingsQuery.data;
  const updateMutation = useUpdateMediaSettings();
  const testMutation = useTestMediaSettings();

  const [baseUrl, setBaseUrl] = useState("");
  const [sharedApiKey, setSharedApiKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  // Chỉ nạp form từ settings MỘT LẦN khi tải xong, tránh ghi đè input người
  // dùng đang gõ dở mỗi khi query refetch (vd sau khi Lưu thành công).
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (settings && !loaded) {
      setBaseUrl(settings.base_url);
      setIsActive(settings.is_active);
      setLoaded(true);
    }
  }, [settings, loaded]);

  const handleSave = () => {
    if (!settings) return;
    const payload: { base_url?: string; shared_api_key?: string | null; is_active?: boolean } = {};
    if (baseUrl !== settings.base_url) payload.base_url = baseUrl;
    if (sharedApiKey.trim()) payload.shared_api_key = sharedApiKey.trim();
    if (isActive !== settings.is_active) payload.is_active = isActive;
    updateMutation.mutate(payload, {
      onSuccess: () => {
        setSharedApiKey("");
        toast.success(t("media.settings.saveSuccess"));
      },
      onError: () => toast.error(t("media.settings.saveFailed")),
    });
  };

  const handleClearKey = () => {
    updateMutation.mutate(
      { shared_api_key: null },
      {
        onSuccess: () => {
          setSharedApiKey("");
          toast.success(t("media.settings.saveSuccess"));
        },
        onError: () => toast.error(t("media.settings.saveFailed")),
      },
    );
  };

  const handleTest = () => {
    testMutation.mutate(undefined, {
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : t("media.settings.testFail")),
    });
  };

  const test = testMutation.data;

  return (
    <div className="space-y-4">
      <PageHeader title={t("media.settings.title")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("media.settings.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label
              htmlFor="media-settings-base-url"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.settings.baseUrl")}
            </label>
            <Input
              id="media-settings-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://ads-crm.example.com"
            />
          </div>
          <div>
            <label
              htmlFor="media-settings-key"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("media.settings.sharedKey")}
            </label>
            <Input
              id="media-settings-key"
              type="password"
              autoComplete="off"
              placeholder="dak_..."
              value={sharedApiKey}
              onChange={(e) => setSharedApiKey(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {settings?.shared_api_key_set ? `${settings.shared_api_key_prefix}… ` : null}
              {t("media.settings.sharedKeyHint")}
              {settings?.shared_api_key_set ? (
                <button
                  type="button"
                  className="ml-1 text-rose-600 underline"
                  onClick={handleClearKey}
                >
                  {t("media.settings.clearKey")}
                </button>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="media-settings-active" checked={isActive} onCheckedChange={setIsActive} />
            <label htmlFor="media-settings-active" className="text-sm text-muted-foreground">
              {t("media.settings.active")}
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {t("media.settings.save")}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testMutation.isPending}>
              {t("media.settings.test")}
            </Button>
          </div>
          {settings?.last_check_at ? (
            <p className="text-xs text-muted-foreground">
              {t("media.settings.lastCheck")}: {settings.last_check_at} —{" "}
              {settings.last_check_ok ? t("media.settings.testOk") : settings.last_check_error}
            </p>
          ) : null}
          {test ? (
            <div
              className={
                test.ok
                  ? "rounded-md border border-action-success/30 bg-action-success/10 p-3 text-sm text-action-success"
                  : "rounded-md border border-action-danger/30 bg-action-danger/10 p-3 text-sm text-action-danger"
              }
            >
              {test.ok ? (
                <p>
                  {t("media.settings.testOk")}: {test.role} / {test.username}
                </p>
              ) : (
                <p>
                  {t("media.settings.testFail")}: {test.error}
                </p>
              )}
              {test.warning ? <p className="mt-1">{test.warning}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
