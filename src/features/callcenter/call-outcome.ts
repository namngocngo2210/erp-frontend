/**
 * "Kết quả cuộc gọi" hiển thị trong panel khi cuộc gọi kết thúc mà chưa nối
 * được (máy bận, khách từ chối, không bắt máy, cuộc gọi nhỡ…). Toast của
 * WebphoneProvider vẫn giữ; banner này là chỗ sale nhìn thấy chắc chắn.
 *
 * Nguồn lý do (theo thứ tự tin cậy): mã OUTCALL_ERROR → chuỗi trong data của
 * event end (server không có schema cố định nên quét theo từ khoá) → mặc định
 * theo hướng gọi khi cuộc gọi kết thúc trước khi được nghe.
 */
import { outcallErrorMessage, outcallResponseMessage } from "./webphone-messages";

export type CallOutcome = {
  title: string;
  /** Câu chi tiết (message gốc của Zenify) — có thể trùng title. */
  detail?: string;
  tone: "info" | "error";
};

const OUTCALL_TITLES: Record<number, string> = {
  486: "Khách từ chối cuộc gọi",
  488: "Máy bận",
  480: "Thuê bao không liên lạc được",
  408: "Khách không bắt máy",
  487: "Cuộc gọi bị ngắt",
  430: "Chuyển hướng hộp thư thoại",
  485: "Số không tồn tại",
  603: "Đầu số bị mạng của khách chặn",
  607: "Khách đăng ký không nhận cuộc gọi",
};

export function outcomeFromOutcallError(code: number): CallOutcome | undefined {
  const known = outcallErrorMessage(code);
  const title = OUTCALL_TITLES[code];
  if (!known && !title) return undefined;
  return {
    title: title ?? "Không gọi được",
    detail: known?.message,
    tone: known?.type === "info" ? "info" : "error",
  };
}

export function outcomeFromOutcallResponse(code: string): CallOutcome | undefined {
  const message = outcallResponseMessage(code);
  if (!message) return undefined;
  return { title: "Không gọi được", detail: message, tone: "error" };
}

/** Từ khoá → nhãn; quét mọi giá trị chuỗi trong data (status/reason/cause/hangupCause…). */
const KEYWORDS: ReadonlyArray<{ test: RegExp; title: string }> = [
  { test: /busy/i, title: "Máy bận" },
  { test: /reject|declin/i, title: "Khách từ chối cuộc gọi" },
  {
    test: /no[\s_-]?answer|noanswer|missed|timeout|request timeout/i,
    title: "Khách không bắt máy",
  },
  { test: /unavailable|unreach/i, title: "Thuê bao không liên lạc được" },
  { test: /cancel/i, title: "Cuộc gọi bị hủy" },
  { test: /fail/i, title: "Cuộc gọi thất bại" },
];

function scanKeywords(data: Record<string, unknown>): string | undefined {
  for (const value of Object.values(data)) {
    if (typeof value !== "string" || !value) continue;
    for (const k of KEYWORDS) if (k.test.test(value)) return k.title;
  }
  return undefined;
}

/**
 * Event end/SIP failed tới khi cuộc gọi CHƯA được nghe → có kết quả để hiện.
 * Đã nghe rồi (in-call) → kết thúc bình thường, không hiện gì.
 */
export function outcomeFromEnd(
  data: Record<string, unknown>,
  ctx: { answered: boolean; direction: "in" | "out" },
): CallOutcome | undefined {
  if (ctx.answered) return undefined;
  const scanned = scanKeywords(data);
  if (ctx.direction === "in") {
    // Khách cúp trước khi agent nghe = cuộc gọi nhỡ (SIP cause "Canceled").
    const title = scanned === "Cuộc gọi bị hủy" || !scanned ? "Cuộc gọi nhỡ" : scanned;
    return { title, tone: "info" };
  }
  return { title: scanned ?? "Khách không bắt máy hoặc từ chối", tone: "info" };
}
