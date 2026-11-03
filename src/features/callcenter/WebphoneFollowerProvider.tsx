/**
 * WebphoneFollowerProvider — TAB PHỤ: không có iframe Zenify. Hiển thị state do tab
 * chủ phát qua BroadcastChannel và chuyển thao tác sang tab chủ (webphone-tabs.ts),
 * nên sale ở tab nào cũng thấy cuộc gọi đến / bấm gọi được; âm thanh phát ở tab chủ.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  sanitizePhoneForDial,
  type WebphoneCommandMethod,
  type ZenifyAgentStatus,
} from "./webphone-bridge";
import type { CallStatus } from "./webphone-call-state";
import { WebphoneContext } from "./webphone-context";
import { diagRecord, diagSetRole } from "./webphone-diag";
import { WebphoneDock } from "./WebphoneDock";
import {
  initialSharedState,
  openWebphoneChannel,
  type SharedWebphoneState,
  type TabAction,
  type WebphoneChannel,
} from "./webphone-tabs";

export function WebphoneFollowerProvider({
  canUse,
  children,
}: {
  canUse: boolean;
  children: ReactNode;
}) {
  const [shared, setShared] = useState<SharedWebphoneState>(initialSharedState);
  const [visible, setVisible] = useState(false);
  const channelRef = useRef<WebphoneChannel | null>(null);
  useEffect(() => {
    diagSetRole("follower");
  }, []);

  useEffect(() => {
    if (!canUse) return;
    const channel = openWebphoneChannel();
    channelRef.current = channel;
    if (!channel) return;
    const unsubscribe = channel.subscribe((msg) => {
      if (msg.type !== "state") return;
      diagRecord("state←leader", {
        callState: msg.state.callState,
        enabled: msg.state.enabled,
        loggedIn: msg.state.loggedIn,
        voiceActivated: msg.state.voiceActivated,
        agentStatus: msg.state.agentStatus,
        outcome: msg.state.lastOutcome?.outcome.title ?? null,
        notReady: msg.state.notReadyReason,
      });
      setShared(msg.state);
    });
    // Tab chủ chỉ phát khi state đổi — xin phát lại để tab mới không trắng.
    channel.post({ type: "action", action: { type: "request-state" } });
    return () => {
      unsubscribe();
      channel.close();
      channelRef.current = null;
    };
  }, [canUse]);

  const send = useCallback((action: TabAction) => {
    diagRecord("tab-action→leader", action);
    channelRef.current?.post({ type: "action", action });
  }, []);

  // Cùng quy tắc bung/thu gọn với tab chủ: cuộc gọi đến → bung; kết thúc không có
  // kết quả → thu gọn; có kết quả (bận / từ chối / nhỡ) → bung tới khi tab chủ xoá.
  const prevCallStateRef = useRef<CallStatus>("idle");
  useEffect(() => {
    const prev = prevCallStateRef.current;
    const next = shared.callState;
    if (next === "ringing" && prev !== "ringing") setVisible(true);
    if (prev !== "idle" && next === "idle" && !shared.lastOutcome) setVisible(false);
    prevCallStateRef.current = next;
  }, [shared.callState, shared.lastOutcome]);
  const prevOutcomeRef = useRef(shared.lastOutcome);
  useEffect(() => {
    if (shared.lastOutcome) setVisible(true);
    else if (prevOutcomeRef.current && shared.callState === "idle") setVisible(false);
    prevOutcomeRef.current = shared.lastOutcome;
  }, [shared.lastOutcome, shared.callState]);

  const dialCall = useCallback(
    (phone: string) => {
      const clean = sanitizePhoneForDial(phone);
      if (!clean) return;
      if (shared.notReadyReason) {
        toast.error(shared.notReadyReason);
        return;
      }
      setVisible(true);
      send({ type: "dial", phone: clean });
    },
    [send, shared.notReadyReason],
  );
  const answer = useCallback(() => send({ type: "answer" }), [send]);
  const hangup = useCallback(() => send({ type: "hangup" }), [send]);
  const toggleMute = useCallback(() => send({ type: "toggle-mute" }), [send]);
  const toggleHold = useCallback(() => send({ type: "toggle-hold" }), [send]);
  const sendCommand = useCallback(
    (method: WebphoneCommandMethod, args?: (string | number)[]) =>
      send({ type: "command", method, args }),
    [send],
  );
  const setAgentStatus = useCallback(
    (status: ZenifyAgentStatus) => send({ type: "agent-status", status }),
    [send],
  );
  const setPhoneType = useCallback(
    (phoneType: 0 | 1) => send({ type: "phone-type", phoneType }),
    [send],
  );
  const activateVoice = useCallback(() => send({ type: "activate-voice" }), [send]);
  const dismissOutcome = useCallback(() => send({ type: "dismiss-outcome" }), [send]);
  const reconnect = useCallback(() => send({ type: "reconnect" }), [send]);

  const contextValue = useMemo(
    () => ({
      canUse,
      enabled: shared.enabled,
      visible,
      setVisible,
      dialCall,
      callState: shared.callState,
      currentCall: shared.currentCall,
      muted: shared.muted,
      held: shared.held,
      answer,
      hangup,
      toggleMute,
      toggleHold,
      sendCommand,
      setAgentStatus,
      setPhoneType,
      agentStatus: shared.agentStatus,
      phoneType: shared.phoneType,
      voiceActivated: shared.voiceActivated,
      activateVoice,
      lastOutcome: shared.lastOutcome,
      dismissOutcome,
      loggedIn: shared.loggedIn,
      loginStalled: shared.loginStalled,
      reconnect,
      isLeader: false,
    }),
    [
      canUse,
      shared,
      visible,
      dialCall,
      answer,
      hangup,
      toggleMute,
      toggleHold,
      sendCommand,
      setAgentStatus,
      setPhoneType,
      activateVoice,
      dismissOutcome,
      reconnect,
    ],
  );

  return (
    <WebphoneContext.Provider value={contextValue}>
      {children}
      {canUse ? (
        <WebphoneDock
          visible={visible}
          onMinimize={() => setVisible(false)}
          errorMessage={shared.panelError}
          onReconnect={reconnect}
        />
      ) : null}
    </WebphoneContext.Provider>
  );
}
