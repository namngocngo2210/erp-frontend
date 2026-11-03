import { useCallback } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import { type FetchJson } from "@/services/http";
import { extractListPayload } from "@/lib/api/list-payload";
import { handleApiError } from "@/lib/errors";
import { getValidAccessToken } from "@/services/http";

export type KshipProviderOption = {
  id?: number | null;
  code: string;
  name: string;
  imageForMobile?: string;
  image?: string;
};

export type KshipServiceOption = {
  id?: number | null;
  code: string;
  name: string;
  provider_code: string;
};

/** Quy định xem hàng (ShipperNote). Danh sách do backend định nghĩa — xem
 *  `KSHIP_SHIPPER_NOTE_OPTIONS` trong gateway_kship_customer_webhook.py. */
export type KshipShipperNoteOption = {
  code: string;
  name: string;
  is_default: boolean;
};

/** Mục SERVICE_EXTRA hãng bắt buộc và người dùng chọn được (auto_add + danh sách).
 *  Hiện chỉ SPX "PickShift" (ca lấy hàng) — giá trị đổi theo ngày nên luôn lấy từ
 *  backend, không cache lâu và không hardcode. */
export type KshipServiceExtraOption = {
  provider_code: string;
  service_code: string;
  code: string;
  name: string;
  view_type: string;
  options: { value: string; name: string }[];
};

export type KshipOptionsPayload = {
  channel_id?: number;
  channel_name?: string;
  providers: KshipProviderOption[];
  services: KshipServiceOption[];
  shipper_notes: KshipShipperNoteOption[];
  service_extras: KshipServiceExtraOption[];
};

export type KiotVietOrderAction =
  | "push_selected"
  | "push_unsent"
  | "sync_shipping_selected"
  | "sync_status_selected"
  | "sync_status_has_shipping"
  // `quick_sale_selected` giữ lại cho tương thích backend (bí danh của bản
  // deferred) nhưng FE không còn gửi — nút "Tạo nhanh" luôn dùng bản deferred.
  | "quick_sale_deferred_selected";

export type KiotVietPrecheckInvalidOrder = {
  order_id: number;
  name: string;
  phone: string;
  channel_code: string;
  reason_codes: string[];
  reasons: string[];
};

export type KiotVietOrderPrecheckResult = {
  action: KiotVietOrderAction;
  step: "precheck";
  input_count: number;
  target_count: number;
  valid_order_ids: number[];
  invalid_orders: KiotVietPrecheckInvalidOrder[];
  valid_count: number;
  invalid_count: number;
};

export type KiotVietJobLogRow = {
  id: number;
  order_id: number;
  order_name: string;
  order_phone: string;
  order_channel_code: string;
  order_external_id: string;
  order_invoice_code: string;
  order_shipping_code: string;
  action: string;
  status: string;
  requested_by_id: number | null;
  requested_by_username: string | null;
  requested_by_display_name: string | null;
  attempt_count: number;
  error_message: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

type UseOrdersBulkActionsDeps = {
  fetchJson: FetchJson;
  /** No-op hiện tại (cache danh sách đã bỏ) — giữ để trình tự gọi không đổi. */
  clearOrdersCache: () => void;
  /** Tải lại danh sách đơn với bộ lọc hiện hành (`loadOrders(undefined, { force: true })`). */
  reloadOrders: () => Promise<unknown>;
  /**
   * Đánh dấu các đơn là "thao tác của chính user" để realtime patch không loại
   * row khỏi danh sách đang lọc. Xem `selfActionOrderIdsRef` trong useOrdersData.
   */
  markSelfActionOrders: (ids: number[]) => void;
};

/** Chuẩn hoá danh sách id: bỏ trùng, bỏ giá trị không phải số nguyên dương. */
function normalizeOrderIds(ids: number[]): number[] {
  return Array.from(
    new Set(
      ids
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.trunc(value)),
    ),
  );
}

/**
 * Sở hữu nhóm thao tác HÀNG LOẠT trên đơn — tách khỏi `useOrdersData` (god hook).
 *
 * Đặc điểm chung của nhóm này: nhận danh sách id, gọi một endpoint batch, rồi
 * (tuỳ thao tác) tải lại danh sách. Chúng KHÔNG đọc filter/pagination state nên
 * chỉ cần 4 phụ thuộc tiêm vào (xem `UseOrdersBulkActionsDeps`).
 *
 * Gồm: xoá hàng loạt, các hành động KiotViet (execute/precheck/log), Kship
 * (options + tạo vận đơn), chuyển đơn Landing, huỷ/khôi phục đơn, và tải file
 * mẫu import. Hành vi (kể cả nội dung toast và mã lỗi ném ra) giữ NGUYÊN.
 */
export function useOrdersBulkActions({
  fetchJson,
  clearOrdersCache,
  reloadOrders,
  markSelfActionOrders,
}: UseOrdersBulkActionsDeps) {
  const { t } = useI18n();

  const bulkDeleteOrders = useCallback(
    async (ids: number[]) => {
      try {
        const payload = await fetchJson("/api/orders/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        clearOrdersCache();
        await reloadOrders();
        const deletedCount =
          typeof payload?.deleted_count === "number" ? payload.deleted_count : ids.length;
        toast.success(
          t("orders.toast.bulkDeleted", "Deleted {count} orders.").replace(
            "{count}",
            String(deletedCount),
          ),
        );
      } catch (err: unknown) {
        handleApiError(err, {
          toast: t("orders.toast.bulkDeleteFailed"),
          context: "orders.bulkDelete",
        });
        throw new Error("BULK_DELETE_ORDERS_FAILED");
      }
    },
    [clearOrdersCache, fetchJson, reloadOrders, t],
  );

  const runKiotVietOrderAction = useCallback(
    async (action: KiotVietOrderAction, ids: number[]) => {
      try {
        const payload = await fetchJson("/api/orders/kiotviet-actions", {
          method: "POST",
          body: JSON.stringify({
            action,
            step: "execute",
            order_ids: ids,
            ids,
          }),
        });
        const inputCount =
          typeof payload?.input_count === "number" ? payload.input_count : ids.length;
        const targetCount = typeof payload?.target_count === "number" ? payload.target_count : 0;
        const queuedCount = typeof payload?.queued_count === "number" ? payload.queued_count : 0;
        const alreadyProcessingCount =
          typeof payload?.already_processing_count === "number"
            ? payload.already_processing_count
            : 0;
        const dispatchFailedCount =
          typeof payload?.dispatch_failed_count === "number" ? payload.dispatch_failed_count : 0;
        const isSelectedAction =
          action === "push_selected" ||
          action === "sync_shipping_selected" ||
          action === "sync_status_selected" ||
          action === "quick_sale_deferred_selected";

        if (targetCount === 0) {
          if (isSelectedAction) {
            toast.warning(
              t(
                "orders.toast.kiotvietActionNoEligibleSelected",
                "Không có đơn hợp lệ để xử lý ({inputCount} đơn đã chọn).",
              ).replace("{inputCount}", String(inputCount)),
            );
          } else {
            toast.warning(
              t("orders.toast.kiotvietActionNoEligibleAuto", "Không có đơn hợp lệ để xử lý."),
            );
          }
          return;
        }

        if (queuedCount > 0) {
          let message = t(
            "orders.toast.kiotvietActionSuccess",
            "Đã đưa vào hàng đợi KiotViet ({count} đơn).",
          ).replace("{count}", String(queuedCount));
          if (alreadyProcessingCount > 0 || dispatchFailedCount > 0) {
            message = `${message} ${t(
              "orders.toast.kiotvietActionSummary",
              "(Đã xử lý: {targetCount}, đang chạy: {alreadyProcessingCount}, lỗi dispatch: {dispatchFailedCount})",
            )
              .replace("{targetCount}", String(targetCount))
              .replace("{alreadyProcessingCount}", String(alreadyProcessingCount))
              .replace("{dispatchFailedCount}", String(dispatchFailedCount))}`;
          }
          toast.success(message);
          return;
        }

        if (alreadyProcessingCount > 0 && dispatchFailedCount === 0) {
          toast.info(
            t(
              "orders.toast.kiotvietActionAlreadyProcessing",
              "Các đơn đã có job đang chạy ({count} đơn).",
            ).replace("{count}", String(alreadyProcessingCount)),
          );
          return;
        }

        toast.warning(
          t(
            "orders.toast.kiotvietActionNoQueued",
            "Không thể đưa đơn vào hàng đợi (lỗi dispatch: {count}).",
          ).replace("{count}", String(dispatchFailedCount)),
        );
      } catch (err: unknown) {
        // fetchJson đã trích `detail` từ response — hiển thị nguyên văn lỗi
        // server/KiotViet thay vì câu chung chung của hệ thống.
        const detail = err instanceof Error ? err.message.trim() : "";
        toast.error(
          detail ||
            t("orders.toast.kiotvietActionFailed", "Không thể thực hiện thao tác KiotViet."),
        );
        throw new Error("KIOTVIET_ORDER_ACTION_FAILED");
      }
    },
    [fetchJson, t],
  );

  const runKiotVietOrderPrecheck = useCallback(
    async (action: KiotVietOrderAction, ids: number[]) => {
      try {
        const payload = await fetchJson("/api/orders/kiotviet-actions", {
          method: "POST",
          body: JSON.stringify({
            action,
            step: "precheck",
            ids,
          }),
        });
        return payload as KiotVietOrderPrecheckResult;
      } catch (err: unknown) {
        const detail = err instanceof Error ? err.message.trim() : "";
        toast.error(
          detail ||
            t("orders.toast.kiotvietPrecheckFailed", "Không thể kiểm tra điều kiện đẩy KiotViet."),
        );
        throw new Error("KIOTVIET_ORDER_PRECHECK_FAILED");
      }
    },
    [fetchJson, t],
  );

  const fetchKiotVietLogs = useCallback(
    async (filters?: {
      q?: string;
      action?: string;
      status?: string;
      requestedBy?: number;
      orderId?: number;
      channel?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (filters?.q) query.set("q", filters.q);
      if (filters?.action) query.set("action", filters.action);
      if (filters?.status) query.set("status", filters.status);
      if (typeof filters?.requestedBy === "number")
        query.set("requested_by", String(filters.requestedBy));
      if (typeof filters?.orderId === "number") query.set("order_id", String(filters.orderId));
      if (filters?.channel) query.set("channel", filters.channel);
      if (filters?.dateFrom) query.set("date_from", filters.dateFrom);
      if (filters?.dateTo) query.set("date_to", filters.dateTo);
      if (typeof filters?.limit === "number") query.set("limit", String(filters.limit));

      const endpoint = query.toString()
        ? `/api/orders/kiotviet-jobs?${query.toString()}`
        : "/api/orders/kiotviet-jobs";
      const data = await fetchJson(endpoint);
      return extractListPayload<KiotVietJobLogRow>(data);
    },
    [fetchJson],
  );

  const fetchKshipOptions = useCallback(
    async (ids: number[]): Promise<KshipOptionsPayload> => {
      const normalizedIds = normalizeOrderIds(ids);
      if (normalizedIds.length === 0) {
        throw new Error("EMPTY_ORDER_IDS");
      }

      const response = await fetchJson("/api/orders/kship-options", {
        method: "POST",
        body: JSON.stringify({ ids: normalizedIds }),
      });

      const providers = extractListPayload<KshipProviderOption>(response?.providers).map(
        (item) => ({
          id: typeof item?.id === "number" ? item.id : null,
          code: String(item?.code || "").trim(),
          name: String(item?.name || "").trim(),
          imageForMobile: String(item?.imageForMobile || "").trim(),
          image: String(item?.image || "").trim(),
        }),
      );

      const services = extractListPayload<KshipServiceOption>(response?.services).map((item) => ({
        id: typeof item?.id === "number" ? item.id : null,
        code: String(item?.code || "").trim(),
        name: String(item?.name || "").trim(),
        provider_code: String(item?.provider_code || "").trim(),
      }));

      const shipperNotes = extractListPayload<KshipShipperNoteOption>(response?.shipper_notes).map(
        (item) => ({
          code: String(item?.code || "").trim(),
          name: String(item?.name || "").trim(),
          is_default: Boolean(item?.is_default),
        }),
      );

      const serviceExtras = extractListPayload<KshipServiceExtraOption>(
        response?.service_extras,
      ).map((item) => ({
        provider_code: String(item?.provider_code || "").trim(),
        service_code: String(item?.service_code || "").trim(),
        code: String(item?.code || "").trim(),
        name: String(item?.name || "").trim(),
        view_type: String(item?.view_type || "").trim(),
        options: (Array.isArray(item?.options) ? item.options : [])
          .map((option) => ({
            value: String(option?.value || "").trim(),
            name: String(option?.name || "").trim(),
          }))
          .filter((option) => option.value),
      }));

      return {
        channel_id: typeof response?.channel_id === "number" ? response.channel_id : undefined,
        channel_name:
          typeof response?.channel_name === "string" ? response.channel_name : undefined,
        providers: providers.filter((item) => item.code || item.name),
        services: services.filter((item) => item.provider_code && (item.code || item.name)),
        shipper_notes: shipperNotes.filter((item) => item.code),
        service_extras: serviceExtras.filter(
          (item) => item.provider_code && item.code && item.options.length > 0,
        ),
      };
    },
    [fetchJson],
  );

  const createKshipDelivery = useCallback(
    async (
      ids: number[],
      providerCode: string,
      serviceCode: string,
      notes?: Record<number, string>,
      senderAddressId?: number | null,
      shipperNotes?: Record<number, string>,
      serviceExtra?: Record<string, string>,
    ): Promise<{ created_count: number; detail: string }> => {
      const normalizedIds = normalizeOrderIds(ids);
      if (normalizedIds.length === 0) {
        throw new Error("EMPTY_ORDER_IDS");
      }

      // Đánh dấu TRƯỚC khi gọi API: backend có thể broadcast event đổi sale_status
      // ('đã lên đơn') trước cả khi response HTTP về, nên phải bảo vệ row khỏi bị
      // revalidate-loại ngay từ lúc bắt đầu thao tác. Xóa dấu khi loadOrders/F5.
      markSelfActionOrders(normalizedIds);

      // Convert notes keys to strings for API
      const notesPayload: Record<string, string> = {};
      if (notes) {
        for (const [id, note] of Object.entries(notes)) {
          if (note) notesPayload[String(id)] = note;
        }
      }

      const shipperNotesPayload: Record<string, string> = {};
      if (shipperNotes) {
        for (const [id, code] of Object.entries(shipperNotes)) {
          if (code) shipperNotesPayload[String(id)] = code;
        }
      }

      const serviceExtraPayload: Record<string, string> = {};
      for (const [code, value] of Object.entries(serviceExtra || {})) {
        if (value) serviceExtraPayload[code] = value;
      }

      const response = await fetchJson("/api/orders/kship-delivery", {
        method: "POST",
        body: JSON.stringify({
          ids: normalizedIds,
          provider_code: providerCode,
          service_code: serviceCode,
          notes: notesPayload,
          shipper_notes: shipperNotesPayload,
          service_extra: serviceExtraPayload,
          ...(typeof senderAddressId === "number" ? { sender_address_id: senderAddressId } : {}),
        }),
      });

      return {
        created_count: typeof response?.created_count === "number" ? response.created_count : 0,
        detail: typeof response?.detail === "string" ? response.detail : "",
      };
    },
    [fetchJson, markSelfActionOrders],
  );

  const downloadOrdersImportTemplate = useCallback(async () => {
    let accessToken: string | null = null;
    try {
      accessToken = await getValidAccessToken();
    } catch {
      accessToken = null;
    }
    const headers = new Headers();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    // eslint-disable-next-line no-restricted-globals -- blob download (template file); fetchJson only handles JSON responses
    const response = await fetch("/api/orders/import-template", {
      method: "GET",
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      throw new Error(t("orders.toast.downloadTemplateFailed", "Không thể tải file mẫu."));
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "orders-import-template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }, [t]);

  const transferLandingOrders = useCallback(
    async (
      ids: number[],
    ): Promise<{
      transferred_count?: number;
      // Chỉ `id` — BE cố ý không trả name/phone khách trong payload lỗi (audit 2026-07-26 N1).
      invalid_orders?: Array<{ id: number }>;
      invalid_count?: number;
      detail?: string;
    }> => {
      const data = await fetchJson("/api/orders/transfer-landing", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      clearOrdersCache();
      await reloadOrders();
      return data;
    },
    [clearOrdersCache, fetchJson, reloadOrders],
  );

  const cancelKiotvietOrders = useCallback(
    async (
      ids: number[],
    ): Promise<{
      queued_count: number;
      skipped_count: number;
      skipped_orders: Array<{ id: number; name: string; phone: string }>;
      dispatch_failed_count: number;
      already_processing_count: number;
    }> => {
      const data = await fetchJson("/api/orders/cancel-kiotviet", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      clearOrdersCache();
      await reloadOrders();
      return data;
    },
    [clearOrdersCache, fetchJson, reloadOrders],
  );

  const restoreCancelledOrders = useCallback(
    async (
      ids: number[],
      options?: { showOrders?: boolean },
    ): Promise<{
      queued_count: number;
      queued_ids: number[];
      skipped_count: number;
      skipped_ids: number[];
    }> => {
      // Dispatch Celery task; worker phát event restore.completed khi xong → FE
      // listener trong App.tsx sẽ hiện toast tổng kết. Không reload list ở đây
      // vì DB chưa thay đổi tại thời điểm 202 trả về.
      const data = await fetchJson("/api/orders/restore-cancelled", {
        method: "POST",
        body: JSON.stringify({ ids, restore_show_orders: options?.showOrders === true }),
      });
      return data;
    },
    [fetchJson],
  );

  return {
    bulkDeleteOrders,
    runKiotVietOrderAction,
    runKiotVietOrderPrecheck,
    fetchKiotVietLogs,
    fetchKshipOptions,
    createKshipDelivery,
    downloadOrdersImportTemplate,
    transferLandingOrders,
    cancelKiotvietOrders,
    restoreCancelledOrders,
  };
}
