/**
 * Sự cố 2026-07-30 ("too many clients already" tái diễn): mỗi tab nhận
 * `order.created` là bắn ngay một GET /api/orders/{id} — N tab × M đơn (bulk)
 * request đồng thời, mỗi request một connection Postgres (CONN_MAX_AGE=0).
 *
 * Hành vi chốt ở đây:
 *  - chỉ tab đang xem danh sách đơn mới fetch (tab khác: notification vẫn hiện);
 *  - fetch bị trễ jitter để phá sự đồng bộ giữa các tab;
 *  - nhiều event trong cửa sổ jitter gộp thành MỘT loadOrders thay vì M GET;
 *  - unmount hủy fetch đang chờ.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useCrmWebSocket, type UseCrmWebSocketParams } from "@/hooks/use-crm-websocket";

const ws = vi.hoisted(() => {
  const listeners = new Set<(event: { data: string }) => void>();
  return {
    listeners,
    manager: {
      addEventListener: (_type: string, fn: (event: { data: string }) => void) => {
        listeners.add(fn);
      },
      removeEventListener: (_type: string, fn: (event: { data: string }) => void) => {
        listeners.delete(fn);
      },
      connect: () => {},
    },
    emit(payload: unknown) {
      for (const fn of [...listeners]) fn({ data: JSON.stringify(payload) });
    },
  };
});

const fetchJsonMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/websocket", () => ({
  getCRMWebSocket: () => ws.manager,
  disconnectCRM: () => {
    ws.listeners.clear();
  },
}));

vi.mock("@/services/http", () => ({ fetchJson: fetchJsonMock }));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

function renderCrmHook(overrides: Partial<UseCrmWebSocketParams> = {}) {
  const ordersHandlers = {
    clearOrdersCache: vi.fn(),
    loadOrders: vi.fn().mockResolvedValue(undefined),
    patchOrderFromRealtime: vi.fn(),
    upsertOrderFromRealtime: vi.fn(),
    upsertOrderFromBroadcast: vi.fn(),
    removeOrderFromRealtime: vi.fn(),
  };
  const params: UseCrmWebSocketParams = {
    user: { id: 1 },
    section: "orders",
    ordersHandlers,
    loadSummary: vi.fn().mockResolvedValue(undefined),
    summaryCacheRef: { current: null },
    suppressOrdersReloadUntilRef: { current: 0 },
    locallyCreatedOrderIdsRef: { current: new Set<number>() },
    latestKiotVietErrorToastRef: { current: new Map<number, string>() },
    setNotifications: vi.fn(),
    setStandaloneOrder: vi.fn(),
    ...overrides,
  };
  const utils = renderHook(() => useCrmWebSocket(params));
  return { ...utils, params, ordersHandlers };
}

describe("useCrmWebSocket — order.created không được fanout REST đồng thời", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchJsonMock.mockReset();
    fetchJsonMock.mockResolvedValue({ id: 5 });
  });

  afterEach(() => {
    ws.listeners.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("một đơn mới: fetch chi tiết SAU jitter, không fetch ngay lập tức", async () => {
    const { ordersHandlers } = renderCrmHook();

    ws.emit({ type: "order.created", order_id: 5 });
    expect(fetchJsonMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    expect(fetchJsonMock).toHaveBeenCalledWith("/api/orders/5");
    expect(ordersHandlers.upsertOrderFromRealtime).toHaveBeenCalledWith({ id: 5 });
  });

  it("nhiều đơn trong cửa sổ jitter: gộp thành MỘT loadOrders, không GET từng đơn", async () => {
    const { ordersHandlers } = renderCrmHook();

    ws.emit({ type: "order.created", order_id: 1 });
    ws.emit({ type: "order.created", order_id: 2 });
    ws.emit({ type: "order.created", order_id: 3 });

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchJsonMock).not.toHaveBeenCalled();
    expect(ordersHandlers.loadOrders).toHaveBeenCalledTimes(1);
    expect(ordersHandlers.loadOrders).toHaveBeenCalledWith(undefined, { force: true });
  });

  it("tab ngoài danh sách đơn: không fetch, notification vẫn hiện", async () => {
    const setNotifications = vi.fn();
    const { ordersHandlers } = renderCrmHook({ section: "users", setNotifications });

    ws.emit({ type: "order.created", order_id: 7 });
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchJsonMock).not.toHaveBeenCalled();
    expect(ordersHandlers.loadOrders).not.toHaveBeenCalled();
    expect(setNotifications).toHaveBeenCalled();
  });

  it("unmount hủy fetch đang chờ trong cửa sổ jitter", async () => {
    const { unmount } = renderCrmHook();

    ws.emit({ type: "order.created", order_id: 9 });
    unmount();

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchJsonMock).not.toHaveBeenCalled();
  });
});

function setDocumentVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

describe("useCrmWebSocket — dập herd còn sót (bão gate 2026-08-04 09:13)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchJsonMock.mockReset();
    fetchJsonMock.mockResolvedValue({ id: 5 });
    setDocumentVisibility("visible");
  });

  afterEach(() => {
    ws.listeners.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    setDocumentVisibility("visible");
  });

  it("dashboard: loadSummary gộp qua jitter, KHÔNG bắn tức thì mỗi event", async () => {
    const loadSummary = vi.fn().mockResolvedValue(undefined);
    renderCrmHook({ section: "dashboard", loadSummary });

    ws.emit({ type: "order.created", order_id: 1 });
    ws.emit({ type: "order.created", order_id: 2 });
    ws.emit({ type: "order.created", order_id: 3 });
    expect(loadSummary).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(loadSummary).toHaveBeenCalledTimes(1);
    expect(loadSummary).toHaveBeenCalledWith({ force: true });
  });

  it("transfer landing→orders: đi qua coalescer, không GET detail tức thì", async () => {
    renderCrmHook();

    ws.emit({
      type: "order.updated",
      order_id: 11,
      source: "orders.service.transfer_landing_orders",
    });
    expect(fetchJsonMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    expect(fetchJsonMock).toHaveBeenCalledWith("/api/orders/11");
  });

  it("bulk transfer nhiều đơn: gộp thành MỘT loadOrders", async () => {
    const { ordersHandlers } = renderCrmHook();

    for (const id of [21, 22, 23]) {
      ws.emit({
        type: "order.updated",
        order_id: id,
        source: "orders.service.transfer_landing_orders",
      });
    }

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchJsonMock).not.toHaveBeenCalled();
    expect(ordersHandlers.loadOrders).toHaveBeenCalledTimes(1);
  });

  it("tab ẩn: hoãn fetch tới khi visible trở lại (kèm jitter)", async () => {
    setDocumentVisibility("hidden");
    renderCrmHook();

    ws.emit({ type: "order.created", order_id: 5 });
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchJsonMock).not.toHaveBeenCalled();

    setDocumentVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(fetchJsonMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    expect(fetchJsonMock).toHaveBeenCalledWith("/api/orders/5");
  });

  it("dashboard tab ẩn: loadSummary hoãn tới khi visible trở lại", async () => {
    setDocumentVisibility("hidden");
    const loadSummary = vi.fn().mockResolvedValue(undefined);
    renderCrmHook({ section: "dashboard", loadSummary });

    ws.emit({ type: "order.created", order_id: 6 });
    await vi.advanceTimersByTimeAsync(10000);
    expect(loadSummary).not.toHaveBeenCalled();

    setDocumentVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(2000);
    expect(loadSummary).toHaveBeenCalledTimes(1);
  });
});

describe("useCrmWebSocket — nhịp refresh giữa burst kéo dài (cooldown + backoff)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchJsonMock.mockReset();
    fetchJsonMock.mockResolvedValue({ id: 5 });
    setDocumentVisibility("visible");
    // Jitter cố định để timeline test xác định: 500 + 0.5×1500 = 1250ms.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    ws.listeners.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    setDocumentVisibility("visible");
  });

  it("burst kéo dài: flush kế tiếp cách flush trước tối thiểu 10s, event dồn được gộp", async () => {
    // Jitter chỉ gom event TRONG một cửa sổ — burst ingest kéo dài từng khiến mỗi
    // tab flush mỗi ~1-2s suốt cơn bão (sóng 44 rồi 40 POST list/10s sáng 04/08).
    const { ordersHandlers } = renderCrmHook();

    ws.emit({ type: "order.created", order_id: 1 });
    await vi.advanceTimersByTimeAsync(1250);
    expect(fetchJsonMock).toHaveBeenCalledTimes(1); // flush 1 tại t=1250

    // Event vẫn dồn về ngay sau flush 1 — như giữa burst thật.
    ws.emit({ type: "order.created", order_id: 2 });
    ws.emit({ type: "order.created", order_id: 3 });
    await vi.advanceTimersByTimeAsync(2000);
    expect(ordersHandlers.loadOrders).not.toHaveBeenCalled(); // chưa qua sàn 10s

    // Sàn 10s tính từ flush 1 → flush 2 tại t=11250, gộp cả 2 event.
    await vi.advanceTimersByTimeAsync(8000);
    expect(ordersHandlers.loadOrders).toHaveBeenCalledTimes(1);
    expect(ordersHandlers.loadOrders).toHaveBeenCalledWith(undefined, { force: true });
  });

  it("loadOrders fail giữa bão: giữ pending, retry sau backoff thay vì thả trôi", async () => {
    const { ordersHandlers } = renderCrmHook();
    ordersHandlers.loadOrders.mockRejectedValueOnce(new Error("HTTP 503"));

    ws.emit({ type: "order.created", order_id: 1 });
    ws.emit({ type: "order.created", order_id: 2 });
    await vi.advanceTimersByTimeAsync(1250);
    expect(ordersHandlers.loadOrders).toHaveBeenCalledTimes(1); // lần 1 fail (503)

    // Retry hẹn sau backoff 5s + jitter 750ms = 5750ms — trước mốc đó im lặng.
    await vi.advanceTimersByTimeAsync(5000);
    expect(ordersHandlers.loadOrders).toHaveBeenCalledTimes(1);

    // Tới mốc backoff: retry lại với pending giữ nguyên (vẫn là loadOrders gộp).
    await vi.advanceTimersByTimeAsync(750);
    expect(ordersHandlers.loadOrders).toHaveBeenCalledTimes(2);
    expect(ordersHandlers.loadOrders).toHaveBeenLastCalledWith(undefined, { force: true });
  });

  it("GET detail fail: đơn không bị thả trôi, retry sau backoff", async () => {
    const { ordersHandlers } = renderCrmHook();
    fetchJsonMock.mockRejectedValueOnce(new Error("HTTP 503"));

    ws.emit({ type: "order.created", order_id: 5 });
    await vi.advanceTimersByTimeAsync(1250);
    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    expect(ordersHandlers.upsertOrderFromRealtime).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5750);
    expect(fetchJsonMock).toHaveBeenCalledTimes(2);
    expect(fetchJsonMock).toHaveBeenLastCalledWith("/api/orders/5");
    expect(ordersHandlers.upsertOrderFromRealtime).toHaveBeenCalledWith({ id: 5 });
  });
});

describe("useCrmWebSocket — payload tự mang row: upsert thẳng, zero REST", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchJsonMock.mockReset();
    fetchJsonMock.mockResolvedValue({ id: 5 });
    setDocumentVisibility("visible");
    vi.spyOn(Math, "random").mockReturnValue(0.5); // jitter cố định 1250ms
  });

  afterEach(() => {
    ws.listeners.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    setDocumentVisibility("visible");
  });

  it("event có row: upsert qua broadcast handler sau jitter, KHÔNG fetch REST", async () => {
    const { ordersHandlers } = renderCrmHook();
    const row = { id: 5, phone: "0900", channel_code: "FB" };

    ws.emit({ type: "order.created", order_id: 5, channel_code: "FB", row });
    expect(ordersHandlers.upsertOrderFromBroadcast).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1250);
    expect(ordersHandlers.upsertOrderFromBroadcast).toHaveBeenCalledTimes(1);
    expect(ordersHandlers.upsertOrderFromBroadcast).toHaveBeenCalledWith([row]);
    expect(fetchJsonMock).not.toHaveBeenCalled();
    expect(ordersHandlers.loadOrders).not.toHaveBeenCalled();
  });

  it("lô event có row trong cửa sổ jitter: gộp thành MỘT lần upsert đủ các row", async () => {
    const { ordersHandlers } = renderCrmHook();

    for (const id of [1, 2, 3]) {
      ws.emit({ type: "order.created", order_id: id, channel_code: "FB", row: { id } });
    }
    await vi.advanceTimersByTimeAsync(1250);

    expect(ordersHandlers.upsertOrderFromBroadcast).toHaveBeenCalledTimes(1);
    expect(ordersHandlers.upsertOrderFromBroadcast).toHaveBeenCalledWith([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
    expect(fetchJsonMock).not.toHaveBeenCalled();
    expect(ordersHandlers.loadOrders).not.toHaveBeenCalled();
  });

  it("row.id lệch order_id (payload hỏng/deploy lệch): rơi về đường fetch cũ", async () => {
    const { ordersHandlers } = renderCrmHook();

    ws.emit({ type: "order.created", order_id: 5, channel_code: "FB", row: { id: 6 } });
    await vi.advanceTimersByTimeAsync(1250);

    expect(ordersHandlers.upsertOrderFromBroadcast).not.toHaveBeenCalled();
    expect(fetchJsonMock).toHaveBeenCalledWith("/api/orders/5");
  });

  it("tab ẩn: row vẫn được upsert (không tốn server, tab quay lại là thấy ngay)", async () => {
    setDocumentVisibility("hidden");
    const { ordersHandlers } = renderCrmHook();

    ws.emit({ type: "order.created", order_id: 7, channel_code: "FB", row: { id: 7 } });
    await vi.advanceTimersByTimeAsync(1250);

    expect(ordersHandlers.upsertOrderFromBroadcast).toHaveBeenCalledWith([{ id: 7 }]);
    expect(fetchJsonMock).not.toHaveBeenCalled();
  });
  it("chuyển đơn Landing → Đơn hàng có row: upsert thẳng, KHÔNG POST list", async () => {
    // Đường REST-fanout cuối cùng của trang Đơn hàng (đo prod 2026-08-11): chuyển
    // đơn là thao tác hàng loạt nên coalescer gom ≥2 id rồi gọi loadOrders — tức
    // MỌI tab bắn một POST /api/orders đầy đủ cùng lúc.
    const { ordersHandlers } = renderCrmHook();
    const row = { id: 31, phone: "0901", show_orders: true };

    ws.emit({
      type: "order.updated",
      order_id: 31,
      source: "orders.service.transfer_landing_orders",
      row,
    });
    await vi.advanceTimersByTimeAsync(1250);

    expect(ordersHandlers.upsertOrderFromBroadcast).toHaveBeenCalledWith([row]);
    expect(ordersHandlers.loadOrders).not.toHaveBeenCalled();
    expect(fetchJsonMock).not.toHaveBeenCalled();
  });

  it("chuyển hàng loạt có row: gộp một lần upsert, vẫn zero REST", async () => {
    const { ordersHandlers } = renderCrmHook();

    for (const id of [41, 42, 43]) {
      ws.emit({
        type: "order.updated",
        order_id: id,
        source: "orders.service.transfer_landing_orders",
        row: { id },
      });
    }
    await vi.advanceTimersByTimeAsync(1250);

    expect(ordersHandlers.upsertOrderFromBroadcast).toHaveBeenCalledTimes(1);
    expect(ordersHandlers.upsertOrderFromBroadcast).toHaveBeenCalledWith([
      { id: 41 },
      { id: 42 },
      { id: 43 },
    ]);
    expect(ordersHandlers.loadOrders).not.toHaveBeenCalled();
  });

  it("chuyển đơn KHÔNG row (backend cũ / lô quá trần): giữ nguyên đường fetch cũ", async () => {
    const { ordersHandlers } = renderCrmHook();

    for (const id of [51, 52]) {
      ws.emit({
        type: "order.updated",
        order_id: id,
        source: "orders.service.transfer_landing_orders",
      });
    }
    await vi.advanceTimersByTimeAsync(2000);

    expect(ordersHandlers.upsertOrderFromBroadcast).not.toHaveBeenCalled();
    expect(ordersHandlers.loadOrders).toHaveBeenCalledTimes(1);
  });
});
