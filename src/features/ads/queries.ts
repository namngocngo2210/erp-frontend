import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { REPORT_FOCUS_STALE_MS } from "@/lib/query-client";

import { fetchJson } from "@/services/http";
import { getFacebookCampaignCost, getGoogleCampaignCost } from "@/lib/api/ads_campaign_report";
import {
  type FacebookAppPartialPayload,
  type FacebookAppUpsertPayload,
  createFacebookApp,
  deleteFacebookApp,
  getDailySpendSummary,
  listFacebookAdAccounts,
  listFacebookApps,
  syncFacebookAdAccounts,
  syncFacebookDailySpend,
  updateFacebookApp,
} from "@/lib/api/facebook_ads";
import {
  type CampaignProductReport,
  getFacebookCampaignProducts,
  getGoogleCampaignProducts,
  setCampaignProduct,
} from "@/lib/api/ads_campaign_products";
import { getPageCostReport } from "@/lib/api/facebook_ads_page_report";
import {
  type GoogleAdsConfigPartialPayload,
  type GoogleAdsConfigUpsertPayload,
  createGoogleAdsConfig,
  deleteGoogleAdsConfig,
  getGoogleAdsDailySpendSummary,
  listGoogleAdsAccounts,
  listGoogleAdsConfigs,
  syncGoogleAdsAccounts,
  syncGoogleAdsDailySpend,
  updateGoogleAdsConfig,
} from "@/lib/api/google_ads";
import { type DigitalProductApiRow } from "./digital-report-selectors";

/** Chu kỳ tự refresh báo cáo ads (hành vi cũ của usePolling trên trang). */
const ADS_REPORT_REFRESH_MS = 30 * 60 * 1000;

/** Chu kỳ tự refresh chi tiêu FB/Google Ads (hành vi cũ: usePolling 60s). */
export const ADS_SPEND_REFRESH_MS = 60_000;

/** Bộ lọc thời gian dùng chung cho 2 trang chi tiêu FB/Google Ads. */
export type AdsSpendFilter =
  | { mode: "preset"; preset: string }
  | { mode: "custom"; since: string; until: string };

/** Filter custom chỉ hợp lệ khi đã nhập đủ 2 mốc ngày. */
export function isSpendFilterReady(filter: AdsSpendFilter): boolean {
  return filter.mode === "preset" || (filter.since !== "" && filter.until !== "");
}

export type AdsReportParams = {
  dateFrom?: string;
  dateTo?: string;
  channelIds: number[];
  /**
   * Lọc sản phẩm — chỉ 2 tab digital dùng. Mảng RỖNG phải giữ nguyên trong queryKey
   * để tab digital ở chế độ "Tất cả sản phẩm" trùng key với query của trang và dùng
   * lại cache, không bắn thêm một request y hệt.
   */
  productIds?: number[];
};

export const adsReportKeys = {
  all: ["ads-report"] as const,
  report: (params: AdsReportParams) => ["ads-report", "report", params] as const,
};

/**
 * GET /api/orders/reports/ads — báo cáo ads theo khoảng ngày + kênh.
 * - keepPreviousData: giữ số liệu cũ hiển thị trong khi tải bộ lọc mới (hành vi cũ).
 * - refetchInterval: thay usePolling 30' (RQ tự tạm dừng khi tab ở nền).
 * - refetchOnWindowFocus "always": thay listener visibilitychange cũ (luôn
 *   refetch khi quay lại tab, kể cả khi data còn "fresh").
 */
export function useAdsReport<T>(params: AdsReportParams) {
  return useQuery({
    queryKey: adsReportKeys.report(params),
    queryFn: async ({ signal }): Promise<T> => {
      const query = new URLSearchParams();
      if (params.dateFrom) query.set("date_from", params.dateFrom);
      if (params.dateTo) query.set("date_to", params.dateTo);
      if (params.channelIds.length > 0) query.set("channel_ids", params.channelIds.join(","));
      if (params.productIds && params.productIds.length > 0)
        query.set("product_ids", params.productIds.join(","));
      const qs = query.toString();
      const url = qs ? `/api/orders/reports/ads?${qs}` : "/api/orders/reports/ads";
      return (await fetchJson(url, { signal })) as T;
    },
    placeholderData: keepPreviousData,
    refetchInterval: ADS_REPORT_REFRESH_MS,
    // "always" (cũ) gọi lại aggregate nặng mỗi lần alt-tab; `true` + staleTime 60s
    // chỉ refetch khi dữ liệu đã cũ (audit 2026-09-23 P2-5).
    refetchOnWindowFocus: true,
    staleTime: REPORT_FOCUS_STALE_MS,
  });
}

export type AdsDigitalProductParams = AdsReportParams & {
  /** "channel" gộp cả kỳ theo kênh; "day" thêm chiều ngày cho tab chi tiết. */
  group: "channel" | "day";
  /** Chỉ bật khi người dùng đã bung ít nhất một hàng — tải lười, không bắn sẵn. */
  enabled: boolean;
};

export const adsDigitalProductKeys = {
  all: ["ads-report", "digital-products"] as const,
  rows: (params: Omit<AdsDigitalProductParams, "enabled">) =>
    ["ads-report", "digital-products", params] as const,
};

/**
 * GET /api/orders/reports/ads/products — dòng con theo sản phẩm khi bung một hàng
 * ở 2 tab digital.
 *
 * Một request cho CẢ bảng (không phải mỗi hàng một request): backend đã gộp sẵn
 * theo (kênh[, ngày], sản phẩm) nên payload nhỏ, còn bung thêm hàng thứ hai thì
 * không tốn thêm lượt gọi nào.
 */
export function useAdsDigitalProducts({ enabled, ...params }: AdsDigitalProductParams) {
  return useQuery({
    queryKey: adsDigitalProductKeys.rows(params),
    enabled,
    queryFn: async ({ signal }): Promise<{ rows: DigitalProductApiRow[] }> => {
      const query = new URLSearchParams();
      if (params.dateFrom) query.set("date_from", params.dateFrom);
      if (params.dateTo) query.set("date_to", params.dateTo);
      if (params.channelIds.length > 0) query.set("channel_ids", params.channelIds.join(","));
      if (params.productIds && params.productIds.length > 0)
        query.set("product_ids", params.productIds.join(","));
      query.set("group", params.group);
      return (await fetchJson(`/api/orders/reports/ads/products?${query.toString()}`, {
        signal,
      })) as { rows: DigitalProductApiRow[] };
    },
    placeholderData: keepPreviousData,
    refetchInterval: ADS_REPORT_REFRESH_MS,
  });
}

export type PageCostReportParams = {
  since?: string;
  until?: string;
  /** Chỉ bật khi người dùng thực sự mở chiều Page trên trang Báo cáo ads. */
  enabled: boolean;
};

/**
 * GET /api/facebook-ads/reports/page — chi phí theo Facebook Page (chiều Page,
 * giai đoạn A: chưa có attribution doanh thu, xem PageCostTable).
 * Tách hook riêng (thay vì gọi useQuery thẳng trong page) để khớp cách các trang
 * ads khác dùng queries.ts, và để test AdsReportPage mock được như useAdsReport.
 */
export function usePageCostReport(params: PageCostReportParams) {
  return useQuery({
    queryKey: ["ads-page-report", params.since, params.until] as const,
    queryFn: () => getPageCostReport({ since: params.since ?? "", until: params.until ?? "" }),
    enabled: params.enabled && Boolean(params.since && params.until),
  });
}

/**
 * GET /api/facebook-ads/reports/campaign + /api/google-ads/reports/campaign — chi phí
 * theo chiến dịch (tab "Chiến dịch" trên trang Báo cáo ads). Hai request độc lập:
 * một nền tảng lỗi không được làm mất số của nền tảng còn lại (xem mergeCampaignRows).
 *
 * `since`/`until` khai optional để nhận thẳng `dateFilter.from`/`.to` của trang (kiểu
 * `DateFilterValue.from?: string`) — cùng cách `usePageCostReport` xử lý phía trên.
 */
export function useCampaignCostReport(params: { since?: string; until?: string }) {
  const ready = Boolean(params.since && params.until);
  const facebook = useQuery({
    queryKey: ["ads", "campaign-cost", "facebook", params],
    queryFn: () =>
      getFacebookCampaignCost({ since: params.since ?? "", until: params.until ?? "" }),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  const google = useQuery({
    queryKey: ["ads", "campaign-cost", "google", params],
    queryFn: () => getGoogleCampaignCost({ since: params.since ?? "", until: params.until ?? "" }),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  return { facebook, google };
}

export type CampaignProductFilter = {
  since?: string;
  until?: string;
  /** "yes" | "no" | "" (tất cả) */
  assigned: string;
  q: string;
  /** `"<platform>:<id>"` của TKQC; rỗng = tất cả. */
  account: string;
};

/**
 * GET /api/{facebook-ads,google-ads}/campaign-products — danh sách chiến dịch kèm
 * sản phẩm đã gán. Hai request độc lập, cùng cách làm với useCampaignCostReport:
 * một nền tảng lỗi không được xoá số của nền tảng còn lại.
 */
export function useCampaignProducts(filter: CampaignProductFilter) {
  const ready = Boolean(filter.since && filter.until);
  const params = {
    since: filter.since ?? "",
    until: filter.until ?? "",
    assigned: filter.assigned,
    q: filter.q,
    account: filter.account,
  };
  const facebook = useQuery<CampaignProductReport>({
    queryKey: ["ads", "campaign-products", "facebook", params],
    queryFn: () => getFacebookCampaignProducts(params),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  const google = useQuery<CampaignProductReport>({
    queryKey: ["ads", "campaign-products", "google", params],
    queryFn: () => getGoogleCampaignProducts(params),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  return { facebook, google };
}

/**
 * PATCH gán/gỡ sản phẩm cho một chiến dịch.
 *
 * Invalidate CẢ `ads-report`: chi phí theo sản phẩm ở 2 tab digital lấy từ chính
 * bảng gán này, nên gán xong mà báo cáo vẫn giữ số cũ thì người dùng tưởng thao tác
 * không ăn và bấm lại.
 */
export function useSetCampaignProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setCampaignProduct,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ads", "campaign-products"] });
      void qc.invalidateQueries({ queryKey: adsReportKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Facebook Ads (trang chi tiêu FB)
// ---------------------------------------------------------------------------

export const fbAdsKeys = {
  all: ["facebook-ads"] as const,
  apps: ["facebook-ads", "apps"] as const,
  adAccounts: (appId: number) => ["facebook-ads", "ad-accounts", appId] as const,
  dailySpends: ["facebook-ads", "daily-spend"] as const,
  dailySpend: (appId: number, accountIds: number[], filter: AdsSpendFilter) =>
    ["facebook-ads", "daily-spend", appId, accountIds, filter] as const,
};

/** GET /api/facebook-ads/apps — danh sách FB App (BM). */
export function useFacebookApps() {
  return useQuery({
    queryKey: fbAdsKeys.apps,
    queryFn: listFacebookApps,
  });
}

/** GET /api/facebook-ads/apps/:id/ad-accounts — TKQC của FB App đang chọn. */
export function useFacebookAdAccounts(appId: number | null) {
  return useQuery({
    queryKey: fbAdsKeys.adAccounts(appId ?? 0),
    queryFn: () => listFacebookAdAccounts(appId as number),
    enabled: appId != null,
  });
}

/**
 * GET /api/facebook-ads/apps/:id/daily-spend — tổng chi tiêu theo TKQC.
 * - keepPreviousData: giữ số liệu cũ khi đổi bộ lọc/tập tài khoản.
 * - refetchInterval 60s + refetchOnWindowFocus "always": thay usePolling +
 *   listener visibilitychange cũ (RQ tự tạm dừng interval khi tab ở nền).
 */
export function useFacebookDailySpendSummary(
  appId: number | null,
  accountIds: number[],
  filter: AdsSpendFilter,
) {
  return useQuery({
    queryKey: fbAdsKeys.dailySpend(appId ?? 0, accountIds, filter),
    queryFn: () =>
      getDailySpendSummary(appId as number, {
        adAccountIds: accountIds,
        ...(filter.mode === "custom"
          ? { since: filter.since, until: filter.until }
          : { datePreset: filter.preset }),
      }),
    enabled: appId != null && accountIds.length > 0 && isSpendFilterReady(filter),
    placeholderData: keepPreviousData,
    refetchInterval: ADS_SPEND_REFRESH_MS,
    // "always" (cũ) gọi lại aggregate nặng mỗi lần alt-tab; `true` + staleTime 60s
    // chỉ refetch khi dữ liệu đã cũ (audit 2026-09-23 P2-5).
    refetchOnWindowFocus: true,
    staleTime: REPORT_FOCUS_STALE_MS,
  });
}

export function useCreateFacebookApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FacebookAppUpsertPayload) => createFacebookApp(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fbAdsKeys.apps });
    },
  });
}

export function useUpdateFacebookApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FacebookAppPartialPayload }) =>
      updateFacebookApp(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fbAdsKeys.apps });
    },
  });
}

export function useDeleteFacebookApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFacebookApp(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fbAdsKeys.apps });
    },
  });
}

/** POST /apps/:id/sync — đồng bộ danh sách TKQC; refetch apps + TKQC của app đó. */
export function useSyncFacebookAdAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: number) => syncFacebookAdAccounts(appId),
    onSuccess: (_result, appId) => {
      void qc.invalidateQueries({ queryKey: fbAdsKeys.apps });
      void qc.invalidateQueries({ queryKey: fbAdsKeys.adAccounts(appId) });
    },
  });
}

/** POST /apps/:id/sync-daily-spend — sync on-demand rồi refetch số liệu chi tiêu. */
export function useSyncFacebookDailySpend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      appId,
      params,
    }: {
      appId: number;
      params: { datePreset?: string; since?: string; until?: string };
    }) => syncFacebookDailySpend(appId, params),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fbAdsKeys.dailySpends });
    },
  });
}

// ---------------------------------------------------------------------------
// Google Ads (trang chi tiêu Google — mirror của Facebook Ads)
// ---------------------------------------------------------------------------

export const googleAdsKeys = {
  all: ["google-ads"] as const,
  configs: ["google-ads", "configs"] as const,
  accounts: (configId: number) => ["google-ads", "accounts", configId] as const,
  dailySpends: ["google-ads", "daily-spend"] as const,
  dailySpend: (configId: number, accountIds: number[], filter: AdsSpendFilter) =>
    ["google-ads", "daily-spend", configId, accountIds, filter] as const,
};

/** GET /api/google-ads/configs — danh sách cấu hình MCC. */
export function useGoogleAdsConfigs() {
  return useQuery({
    queryKey: googleAdsKeys.configs,
    queryFn: listGoogleAdsConfigs,
  });
}

/** GET /api/google-ads/configs/:id/accounts — tài khoản con của MCC đang chọn. */
export function useGoogleAdsAccounts(configId: number | null) {
  return useQuery({
    queryKey: googleAdsKeys.accounts(configId ?? 0),
    queryFn: () => listGoogleAdsAccounts(configId as number),
    enabled: configId != null,
  });
}

/**
 * GET /api/google-ads/configs/:id/daily-spend — tổng chi tiêu theo tài khoản.
 * Cùng hành vi refresh với useFacebookDailySpendSummary.
 */
export function useGoogleAdsDailySpendSummary(
  configId: number | null,
  accountIds: number[],
  filter: AdsSpendFilter,
) {
  return useQuery({
    queryKey: googleAdsKeys.dailySpend(configId ?? 0, accountIds, filter),
    queryFn: () =>
      getGoogleAdsDailySpendSummary(configId as number, {
        accountIds,
        ...(filter.mode === "custom"
          ? { since: filter.since, until: filter.until }
          : { datePreset: filter.preset }),
      }),
    enabled: configId != null && accountIds.length > 0 && isSpendFilterReady(filter),
    placeholderData: keepPreviousData,
    refetchInterval: ADS_SPEND_REFRESH_MS,
    // "always" (cũ) gọi lại aggregate nặng mỗi lần alt-tab; `true` + staleTime 60s
    // chỉ refetch khi dữ liệu đã cũ (audit 2026-09-23 P2-5).
    refetchOnWindowFocus: true,
    staleTime: REPORT_FOCUS_STALE_MS,
  });
}

export function useCreateGoogleAdsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GoogleAdsConfigUpsertPayload) => createGoogleAdsConfig(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: googleAdsKeys.configs });
    },
  });
}

export function useUpdateGoogleAdsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GoogleAdsConfigPartialPayload }) =>
      updateGoogleAdsConfig(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: googleAdsKeys.configs });
    },
  });
}

export function useDeleteGoogleAdsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGoogleAdsConfig(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: googleAdsKeys.configs });
    },
  });
}

/** POST /configs/:id/sync — đồng bộ danh sách tài khoản; refetch configs + accounts. */
export function useSyncGoogleAdsAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configId: number) => syncGoogleAdsAccounts(configId),
    onSuccess: (_result, configId) => {
      void qc.invalidateQueries({ queryKey: googleAdsKeys.configs });
      void qc.invalidateQueries({ queryKey: googleAdsKeys.accounts(configId) });
    },
  });
}

/** POST /configs/:id/sync-daily-spend — sync on-demand rồi refetch số liệu chi tiêu. */
export function useSyncGoogleAdsDailySpend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      params,
    }: {
      configId: number;
      params: { datePreset?: string; since?: string; until?: string };
    }) => syncGoogleAdsDailySpend(configId, params),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: googleAdsKeys.dailySpends });
    },
  });
}
