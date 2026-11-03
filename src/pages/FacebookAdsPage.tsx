import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoSpinner, LogoSpinnerOverlay } from "@/components/ui/logo-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { FacebookAdsCard } from "@/features/ads/components/FacebookAdsCard";
import { AdsSpendCell } from "@/features/ads/components/AdsSpendCell";
import { AdsSpendFilterBar } from "@/features/ads/components/AdsSpendFilterBar";
import {
  isSpendFilterReady,
  useCreateFacebookApp,
  useDeleteFacebookApp,
  useFacebookAdAccounts,
  useFacebookApps,
  useFacebookDailySpendSummary,
  useSyncFacebookAdAccounts,
  useSyncFacebookDailySpend,
  useUpdateFacebookApp,
} from "@/features/ads/queries";
import {
  type AdsSpendMetricsBase,
  fmtInt,
  useAdsSpendFilters,
  useAdsSpendMetrics,
  useAdsSpendSelection,
} from "@/features/ads/useAdsPlatformReport";
import type {
  DailySpendSummary,
  FacebookApp,
  FacebookAppPartialPayload,
  FacebookAppUpsertPayload,
} from "@/lib/api/facebook_ads";
import { formatDateVi } from "@/lib/format";
import { useConfirm } from "@/hooks/use-confirm";

// Trạng thái token do backend ghi (debug_token / kết quả cron). Hiện ngay trên bảng
// để người vận hành biết phải cấp lại token, thay vì đợi báo cáo lệch mới phát hiện.
// Xem docs/facebook-token-lifecycle-2026-07-27.md.
const TOKEN_BADGE: Record<
  string,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  ok: { label: "Hợp lệ", variant: "success" },
  expiring: { label: "Sắp hết hạn", variant: "warning" },
  invalid: { label: "Hỏng", variant: "destructive" },
  unknown: { label: "Chưa kiểm tra", variant: "secondary" },
};

function TokenStatusCell({ app }: { app: FacebookApp }) {
  const badge = TOKEN_BADGE[app.token_status ?? "unknown"] ?? TOKEN_BADGE.unknown;
  const expiresAt = app.token_expires_at;
  const checked = app.token_checked_at;

  let hint: string | null = null;
  if (app.token_status === "ok" && !expiresAt && checked) {
    hint = "Không hết hạn";
  } else if (expiresAt) {
    hint = `Hết hạn ${formatDateVi(expiresAt)}`;
  }

  return (
    <div className="space-y-1">
      <Badge variant={badge.variant}>{badge.label}</Badge>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      {app.token_error && (
        <div className="max-w-55 truncate text-xs text-destructive" title={app.token_error}>
          {app.token_error}
        </div>
      )}
    </div>
  );
}

type DialogState = { mode: "create" } | { mode: "edit"; app: FacebookApp } | null;

const EMPTY_FORM: FacebookAppUpsertPayload = {
  name: "",
  app_id: "",
  app_secret: "",
  access_token: "",
  note: "",
};

interface AggMetrics extends AdsSpendMetricsBase {
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  reach: number;
}

const EMPTY_METRICS: AggMetrics = {
  spend: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
  cpm: 0,
  reach: 0,
  loading: false,
};

type SpendRow = DailySpendSummary["by_account"][string];

/** Map 1 dòng summary của BE thành metrics hiển thị (logic cũ của page). */
function buildAggMetrics(row: SpendRow | undefined): AggMetrics {
  return {
    spend: Number(row?.spend ?? 0) || 0,
    impressions: row?.impressions ?? 0,
    clicks: row?.clicks ?? 0,
    ctr: 0,
    cpm: 0,
    reach: row?.reach ?? 0,
    loading: false,
  };
}

interface FacebookAdsPageProps {
  isAdmin?: boolean;
}

function FacebookAdsPage({ isAdmin = false }: FacebookAdsPageProps = {}) {
  const [appsExpanded, setAppsExpanded] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [form, setForm] = useState<FacebookAppUpsertPayload>(EMPTY_FORM);

  const filters = useAdsSpendFilters({
    storageKey: "facebook_ads_filters_v1",
    parentIdField: "selectedAppId",
  });
  const {
    selectedParentId: selectedAppId,
    setSelectedParentId: setSelectedAppId,
    selectedAccountIds,
    setSelectedAccountIds,
    filterMode,
    setFilterMode,
    filterPreset,
    setFilterPreset,
    filterSince,
    setFilterSince,
    filterUntil,
    setFilterUntil,
    spendFilter,
  } = filters;

  const appsQuery = useFacebookApps();
  const accountsQuery = useFacebookAdAccounts(selectedAppId);
  const {
    parents: apps,
    parentsLoading: appsLoading,
    accountsLoading: adsLoading,
    visibleAccounts,
    visibleAccountIds,
    parentOptions,
    accountOptions,
  } = useAdsSpendSelection({ filters, parentsQuery: appsQuery, accountsQuery });

  const spendQuery = useFacebookDailySpendSummary(selectedAppId, visibleAccountIds, spendFilter);
  const { metricsLoading, metricsByAcc, totalSpend } = useAdsSpendMetrics({
    visibleAccounts,
    spendQuery,
    emptyMetrics: EMPTY_METRICS,
    buildMetrics: buildAggMetrics,
  });

  const createMutation = useCreateFacebookApp();
  const updateMutation = useUpdateFacebookApp();
  const deleteMutation = useDeleteFacebookApp();
  const confirm = useConfirm();
  const syncAccountsMutation = useSyncFacebookAdAccounts();
  const syncSpendMutation = useSyncFacebookDailySpend();
  const saving = createMutation.isPending || updateMutation.isPending;
  const syncingAppId = syncAccountsMutation.isPending
    ? (syncAccountsMutation.variables ?? null)
    : null;
  const syncingSpend = syncSpendMutation.isPending;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialog({ mode: "create" });
  };

  const openEdit = (app: FacebookApp) => {
    setForm({
      name: app.name,
      app_id: app.app_id,
      app_secret: "",
      access_token: "",
      note: app.note,
    });
    setDialog({ mode: "edit", app });
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(null);
  };

  const submit = async () => {
    if (!form.name.trim() || !form.app_id.trim()) {
      toast.error("Vui lòng nhập tên và App ID.");
      return;
    }
    try {
      if (dialog?.mode === "create") {
        if (!form.app_secret.trim() || !form.access_token.trim()) {
          toast.error("Vui lòng nhập App Secret và Access Token.");
          return;
        }
        await createMutation.mutateAsync(form);
        toast.success("Đã tạo FB App.");
      } else if (dialog?.mode === "edit") {
        const payload: FacebookAppPartialPayload = {
          name: form.name,
          app_id: form.app_id,
          note: form.note,
        };
        if (form.app_secret.trim()) payload.app_secret = form.app_secret;
        if (form.access_token.trim()) payload.access_token = form.access_token;
        await updateMutation.mutateAsync({ id: dialog.app.id, payload });
        toast.success("Đã cập nhật FB App.");
      }
      setDialog(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const removeApp = async (app: FacebookApp) => {
    if (!(await confirm({ title: `Xóa FB App "${app.name}"?`, destructive: true }))) return;
    try {
      await deleteMutation.mutateAsync(app.id);
      toast.success("Đã xóa.");
      // Effect chọn app sẽ tự nhảy sang app đầu tiên sau khi list refetch.
      if (selectedAppId === app.id) setSelectedAppId(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const sync = async (app: FacebookApp) => {
    try {
      const result = await syncAccountsMutation.mutateAsync(app.id);
      toast.success(
        `Đồng bộ xong: +${result.created} mới, ${result.updated} cập nhật, ${result.removed} đánh dấu xóa.`,
      );
      // Hook đã invalidate apps + ad-accounts; chỉ cần trỏ selection sang app này.
      setSelectedAppId(app.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  /**
   * Trigger đồng bộ daily-spend on-demand cho FB App đang chọn theo
   * khoảng thời gian hiện hành. Hữu ích khi cron stale hoặc user vừa
   * chuyển sang preset mà DB chưa có dữ liệu cho range đó.
   */
  const handleSyncDailySpend = async () => {
    if (selectedAppId == null) return;
    if (!isSpendFilterReady(spendFilter)) {
      toast.error("Vui lòng nhập đủ ngày bắt đầu/kết thúc.");
      return;
    }
    try {
      const result = await syncSpendMutation.mutateAsync({
        appId: selectedAppId,
        params:
          filterMode === "custom"
            ? { since: filterSince, until: filterUntil }
            : { datePreset: filterPreset },
      });
      toast.success(
        `Đồng bộ chi tiêu xong: ${result.accounts} TKQC, ${result.rows_upserted} dòng cập nhật.`,
      );
      // Hook đã invalidate daily-spend → metrics tự refetch với data mới.
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="p-3">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="flex flex-1 items-center gap-2 text-left"
            onClick={() => setAppsExpanded((v) => !v)}
          >
            {appsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <h2 className="text-sm font-semibold">Facebook Apps (BM)</h2>
            <span className="text-xs text-muted-foreground">({apps.length})</span>
          </button>
          {isAdmin && (
            <Button onClick={openCreate} size="sm" variant="outline">
              + Thêm FB App
            </Button>
          )}
        </div>
        {appsExpanded && (
          <div className="mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>App ID</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Số TKQC</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appsLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      <LogoSpinner size={28} />
                    </TableCell>
                  </TableRow>
                )}
                {!appsLoading && apps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Chưa có FB App nào.
                    </TableCell>
                  </TableRow>
                )}
                {apps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell className="font-mono text-xs">{app.app_id}</TableCell>
                    <TableCell>
                      <TokenStatusCell app={app} />
                    </TableCell>
                    <TableCell>{app.ad_accounts_count}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {app.note}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {isAdmin ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sync(app)}
                            disabled={syncingAppId === app.id}
                          >
                            {syncingAppId === app.id ? (
                              <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                Đang sync
                              </>
                            ) : (
                              "Đồng bộ TKQC"
                            )}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(app)}>
                            Sửa
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => removeApp(app)}>
                            Xóa
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <AdsSpendFilterBar
          parentLabel="FB App (BM)"
          parentOptions={parentOptions}
          selectedParentId={selectedAppId}
          onSelectParent={setSelectedAppId}
          accountOptions={accountOptions}
          selectedAccountIds={selectedAccountIds}
          onSelectAccounts={setSelectedAccountIds}
          accountsPlaceholder="Chọn TKQC..."
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          filterPreset={filterPreset}
          onFilterPresetChange={setFilterPreset}
          filterSince={filterSince}
          onFilterSinceChange={setFilterSince}
          filterUntil={filterUntil}
          onFilterUntilChange={setFilterUntil}
          metricsLoading={metricsLoading}
          showSyncButton
          syncTitle="Gọi FB API và cập nhật DB cho khoảng thời gian đang chọn"
          syncing={syncingSpend}
          syncDisabled={selectedAppId == null || syncingSpend}
          onSync={handleSyncDailySpend}
        />

        <div className="relative">
          {metricsLoading && <LogoSpinnerOverlay size={44} />}
          {(() => {
            const table = (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên TK</TableHead>
                    <TableHead className="text-right">Chi phí</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adsLoading && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        <LogoSpinner size={28} />
                      </TableCell>
                    </TableRow>
                  )}
                  {!adsLoading && selectedAppId == null && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Chọn FB App để xem TKQC.
                      </TableCell>
                    </TableRow>
                  )}
                  {!adsLoading && selectedAppId != null && visibleAccounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Không có TKQC nào hiển thị.
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <AdsSpendCell metrics={metricsByAcc[acc.id]} />
                    </TableRow>
                  ))}
                  {visibleAccounts.length > 0 && (
                    <TableRow className="border-t-2 bg-muted/40">
                      <TableCell className="font-bold">Tổng cộng</TableCell>
                      <TableCell className="text-right font-bold">{fmtInt(totalSpend)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            );
            return (
              <ResponsiveList
                items={visibleAccounts}
                table={table}
                getKey={(acc) => acc.id}
                emptyText={
                  selectedAppId == null ? "Chọn FB App để xem TKQC." : "Không có TKQC nào hiển thị."
                }
                renderCard={(acc) => (
                  <FacebookAdsCard
                    account={acc}
                    metrics={metricsByAcc[acc.id]}
                    formatInt={fmtInt}
                  />
                )}
              />
            );
          })()}
        </div>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Sửa FB App" : "Thêm FB App"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tên</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">App ID</label>
              <Input
                value={form.app_id}
                onChange={(e) => setForm({ ...form, app_id: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                App Secret{" "}
                {dialog?.mode === "edit" && (
                  <span className="text-xs text-muted-foreground">(để trống nếu không đổi)</span>
                )}
              </label>
              <Input
                type="password"
                value={form.app_secret}
                onChange={(e) => setForm({ ...form, app_secret: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Access Token{" "}
                {dialog?.mode === "edit" && (
                  <span className="text-xs text-muted-foreground">(để trống nếu không đổi)</span>
                )}
              </label>
              <Textarea
                value={form.access_token}
                onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ghi chú</label>
              <Textarea
                value={form.note ?? ""}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FacebookAdsPage;
