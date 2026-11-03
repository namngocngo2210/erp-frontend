/**
 * Bảng message lỗi/thông báo Zenify theo doc v2.3 — iframe headless không còn
 * toastr, WebphoneProvider toast bằng sonner với các message này.
 */

const OUTCALL_ERRORS: Record<number, string> = {
  401: "Lỗi 401: không thể gọi ra, do đầu số/IP tổng đài của khách hàng chưa đăng ký với Hub!",
  402: "Lỗi 402: hết hạn mức cước!",
  403: "Lỗi 403: hub không chấp nhận cuộc gọi do chưa khai ip hoặc lý do khác!",
  404: "Lỗi 404: không có routing rule nào trên Hub, hoặc không còn số để gọi ra!",
  408: "Lỗi 408: không có phản hồi!",
  420: "Lỗi 420: thuê bao không đúng định dạng 09xx (10 chữ số) và 02xxx (11 hoặc 12 chữ số)!",
  430: "Info 430: cuộc gọi được chuyển hướng voicemail!",
  480: "Lỗi 480: thuê bao không liên lạc được!",
  485: "Lỗi 485: thuê bao không tồn tại!",
  486: "Lỗi 486: người nhận từ chối trả lời cuộc gọi!",
  487: "Lỗi 487: cuộc gọi bị ngắt!",
  488: "Lỗi 488: thuê bao bận!",
  500: "Lỗi 500: hệ thống Telco đang gặp sự cố, vui lòng thử lại sau!",
  503: "Lỗi 503: kết nối đến thống Hub tổng đài gặp sự cố, vui lòng thử lại sau!",
  603: "Lỗi 603: đầu số đã bị khóa bởi mạng của người nhận!",
  607: "Lỗi 607: khách hàng đăng ký không nhận cuộc gọi này!",
  608: "Lỗi 608: hệ thống đang quá tải, vui lòng thử lại sau!",
};

const OUTCALL_REQUEST_ERRORS: Record<string, string> = {
  IN_BLACKLIST: "Khách hàng trong blacklist!",
  IN_INVALID_QUEUE: "Đầu số gọi ra không được phép!",
  GATEWAY_INACTIVE: "Không thể kết nối tới SipTrunk!",
  PERMISSION_DENY: "Không được phép gọi ra!",
  INCALL: "Bạn đang trong cuộc gọi khác!",
};

export const NOT_READY_MESSAGE = "Webphone chưa sẵn sàng, thử lại sau vài giây.";
export const AGENT_REJECT_MESSAGE =
  "Bạn đã từ chối cuộc gọi nhiều lần! Hệ thống tự chuyển trạng thái Không sẵn sàng.";

/** Lỗi gọi ra (OUTCALL_ERROR_RESPONSE_ID); 430 là info (voicemail). */
export function outcallErrorMessage(
  code: number,
): { message: string; type: "error" | "info" } | undefined {
  const message = OUTCALL_ERRORS[code];
  if (!message) return undefined;
  return { message, type: code === 430 ? "info" : "error" };
}

/** Kết quả yêu cầu gọi ra (OUT_CALL_RESPONSE_ID) — undefined nếu OK. */
export function outcallResponseMessage(code: string): string | undefined {
  if (code === "OK") return undefined;
  return OUTCALL_REQUEST_ERRORS[code] ?? "Không thể kết nối tới WebPhone!";
}
