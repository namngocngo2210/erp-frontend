/**
 * Giao thức postMessage giữa app ↔ iframe /webphone.html (Zenify Web SDK).
 *
 * Vendor stack (jQuery/Bootstrap4/toastr/webphone.js) bị cô lập trong iframe
 * same-origin để không đè CSS Tailwind của SPA — xem docs/zenify-webphone-integration.md.
 */

/** 15 function SDK stateless — whitelist trong iframe (webphone.html). */
export type WebphoneCommandMethod =
  | "answerCall"
  | "terminate"
  | "hold"
  | "unhold"
  | "mute"
  | "unmute"
  | "register"
  | "unregister"
  | "transferToAgent"
  | "transferToAcd"
  | "inviteAgent"
  | "invitePhone"
  | "transferPhone"
  | "spy"
  | "join";

/** Trạng thái agent theo doc v2.3 (CHANGE_AGENT_STATUS_RESPOND_ID). */
export type ZenifyAgentStatus =
  | "AVAILABLE"
  | "NOT AVAILABLE"
  | "NOACD"
  | "ONCAMPAIGN"
  | "TYPING"
  | "ATLUNCH"
  | "MEETING"
  | "TRAINING"
  | "GOOUT"
  | "LOGOUT";

/**
 * Lúc đăng nhập tổng đài (mở tab ERP = bắt đầu ca), agent đang "Không nhận cuộc
 * gọi" hoặc "Đã đăng xuất" (thường do phiên trước) thì tự đưa về AVAILABLE — nếu
 * không, cuộc gọi đến không bao giờ đổ vào và sale không biết vì sao. Các trạng
 * thái có chủ đích (họp, ăn trưa, đào tạo…) giữ nguyên; sale đổi tay qua panel.
 */
export function shouldForceAvailableOnLogin(status: ZenifyAgentStatus | null): boolean {
  return status === "NOT AVAILABLE" || status === "LOGOUT";
}

/** Tên ngữ nghĩa map từ ZenifyConfig trong iframe (app không thấy ZenifyConfig). */
export type WebphoneEventKind =
  | "ring"
  | "answer"
  | "end"
  | "outcall-error"
  | "outcall-response"
  | "notification"
  | "agent-status"
  | "phone-type"
  /** LOGIN_RESPOND OK — data.status = trạng thái agent ban đầu (NOACD đã quy về AVAILABLE). */
  | "logged-in"
  /** VOICE_ACTIVATED — data.isVoiceActivated: tab này có được PBX đổ chuông không. */
  | "voice-activated";

/** App → iframe. */
export type WebphoneOutboundMessage =
  | { type: "webphone:init"; token: string }
  | { type: "webphone:dial"; phone: string }
  | { type: "webphone:activate" }
  /** App đã về idle — nếu leg SIP còn sống (PBX phát tút bận sau lỗi gọi ra) thì BYE. */
  | { type: "webphone:ensure-hangup" }
  | { type: "webphone:logout" }
  | { type: "webphone:command"; method: WebphoneCommandMethod; args?: (string | number)[] }
  | { type: "webphone:agent-status"; status: ZenifyAgentStatus }
  | { type: "webphone:phone-type"; phoneType: 0 | 1 };

/** Iframe → app. */
export type WebphoneInboundMessage =
  | { type: "webphone:ready" }
  | { type: "webphone:initialized" }
  | { type: "webphone:logged-out" }
  | { type: "webphone:sdk-error"; message: string }
  /** console.* của SDK trong iframe (webphone.html chuyển tiếp) — chỉ để ghi nhật ký chẩn đoán. */
  | { type: "webphone:log"; level: string; text: string }
  | {
      type: "webphone:event";
      kind?: WebphoneEventKind;
      objectId?: string;
      data?: Record<string, unknown>;
    };

export function isWebphoneInboundMessage(value: unknown): value is WebphoneInboundMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string" &&
    (value as { type: string }).type.startsWith("webphone:")
  );
}

/**
 * Làm sạch SĐT trước khi gọi. Zenify chỉ nhận định dạng nội địa 0xx (lỗi 420),
 * nên +84/84 đầu số được đổi về 0 (khác normalizePhone của orders — hàm đó chỉ
 * strip ký tự để so khớp, không đổi prefix).
 */
export function sanitizePhoneForDial(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}
