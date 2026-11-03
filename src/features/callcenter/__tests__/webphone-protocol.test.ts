import { describe, expect, it } from "vitest";

import {
  isWebphoneInboundMessage,
  shouldForceAvailableOnLogin,
  type WebphoneEventKind,
} from "../webphone-bridge";
import { outcallErrorMessage, outcallResponseMessage } from "../webphone-messages";
import {
  initialCallState,
  webphoneCallReducer,
  type CallMachineAction,
  type CallMachineState,
} from "../webphone-call-state";

describe("outcallErrorMessage", () => {
  it("maps documented codes with type", () => {
    expect(outcallErrorMessage(402)).toEqual({
      message: "Lỗi 402: hết hạn mức cước!",
      type: "error",
    });
    expect(outcallErrorMessage(430)).toEqual({
      message: "Info 430: cuộc gọi được chuyển hướng voicemail!",
      type: "info",
    });
  });
  it("returns undefined for unknown code", () => {
    expect(outcallErrorMessage(999)).toBeUndefined();
  });
});

describe("outcallResponseMessage", () => {
  it("maps documented request errors", () => {
    expect(outcallResponseMessage("IN_BLACKLIST")).toBe("Khách hàng trong blacklist!");
  });
  it("returns fallback for unknown non-OK code", () => {
    expect(outcallResponseMessage("WHATEVER")).toBe("Không thể kết nối tới WebPhone!");
  });
  it("returns undefined for OK", () => {
    expect(outcallResponseMessage("OK")).toBeUndefined();
  });
});

describe("shouldForceAvailableOnLogin", () => {
  it("đưa về AVAILABLE khi đăng nhập mà đang tắt nhận cuộc gọi / đã đăng xuất", () => {
    expect(shouldForceAvailableOnLogin("NOT AVAILABLE")).toBe(true);
    expect(shouldForceAvailableOnLogin("LOGOUT")).toBe(true);
  });
  it("giữ nguyên trạng thái có chủ đích (họp, ăn trưa…) và trạng thái đang nhận", () => {
    expect(shouldForceAvailableOnLogin("AVAILABLE")).toBe(false);
    expect(shouldForceAvailableOnLogin("NOACD")).toBe(false);
    expect(shouldForceAvailableOnLogin("MEETING")).toBe(false);
    expect(shouldForceAvailableOnLogin("ATLUNCH")).toBe(false);
    expect(shouldForceAvailableOnLogin(null)).toBe(false);
  });
});

describe("isWebphoneInboundMessage", () => {
  it("accepts new event kinds", () => {
    expect(
      isWebphoneInboundMessage({
        type: "webphone:event",
        kind: "agent-status",
        data: { status: "MEETING" },
      }),
    ).toBe(true);
  });
});

const NOW = 1_752_500_000_000;

function run(state: CallMachineState, ...actions: CallMachineAction[]): CallMachineState {
  return actions.reduce(webphoneCallReducer, state);
}

const event = (kind: WebphoneEventKind, data: Record<string, unknown> = {}): CallMachineAction => ({
  type: "event",
  kind,
  data,
  now: NOW,
});

describe("webphoneCallReducer", () => {
  it("dial → dialing with outbound call", () => {
    const s = run(initialCallState, { type: "dial", phone: "0912345678" });
    expect(s).toEqual({
      status: "dialing",
      call: { direction: "out", phone: "0912345678" },
      muted: false,
      held: false,
    });
  });

  it("inbound ring → ringing with caller info", () => {
    const s = run(
      initialCallState,
      event("ring", { callId: "c1", caller: "0900000001", callType: "CALL_INBOUND" }),
    );
    expect(s.status).toBe("ringing");
    expect(s.call).toEqual({ direction: "in", phone: "0900000001", callId: "c1" });
  });

  it("outbound ring keeps dialing and attaches callId", () => {
    const s = run(
      initialCallState,
      { type: "dial", phone: "0912345678" },
      event("ring", { callId: "c2", caller: "0912345678", callType: "CALL_OUTBOUND" }),
    );
    expect(s.status).toBe("dialing");
    expect(s.call?.callId).toBe("c2");
  });

  it("answer → in-call with startedAt", () => {
    const s = run(
      initialCallState,
      event("ring", { callId: "c1", caller: "0900000001", callType: "CALL_INBOUND" }),
      event("answer", { callId: "c1" }),
    );
    expect(s.status).toBe("in-call");
    expect(s.call?.startedAt).toBe(NOW);
  });

  it("end resets to idle (and clears mute/hold)", () => {
    const inCall = run(
      initialCallState,
      event("ring", { callId: "c1", caller: "0900000001", callType: "CALL_INBOUND" }),
      event("answer", { callId: "c1" }),
      { type: "toggle-mute" },
    );
    expect(inCall.muted).toBe(true);
    expect(run(inCall, event("end", { callId: "c1" }))).toEqual(initialCallState);
  });

  it("end WITHOUT callId (SIP session ended — khách cúp máy) resets even when call has callId", () => {
    const inCall = run(
      initialCallState,
      { type: "dial", phone: "0912345678" },
      event("ring", { callId: "c2", caller: "0912345678", callType: "CALL_OUTBOUND" }),
      event("answer", { callId: "c2" }),
    );
    expect(inCall.status).toBe("in-call");
    expect(run(inCall, event("end", { source: "sip", cause: "ended" }))).toEqual(initialCallState);
  });

  it("end of a DIFFERENT callId is ignored", () => {
    const inCall = run(
      initialCallState,
      event("ring", { callId: "c1", caller: "0900000001", callType: "CALL_INBOUND" }),
      event("answer", { callId: "c1" }),
    );
    expect(run(inCall, event("end", { callId: "other" }))).toBe(inCall);
  });

  it("outcall-error ends the attempt, except 430 voicemail info", () => {
    const dialing = run(initialCallState, { type: "dial", phone: "0912345678" });
    expect(run(dialing, event("outcall-error", { errorCode: "486" }))).toEqual(initialCallState);
    expect(run(dialing, event("outcall-error", { errorCode: "430" }))).toBe(dialing);
  });

  it("outcall-response non-OK ends the attempt, OK keeps dialing", () => {
    const dialing = run(initialCallState, { type: "dial", phone: "0912345678" });
    expect(run(dialing, event("outcall-response", { errorCode: "INCALL" }))).toEqual(
      initialCallState,
    );
    expect(run(dialing, event("outcall-response", { errorCode: "OK" }))).toBe(dialing);
  });

  it("toggle-mute/hold only flip while in a call", () => {
    expect(run(initialCallState, { type: "toggle-mute" })).toBe(initialCallState);
    const inCall = run(
      initialCallState,
      event("ring", { callId: "c1", caller: "0900000001", callType: "CALL_INBOUND" }),
      event("answer", {}),
    );
    const muted = run(inCall, { type: "toggle-mute" });
    expect(muted.muted).toBe(true);
    expect(run(muted, { type: "toggle-hold" }).held).toBe(true);
  });

  it("reset returns initial state", () => {
    const dialing = run(initialCallState, { type: "dial", phone: "0912345678" });
    expect(run(dialing, { type: "reset" })).toEqual(initialCallState);
  });

  it("hangup optimistically returns to idle from in-call", () => {
    const inCall = run(
      initialCallState,
      event("ring", { callId: "c1", caller: "0900000001", callType: "CALL_INBOUND" }),
      event("answer", { callId: "c1" }),
    );
    expect(inCall.status).toBe("in-call");
    expect(run(inCall, { type: "hangup" })).toEqual(initialCallState);
  });

  it("late/mismatched end after hangup is a no-op (no wedge)", () => {
    // hangup đã về idle; echo `end` tới sau (kể cả callId lệch) không được làm gì.
    const afterHangup = run(
      initialCallState,
      event("ring", { callId: "c1", caller: "0900000001", callType: "CALL_INBOUND" }),
      event("answer", { callId: "c1" }),
      { type: "hangup" },
    );
    expect(afterHangup).toEqual(initialCallState);
    expect(run(afterHangup, event("end", { callId: "other" }))).toEqual(initialCallState);
  });
});
