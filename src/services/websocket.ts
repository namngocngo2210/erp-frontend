import { getValidAccessToken } from "./http";

/**
 * Subprotocol mang JWT khi bắt tay WebSocket (hợp đồng với backend, audit
 * 2026-09-23 N2). Trước đây token nằm ở `?token=` trên URL nên lọt vào access
 * log uvicorn → Alloy → Loki/Grafana (112 dòng/24h): ai đọc được log là có phiên
 * của user. Header `Sec-WebSocket-Protocol` không được ghi vào access log.
 * JWT chỉ gồm `A-Za-z0-9-_.` nên hợp lệ làm subprotocol token (RFC 6455 §4.1).
 */
export const WS_AUTH_SUBPROTOCOL = "desi.jwt.v1";

function buildWebSocketUrls(baseUrl: string): string[] {
  const urls: string[] = [];
  const envBase = String(import.meta.env.VITE_WS_BACKEND_URL || "").trim();
  if (envBase) {
    const normalizedBase = envBase.replace(/\/+$/, "");
    const normalizedPath = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
    return [`${normalizedBase}${normalizedPath}`];
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const normalizedPath = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
  // Use same host as frontend so Vite/nginx proxy can forward /ws to backend.
  urls.push(`${protocol}//${window.location.host}${normalizedPath}`);

  return Array.from(new Set(urls));
}

// Sự cố 2026-07-23: một gunicorn worker recycle (`--max-requests`) làm mọi WS client
// trên worker đó rớt cùng một giây. Backoff cũ `1000 * 2^(n-1)` KHÔNG có jitter nên
// toàn bộ client thử lại đúng cùng mili-giây; mỗi lần bắt tay mở một connection
// Postgres để xác thực JWT → ~96 connection đồng thời, cạn `max_connections=100`,
// mọi API HTTP trả 500. Full jitter phá đồng bộ hoá đó: mỗi client bốc ngẫu nhiên
// trong [sàn, trần của bậc hiện tại] thay vì cùng dùng chung một mốc.
export const RECONNECT_MIN_DELAY_MS = 250;
export const RECONNECT_BASE_DELAY_MS = 1000;
export const RECONNECT_MAX_DELAY_MS = 30_000;

export function computeReconnectDelay(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(
    RECONNECT_MAX_DELAY_MS,
    RECONNECT_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1),
  );
  const ceiling = Math.max(RECONNECT_MIN_DELAY_MS, exponential);
  return Math.round(RECONNECT_MIN_DELAY_MS + random() * (ceiling - RECONNECT_MIN_DELAY_MS));
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private urls: string[];
  private urlIndex = 0;
  private reconnectTimeout: number | null = null;
  private eventListeners: Map<string, Set<(event: MessageEvent) => void>> = new Map();
  private isWebSocketConnected = false;
  private reconnectAttempts = 0;
  private shouldReconnect = true;

  constructor(baseUrl: string) {
    this.urls = buildWebSocketUrls(baseUrl);
  }

  private getCurrentBaseUrl(): string {
    return this.urls[this.urlIndex] || "";
  }

  connect(): void {
    void this.connectInternal();
  }

  private async connectInternal(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING)
      return;

    const token = await getValidAccessToken();
    if (!token) {
      console.warn("WebSocket: No access token available");
      return;
    }

    this.shouldReconnect = true;
    // Token đi trong subprotocol, KHÔNG nối vào URL (xem WS_AUTH_SUBPROTOCOL).
    // Server chọn "desi.jwt.v1" khi accept; token đổi sau refresh thì lần
    // reconnect kế tiếp tự lấy token mới qua getValidAccessToken().
    const safeUrl = this.getCurrentBaseUrl();
    this.ws = new WebSocket(safeUrl, [WS_AUTH_SUBPROTOCOL, token]);

    this.ws.onopen = () => {
      this.isWebSocketConnected = true;
      this.reconnectAttempts = 0;
      this.notifyListeners("open", new MessageEvent("open"));
    };

    this.ws.onmessage = (event) => {
      this.notifyListeners("message", event);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", { url: safeUrl, error });
      this.notifyListeners("error", error as unknown as MessageEvent);
    };

    this.ws.onclose = (event) => {
      this.isWebSocketConnected = false;
      if (event.code !== 1000) {
        console.warn("WebSocket closed:", {
          url: safeUrl,
          code: event.code,
          reason: event.reason || "no-reason",
          wasClean: event.wasClean,
        });
      }
      this.notifyListeners("close", event as unknown as MessageEvent);

      // If configured backend URL is not reachable, fall back to same-origin /ws proxy.
      if (this.shouldReconnect && event.code === 1006 && this.urlIndex < this.urls.length - 1) {
        this.urlIndex += 1;
        this.reconnectAttempts = 0;
        console.warn("WebSocket fallback to alternate endpoint:", this.getCurrentBaseUrl());
      }

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  // Thử lại không giới hạn số lần — độ giãn đã bị chặn bởi RECONNECT_MAX_DELAY_MS.
  // Trước đây dừng hẳn sau 5 lần: mọi gián đoạn quá ~31 giây (đúng bằng sự cố
  // 2026-07-23) làm client tắt realtime vĩnh viễn cho tới khi user tự tải lại
  // trang — hỏng âm thầm, không có dấu hiệu nào trên giao diện.
  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    this.reconnectAttempts++;
    const delay = computeReconnectDelay(this.reconnectAttempts);

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isWebSocketConnected = false;
  }

  send(data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket: Not connected, cannot send message");
      return;
    }
    this.ws.send(JSON.stringify(data));
  }

  isConnected(): boolean {
    return this.isWebSocketConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  addEventListener(event: string, callback: (event: MessageEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  removeEventListener(event: string, callback: (event: MessageEvent) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private notifyListeners(event: string, data: MessageEvent): void {
    this.eventListeners.get(event)?.forEach((callback) => callback(data));
  }
}

// Global WebSocket manager for CRM
let crmWebSocket: WebSocketManager | null = null;

export function getCRMWebSocket(): WebSocketManager {
  if (!crmWebSocket) {
    crmWebSocket = new WebSocketManager("/ws/crm/");
  }
  return crmWebSocket;
}

export function disconnectCRM(): void {
  if (crmWebSocket) {
    crmWebSocket.disconnect();
    crmWebSocket = null;
  }
}
