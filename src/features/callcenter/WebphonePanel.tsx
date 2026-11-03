import { AgentStatusBar } from "./AgentStatusBar";
import { CallOutcomeBanner } from "./CallOutcomeBanner";
import { CallScreen } from "./CallScreen";
import { Dialpad } from "./Dialpad";
import { useWebphone } from "./webphone-context";

/** Thân panel "Tổng đài" — UI gọi tự build (headless SDK, Bước 3.2). */
export function WebphonePanel() {
  const {
    callState,
    currentCall,
    muted,
    held,
    dialCall,
    answer,
    hangup,
    toggleMute,
    toggleHold,
    lastOutcome,
    dismissOutcome,
    isLeader,
  } = useWebphone();

  return (
    <div className="w-85 max-w-[calc(100vw-2rem)] px-4 py-4">
      {callState === "idle" || !currentCall ? (
        <div className="flex flex-col gap-3">
          {lastOutcome ? (
            <CallOutcomeBanner value={lastOutcome} onRedial={dialCall} onDismiss={dismissOutcome} />
          ) : null}
          <AgentStatusBar />
          <Dialpad onDial={dialCall} />
        </div>
      ) : (
        <CallScreen
          status={callState}
          call={currentCall}
          muted={muted}
          held={held}
          onAnswer={answer}
          onHangup={hangup}
          onToggleMute={toggleMute}
          onToggleHold={toggleHold}
        />
      )}
      {!isLeader ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Âm thanh cuộc gọi phát ở tab ERP đang giữ tổng đài.
        </p>
      ) : null}
    </div>
  );
}
