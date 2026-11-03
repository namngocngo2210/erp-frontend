import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WS_AUTH_SUBPROTOCOL, WebSocketManager } from "../websocket";

vi.mock("../http", () => ({
  getValidAccessToken: vi.fn(async () => "fake-token"),
}));

const CLOSED = 3;

class FakeWebSocket {
  // Bắt buộc có: connectInternal so readyState với WebSocket.OPEN/CONNECTING.
  // Thiếu thì cả hai vế đều undefined và guard chặn mọi lần kết nối.
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: FakeWebSocket[] = [];

  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string; wasClean: boolean }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessage: ((event: unknown) => void) | null = null;

  constructor(
    public url: string,
    public protocols?: string | string[],
  ) {
    FakeWebSocket.instances.push(this);
  }

  close(): void {
    this.readyState = CLOSED;
  }

  /** Giả lập server cắt kết nối (worker recycle, reload nginx, mạng chập). */
  dropByServer(): void {
    this.readyState = CLOSED;
    this.onclose?.({ code: 1006, reason: "", wasClean: false });
  }
}

describe("WebSocketManager — vòng đời reconnect", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function lastSocket(): FakeWebSocket {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  /** Chạy hết microtask (connectInternal await lấy token) rồi đẩy timer tới hạn. */
  async function settleAndAdvance(): Promise<void> {
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(0);
  }

  // Audit 2026-09-23 N2: token trên URL lọt vào access log uvicorn/Loki.
  it("gửi JWT qua subprotocol, KHÔNG nối ?token= vào URL", async () => {
    const manager = new WebSocketManager("/ws/crm/");
    manager.connect();
    await settleAndAdvance();

    const socket = lastSocket();
    expect(socket.url).not.toContain("token=");
    expect(socket.url).toMatch(/\/ws\/crm\/$/);
    expect(socket.protocols).toEqual([WS_AUTH_SUBPROTOCOL, "fake-token"]);
  });

  it("không bỏ cuộc sau 5 lần thử — gián đoạn dài vẫn tự nối lại", async () => {
    const manager = new WebSocketManager("/ws/crm/");
    manager.connect();
    await settleAndAdvance();

    expect(FakeWebSocket.instances).toHaveLength(1);

    // Rớt liên tiếp 12 lần, vượt xa trần 5 lần cũ.
    for (let round = 0; round < 12; round += 1) {
      lastSocket().dropByServer();
      await settleAndAdvance();
    }

    expect(FakeWebSocket.instances).toHaveLength(13);
  });

  it("disconnect() vẫn dừng hẳn vòng thử lại", async () => {
    const manager = new WebSocketManager("/ws/crm/");
    manager.connect();
    await settleAndAdvance();

    manager.disconnect();
    lastSocket().dropByServer();
    await settleAndAdvance();

    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
