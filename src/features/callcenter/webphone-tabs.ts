/**
 * Đa tab ERP: chỉ MỘT tab giữ iframe Zenify (tab chủ). Mỗi tab tự đăng nhập tổng
 * đài với cùng agent thì Zenify coi tab sau là phiên phụ ("Voice tab is not
 * activated") hoặc ngắt phiên cũ — cuộc gọi đến không biết đổ vào đâu.
 *
 * - Bầu tab chủ bằng Web Locks: tab giữ khoá `desi-webphone-leader` là chủ; tab
 *   chủ đóng → khoá nhả → tab đang chờ tự tiếp quản (đăng nhập lại Zenify).
 * - Tab chủ phát trạng thái (SharedWebphoneState) qua BroadcastChannel; tab phụ
 *   hiển thị y hệt và chuyển thao tác (gọi, nghe, tắt, đổi trạng thái…) sang
 *   tab chủ. Âm thanh phát ở tab chủ (trình duyệt phát audio tab nền bình thường).
 * - Không có Web Locks (http dev, trình duyệt cũ) → mọi tab tự làm chủ như trước.
 */
import type { WebphoneCommandMethod, ZenifyAgentStatus } from "./webphone-bridge";
import type { CallInfo, CallStatus } from "./webphone-call-state";
import type { LastCallOutcome } from "./webphone-context";

export const WEBPHONE_LOCK_NAME = "desi-webphone-leader";
export const WEBPHONE_CHANNEL_NAME = "desi-webphone";

/** Phần state tab chủ chia sẻ cho tab phụ (đủ để dựng WebphonePanel). */
export type SharedWebphoneState = {
  enabled: boolean;
  notReadyReason: string | null;
  /** Thông báo thay cho panel (phiên kết thúc / lỗi SDK) — tab phụ hiện kèm Kết nối lại. */
  panelError: string | null;
  callState: CallStatus;
  currentCall: CallInfo | null;
  muted: boolean;
  held: boolean;
  agentStatus: ZenifyAgentStatus | null;
  phoneType: number | null;
  voiceActivated: boolean | null;
  lastOutcome: LastCallOutcome | null;
  loggedIn: boolean;
  loginStalled: boolean;
};

export const initialSharedState: SharedWebphoneState = {
  enabled: false,
  notReadyReason: "Tổng đài đang khởi động ở tab ERP khác, thử lại sau giây lát.",
  panelError: null,
  callState: "idle",
  currentCall: null,
  muted: false,
  held: false,
  agentStatus: null,
  phoneType: null,
  voiceActivated: null,
  lastOutcome: null,
  loggedIn: false,
  loginStalled: false,
};

/** Thao tác tab phụ gửi sang tab chủ. */
export type TabAction =
  | { type: "dial"; phone: string }
  | { type: "answer" }
  | { type: "hangup" }
  | { type: "toggle-mute" }
  | { type: "toggle-hold" }
  | { type: "agent-status"; status: ZenifyAgentStatus }
  | { type: "phone-type"; phoneType: 0 | 1 }
  | { type: "activate-voice" }
  | { type: "dismiss-outcome" }
  | { type: "reconnect" }
  | { type: "command"; method: WebphoneCommandMethod; args?: (string | number)[] }
  /** Tab phụ vừa mở — xin tab chủ phát lại state hiện tại. */
  | { type: "request-state" };

export type TabMessage =
  | { type: "state"; state: SharedWebphoneState }
  | { type: "action"; action: TabAction };

export function isTabMessage(value: unknown): value is TabMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown; state?: unknown; action?: unknown };
  if (v.type === "state") return typeof v.state === "object" && v.state !== null;
  if (v.type === "action") {
    return (
      typeof v.action === "object" &&
      v.action !== null &&
      typeof (v.action as { type?: unknown }).type === "string"
    );
  }
  return false;
}

export type WebphoneChannel = {
  post: (msg: TabMessage) => void;
  subscribe: (fn: (msg: TabMessage) => void) => () => void;
  close: () => void;
};

/** BroadcastChannel bọc lại (null nếu trình duyệt không có). */
export function openWebphoneChannel(): WebphoneChannel | null {
  const Ctor = (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
  if (typeof Ctor !== "function") return null;
  let bc: BroadcastChannel;
  try {
    bc = new Ctor(WEBPHONE_CHANNEL_NAME);
  } catch {
    return null;
  }
  const listeners = new Set<(msg: TabMessage) => void>();
  bc.onmessage = (event: MessageEvent) => {
    if (!isTabMessage(event.data)) return;
    for (const fn of listeners) fn(event.data);
  };
  return {
    post: (msg) => {
      try {
        bc.postMessage(msg);
      } catch {
        /* channel đã đóng */
      }
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close: () => {
      listeners.clear();
      bc.close();
    },
  };
}

/**
 * Xin làm tab chủ. `onLeader` được gọi (1 lần) khi giành được khoá; trả về hàm
 * nhả khoá (unmount). Không có Web Locks → làm chủ ngay.
 */
export function claimLeadership(onLeader: () => void): () => void {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks || typeof locks.request !== "function") {
    onLeader();
    return () => {};
  }
  const controller = new AbortController();
  let release: (() => void) | null = null;
  locks
    .request(
      WEBPHONE_LOCK_NAME,
      { mode: "exclusive", signal: controller.signal },
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
          onLeader();
        }),
    )
    .catch(() => {
      /* bị abort khi chưa tới lượt (tab đóng / unmount) */
    });
  return () => {
    if (release) release();
    else controller.abort();
  };
}
