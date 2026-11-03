import { Dispatch, MutableRefObject, SetStateAction, useEffect, useRef } from "react";
import { toast } from "sonner";

import { formatKiotVietErrorToast } from "@/features/orders/kiotviet-error";
import { type OrderRow } from "@/features/orders/order-types";
import { mergeOrderRowPatch } from "@/features/orders/order-realtime-merge";
import { fetchJson } from "@/services/http";
import { getCRMWebSocket, disconnectCRM } from "@/services/websocket";
import { swallowError } from "@/lib/errors";

const SALES_STATUS_LABEL_BY_CODE: Record<string, string> = {
  created_order: "Đã lên đơn",
  customer_bombed: "Khách bom hàng",
};

/**
 * Các section đang render danh sách đơn — chỉ những tab này mới cần fetch dữ
 * liệu đơn khi có `order.created`. Sự cố 2026-07-30: MỌI tab (kể cả dashboard,
 * users...) đều GET /api/orders/{id} cùng thời điểm khi broadcast tới, N tab ×
 * M đơn bulk = N×M connection Postgres đồng thời (CONN_MAX_AGE=0 ở prod).
 */
const ORDER_LIST_SECTIONS = new Set(["orders", "landing-orders", "koc-orders"]);

/** Cửa sổ jitter trước khi fetch — phá sự đồng bộ giữa các tab cùng nhận event. */
const CREATED_FETCH_JITTER_BASE_MS = 500;
const CREATED_FETCH_JITTER_SPREAD_MS = 1500;

/**
 * Nhịp tối thiểu giữa 2 lần refresh do `order.created` trên MỘT tab. Jitter chỉ
 * gom event TRONG một cửa sổ 0.5–2s; burst ingest kéo dài phát event liên tục nên
 * hết cửa sổ là tab lại flush tiếp — mỗi tab bắn list mỗi ~1–2s suốt cơn bão (bão
 * gate 2026-08-04 09:13: sóng 44 rồi 40 POST list/10s). Sàn 10s chặn nhịp đó lại:
 * event đến trong lúc chờ vẫn gom vào pending, chỉ nhịp fetch bị giãn.
 */
const CREATED_REFRESH_MIN_INTERVAL_MS = 10_000;

/** Backoff khi fetch refresh fail (503 giữa bão): 5s nhân đôi tới trần 60s.
 * Retry ngay theo jitter thường chính là mồi cho sóng 503 kế tiếp. */
const CREATED_RETRY_BASE_MS = 5_000;
const CREATED_RETRY_MAX_MS = 60_000;

/** Rút OrderRow từ response API (trần hoặc bọc trong `data`). */
function extractOrderRow(response: unknown): OrderRow | null {
  if (!response || typeof response !== "object") return null;
  if ("id" in response && typeof response.id === "number") {
    return response as OrderRow;
  }
  if (
    "data" in response &&
    response.data &&
    typeof response.data === "object" &&
    "id" in response.data &&
    typeof (response.data as { id?: unknown }).id === "number"
  ) {
    return response.data as OrderRow;
  }
  return null;
}

/** Trạng thái thông báo realtime đơn hàng hiển thị ở chuông notification. */
export type OrderNotification = {
  id: string;
  orderId: number | null;
  content: string;
  timeLabel: string;
  unread: boolean;
};

/** Phần thông tin user mà handler realtime cần để scope/gate event. */
type CrmWsUser = {
  id: number;
  is_superuser?: boolean;
  assigned_channels?: Array<{
    id: number;
    code: string;
    name: string;
    is_active: boolean;
  }>;
} | null;

/** Tập handler dữ liệu đơn mà handler realtime gọi để cập nhật list/detail. */
type OrdersRealtimeHandlers = {
  clearOrdersCache: (...args: never[]) => unknown;
  loadOrders: (overrides?: never, options?: { force?: boolean }) => Promise<unknown>;
  patchOrderFromRealtime: (orderId: number, patch: Partial<OrderRow>) => void;
  upsertOrderFromRealtime: (order: OrderRow) => void;
  /** Upsert lô row đến từ payload WS (bản list, không can_edit) — zero REST. */
  upsertOrderFromBroadcast: (rows: OrderRow[]) => void;
  removeOrderFromRealtime: (...args: never[]) => unknown;
};

type LoadSummaryFn = (options?: {
  force?: boolean;
  dateFrom?: string;
  dateTo?: string;
}) => Promise<void>;

export type UseCrmWebSocketParams = {
  /** User hiện tại — dùng để mở/đóng socket theo identity (user.id) và scope event. */
  user: CrmWsUser;
  /** Section đang xem — quyết định nhánh xử lý transfer/dashboard refresh. */
  section: string;
  /** Bộ handler cập nhật danh sách/đơn realtime (đã được giữ ổn định qua ref ở App). */
  ordersHandlers: OrdersRealtimeHandlers;
  /** Hàm reload dashboard summary (có thể đổi reference giữa các render). */
  loadSummary: LoadSummaryFn;
  /** Cache dashboard summary — chia sẻ với App để invalidate khi có đơn mới/cập nhật. */
  summaryCacheRef: MutableRefObject<unknown>;
  /** Mốc thời gian chặn reload list sau optimistic patch — chia sẻ với App. */
  suppressOrdersReloadUntilRef: MutableRefObject<number>;
  /** Tập id đơn vừa tạo cục bộ — chia sẻ với App để khử trùng notification. */
  locallyCreatedOrderIdsRef: MutableRefObject<Set<number>>;
  /** Theo dõi lỗi KiotViet đã toast theo đơn — chia sẻ với App (clear khi logout). */
  latestKiotVietErrorToastRef: MutableRefObject<Map<number, string>>;
  /** Setter danh sách thông báo. */
  setNotifications: Dispatch<SetStateAction<OrderNotification[]>>;
  /** Setter đơn standalone (route detail khi đơn không nằm trong list). */
  setStandaloneOrder: Dispatch<SetStateAction<OrderRow | null>>;
};

/**
 * Quản lý kết nối WebSocket CRM realtime: đăng ký listener, xử lý các loại
 * message (restore.completed / order.created / order.updated, gồm cả tín hiệu
 * KiotViet) và dọn dẹp socket khi user đổi/unmount.
 *
 * Handler đọc state mới nhất qua các ref nội bộ (cập nhật mỗi render) nên effect
 * chỉ subscribe lại khi identity (user.id) đổi — tránh add/remove listener thừa
 * và không gặp stale closure.
 */
export function useCrmWebSocket({
  user,
  section,
  ordersHandlers,
  loadSummary,
  summaryCacheRef,
  suppressOrdersReloadUntilRef,
  locallyCreatedOrderIdsRef,
  latestKiotVietErrorToastRef,
  setNotifications,
  setStandaloneOrder,
}: UseCrmWebSocketParams): void {
  // Ref nội bộ: giữ giá trị mới nhất cho handler đọc mà không cần re-subscribe.
  const userRef = useRef(user);
  const sectionRef = useRef(section);
  const ordersHandlersRef = useRef(ordersHandlers);
  const loadSummaryRef = useRef(loadSummary);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    sectionRef.current = section;
  }, [section]);

  useEffect(() => {
    ordersHandlersRef.current = ordersHandlers;
  }, [ordersHandlers]);

  useEffect(() => {
    loadSummaryRef.current = loadSummary;
  }, [loadSummary]);

  useEffect(() => {
    if (!user?.id) return;

    const ws = getCRMWebSocket();

    // Gom order.created trong cửa sổ jitter: 1 đơn → GET chi tiết, nhiều đơn
    // (bulk KShip/Excel phát tới 50 event một lượt) → MỘT loadOrders force thay
    // vì M request song song. Jitter ngẫu nhiên để N tab không cùng bắn một lúc.
    //
    // Tab ẨN không fetch (bão gate 2026-08-04 09:13: phần lớn "bầy đàn" là tab
    // nền không ai nhìn): id gom vào pending, chỉ flush khi tab visible trở lại
    // — người dùng quay lại tab là thấy dữ liệu mới trong ~2s, còn server không
    // phải phục vụ N tab nền cùng nhịp giữa burst.
    const pendingCreatedOrderIds = new Set<number>();
    let createdFlushTimer: number | null = null;
    let summaryFlushTimer: number | null = null;
    let summaryPendingWhileHidden = false;
    // Mốc lần flush gần nhất + backoff hiện hành — xem CREATED_REFRESH_MIN_INTERVAL_MS.
    let lastCreatedFlushAt = 0;
    let createdRetryDelayMs = CREATED_RETRY_BASE_MS;

    const isTabHidden = () => document.visibilityState === "hidden";
    const fetchJitterMs = () =>
      CREATED_FETCH_JITTER_BASE_MS + Math.random() * CREATED_FETCH_JITTER_SPREAD_MS;
    // Delay cho flush kế tiếp: jitter thường, nhưng không sớm hơn sàn cooldown.
    const createdFlushDelayMs = () =>
      Math.max(fetchJitterMs(), lastCreatedFlushAt + CREATED_REFRESH_MIN_INTERVAL_MS - Date.now());

    const flushCreatedOrders = () => {
      createdFlushTimer = null;
      // Tab vừa bị ẩn giữa cửa sổ jitter: giữ pending, đợi visibilitychange.
      if (isTabHidden()) return;
      const ids = [...pendingCreatedOrderIds];
      pendingCreatedOrderIds.clear();
      if (ids.length === 0) return;
      lastCreatedFlushAt = Date.now();
      // Fail (503 giữa bão / mạng): trả ids về pending để gộp với event mới rồi
      // hẹn lại theo backoff nhân đôi — KHÔNG thả trôi như trước (user nhìn list
      // cũ mãi) và KHÔNG retry dày (tự khuếch đại bão). Thành công thì reset.
      const retryLater = () => {
        for (const id of ids) pendingCreatedOrderIds.add(id);
        const delay = createdRetryDelayMs + Math.random() * CREATED_FETCH_JITTER_SPREAD_MS;
        createdRetryDelayMs = Math.min(createdRetryDelayMs * 2, CREATED_RETRY_MAX_MS);
        if (createdFlushTimer === null) {
          createdFlushTimer = window.setTimeout(flushCreatedOrders, delay);
        }
      };
      if (ids.length === 1) {
        fetchJson(`/api/orders/${ids[0]}`)
          .then((response) => {
            createdRetryDelayMs = CREATED_RETRY_BASE_MS;
            const realtimeOrder = extractOrderRow(response);
            if (realtimeOrder) {
              ordersHandlersRef.current.upsertOrderFromRealtime(realtimeOrder);
            }
          })
          .catch(retryLater);
        return;
      }
      ordersHandlersRef.current
        .loadOrders(undefined, { force: true })
        .then(() => {
          createdRetryDelayMs = CREATED_RETRY_BASE_MS;
        })
        .catch(retryLater);
    };

    const scheduleCreatedOrderRefresh = (orderId: number) => {
      pendingCreatedOrderIds.add(orderId);
      if (isTabHidden()) return;
      if (createdFlushTimer !== null) return;
      createdFlushTimer = window.setTimeout(flushCreatedOrders, createdFlushDelayMs());
    };

    // Đường KHÔNG-REST: payload order.created tự mang `row` (bản list, server đã
    // strip theo field_policy từng user) → upsert thẳng vào bảng. Không gate tab
    // ẩn, không cooldown, không backoff — vì không tốn một request nào; jitter
    // chỉ để gộp lô event bulk thành MỘT lần setState thay vì M lần re-render.
    const pendingBroadcastRows = new Map<number, OrderRow>();
    let broadcastFlushTimer: number | null = null;

    const flushBroadcastRows = () => {
      broadcastFlushTimer = null;
      const rows = [...pendingBroadcastRows.values()];
      pendingBroadcastRows.clear();
      if (rows.length === 0) return;
      ordersHandlersRef.current.upsertOrderFromBroadcast(rows);
    };

    const scheduleBroadcastRowUpsert = (row: OrderRow) => {
      pendingBroadcastRows.set(row.id, row);
      if (broadcastFlushTimer !== null) return;
      broadcastFlushTimer = window.setTimeout(flushBroadcastRows, fetchJitterMs());
    };

    /** Rút row hợp lệ từ payload WS — id phải khớp order_id (contract đã check
     * phía server, đây là hàng rào thứ hai cho deploy lệch phiên bản). */
    const extractBroadcastRow = (payload: unknown, orderId: number): OrderRow | null => {
      if (!payload || typeof payload !== "object") return null;
      const row = (payload as { row?: unknown }).row;
      if (!row || typeof row !== "object") return null;
      if ((row as { id?: unknown }).id !== orderId) return null;
      return row as OrderRow;
    };

    // Dashboard summary cùng khuôn coalesce+jitter: trước đây MỖI order.created
    // là MỖI tab dashboard bắn loadSummary({force}) tức thì — burst M event ×
    // N tab dashboard là một nhịp herd không kém gì list đơn.
    const flushSummaryRefresh = () => {
      summaryFlushTimer = null;
      if (isTabHidden()) {
        summaryPendingWhileHidden = true;
        return;
      }
      if (sectionRef.current !== "dashboard") return;
      loadSummaryRef.current({ force: true }).catch(() => null);
    };

    const scheduleSummaryRefresh = () => {
      if (sectionRef.current !== "dashboard") return;
      if (isTabHidden()) {
        summaryPendingWhileHidden = true;
        return;
      }
      if (summaryFlushTimer !== null) return;
      summaryFlushTimer = window.setTimeout(flushSummaryRefresh, fetchJitterMs());
    };

    const handleVisibilityChange = () => {
      if (isTabHidden()) return;
      if (pendingCreatedOrderIds.size > 0 && createdFlushTimer === null) {
        createdFlushTimer = window.setTimeout(flushCreatedOrders, createdFlushDelayMs());
      }
      if (summaryPendingWhileHidden) {
        summaryPendingWhileHidden = false;
        if (summaryFlushTimer === null) {
          summaryFlushTimer = window.setTimeout(flushSummaryRefresh, fetchJitterMs());
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "restore.completed") {
          // Toast tổng kết khi Celery worker xử lý xong toàn bộ batch restore.
          // Chỉ hiện cho user đã bấm khôi phục để tránh spam mọi tab.
          if (Number(payload?.user_id) !== userRef.current?.id) return;
          const restored = Number(payload?.restored_count ?? 0);
          const skipped = Number(payload?.skipped_count ?? 0);
          const alreadyRestored = Number(payload?.already_restored_count ?? 0);
          const failed = Number(payload?.failed_count ?? 0);
          const msgs: string[] = [];
          if (restored > 0) msgs.push(`Đã khôi phục ${restored} đơn`);
          // Tách riêng khỏi "không hợp lệ": đơn đã có bản khôi phục vẫn nằm ở
          // tab "Đã hủy" nên bấm khôi phục lần hai là thao tác thường gặp.
          if (alreadyRestored > 0) msgs.push(`${alreadyRestored} đơn đã khôi phục trước đó`);
          if (skipped > 0) msgs.push(`${skipped} đơn không hợp lệ (bỏ qua)`);
          // Lỗi hệ thống (exception ở worker) tách khỏi "không hợp lệ" — dữ liệu
          // đơn không có vấn đề, cần xem log worker chứ không phải soi lại đơn.
          if (failed > 0) msgs.push(`${failed} đơn gặp lỗi hệ thống, vui lòng thử lại`);
          if (failed > 0 && restored === 0) {
            toast.error(msgs.join(". "));
          } else if (restored > 0) {
            toast.success(msgs.join(". "));
          } else {
            toast.warning(msgs.join(". ") || "Không có đơn nào được khôi phục");
          }
          // Refresh list hiện tại: khôi phục tạo ĐƠN MỚI (đơn hủy cũ vẫn nằm
          // nguyên ở tab "Đã hủy"), đơn mới chỉ xuất hiện sau khi load lại.
          ordersHandlersRef.current.loadOrders(undefined, { force: true }).catch(() => null);
          return;
        }
        if (payload.type === "order.created") {
          const orderId = Number(payload?.order_id);
          const normalizedOrderId = Number.isFinite(orderId) ? orderId : null;
          const createdAtRaw = payload?.created_at ?? payload?.time ?? Date.now();
          const createdAt = new Date(createdAtRaw);
          const validCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
          const timeLabel = validCreatedAt.toLocaleTimeString("vi-VN", { hour12: false });
          const content =
            normalizedOrderId !== null
              ? `Đơn hàng ${normalizedOrderId} đã được tạo`
              : "Đơn hàng mới đã được tạo";

          // Channel scope: nếu user không thuộc kênh trong event thì bỏ qua hoàn toàn
          // (không notification, không fetch). Admin và user không bị scope (assigned_channels=undefined)
          // vẫn nhận như cũ.
          const eventChannelCode =
            typeof payload?.channel_code === "string" ? payload.channel_code : "";
          const currentUser = userRef.current;
          const userAssigned = currentUser?.assigned_channels;
          const isScoped = !currentUser?.is_superuser && Array.isArray(userAssigned);
          if (isScoped && eventChannelCode) {
            const allowed = new Set(
              userAssigned!.filter((ch) => ch.is_active).map((ch) => ch.code),
            );
            if (!allowed.has(eventChannelCode)) return;
          }

          setNotifications((prev) =>
            [
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                orderId: normalizedOrderId,
                content,
                timeLabel,
                unread: true,
              },
              ...prev,
            ].slice(0, 5),
          );
          summaryCacheRef.current = null;
          if (normalizedOrderId !== null && ORDER_LIST_SECTIONS.has(sectionRef.current)) {
            const broadcastRow = extractBroadcastRow(payload, normalizedOrderId);
            if (broadcastRow) {
              scheduleBroadcastRowUpsert(broadcastRow);
            } else {
              // Event không mang row (backend cũ giữa deploy / row build fail):
              // giữ nguyên đường fetch coalesce + cooldown cũ.
              scheduleCreatedOrderRefresh(normalizedOrderId);
            }
          }
          scheduleSummaryRefresh();
          const isLocallyCreatedOrder =
            normalizedOrderId !== null && locallyCreatedOrderIdsRef.current.has(normalizedOrderId);
          if (isLocallyCreatedOrder) {
            locallyCreatedOrderIdsRef.current.delete(normalizedOrderId);
          }
        }
        if (payload.type === "order.updated") {
          const latestKiotVietJobStatusRawForFilter = payload?.latest_kiotviet_job_status;
          const latestKiotVietJobStatusForFilter =
            typeof latestKiotVietJobStatusRawForFilter === "string"
              ? latestKiotVietJobStatusRawForFilter.trim().toLowerCase()
              : "";
          const hasKiotVietRealtimeSignal =
            typeof payload?.is_kiotviet_processing === "boolean" ||
            latestKiotVietJobStatusForFilter !== "";
          if (Date.now() < suppressOrdersReloadUntilRef.current && !hasKiotVietRealtimeSignal) {
            return;
          }
          const orderId = Number(payload?.order_id);
          if (!Number.isFinite(orderId) || orderId <= 0) {
            return;
          }
          const patch: Partial<OrderRow> = {};
          const nextStatusRaw = payload?.status ?? payload?.to_status;
          const nextStatus =
            typeof nextStatusRaw === "number"
              ? nextStatusRaw
              : typeof nextStatusRaw === "string" && nextStatusRaw.trim() !== ""
                ? Number(nextStatusRaw)
                : null;
          if (nextStatus !== null && !Number.isNaN(nextStatus)) {
            patch.status = nextStatus;
          }

          const invoiceStatusRaw = payload?.invoice_status;
          if (typeof invoiceStatusRaw === "number" && Number.isFinite(invoiceStatusRaw)) {
            patch.invoice_status = invoiceStatusRaw;
          } else if (typeof invoiceStatusRaw === "string" && invoiceStatusRaw.trim() !== "") {
            const parsedInvoiceStatus = Number(invoiceStatusRaw);
            if (!Number.isNaN(parsedInvoiceStatus)) {
              patch.invoice_status = parsedInvoiceStatus;
            }
          }

          const shippingFeeRaw = payload?.shipping_fee;
          if (typeof shippingFeeRaw === "number" && Number.isFinite(shippingFeeRaw)) {
            patch.shipping_fee = String(shippingFeeRaw);
          } else if (typeof shippingFeeRaw === "string" && shippingFeeRaw.trim() !== "") {
            patch.shipping_fee = shippingFeeRaw.trim();
          }
          const invoiceCodeRaw = payload?.invoice_code ?? payload?.order_invoice_code;
          if (typeof invoiceCodeRaw === "string") {
            patch.invoice_code = invoiceCodeRaw.trim();
          }

          const shippingCodeRaw = payload?.shipping_code ?? payload?.order_shipping_code;
          if (typeof shippingCodeRaw === "string") {
            patch.shipping_code = shippingCodeRaw.trim();
          }

          const latestKiotVietJobStatusRaw = payload?.latest_kiotviet_job_status;
          const latestKiotVietJobStatus =
            typeof latestKiotVietJobStatusRaw === "string" ? latestKiotVietJobStatusRaw.trim() : "";
          const latestKiotVietJobActionRaw = payload?.latest_kiotviet_job_action;
          const latestKiotVietJobAction =
            typeof latestKiotVietJobActionRaw === "string" ? latestKiotVietJobActionRaw.trim() : "";
          const latestKiotVietJobErrorRaw = payload?.latest_kiotviet_job_error;
          const latestKiotVietJobError =
            typeof latestKiotVietJobErrorRaw === "string" ? latestKiotVietJobErrorRaw.trim() : "";

          // Trạng thái + lỗi job KiotViet chỉ hiển thị cho ĐÚNG người thực hiện job
          // (so requested_by_id với user hiện tại). Người khác không thấy badge lẫn
          // toast — khi event mang tín hiệu kiotviet mà viewer không phải actor, ta
          // xóa trạng thái khỏi dòng vì job mới nhất của đơn không thuộc về họ.
          // Backend serializer cũng gate y hệt cho lần load đầu (xem OrderSerializer).
          const kiotvietRequestedById = Number(payload?.requested_by_id);
          const isKiotvietActor =
            Number.isFinite(kiotvietRequestedById) && kiotvietRequestedById === userRef.current?.id;

          if (hasKiotVietRealtimeSignal) {
            if (isKiotvietActor) {
              if (typeof payload?.is_kiotviet_processing === "boolean") {
                patch.is_kiotviet_processing = payload.is_kiotviet_processing;
              }
              if (latestKiotVietJobStatus) {
                patch.latest_kiotviet_job_status = latestKiotVietJobStatus;
              }
              if (latestKiotVietJobAction) {
                patch.latest_kiotviet_job_action = latestKiotVietJobAction;
              }
              if (latestKiotVietJobError) {
                patch.latest_kiotviet_job_error = latestKiotVietJobError;
              } else if (
                latestKiotVietJobStatus &&
                latestKiotVietJobStatus.toLowerCase() !== "failed"
              ) {
                patch.latest_kiotviet_job_error = null;
                latestKiotVietErrorToastRef.current.delete(orderId);
              }
            } else {
              patch.is_kiotviet_processing = false;
              patch.latest_kiotviet_job_status = null;
              patch.latest_kiotviet_job_action = null;
              patch.latest_kiotviet_job_error = null;
              latestKiotVietErrorToastRef.current.delete(orderId);
            }
          }

          if (
            isKiotvietActor &&
            latestKiotVietJobStatus &&
            latestKiotVietJobStatus.toLowerCase() === "failed"
          ) {
            // Job FAILED luôn phải có toast — kể cả khi event không kèm mô tả
            // lỗi (trước đây các case này im lặng, chỉ còn badge "Thất bại").
            const toastKey = latestKiotVietJobError || "__failed_without_error__";
            const lastNotifiedError = latestKiotVietErrorToastRef.current.get(orderId);
            if (lastNotifiedError !== toastKey) {
              latestKiotVietErrorToastRef.current.set(orderId, toastKey);
              const compactError = latestKiotVietJobError
                ? formatKiotVietErrorToast(latestKiotVietJobError)
                : "KiotViet trả lỗi nhưng không kèm mô tả.";
              // `id` theo đơn để lỗi mới của cùng đơn thay thế toast cũ thay vì
              // chồng nhiều toast. Dùng duration mặc định (4s) để toast tự tắt.
              toast.error(`KiotViet lỗi đơn #${orderId}: ${compactError}`, {
                id: `kiotviet-error-${orderId}`,
              });
            }
          }

          const salesStatusCodeRaw = payload?.sales_status_code;
          const salesStatusCode =
            typeof salesStatusCodeRaw === "string" ? salesStatusCodeRaw.trim() : "";
          if (salesStatusCode) {
            patch.crm = {
              sales_status_code: salesStatusCode,
              sales_status_label: SALES_STATUS_LABEL_BY_CODE[salesStatusCode] ?? null,
            } as OrderRow["crm"];
          }

          // Đơn được chuyển từ Landing Page → Đơn hàng
          const isTransferEvent = payload?.source === "orders.service.transfer_landing_orders";
          if (isTransferEvent) {
            if (sectionRef.current === "orders") {
              // Đường KHÔNG-REST, giống hệt order.created: event tự mang row bản
              // list nên tab upsert thẳng, không tốn request nào.
              //
              // Vì sao đáng làm (đo 2026-08-11): đây là đường fanout REST cuối
              // cùng còn sót của trang Đơn hàng. Coalescer gom được ≥2 id là nó
              // gọi loadOrders — tức POST /api/orders đầy đủ (~460ms server) từ
              // MỌI tab đang mở. Chuyển đơn vốn là thao tác hàng loạt nên điều
              // kiện "≥2 id" gần như luôn đúng, và đó chính là các cụm 8-10
              // request list dồn trong cùng một giây đo được trên prod.
              //
              // Backend cũ (event không kèm row) hoặc lô quá lớn (server chủ động
              // bỏ row) đều rơi về đường coalesce cũ — không cần deploy đồng bộ.
              const transferRow = extractBroadcastRow(payload, orderId);
              if (transferRow) {
                scheduleBroadcastRowUpsert(transferRow);
              } else {
                scheduleCreatedOrderRefresh(orderId);
              }
            }
            // Landing page: keep the order visible, just flip show_orders flag
            if (sectionRef.current === "landing-orders") {
              ordersHandlersRef.current.patchOrderFromRealtime(orderId, { show_orders: true });
            }
            return;
          }

          if (Object.keys(patch).length === 0) {
            return;
          }
          ordersHandlersRef.current.patchOrderFromRealtime(orderId, patch);
          // The detail route renders from `standaloneOrder` when the order is not
          // in the current list page (routed-pages.tsx). That state is fed by a
          // one-shot fetch and is NOT touched by patchOrderFromRealtime, so apply
          // the same realtime patch here — otherwise fields like invoice_code
          // (push) / shipping_code (kship) only appear after a manual refresh.
          setStandaloneOrder((prev) =>
            prev && prev.id === orderId ? mergeOrderRowPatch(prev, patch) : prev,
          );
        }
      } catch (err) {
        // ignore invalid payload
        swallowError(err, "ws.crm.invalidPayload");
      }
    };

    ws.addEventListener("message", handleMessage);
    ws.connect();

    return () => {
      if (createdFlushTimer !== null) {
        window.clearTimeout(createdFlushTimer);
        createdFlushTimer = null;
      }
      if (broadcastFlushTimer !== null) {
        window.clearTimeout(broadcastFlushTimer);
        broadcastFlushTimer = null;
      }
      if (summaryFlushTimer !== null) {
        window.clearTimeout(summaryFlushTimer);
        summaryFlushTimer = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      ws.removeEventListener("message", handleMessage);
      // Tear down the singleton socket + its auto-reconnect timer so a user change
      // or unmount doesn't leak a connection / exponential-backoff timer.
      disconnectCRM();
    };
    // Chỉ subscribe lại khi identity (user.id) đổi — handler đọc state qua ref
    // nên không cần phụ thuộc các state khác. Không còn dựa vào authChecking để
    // kích hoạt lại: connect() tự lấy token qua getValidAccessToken() (mint từ
    // refresh cookie nếu in-memory còn rỗng lúc boot), nên kết nối realtime vẫn
    // thành công sau reload mà không gây add/remove listener thừa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
