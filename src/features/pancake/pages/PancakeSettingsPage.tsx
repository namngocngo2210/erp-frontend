import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { listChannels, listChannelStaff } from "@/lib/api/channels";
import {
  saveConnection,
  saveStaffMaps,
  syncPages,
  updatePage,
  type PancakePage,
  type PancakeStaffMap,
} from "@/lib/api/pancake";
import { formatDateTime } from "@/lib/utils";
import {
  pancakeKeys,
  usePancakeConnection,
  usePancakePages,
  usePancakeStaffMaps,
} from "@/features/pancake/queries";

/**
 * Cài đặt → Pancake (superuser-only): token tài khoản, đồng bộ page, gán page ↔
 * kênh bán, bật/tắt poll. Bật page cần kênh + nền tảng có cột Foxia (BE validate
 * lại; FE chỉ khoá control để người dùng không bấm vào chỗ chắc chắn 400).
 */
export default function PancakeSettingsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const connectionQuery = usePancakeConnection();
  const pagesQuery = usePancakePages();
  const channelsQuery = useQuery({ queryKey: ["channels", "for-pancake"], queryFn: listChannels });
  const staffMapsQuery = usePancakeStaffMaps();
  const staffUsersQuery = useQuery({
    queryKey: ["channels", "staff", "for-pancake"],
    queryFn: () => listChannelStaff(),
  });

  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [busyPage, setBusyPage] = useState<number | null>(null);
  const [busyStaff, setBusyStaff] = useState<number | null>(null);

  const connection = connectionQuery.data;
  const pages = pagesQuery.data ?? [];
  const channels = (channelsQuery.data ?? []).filter((c) => c.is_active);
  const staffMaps = staffMapsQuery.data ?? [];
  const staffUsers = staffUsersQuery.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: pancakeKeys.all });

  const handleSaveToken = async () => {
    const value = token.trim();
    if (!value) return;
    setSaving(true);
    try {
      await saveConnection(value);
      setToken("");
      toast.success(t("pancake.connection.saved"));
    } catch (error) {
      toast.error((error as Error)?.message || t("pancake.connection.saveFailed"));
    } finally {
      setSaving(false);
      // BE lưu auth_status/auth_error kể cả khi PUT trả lỗi (token sai) — refetch
      // cả hai nhánh để thẻ Kết nối không đứng hình ở trạng thái cũ.
      await invalidate();
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPages();
      toast.success(
        t("pancake.pages.synced")
          .replace("{fetched}", String(result.fetched))
          .replace("{created}", String(result.created))
          .replace("{deactivated}", String(result.deactivated)),
      );
    } catch (error) {
      toast.error((error as Error)?.message || t("pancake.pages.syncFailed"));
    } finally {
      setSyncing(false);
      // Tương tự: BE có thể đã cập nhật auth_status trước khi đồng bộ page lỗi.
      await invalidate();
    }
  };

  const patchPage = async (
    page: PancakePage,
    patch: { channel_id?: number | null; is_enabled?: boolean },
  ) => {
    setBusyPage(page.id);
    try {
      await updatePage(page.id, patch);
      toast.success(t("pancake.pages.updated"));
    } catch (error) {
      toast.error((error as Error)?.message || t("pancake.pages.updateFailed"));
    } finally {
      setBusyPage(null);
      await invalidate();
    }
  };

  const handleStaffChange = async (map: PancakeStaffMap, userId: number | null) => {
    setBusyStaff(map.id);
    try {
      await saveStaffMaps([{ id: map.id, user_id: userId }]);
      toast.success(t("pancake.staff.saved"));
    } catch (error) {
      toast.error((error as Error)?.message || t("pancake.staff.saveFailed"));
    } finally {
      setBusyStaff(null);
      await invalidate();
    }
  };

  const statusLabel = (status: string) => t(`pancake.connection.status.${status}`, status);
  const statusVariant = (status?: string) =>
    status === "ok" ? "success" : status === "error" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pancake.settings.title")}
        description={t("pancake.settings.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("pancake.connection.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={statusVariant(connection?.auth_status)}>
              {statusLabel(connection?.auth_status ?? "unknown")}
            </Badge>
            {connection?.auth_error && (
              <span className="text-destructive">{connection.auth_error}</span>
            )}
            {connection?.last_pages_synced_at && (
              <span className="text-muted-foreground">
                {t("pancake.connection.lastSynced").replace(
                  "{time}",
                  formatDateTime(connection.last_pages_synced_at),
                )}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label htmlFor="pancake-token" className="text-sm font-medium">
                {t("pancake.connection.tokenLabel")}
              </label>
              <Input
                id="pancake-token"
                type="password"
                autoComplete="off"
                value={token}
                placeholder={
                  connection?.has_token
                    ? t("pancake.connection.hasToken")
                    : t("pancake.connection.tokenPlaceholder")
                }
                onChange={(event) => setToken(event.target.value)}
              />
            </div>
            <Button onClick={handleSaveToken} disabled={saving || !token.trim()}>
              {t("pancake.connection.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("pancake.pages.title")}</CardTitle>
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing || !connection?.has_token}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("pancake.pages.sync")}
          </Button>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("pancake.pages.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pancake.pages.col.name")}</TableHead>
                  <TableHead>{t("pancake.pages.col.platform")}</TableHead>
                  <TableHead>{t("pancake.pages.col.channel")}</TableHead>
                  <TableHead>{t("pancake.pages.col.enabled")}</TableHead>
                  <TableHead>{t("pancake.pages.col.lastPolled")}</TableHead>
                  <TableHead>{t("pancake.pages.col.error")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => {
                  const unsupported = page.foxia_kind === null;
                  const busy = busyPage === page.id;
                  const error = page.token_error || page.last_error;
                  return (
                    <TableRow
                      key={page.id}
                      className={page.is_activated ? undefined : "opacity-50"}
                    >
                      <TableCell>
                        <div className="font-medium">{page.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {page.pancake_page_id}
                          {!page.is_activated && ` · ${t("pancake.pages.inactive")}`}
                        </div>
                      </TableCell>
                      <TableCell>{page.platform}</TableCell>
                      <TableCell>
                        <Select
                          value={page.channel_id != null ? String(page.channel_id) : ""}
                          disabled={unsupported || busy}
                          onValueChange={(value) =>
                            patchPage(page, { channel_id: value ? Number(value) : null })
                          }
                        >
                          <SelectTrigger
                            aria-label={`${t("pancake.pages.col.channel")}: ${page.name}`}
                            title={unsupported ? t("pancake.pages.unsupported") : undefined}
                            className="h-9 min-w-40"
                          >
                            <SelectValue placeholder={t("pancake.pages.noChannel")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t("pancake.pages.noChannel")}</SelectItem>
                            {channels.map((channel) => (
                              <SelectItem key={channel.id} value={String(channel.id)}>
                                {channel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          aria-label={`${t("pancake.pages.col.enabled")}: ${page.name}`}
                          checked={page.is_enabled}
                          disabled={unsupported || busy || page.channel_id === null}
                          onCheckedChange={(checked) => patchPage(page, { is_enabled: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {page.last_polled_at ? formatDateTime(page.last_polled_at) : "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-[16rem] truncate text-sm text-destructive"
                        title={error}
                      >
                        {error}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("pancake.staff.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("pancake.staff.description")}</p>
        </CardHeader>
        <CardContent>
          {staffMaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("pancake.staff.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pancake.staff.col.name")}</TableHead>
                  <TableHead>{t("pancake.staff.col.user")}</TableHead>
                  <TableHead>{t("pancake.staff.col.lastSeen")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMaps.map((map) => (
                  <TableRow key={map.id}>
                    <TableCell className="font-medium">{map.pancake_name}</TableCell>
                    <TableCell>
                      <Select
                        value={map.user_id != null ? String(map.user_id) : ""}
                        disabled={busyStaff === map.id}
                        onValueChange={(value) =>
                          handleStaffChange(map, value ? Number(value) : null)
                        }
                      >
                        <SelectTrigger
                          aria-label={`${t("pancake.staff.col.user")}: ${map.pancake_name}`}
                          className="h-9 min-w-40"
                        >
                          <SelectValue placeholder={t("pancake.staff.noUser")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">{t("pancake.staff.noUser")}</SelectItem>
                          {staffUsers.map((user) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.display_name || user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {map.last_seen_at ? formatDateTime(map.last_seen_at) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
