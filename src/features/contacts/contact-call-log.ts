/**
 * Quyết định log cuộc gọi outbound của trang contact — hàm THUẦN, tách khỏi
 * effect trong ContactsPage để test được không cần mock webphone/React.
 *
 * Bối cảnh: page dial qua webphone rồi theo dõi `callState` của
 * `webphoneCallReducer`; khi state về `idle` cần phân biệt "cuộc gọi MÌNH dial
 * vừa kết thúc" với các đường khác cũng về idle (cuộc gọi đến chen ngang thay
 * thế state, dial từ trang khác, reset phiên). Nhận diện bằng
 * `direction === "out"` + SĐT ĐÃ SANITIZE trùng với cuộc đã dial — không dùng
 * `callId` vì reducer chỉ có callId sau event `ring` outbound (SDK có thể
 * không echo), còn phone có ngay từ action `dial`.
 */
import type { CallInfo, CallStatus } from "@/features/callcenter/webphone-call-state";

/** Cuộc gọi trang này đã dial — `phone` là số ĐÃ qua sanitizePhoneForDial. */
export type TrackedCall = {
  customerId: number;
  phone: string;
  dialedAt: number;
};

export type TrackedCallEndResult = {
  customerId: number;
  duration_s: number;
  answered: boolean;
};

/**
 * Gọi khi `callState` vừa chuyển VỀ idle. Trả payload log nếu cuộc gọi vừa kết
 * thúc đúng là cuộc `tracked` đã dial; `null` = không log (cuộc gọi đến, số
 * không khớp, không có gì đang theo dõi...).
 *
 * - `answered` = status ngay trước idle là "in-call" (reducer chỉ vào in-call
 *   qua event `answer`).
 * - `duration_s` tính từ `prevCall.startedAt` (mốc bắt máy thật); fallback
 *   `dialedAt` nếu SDK không echo answer kịp.
 */
export function evaluateTrackedCallEnd(
  prevStatus: CallStatus,
  prevCall: CallInfo | null,
  tracked: TrackedCall | null,
  now: number,
): TrackedCallEndResult | null {
  if (!tracked) return null;
  if (prevStatus === "idle") return null;
  if (!prevCall || prevCall.direction !== "out") return null;
  if (prevCall.phone !== tracked.phone) return null;

  const answered = prevStatus === "in-call";
  const startedAt = prevCall.startedAt ?? tracked.dialedAt;
  const duration_s = answered ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
  return { customerId: tracked.customerId, duration_s, answered };
}
