/**
 * Context webphone — tách khỏi WebphoneProvider để component UI (WebphonePanel)
 * import hook không tạo vòng import, và test bơm được value giả qua
 * WebphoneContext.Provider.
 */
import { createContext, useContext } from "react";

import type { CallOutcome } from "./call-outcome";
import type { WebphoneCommandMethod, ZenifyAgentStatus } from "./webphone-bridge";
import type { CallInfo, CallStatus } from "./webphone-call-state";

/** Kết quả cuộc gọi vừa rồi (chưa nối được) — hiện trong panel idle. */
export type LastCallOutcome = { phone: string; outcome: CallOutcome };

export type WebphoneContextValue = {
  /** User có quyền dùng tổng đài (landing-orders:view) — quyết định HIỆN icon gọi. */
  canUse: boolean;
  /** Webphone sẵn sàng nhận lệnh gọi (token + SDK đã init). */
  enabled: boolean;
  visible: boolean;
  setVisible: (next: boolean) => void;
  dialCall: (phone: string) => void;
  // State machine cuộc gọi (webphone-call-state.ts).
  callState: CallStatus;
  currentCall: CallInfo | null;
  muted: boolean;
  held: boolean;
  answer: () => void;
  /** terminate — dùng cho cả từ chối cuộc gọi đến lẫn tắt máy. */
  hangup: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  // Đường ống các function còn lại của doc v2.3 (chưa có UI riêng).
  sendCommand: (method: WebphoneCommandMethod, args?: (string | number)[]) => void;
  setAgentStatus: (status: ZenifyAgentStatus) => void;
  setPhoneType: (phoneType: 0 | 1) => void;
  agentStatus: ZenifyAgentStatus | null;
  /** Chế độ nghe gọi (USER_PHONE_SELECT): 0 WEB, 1 SIP_PHONE, 3 PHONE, 5 MOBILE_APP. */
  phoneType: number | null;
  /** Tab này có được PBX đổ chuông không (VOICE_ACTIVATED). null = chưa biết. */
  voiceActivated: boolean | null;
  /** Giành quyền nghe gọi về tab này (ZenifyApp.activateVoice). */
  activateVoice: () => void;
  lastOutcome: LastCallOutcome | null;
  dismissOutcome: () => void;
  /** Đã nhận LOGIN_RESPOND OK từ Zenify (khác với có trạng thái agent). */
  loggedIn: boolean;
  /** Init xong nhưng quá lâu không thấy login OK (token sai, bị tab khác đá, mạng). */
  loginStalled: boolean;
  /** Remount iframe + lấy token mới (giống nút Kết nối lại khi phiên kết thúc). */
  reconnect: () => void;
  /** Tab này giữ iframe Zenify (âm thanh phát ở đây); false = tab phụ điều khiển từ xa. */
  isLeader: boolean;
};

export const WebphoneContext = createContext<WebphoneContextValue>({
  canUse: false,
  enabled: false,
  visible: false,
  setVisible: () => {},
  dialCall: () => {},
  callState: "idle",
  currentCall: null,
  muted: false,
  held: false,
  answer: () => {},
  hangup: () => {},
  toggleMute: () => {},
  toggleHold: () => {},
  sendCommand: () => {},
  setAgentStatus: () => {},
  setPhoneType: () => {},
  agentStatus: null,
  phoneType: null,
  voiceActivated: null,
  activateVoice: () => {},
  lastOutcome: null,
  dismissOutcome: () => {},
  loggedIn: false,
  loginStalled: false,
  reconnect: () => {},
  isLeader: true,
});

export function useWebphone(): WebphoneContextValue {
  return useContext(WebphoneContext);
}
