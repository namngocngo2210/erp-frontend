import { useEffect, useState } from "react";
import { Mic, MicOff, Pause, Phone, PhoneOff, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { CallInfo, CallStatus } from "./webphone-call-state";

function formatDuration(startedAt: number, now: number): string {
  const total = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Đồng hồ MM:SS tự đếm từ startedAt (thay easytimer của bộ UI Zenify cũ). */
function CallTimer({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className="font-mono text-lg text-foreground">{formatDuration(startedAt, now)}</span>
  );
}

type CallScreenProps = {
  status: Exclude<CallStatus, "idle">;
  call: CallInfo;
  muted: boolean;
  held: boolean;
  onAnswer: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleHold: () => void;
};

/** Màn hình cuộc gọi: đến (ringing) / đang gọi ra (dialing) / trong cuộc gọi. */
export function CallScreen({
  status,
  call,
  muted,
  held,
  onAnswer,
  onHangup,
  onToggleMute,
  onToggleHold,
}: CallScreenProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4 py-2">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">
          {status === "ringing" ? "Cuộc gọi đến" : call.direction === "out" ? "Gọi đi" : "Cuộc gọi"}
        </span>
        <span className="text-lg font-semibold text-foreground">{call.phone || "Không rõ số"}</span>
        {status === "in-call" && call.startedAt ? (
          <CallTimer startedAt={call.startedAt} />
        ) : (
          <span className="text-sm text-muted-foreground">
            {status === "ringing" ? "đang đổ chuông vào…" : "Đang đổ chuông…"}
          </span>
        )}
      </div>

      {status === "ringing" ? (
        <div className="flex items-center gap-3">
          <Button
            onClick={onAnswer}
            className="gap-2 bg-action-success hover:bg-action-success/90"
            aria-label="Nghe máy"
          >
            <Phone className="h-4 w-4" />
            Nghe máy
          </Button>
          <Button variant="destructive" onClick={onHangup} className="gap-2" aria-label="Từ chối">
            <PhoneOff className="h-4 w-4" />
            Từ chối
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant={muted ? "secondary" : "outline"}
            size="icon"
            onClick={onToggleMute}
            title={muted ? "Bật tiếng" : "Tắt tiếng"}
            aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            variant={held ? "secondary" : "outline"}
            size="icon"
            onClick={onToggleHold}
            title={held ? "Tiếp tục" : "Giữ máy"}
            aria-label={held ? "Tiếp tục" : "Giữ máy"}
          >
            {held ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button variant="destructive" onClick={onHangup} className="gap-2" aria-label="Tắt máy">
            <PhoneOff className="h-4 w-4" />
            Tắt máy
          </Button>
        </div>
      )}
    </div>
  );
}
