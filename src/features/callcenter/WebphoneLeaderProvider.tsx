/**
 * WebphoneLeaderProvider — TAB CHỦ: mount iframe /webphone.html (Zenify SDK headless).
 *
 * Iframe được giữ mounted xuyên suốt điều hướng SPA để cuộc gọi không rớt khi
 * đổi trang. Chỉ user có quyền `landing-orders:view` mới fetch token + render
 * webphone (sale phụ trách đơn landing). Iframe chỉ mount SAU khi có token —
 * user chưa cấu hình Zenify không tải vendor CDN vô ích.
 *
 * Iframe chỉ là engine (Bước 3.2 tài liệu) — UI gọi do WebphonePanel dựng từ
 * state machine webphone-call-state.ts; provider lo side effect (toast, postMessage).
 * Tab chủ còn phát state cho các tab phụ và nhận thao tác từ chúng (webphone-tabs.ts).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  outcomeFromEnd,
  outcomeFromOutcallError,
  outcomeFromOutcallResponse,
} from "./call-outcome";
import { useRefreshWebphoneToken, useWebphoneToken } from "./queries";
import {
  isWebphoneInboundMessage,
  sanitizePhoneForDial,
  shouldForceAvailableOnLogin,
  type WebphoneCommandMethod,
  type WebphoneInboundMessage,
  type WebphoneOutboundMessage,
  type ZenifyAgentStatus,
} from "./webphone-bridge";
import { initialCallState, webphoneCallReducer } from "./webphone-call-state";
import { WebphoneContext, type LastCallOutcome } from "./webphone-context";
import { diagRecord, diagSetRole } from "./webphone-diag";
import { WebphoneDock } from "./WebphoneDock";
import {
  openWebphoneChannel,
  type SharedWebphoneState,
  type TabAction,
  type WebphoneChannel,
} from "./webphone-tabs";
import {
  AGENT_REJECT_MESSAGE,
  NOT_READY_MESSAGE,
  outcallErrorMessage,
  outcallResponseMessage,
} from "./webphone-messages";

// Chủ động làm mới phiên trước khi token hết hạn (tab ERP mở nhiều ngày liền).
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
// Banner kết quả cuộc gọi (bận / từ chối / nhỡ) tự thu gọn sau khoảng này.
const OUTCOME_AUTO_HIDE_MS = 8_000;
// Init xong mà quá lâu không login OK → coi là treo (token sai / bị tab khác đá / mạng).
const LOGIN_STALL_MS = 15_000;

export function WebphoneLeaderProvider({
  canUse,
  children,
}: {
  canUse: boolean;
  children: ReactNode;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    diagSetRole("leader");
  }, []);
  const [frameReady, setFrameReady] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  // Zenify ép đăng xuất (forced logout / token hết hạn) → dừng hẳn, KHÔNG tự
  // re-init bằng token cũ; user bấm launcher để lấy token mới và vào lại.
  const [sessionEnded, setSessionEnded] = useState(false);
  // Đổi key → remount iframe với trạng thái sạch khi recover.
  const [frameKey, setFrameKey] = useState(0);

  const [callMachine, dispatch] = useReducer(webphoneCallReducer, initialCallState);
  const [agentStatus, setAgentStatusState] = useState<ZenifyAgentStatus | null>(null);
  const [phoneType, setPhoneTypeState] = useState<number | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [voiceActivated, setVoiceActivated] = useState<boolean | null>(null);
  const [lastOutcome, setLastOutcome] = useState<LastCallOutcome | null>(null);
  const [loginStalled, setLoginStalled] = useState(false);
  const dismissOutcome = useCallback(() => setLastOutcome(null), []);
  // Snapshot state cuộc gọi cho handleEvent (event end/lỗi cần biết cuộc gọi TRƯỚC
  // đó đã được nghe chưa, hướng nào) — ghi qua effect, không đọc trong render.
  const callSnapshotRef = useRef(callMachine);
  useEffect(() => {
    callSnapshotRef.current = callMachine;
  }, [callMachine]);

  const tokenQuery = useWebphoneToken(canUse);
  const refreshToken = useRefreshWebphoneToken();
  const token = tokenQuery.data?.token;

  const post = useCallback((msg: WebphoneOutboundMessage) => {
    diagRecord(`app→iframe ${msg.type}`, msg.type === "webphone:init" ? undefined : msg);
    iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, []);

  // Side effect theo event SDK (toast/panel) — state cuộc gọi do reducer lo.
  const handleEvent = useCallback(
    (msg: Extract<WebphoneInboundMessage, { type: "webphone:event" }>) => {
      const data = msg.data ?? {};
      // Dấu vết chẩn đoán tích hợp Zenify (DevTools bật mức "Verbose"): mốc khách
      // nhấc máy / kết thúc phụ thuộc server gửi event nào — cần log thật để đối chiếu.
      // eslint-disable-next-line no-console
      console.debug("[webphone]", msg.kind, msg.objectId, data);
      diagRecord(`event ${msg.kind ?? "?"} objectId=${msg.objectId ?? "?"}`, data);
      const before = callSnapshotRef.current;
      if (msg.kind) dispatch({ type: "event", kind: msg.kind, data, now: Date.now() });
      // Kết quả cuộc gọi chưa nối được (bận / từ chối / không bắt máy / nhỡ) → hiện
      // trong panel, không chỉ toast thoáng qua.
      const showOutcome = (outcome: ReturnType<typeof outcomeFromEnd>) => {
        if (!outcome || !before.call) return;
        setLastOutcome({ phone: before.call.phone, outcome });
        setVisible(true);
      };
      switch (msg.kind) {
        case "ring":
          // Cuộc gọi đến → tự bung panel cho agent thấy màn hình nghe máy.
          if (data.callType === "CALL_INBOUND") {
            setLastOutcome(null);
            setVisible(true);
          }
          break;
        case "answer":
          setLastOutcome(null);
          break;
        case "end":
          if (before.call && before.status !== "in-call") {
            // Guard callId như reducer: end của cuộc khác thì không phải kết quả cuộc này.
            const endedId = data.callId ? String(data.callId) : undefined;
            if (!endedId || !before.call.callId || endedId === before.call.callId) {
              showOutcome(
                outcomeFromEnd(data, { answered: false, direction: before.call.direction }),
              );
            }
          }
          break;
        case "outcall-error": {
          const code = Number(data.errorCode);
          const err = outcallErrorMessage(code);
          if (err) (err.type === "info" ? toast.info : toast.error)(err.message);
          // 430 voicemail: cuộc gọi vẫn tiếp diễn, không phải kết thúc.
          if (code !== 430) showOutcome(outcomeFromOutcallError(code));
          break;
        }
        case "outcall-response": {
          const code = String(data.errorCode ?? "");
          const message = outcallResponseMessage(code);
          if (message) toast.error(message);
          showOutcome(outcomeFromOutcallResponse(code));
          break;
        }
        case "notification":
          if (data.type === "not_ready") toast.error(NOT_READY_MESSAGE);
          if (data.type === "agent_reject") toast.warning(AGENT_REJECT_MESSAGE);
          if (data.type === "phone_failed" && data.title) toast.error(String(data.title));
          break;
        case "agent-status":
          setAgentStatusState((data.status as ZenifyAgentStatus) ?? null);
          break;
        case "logged-in":
          setLoggedIn(true);
          if (data.status) setAgentStatusState(data.status as ZenifyAgentStatus);
          break;
        case "voice-activated":
          setVoiceActivated(Boolean(data.isVoiceActivated));
          // Trạng thái agent kèm theo — điền nếu lúc login chưa có.
          if (data.agentStatus) {
            setAgentStatusState((prev) => prev ?? (data.agentStatus as ZenifyAgentStatus));
          }
          break;
        case "phone-type": {
          const value = Number(data.phoneType);
          setPhoneTypeState(Number.isNaN(value) ? null : value);
          break;
        }
      }
    },
    [],
  );

  // Nhận sự kiện từ iframe: ready/sdk-error/call events.
  useEffect(() => {
    if (!canUse) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isWebphoneInboundMessage(event.data)) return;
      const msg = event.data;
      switch (msg.type) {
        case "webphone:ready":
          setFrameReady(true);
          break;
        case "webphone:initialized":
          setInitialized(true);
          break;
        case "webphone:logged-out":
          setInitialized(false);
          setSessionEnded(true);
          dispatch({ type: "reset" });
          setAgentStatusState(null);
          setPhoneTypeState(null);
          setLoggedIn(false);
          setVoiceActivated(null);
          break;
        case "webphone:sdk-error":
          setSdkError(msg.message);
          console.warn("[webphone]", msg.message);
          break;
        case "webphone:log":
          diagRecord(`sdk.${msg.level}`, msg.text);
          break;
        case "webphone:event":
          handleEvent(msg);
          break;
      }
      if (msg.type !== "webphone:event" && msg.type !== "webphone:log") {
        diagRecord(`iframe→app ${msg.type}`);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [canUse, handleEvent]);

  // Đủ điều kiện thì init SDK trong iframe (1 lần cho tới khi phiên kết thúc).
  useEffect(() => {
    if (!canUse || !frameReady || initialized || sessionEnded || !token) return;
    post({ type: "webphone:init", token });
  }, [canUse, frameReady, initialized, sessionEnded, token, post]);

  // Đăng nhập treo: init xong (SDK nhận token) nhưng không thấy LOGIN_RESPOND OK.
  useEffect(() => {
    if (!initialized || loggedIn || sessionEnded) {
      setLoginStalled(false);
      return;
    }
    const timer = window.setTimeout(() => setLoginStalled(true), LOGIN_STALL_MS);
    return () => window.clearTimeout(timer);
  }, [initialized, loggedIn, sessionEnded]);

  // Cuộc gọi ĐẾN chỉ đổ vào tab đang giữ quyền nghe gọi (activateVoice → server
  // VOICE_ACTIVATED → SDK register SIP). Trước đây chỉ activate lúc bấm gọi ra nên
  // tab mở cả ngày không nhận được cuộc gọi đến. Sau login, nếu server không báo
  // tab này đã activated thì tự giành 1 lần (không lặp để 2 tab không giành qua lại).
  const autoActivatedRef = useRef(false);
  useEffect(() => {
    if (!loggedIn || voiceActivated === true || autoActivatedRef.current) return;
    const timer = window.setTimeout(() => {
      if (autoActivatedRef.current) return;
      autoActivatedRef.current = true;
      post({ type: "webphone:activate" });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [loggedIn, voiceActivated, post]);

  // Điều kiện 2 để nhận cuộc gọi đến: agent phải AVAILABLE. Sau login, nếu đang
  // "Không nhận cuộc gọi" / "Đã đăng xuất" thì tự bật Sẵn sàng 1 lần; sale muốn
  // tắt thì đổi qua AgentStatusBar (không bị ép lại cho tới lần login sau).
  const autoAvailableRef = useRef(false);
  useEffect(() => {
    if (!loggedIn || autoAvailableRef.current || !shouldForceAvailableOnLogin(agentStatus)) return;
    autoAvailableRef.current = true;
    post({ type: "webphone:agent-status", status: "AVAILABLE" });
  }, [loggedIn, agentStatus, post]);

  // Remount iframe + lấy token mới (bỏ cache BE) — dùng khi recover thủ công.
  const recover = useCallback(() => {
    setFrameReady(false);
    setInitialized(false);
    setSdkError(null);
    setSessionEnded(false);
    setFrameKey((key) => key + 1);
    dispatch({ type: "reset" });
    setAgentStatusState(null);
    setPhoneTypeState(null);
    setLoggedIn(false);
    setVoiceActivated(null);
    autoActivatedRef.current = false;
    autoAvailableRef.current = false;
    void refreshToken().catch(() => {
      /* lỗi giữ nguyên trong query cache — panel hiển thị trạng thái lỗi */
    });
  }, [refreshToken]);

  // Recover remount iframe → HỦY connection SDK/websocket → RỚT cuộc gọi đang nói.
  // Không được recover giữa cuộc gọi: nếu timer TTL chạm đúng lúc đang gọi thì HOÃN,
  // để effect theo dõi trạng thái chạy recover ngay khi về idle (audit 2026-07-15).
  const callStatusRef = useRef(callMachine.status);
  useEffect(() => {
    // Latest-ref qua effect (ghi ref trong thân render làm React Compiler bail out).
    // Chỉ đọc lúc timer TTL bắn (recoverWhenIdle) — không đọc trong render.
    callStatusRef.current = callMachine.status;
  }, [callMachine.status]);
  const pendingRecoverRef = useRef(false);

  const recoverWhenIdle = useCallback(() => {
    if (callStatusRef.current === "idle") {
      recover();
    } else {
      pendingRecoverRef.current = true;
    }
  }, [recover]);

  // Token có hạn (BE trả ttl còn lại) — làm mới phiên trước khi hết hạn để tab
  // mở nhiều ngày không chết webphone âm thầm. Recover reload iframe nên chỉ
  // chạy khi sắp hết hạn thật (margin 5'), không chạy giữa phiên bình thường.
  const ttl = tokenQuery.data?.ttl;
  useEffect(() => {
    if (!canUse || !initialized || !ttl) return;
    const delay = Math.max(ttl * 1000 - TOKEN_REFRESH_MARGIN_MS, 60_000);
    const timer = window.setTimeout(recoverWhenIdle, delay);
    return () => window.clearTimeout(timer);
  }, [canUse, initialized, ttl, recoverWhenIdle]);

  // Cuộc gọi vừa kết thúc mà có recover đang chờ (TTL hết hạn giữa cuộc gọi) → làm
  // mới phiên ngay bây giờ.
  useEffect(() => {
    if (callMachine.status === "idle" && pendingRecoverRef.current) {
      pendingRecoverRef.current = false;
      recover();
    }
  }, [callMachine.status, recover]);

  // Cuộc gọi kết thúc (tắt máy / khách cúp / lỗi) → thu gọn panel thay vì bật lại
  // bàn phím quay số (muốn quay số thì bấm "Quay số" trên toolbar hoặc launcher),
  // và bảo iframe BYE leg SIP nếu còn sống — gọi ra lỗi (480/408...) reducer về
  // idle theo OUTCALL_ERROR nhưng PBX vẫn phát tút bận vào tai agent tới khi BYE.
  // Ngoại lệ: có "kết quả cuộc gọi" (bận / từ chối / nhỡ) thì giữ panel mở để sale
  // đọc và bấm Gọi lại; tự thu gọn sau ít giây nếu không thao tác.
  const wasInCallRef = useRef(false);
  const lastOutcomeRef = useRef<LastCallOutcome | null>(null);
  useEffect(() => {
    lastOutcomeRef.current = lastOutcome;
  }, [lastOutcome]);
  useEffect(() => {
    const inCall = callMachine.status !== "idle";
    if (wasInCallRef.current && !inCall) {
      if (!lastOutcomeRef.current) setVisible(false);
      post({ type: "webphone:ensure-hangup" });
    }
    wasInCallRef.current = inCall;
  }, [callMachine.status, post]);
  useEffect(() => {
    if (!lastOutcome) return;
    const timer = window.setTimeout(() => {
      setLastOutcome(null);
      setVisible(false);
    }, OUTCOME_AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [lastOutcome]);

  const enabled = canUse && initialized && !sdkError && !sessionEnded;

  // Lý do webphone chưa gọi được — icon vẫn hiện (user thấy tính năng tồn tại),
  // bấm thì toast giải thích thay vì im lặng.
  const notReadyReason = !token
    ? tokenQuery.isError
      ? (tokenQuery.error as Error | null)?.message ||
        "Tổng đài chưa được cấu hình hoặc lỗi kết nối."
      : "Đang lấy phiên tổng đài, thử lại sau giây lát."
    : sdkError
      ? sdkError
      : sessionEnded
        ? "Phiên tổng đài đã kết thúc — mở webphone và bấm Kết nối lại."
        : !initialized
          ? "Webphone đang kết nối, thử lại sau giây lát."
          : null;

  const dialCall = useCallback(
    (phone: string) => {
      const clean = sanitizePhoneForDial(phone);
      if (!clean) return;
      if (notReadyReason) {
        toast.error(notReadyReason);
        return;
      }
      setLastOutcome(null);
      setVisible(true);
      // activate trước khi dial: sale hay mở nhiều tab ERP, tab này phải giành
      // quyền nghe gọi (ZenifyApp.activateVoice) thì audio mới vào đúng tab.
      post({ type: "webphone:activate" });
      post({ type: "webphone:dial", phone: clean });
      dispatch({ type: "dial", phone: clean });
    },
    [post, notReadyReason],
  );

  const sendCommand = useCallback(
    (method: WebphoneCommandMethod, args?: (string | number)[]) => {
      post({ type: "webphone:command", method, args });
    },
    [post],
  );
  const answer = useCallback(() => sendCommand("answerCall"), [sendCommand]);
  const hangup = useCallback(() => {
    sendCommand("terminate");
    // Về idle ngay, không chờ echo `end` (xem reducer case "hangup").
    dispatch({ type: "hangup" });
  }, [sendCommand]);
  const toggleMute = useCallback(() => {
    sendCommand(callMachine.muted ? "unmute" : "mute");
    dispatch({ type: "toggle-mute" });
  }, [sendCommand, callMachine.muted]);
  const toggleHold = useCallback(() => {
    sendCommand(callMachine.held ? "unhold" : "hold");
    dispatch({ type: "toggle-hold" });
  }, [sendCommand, callMachine.held]);
  const setAgentStatus = useCallback(
    (status: ZenifyAgentStatus) => post({ type: "webphone:agent-status", status }),
    [post],
  );
  const setPhoneType = useCallback(
    (value: 0 | 1) => post({ type: "webphone:phone-type", phoneType: value }),
    [post],
  );
  const activateVoice = useCallback(() => post({ type: "webphone:activate" }), [post]);

  const contextValue = useMemo(
    () => ({
      canUse,
      enabled,
      visible,
      setVisible,
      dialCall,
      callState: callMachine.status,
      currentCall: callMachine.call,
      muted: callMachine.muted,
      held: callMachine.held,
      answer,
      hangup,
      toggleMute,
      toggleHold,
      sendCommand,
      setAgentStatus,
      setPhoneType,
      agentStatus,
      phoneType,
      voiceActivated,
      activateVoice,
      lastOutcome,
      dismissOutcome,
      loggedIn,
      loginStalled,
      reconnect: recover,
      isLeader: true,
    }),
    [
      canUse,
      enabled,
      visible,
      dialCall,
      callMachine,
      answer,
      hangup,
      toggleMute,
      toggleHold,
      sendCommand,
      setAgentStatus,
      setPhoneType,
      agentStatus,
      phoneType,
      voiceActivated,
      activateVoice,
      lastOutcome,
      dismissOutcome,
      loggedIn,
      loginStalled,
      recover,
    ],
  );

  const showFrame = canUse && Boolean(token);
  const panelError =
    sdkError ?? (sessionEnded ? "Phiên tổng đài đã kết thúc (đăng xuất hoặc hết hạn)." : null);

  // ---- Đa tab: phát state cho tab phụ, nhận thao tác từ tab phụ ----
  const channelRef = useRef<WebphoneChannel | null>(null);
  useEffect(() => {
    if (!canUse) return;
    const channel = openWebphoneChannel();
    channelRef.current = channel;
    return () => {
      channel?.close();
      channelRef.current = null;
    };
  }, [canUse]);

  const sharedState = useMemo<SharedWebphoneState>(
    () => ({
      enabled,
      notReadyReason,
      panelError,
      callState: callMachine.status,
      currentCall: callMachine.call,
      muted: callMachine.muted,
      held: callMachine.held,
      agentStatus,
      phoneType,
      voiceActivated,
      lastOutcome,
      loggedIn,
      loginStalled,
    }),
    [
      enabled,
      notReadyReason,
      panelError,
      callMachine,
      agentStatus,
      phoneType,
      voiceActivated,
      lastOutcome,
      loggedIn,
      loginStalled,
    ],
  );
  const sharedStateRef = useRef(sharedState);
  useEffect(() => {
    sharedStateRef.current = sharedState;
    channelRef.current?.post({ type: "state", state: sharedState });
  }, [sharedState]);

  const actionHandlersRef = useRef<(action: TabAction) => void>(() => {});
  useEffect(() => {
    actionHandlersRef.current = (action) => {
      switch (action.type) {
        case "dial":
          dialCall(action.phone);
          break;
        case "answer":
          answer();
          break;
        case "hangup":
          hangup();
          break;
        case "toggle-mute":
          toggleMute();
          break;
        case "toggle-hold":
          toggleHold();
          break;
        case "agent-status":
          setAgentStatus(action.status);
          break;
        case "phone-type":
          setPhoneType(action.phoneType);
          break;
        case "activate-voice":
          activateVoice();
          break;
        case "dismiss-outcome":
          dismissOutcome();
          break;
        case "reconnect":
          recover();
          break;
        case "command":
          sendCommand(action.method, action.args);
          break;
        case "request-state":
          channelRef.current?.post({ type: "state", state: sharedStateRef.current });
          break;
      }
    };
  }, [
    dialCall,
    answer,
    hangup,
    toggleMute,
    toggleHold,
    setAgentStatus,
    setPhoneType,
    activateVoice,
    dismissOutcome,
    recover,
    sendCommand,
  ]);
  useEffect(() => {
    const channel = channelRef.current;
    if (!canUse || !channel) return;
    return channel.subscribe((msg) => {
      if (msg.type !== "action") return;
      diagRecord("tab-action←follower", msg.action);
      actionHandlersRef.current(msg.action);
    });
  }, [canUse]);

  return (
    <WebphoneContext.Provider value={contextValue}>
      {children}
      {showFrame ? (
        <WebphoneDock
          visible={visible}
          onMinimize={() => setVisible(false)}
          errorMessage={panelError}
          onReconnect={recover}
        >
          {/* Iframe headless (Bước 3.2) — chỉ là engine kết nối/âm thanh, luôn ẩn. */}
          <iframe
            key={frameKey}
            ref={iframeRef}
            src="/webphone.html"
            title="Zenify Webphone"
            allow="microphone; autoplay"
            aria-hidden="true"
            className="h-0 w-0 border-0"
          />
        </WebphoneDock>
      ) : null}
    </WebphoneContext.Provider>
  );
}
