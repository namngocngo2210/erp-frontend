/**
 * Chạy script inline của public/webphone.html trong jsdom với ZenifyApp/ZenifyPhone
 * giả — kiểm tra giao thức iframe ↔ app mà không cần SDK thật.
 */
import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Đường dẫn tương đối cwd = frontend/ (vitest chạy từ đây, như managed-fields-sync.test.ts).
const html = readFileSync("public/webphone.html", "utf8");
const script = html.match(/<script type="text\/javascript">([\s\S]*?)<\/script>/)?.[1] ?? "";

type Stub = Record<string, unknown>;

// Mỗi lần chạy script, iframe gắn listener "message" lên window — gỡ sau từng test
// để test sau không bị listener cũ xử lý trùng.
const messageListeners: EventListenerOrEventListenerObject[] = [];

function bootIframe() {
  const posted: unknown[] = [];
  const ZenifyPhone: Stub = {
    subscribe: vi.fn(),
    terminate_call: vi.fn(),
    session: null,
  };
  const ZenifyApp: Stub = {
    subscribe: vi.fn(),
    init: vi.fn(),
    terminate: vi.fn(),
    dialCall: vi.fn(),
  };
  const ZenifyConfig = {
    RING_AGENT_RESPOND_ID: 1038,
    AGENT_ANSWER_RESPOND_ID: 1039,
    AGENT_END_CALL_RESPOND_ID: 1009,
    USER_END_CALL_RESPOND_ID: 1011,
    END_CALL_RESPOND_ID: 1012,
    OUTCALL_ERROR_RESPONSE_ID: 1083,
    OUT_CALL_RESPONSE_ID: 1055,
    USER_PHONE_SELECT: 8003,
    NEW_NOTIFICATION_ID: 100,
    CHANGE_AGENT_STATUS_RESPOND_ID: 2013,
    VOICE_ACTIVATED: 6666,
    LOGIN_RESPOND_ID: 1000,
  };
  Object.assign(window, { ZenifyApp, ZenifyPhone, ZenifyConfig });
  // iframe gửi lên window.parent — trong jsdom parent === window.
  vi.spyOn(window, "postMessage").mockImplementation((msg: unknown) => {
    posted.push(msg);
  });
  const realAdd = window.addEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
    if (type === "message" && listener) messageListeners.push(listener);
    realAdd(type, listener, options);
  });
  new Function(script)();
  const send = (data: unknown) =>
    window.dispatchEvent(new MessageEvent("message", { data, origin: window.location.origin }));
  return { posted, ZenifyApp, ZenifyPhone, send };
}

describe("webphone.html iframe protocol", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    for (const listener of messageListeners.splice(0)) {
      window.removeEventListener("message", listener);
    }
    delete (window as unknown as Stub).ZenifyApp;
    delete (window as unknown as Stub).ZenifyPhone;
    delete (window as unknown as Stub).ZenifyConfig;
  });

  it("init subscribes both ZenifyApp (socket) and ZenifyPhone (SIP session)", () => {
    const { ZenifyApp, ZenifyPhone, send } = bootIframe();
    send({ type: "webphone:init", token: "tok" });
    expect(ZenifyApp.subscribe).toHaveBeenCalledTimes(1);
    expect(ZenifyPhone.subscribe).toHaveBeenCalledTimes(1);
    expect(ZenifyApp.init).toHaveBeenCalledWith("tok");
  });

  it("SIP 'ended'/'failed' (khách cúp máy) forward thành event end không callId", () => {
    const { posted, ZenifyPhone, send } = bootIframe();
    send({ type: "webphone:init", token: "tok" });
    const onPhoneEvent = (ZenifyPhone.subscribe as ReturnType<typeof vi.fn>).mock.calls[0][0] as (
      name: string,
    ) => void;
    onPhoneEvent("accepted");
    onPhoneEvent("ended");
    onPhoneEvent("failed");
    const ends = posted.filter(
      (m) => (m as { type: string; kind?: string }).type === "webphone:event",
    );
    expect(ends).toEqual([
      {
        type: "webphone:event",
        kind: "end",
        objectId: undefined,
        data: { source: "sip", cause: "ended", reason: "" },
      },
      {
        type: "webphone:event",
        kind: "end",
        objectId: undefined,
        data: { source: "sip", cause: "failed", reason: "" },
      },
    ]);
  });

  it("SIP failed kèm cause JsSIP (Busy/Rejected/Canceled) → data.reason", () => {
    const { posted, ZenifyPhone, send } = bootIframe();
    send({ type: "webphone:init", token: "tok" });
    const onPhoneEvent = (ZenifyPhone.subscribe as ReturnType<typeof vi.fn>).mock.calls[0][0] as (
      name: string,
    ) => void;
    // SDK gán ZenifyPhone.session rồi phát "newRTCSession"; iframe gắn listener lấy cause.
    const handlers: Record<string, (e: { cause?: string }) => void> = {};
    ZenifyPhone.session = {
      on: (ev: string, fn: (e: { cause?: string }) => void) => (handlers[ev] = fn),
    };
    onPhoneEvent("newRTCSession");
    handlers.failed({ cause: "Busy" });
    onPhoneEvent("failed");
    const last = posted[posted.length - 1] as { data: Record<string, unknown> };
    expect(last.data).toEqual({ source: "sip", cause: "failed", reason: "Busy" });
  });

  it("forwards login OK (trạng thái agent, NOACD → AVAILABLE) and voice activation", () => {
    const { posted, ZenifyApp, send } = bootIframe();
    send({ type: "webphone:init", token: "tok" });
    const onAppEvent = (ZenifyApp.subscribe as ReturnType<typeof vi.fn>).mock.calls[0][0] as (
      msg: unknown,
    ) => void;
    onAppEvent({ objectId: 1000, data: { status: "INVALID_TOKEN" } });
    onAppEvent({ objectId: 1000, data: { status: "OK", userStatus: "NOACD", phoneType: 0 } });
    onAppEvent({ objectId: 6666, data: { isVoiceActivated: true, phoneType: 0 } });
    onAppEvent({ objectId: 6666, data: { isVoiceActivated: false } });
    const events = posted.filter((m) => (m as { type: string }).type === "webphone:event");
    expect(events).toEqual([
      {
        type: "webphone:event",
        kind: "logged-in",
        objectId: 1000,
        data: { status: "AVAILABLE", agentId: "", autoAnswer: null, phoneType: null },
      },
      {
        type: "webphone:event",
        kind: "voice-activated",
        objectId: 6666,
        data: { isVoiceActivated: true, agentStatus: "" },
      },
      {
        type: "webphone:event",
        kind: "voice-activated",
        objectId: 6666,
        data: { isVoiceActivated: false, agentStatus: "" },
      },
    ]);
  });

  it("logged-in lấy trạng thái từ ZenifyAgent.userstatus (SDK đã tính) khi LOGIN_RESPOND thiếu userStatus", () => {
    const { posted, ZenifyApp, send } = bootIframe();
    (window as unknown as Stub).ZenifyAgent = {
      userstatus: "MEETING",
      agentId: 7486,
      auto_answer: 0,
      phoneType: 0,
    };
    try {
      send({ type: "webphone:init", token: "tok" });
      const onAppEvent = (ZenifyApp.subscribe as ReturnType<typeof vi.fn>).mock.calls[0][0] as (
        msg: unknown,
      ) => void;
      onAppEvent({ objectId: 1000, data: { status: "OK" } });
      onAppEvent({ objectId: 6666, data: { isVoiceActivated: true } });
      const events = posted.filter((m) => (m as { type: string }).type === "webphone:event");
      expect(events).toEqual([
        {
          type: "webphone:event",
          kind: "logged-in",
          objectId: 1000,
          data: { status: "MEETING", agentId: "7486", autoAnswer: 0, phoneType: 0 },
        },
        {
          type: "webphone:event",
          kind: "voice-activated",
          objectId: 6666,
          data: { isVoiceActivated: true, agentStatus: "MEETING" },
        },
      ]);
    } finally {
      delete (window as unknown as Stub).ZenifyAgent;
    }
  });

  it("ensure-hangup tears down a SIP leg still alive after the app went idle", () => {
    const { ZenifyApp, ZenifyPhone, send } = bootIframe();
    send({ type: "webphone:init", token: "tok" });
    // Không còn session → không làm gì (khách cúp máy bình thường, BYE đã xong).
    send({ type: "webphone:ensure-hangup" });
    expect(ZenifyPhone.terminate_call).not.toHaveBeenCalled();
    expect(ZenifyApp.terminate).not.toHaveBeenCalled();
    // Leg SIP còn sống (PBX đang phát tút bận) → BYE + báo server terminate.
    ZenifyPhone.session = {};
    send({ type: "webphone:ensure-hangup" });
    expect(ZenifyApp.terminate).toHaveBeenCalledTimes(1);
    expect(ZenifyPhone.terminate_call).toHaveBeenCalledTimes(1);
  });
});
