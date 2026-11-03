import { useMemo, useState } from "react";
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
import { GoogleAdsCard } from "@/features/ads/components/GoogleAdsCard";
import { AdsSpendCell } from "@/features/ads/components/AdsSpendCell";
import { AdsSpendFilterBar } from "@/features/ads/components/AdsSpendFilterBar";
import {
  isSpendFilterReady,
  useCreateGoogleAdsConfig,
  useDeleteGoogleAdsConfig,
  useGoogleAdsAccounts,
  useGoogleAdsConfigs,
  useGoogleAdsDailySpendSummary,
  useSyncGoogleAdsAccounts,
  useSyncGoogleAdsDailySpend,
  useUpdateGoogleAdsConfig,
} from "@/features/ads/queries";
import {
  type AdsSpendMetricsBase,
  fmtInt,
  useAdsSpendFilters,
  useAdsSpendMetrics,
  useAdsSpendSelection,
} from "@/features/ads/useAdsPlatformReport";
import type {
  GoogleAdsConfig,
  GoogleAdsConfigPartialPayload,
  GoogleAdsConfigUpsertPayload,
  GoogleAdsDailySpendSummary,
} from "@/lib/api/google_ads";
import { formatDateTimeVi } from "@/lib/format";
import { useConfirm } from "@/hooks/use-confirm";

type DialogState = { mode: "create" } | { mode: "edit"; config: GoogleAdsConfig } | null;

const EMPTY_FORM: GoogleAdsConfigUpsertPayload = {
  name: "",
  developer_token: "",
  client_id: "",
  client_secret: "",
  refresh_token: "",
  login_customer_id: "",
  note: "",
};

const EMPTY_METRICS: AdsSpendMetricsBase = { spend: 0, loading: false };

type SpendRow = GoogleAdsDailySpendSummary["by_account"][string];

/** Map 1 dòng summary của BE thành metrics hiển thị (logic cũ của page). */
function buildSpendMetrics(row: SpendRow | undefined): AdsSpendMetricsBase {
  return { spend: Number(row?.spend ?? 0) || 0, loading: false };
}

interface GoogleAdsPageProps {
  isAdmin?: boolean;
}

function GoogleAdsPage({ isAdmin = false }: GoogleAdsPageProps = {}) {
  const [configsExpanded, setConfigsExpanded] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [form, setForm] = useState<GoogleAdsConfigUpsertPayload>(EMPTY_FORM);

  const filters = useAdsSpendFilters({
    storageKey: "google_ads_filters_v1",
    parentIdField: "selectedConfigId",
  });
  const {
    selectedParentId: selectedConfigId,
    setSelectedParentId: setSelectedConfigId,
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

  const configsQuery = useGoogleAdsConfigs();
  const accountsQuery = useGoogleAdsAccounts(selectedConfigId);
  const {
    parents: configs,
    parentsLoading: configsLoading,
    accountsLoading,
    visibleAccounts,
    visibleAccountIds,
    parentOptions,
    accountOptions,
  } = useAdsSpendSelection({ filters, parentsQuery: configsQuery, accountsQuery });

  const spendQuery = useGoogleAdsDailySpendSummary(
    selectedConfigId,
    visibleAccountIds,
    spendFilter,
  );
  const { metricsLoading, summary, metricsByAcc, totalSpend } = useAdsSpendMetrics({
    visibleAccounts,
    spendQuery,
    emptyMetrics: EMPTY_METRICS,
    buildMetrics: buildSpendMetrics,
  });

  const createMutation = useCreateGoogleAdsConfig();
  const updateMutation = useUpdateGoogleAdsConfig();
  const deleteMutation = useDeleteGoogleAdsConfig();
  const confirm = useConfirm();
  const syncAccountsMutation = useSyncGoogleAdsAccounts();
  const syncSpendMutation = useSyncGoogleAdsDailySpend();
  const saving = createMutation.isPending || updateMutation.isPending;
  const syncingConfigId = syncAccountsMutation.isPending
    ? (syncAccountsMutation.variables ?? null)
    : null;
  const syncingSpend = syncSpendMutation.isPending;

  // "Cập nhật lần cuối" theo dữ liệu đang hiển thị.
  const lastUpdated = useMemo(
    () => (summary?.last_synced_at ? new Date(summary.last_synced_at) : null),
    [summary],
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialog({ mode: "create" });
  };

  const openEdit = (config: GoogleAdsConfig) => {
    setForm({
      name: config.name,
      developer_token: "",
      client_id: "",
      client_secret: "",
      refresh_token: "",
      login_customer_id: config.login_customer_id,
      note: config.note,
    });
    setDialog({ mode: "edit", config });
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(null);
  };

  const submit = async () => {
    if (!form.name.trim() || !form.login_customer_id.trim()) {
      toast.error("Vui lòng nhập Tên và Login Customer ID (MCC).");
      return;
    }
    try {
      if (dialog?.mode === "create") {
        if (
          !form.developer_token.trim() ||
          !form.client_id.trim() ||
          !form.client_secret.trim() ||
          !form.refresh_token.trim()
        ) {
          toast.error("Vui lòng nhập đủ Developer Token, Client ID, Client Secret, Refresh Token.");
          return;
        }
        await createMutation.mutateAsync(form);
        toast.success("Đã thêm tài khoản Google Ads.");
      } else if (dialog?.mode === "edit") {
        const payload: GoogleAdsConfigPartialPayload = {
          name: form.name,
          client_id: form.client_id || undefined,
          login_customer_id: form.login_customer_id,
          note: form.note,
        };
        // Các secret chỉ gửi khi người dùng nhập lại (để trống = giữ nguyên).
        if (form.developer_token.trim()) payload.developer_token = form.developer_token;
        if (form.client_secret.trim()) payload.client_secret = form.client_secret;
        if (form.refresh_token.trim()) payload.refresh_token = form.refresh_token;
        await updateMutation.mutateAsync({ id: dialog.config.id, payload });
        toast.success("Đã cập nhật cấu hình Google Ads.");
      }
      setDialog(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const removeConfig = async (config: GoogleAdsConfig) => {
    const ok = await confirm({
      title: `Xóa cấu hình Google Ads "${config.name}"?`,
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(config.id);
      toast.success("Đã xóa.");
      // Effect chọn config sẽ tự nhảy sang config đầu tiên sau khi list refetch.
      if (selectedConfigId === config.id) setSelectedConfigId(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const syncAccounts = async (config: GoogleAdsConfig) => {
    try {
      const result = await syncAccountsMutation.mutateAsync(config.id);
      toast.success(
        `Đồng bộ xong: +${result.created} mới, ${result.updated} cập nhật, ${result.removed} đánh dấu xóa.`,
      );
      // Hook đã invalidate configs + accounts; chỉ cần trỏ selection sang config này.
      setSelectedConfigId(config.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  /**
   * Trigger đồng bộ daily-spend on-demand cho config đang chọn theo khoảng
   * thời gian hiện hành. Hữu ích khi cron stale hoặc user vừa chuyển preset
   * mà DB chưa có dữ liệu cho range đó.
   */
  const handleSyncDailySpend = async () => {
    if (selectedConfigId == null) return;
    if (!isSpendFilterReady(spendFilter)) {
      toast.error("Vui lòng nhập đủ ngày bắt đầu/kết thúc.");
      return;
    }
    try {
      const result = await syncSpendMutation.mutateAsync({
        configId: selectedConfigId,
        params:
          filterMode === "custom"
            ? { since: filterSince, until: filterUntil }
            : { datePreset: filterPreset },
      });
      toast.success(
        `Đồng bộ chi tiêu xong: ${result.accounts} tài khoản, ${result.rows_upserted} dòng cập nhật.`,
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
            onClick={() => setConfigsExpanded((v) => !v)}
          >
            {configsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <h2 className="text-sm font-semibold">Tài khoản Google Ads (MCC)</h2>
            <span className="text-xs text-muted-foreground">({configs.length})</span>
          </button>
          {isAdmin && (
            <Button onClick={openCreate} size="sm" variant="outline">
              + Thêm TK Google Ads
            </Button>
          )}
        </div>
        {configsExpanded && (
          <div className="mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>MCC ID</TableHead>
                  <TableHead>Số tài khoản</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configsLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      <LogoSpinner size={28} />
                    </TableCell>
                  </TableRow>
                )}
                {!configsLoading && configs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Chưa có cấu hình Google Ads nào.
                    </TableCell>
                  </TableRow>
                )}
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell className="font-mono text-xs">{config.login_customer_id}</TableCell>
                    <TableCell>{config.accounts_count}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {config.note}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {isAdmin ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => syncAccounts(config)}
                            disabled={syncingConfigId === config.id}
                          >
                            {syncingConfigId === config.id ? (
                              <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                Đang sync
                              </>
                            ) : (
                              "Đồng bộ TK"
                            )}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(config)}>
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeConfig(config)}
                          >
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
          parentLabel="Cấu hình (MCC)"
          parentOptions={parentOptions}
          selectedParentId={selectedConfigId}
          onSelectParent={setSelectedConfigId}
          accountOptions={accountOptions}
          selectedAccountIds={selectedAccountIds}
          onSelectAccounts={setSelectedAccountIds}
          accountsPlaceholder="Chọn tài khoản..."
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          filterPreset={filterPreset}
          onFilterPresetChange={setFilterPreset}
          filterSince={filterSince}
          onFilterSinceChange={setFilterSince}
          filterUntil={filterUntil}
          onFilterUntilChange={setFilterUntil}
          metricsLoading={metricsLoading}
          showSyncButton={isAdmin}
          syncTitle="Gọi Google Ads API và cập nhật DB cho khoảng thời gian đang chọn"
          syncing={syncingSpend}
          syncDisabled={selectedConfigId == null || syncingSpend}
          onSync={handleSyncDailySpend}
        />
        {lastUpdated && (
          <p className="mb-2 text-xs text-muted-foreground">
            Cập nhật lần cuối: {formatDateTimeVi(lastUpdated)}
          </p>
        )}

        <div className="relative">
          {metricsLoading && <LogoSpinnerOverlay size={44} />}
          {(() => {
            const table = (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên tài khoản</TableHead>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Chi phí</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountsLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        <LogoSpinner size={28} />
                      </TableCell>
                    </TableRow>
                  )}
                  {!accountsLoading && selectedConfigId == null && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Chọn cấu hình để xem tài khoản.
                      </TableCell>
                    </TableRow>
                  )}
                  {!accountsLoading && selectedConfigId != null && visibleAccounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Không có tài khoản nào hiển thị — bấm "Đồng bộ TK" để lấy danh sách.
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell className="font-mono text-xs">{acc.customer_id}</TableCell>
                      <TableCell>
                        <Badge variant={acc.status === "active" ? "default" : "secondary"}>
                          {acc.status === "active" ? "Active" : "Removed"}
                        </Badge>
                      </TableCell>
                      <AdsSpendCell metrics={metricsByAcc[acc.id]} />
                    </TableRow>
                  ))}
                  {visibleAccounts.length > 0 && (
                    <TableRow className="border-t-2 bg-muted/40">
                      <TableCell className="font-bold" colSpan={3}>
                        Tổng cộng
                      </TableCell>
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
                  selectedConfigId == null
                    ? "Chọn cấu hình để xem tài khoản."
                    : "Không có tài khoản nào hiển thị."
                }
                renderCard={(acc) => (
                  <GoogleAdsCard account={acc} metrics={metricsByAcc[acc.id]} formatInt={fmtInt} />
                )}
              />
            );
          })()}
        </div>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? "Sửa cấu hình Google Ads" : "Thêm tài khoản Google Ads"}
            </DialogTitle>
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
              <label className="text-sm font-medium">Login Customer ID (MCC)</label>
              <Input
                value={form.login_customer_id}
                placeholder="1234567890"
                onChange={(e) => setForm({ ...form, login_customer_id: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Client ID</label>
              <Input
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              />
            </div>
            {(["developer_token", "client_secret", "refresh_token"] as const).map((field) => {
              const labels: Record<string, string> = {
                developer_token: "Developer Token",
                client_secret: "Client Secret",
                refresh_token: "Refresh Token",
              };
              return (
                <div key={field}>
                  <label className="text-sm font-medium">
                    {labels[field]}{" "}
                    {dialog?.mode === "edit" && (
                      <span className="text-xs text-muted-foreground">
                        (để trống nếu không đổi)
                      </span>
                    )}
                  </label>
                  <Input
                    type="password"
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  />
                </div>
              );
            })}
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

export default GoogleAdsPage;
