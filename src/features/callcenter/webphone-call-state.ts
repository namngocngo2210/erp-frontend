/**
 * State machine cuộc gọi — reducer THUẦN (side effect toast/postMessage nằm ở
 * WebphoneProvider). `now` truyền qua action để reducer test được không cần mock Date.
 */
import type { WebphoneEventKind } from "./webphone-bridge";

export type CallStatus = "idle" | "dialing" | "ringing" | "in-call";

export type CallInfo = {
  direction: "in" | "out";
  phone: string;
  callId?: string;
  startedAt?: number;
};

export type CallMachineState = {
  status: CallStatus;
  call: CallInfo | null;
  muted: boolean;
  held: boolean;
};

export type CallMachineAction =
  | { type: "dial"; phone: string }
  | { type: "event"; kind: WebphoneEventKind; data: Record<string, unknown>; now: number }
  | { type: "toggle-mute" }
  | { type: "toggle-hold" }
  | { type: "hangup" }
  | { type: "reset" };

export const initialCallState: CallMachineState = {
  status: "idle",
  call: null,
  muted: false,
  held: false,
};

function onEvent(
  state: CallMachineState,
  kind: WebphoneEventKind,
  data: Record<string, unknown>,
  now: number,
): CallMachineState {
  switch (kind) {
    case "ring": {
      const callId = data.callId ? String(data.callId) : undefined;
      if (data.callType === "CALL_INBOUND") {
        return {
          ...initialCallState,
          status: "ringing",
          call: { direction: "in", phone: String(data.caller ?? ""), callId },
        };
      }
      // CALL_OUTBOUND: đầu xa đổ chuông — giữ dialing, ghi nhận callId.
      if (state.call) return { ...state, call: { ...state.call, callId } };
      return state;
    }
    case "answer":
      if (!state.call) return state;
      return { ...state, status: "in-call", call: { ...state.call, startedAt: now } };
    case "end": {
      if (!state.call) return state;
      const endedId = data.callId ? String(data.callId) : undefined;
      // Event end của cuộc gọi khác (nhiều tab / cuộc trước dồn về) — bỏ qua.
      if (endedId && state.call.callId && endedId !== state.call.callId) return state;
      return initialCallState;
    }
    case "outcall-error":
      // 430 = voicemail (info), cuộc gọi vẫn tiếp diễn.
      if (Number(data.errorCode) === 430) return state;
      return state.call ? initialCallState : state;
    case "outcall-response":
      if (data.errorCode === "OK") return state;
      return state.call ? initialCallState : state;
    default:
      return state;
  }
}

export function webphoneCallReducer(
  state: CallMachineState,
  action: CallMachineAction,
): CallMachineState {
  switch (action.type) {
    case "dial":
      return {
        ...initialCallState,
        status: "dialing",
        call: { direction: "out", phone: action.phone },
      };
    case "event":
      return onEvent(state, action.kind, action.data, action.now);
    case "toggle-mute":
      return state.status === "in-call" || state.status === "dialing"
        ? { ...state, muted: !state.muted }
        : state;
    case "toggle-hold":
      return state.status === "in-call" || state.status === "dialing"
        ? { ...state, held: !state.held }
        : state;
    case "hangup":
      // Reset LẠC QUAN khi user bấm Tắt máy: không chờ echo `end` của SDK. SDK có
      // thể không echo, echo trễ, hoặc echo với callId lệch (đa tab / SDK cấp lại
      // id) → panel kẹt "đang gọi", nút Tắt máy như vô hiệu (audit 2026-07-15).
      // Event `end` tới sau gặp state.call=null nên no-op, không double-reset.
      return initialCallState;
    case "reset":
      return initialCallState;
    default:
      return state;
  }
}
