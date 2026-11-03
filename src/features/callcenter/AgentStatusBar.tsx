import { PhoneIncoming, PhoneOff, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ZenifyAgentStatus } from "./webphone-bridge";
import { useWebphone } from "./webphone-context";

/** Trạng thái agent cho phép chọn từ panel — các trạng thái khác (họp, ăn trưa…) hiện read-only. */
const SELECTABLE: ReadonlyArray<{ value: ZenifyAgentStatus; label: string }> = [
  { value: "AVAILABLE", label: "Sẵn sàng nhận cuộc gọi" },
  { value: "NOT AVAILABLE", label: "Không nhận cuộc gọi" },
];

const STATUS_LABELS: Record<ZenifyAgentStatus, string> = {
  AVAILABLE: "Sẵn sàng nhận cuộc gọi",
  "NOT AVAILABLE": "Không nhận cuộc gọi",
  NOACD: "Sẵn sàng (không ACD)",
  ONCAMPAIGN: "Đang chạy chiến dịch",
  TYPING: "Đang nhập liệu",
  ATLUNCH: "Ăn trưa",
  MEETING: "Họp",
  TRAINING: "Đào tạo",
  GOOUT: "Ra ngoài",
  LOGOUT: "Đã đăng xuất",
};

/**
 * Thanh trạng thái nhận cuộc gọi đến (hiện khi panel idle). Cuộc gọi đến chỉ đổ
 * vào agent AVAILABLE và vào tab đang giữ quyền nghe gọi — 2 điều kiện này trước
 * đây không hiển thị nên sale không biết vì sao không nhận được cuộc gọi.
 */
export function AgentStatusBar() {
  const {
    agentStatus,
    setAgentStatus,
    voiceActivated,
    activateVoice,
    loggedIn,
    loginStalled,
    reconnect,
  } = useWebphone();
  const selectable = agentStatus !== null && SELECTABLE.some((s) => s.value === agentStatus);

  if (!loggedIn && loginStalled) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
        <span className="flex-1">
          Chưa đăng nhập được tổng đài — kiểm tra Email Zenify, hoặc agent đang mở ở tab/máy khác.
        </span>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={reconnect}>
          <RefreshCw className="h-3.5 w-3.5" />
          Kết nối lại
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">Trạng thái</span>
        {agentStatus === null ? (
          loggedIn ? (
            <>
              <span className="flex-1 text-xs text-muted-foreground">
                Đã đăng nhập, không rõ trạng thái
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => setAgentStatus("AVAILABLE")}
              >
                Đặt Sẵn sàng
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Đang đăng nhập tổng đài…</span>
          )
        ) : selectable ? (
          <Select
            value={agentStatus}
            onValueChange={(value) => value && setAgentStatus(value as ZenifyAgentStatus)}
          >
            <SelectTrigger className="h-8 flex-1 text-xs" aria-label="Trạng thái nhận cuộc gọi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SELECTABLE.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-foreground">
            {STATUS_LABELS[agentStatus] ?? agentStatus}
          </span>
        )}
      </div>
      {voiceActivated === false ? (
        <div className="flex items-center gap-2 rounded-md border border-action-warning/30 bg-action-warning/10 px-2 py-1.5 text-xs text-action-warning">
          <PhoneOff className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Tab này chưa nhận cuộc gọi đến (tab khác đang giữ).</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
            onClick={activateVoice}
          >
            <PhoneIncoming className="h-3.5 w-3.5" />
            Kích hoạt
          </Button>
        </div>
      ) : null}
    </div>
  );
}
