const KIOTVIET_ERROR_CODE_MAP: Record<string, string> = {
  failed: "KiotViet trả lỗi nhưng không kèm mô tả.",
  mock_failed: "KiotViet trả lỗi nhưng không kèm mô tả.",
  channel_unavailable: "Kênh KiotViet không khả dụng.",
  validation_failed: "Dữ liệu đơn không hợp lệ với KiotViet.",
  rate_limited: "KiotViet đang giới hạn tốc độ, vui lòng thử lại sau.",
  shipping_service_down: "Dịch vụ vận chuyển của KiotViet đang gián đoạn.",
  order_not_found: "Không tìm thấy đơn trên KiotViet.",
  permission_denied: "Tài khoản không có quyền thao tác trên KiotViet.",
  status_sync_timeout: "Đồng bộ trạng thái KiotViet bị timeout.",
  status_rejected: "KiotViet từ chối cập nhật trạng thái đơn.",
  upstream_error: "KiotViet trả lỗi hệ thống.",
  dispatch_failed: "Không gửi được lệnh tới hàng đợi KiotViet.",
  stale_timeout_requeued: "Lệnh KiotViet trước quá hạn, đang thử lại.",
};

// Lỗi precheck phía HỆ THỐNG (chưa gọi tới KiotViet) — dịch sang tiếng Việt gọn.
// Các entry này KHÔNG được nuốt lỗi do KiotViet trả về: những message dạng
// "Failed to X: <status> - <body>" đi qua KIOTVIET_GATEWAY_LABELS bên dưới,
// nơi phần <body> (lỗi gốc của kiot) luôn được giữ lại.
const KIOTVIET_ERROR_PATTERN_MAP: Array<[RegExp, string]> = [
  [/branch_id is empty|thiếu mã kho/i, "Thiếu mã kho."],
  [/invalid branch_id|mã kho không hợp lệ/i, "Mã kho không hợp lệ."],
  [/order chưa có invoice_code/i, "Đơn chưa có mã hóa đơn."],
  [/order chưa có invoice_id/i, "Đơn chưa có mã hóa đơn."],
  [/thiếu provider_code/i, "Thiếu hãng vận chuyển KShip."],
  [/thiếu service_code/i, "Thiếu dịch vụ vận chuyển KShip."],
  [/invoice_code is empty/i, "Thiếu mã hóa đơn."],
  [/invoice_id is empty/i, "Thiếu mã hóa đơn."],
  [/missing target branch id/i, "Thiếu mã kho đích."],
  [/order missing invoice_code/i, "Đơn chưa có mã hóa đơn."],
];

// Nhãn tiếng Việt cho lỗi gateway "Failed to X: <status> - <body>". Phần <body>
// là lỗi nguyên văn KiotViet trả về và PHẢI hiển thị kèm — yêu cầu nghiệp vụ:
// hiển thị 100% lỗi của kiot, không thay bằng câu chung chung của hệ thống.
const KIOTVIET_GATEWAY_LABELS: Array<[RegExp, string]> = [
  [/failed to create order/i, "KiotViet từ chối tạo đơn"],
  [/failed to create invoice/i, "KiotViet từ chối tạo hóa đơn"],
  [/failed to get invoice/i, "Không lấy được thông tin hóa đơn từ KiotViet"],
  [/failed to delete invoice/i, "KiotViet từ chối hủy hóa đơn"],
  [/failed to create customer/i, "KiotViet từ chối tạo khách hàng"],
  [/failed to update old invoice (status|price)/i, "KiotViet từ chối cập nhật hóa đơn kênh cũ"],
];

// KiotViet's API is ServiceStack-based, so error bodies arrive in either
// camelCase (`responseStatus`) or PascalCase (`ResponseStatus`). Pick a field
// regardless of the first-letter casing so we surface the real reason instead
// of the generic fallback.
function pickField(source: Record<string, unknown>, name: string): unknown {
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  const upper = name.charAt(0).toUpperCase() + name.slice(1);
  if (lower in source) return source[lower];
  if (upper in source) return source[upper];
  return undefined;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Collect human messages from a ServiceStack `Errors[]` array (each entry may
// hold `message`/`Message`), joined so several field errors stay readable.
function collectNestedErrorMessages(errors: unknown): string {
  if (!Array.isArray(errors)) return "";
  const messages = errors
    .map((entry) =>
      entry && typeof entry === "object"
        ? asTrimmedString(pickField(entry as Record<string, unknown>, "message"))
        : "",
    )
    .filter((msg) => msg.length > 0);
  return messages.join("; ");
}

// Tách TỪNG khối JSON cân bằng ngoặc trong chuỗi lỗi. Message lỗi có thể chứa
// nhiều khối JSON (message cha + cause chain lặp lại body response) — cắt kiểu
// indexOf("{")..lastIndexOf("}") sẽ ôm cả " | cause[1] ..." vào giữa và
// JSON.parse fail, làm mất lỗi gốc của KiotViet.
function extractJsonFragments(text: string): string[] {
  const fragments: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      if (depth > 0) inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        fragments.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return fragments;
}

function extractMessageFromParsed(parsed: Record<string, unknown>): string {
  const responseStatus = pickField(parsed, "responseStatus");
  const status =
    responseStatus && typeof responseStatus === "object"
      ? (responseStatus as Record<string, unknown>)
      : undefined;

  // 1. responseStatus.message — KiotViet's primary human-readable reason.
  const statusMessage = status ? asTrimmedString(pickField(status, "message")) : "";
  if (statusMessage) return statusMessage;

  // 2. responseStatus.errors[].message — per-field validation details.
  const nested = status ? collectNestedErrorMessages(pickField(status, "errors")) : "";
  if (nested) return nested;

  // 3. top-level message / errors[] (some endpoints skip responseStatus).
  const topMessage = asTrimmedString(pickField(parsed, "message"));
  if (topMessage) return topMessage;
  const topNested = collectNestedErrorMessages(pickField(parsed, "errors"));
  if (topNested) return topNested;

  // 4. Only a machine errorCode is present — still beats a generic label.
  const errorCode = status
    ? asTrimmedString(pickField(status, "errorCode"))
    : asTrimmedString(pickField(parsed, "errorCode"));
  if (errorCode) return `KiotViet từ chối (mã lỗi: ${errorCode})`;

  return "";
}

function extractKiotVietResponseMessage(errorMessage: string): string {
  for (const fragment of extractJsonFragments(errorMessage)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fragment);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;
    const message = extractMessageFromParsed(parsed as Record<string, unknown>);
    if (message) return message;
  }
  return "";
}

export function humanizeKiotVietError(errorMessage: string): string {
  const responseMessage = extractKiotVietResponseMessage(errorMessage);
  if (responseMessage) return responseMessage;

  const normalized = errorMessage
    .replace(/^Exception:\s*/i, "")
    .replace(/^execute_action http \d+:\s*/i, "")
    .replace(/\s*\|\s*cause\[\d+\].*$/i, "")
    .replace(/\[stage=[^\]]+\]\s*/g, "")
    .replace(/\s*\(order_id=\d+\)\.?/gi, "")
    .trim();
  const lowerKey = normalized.toLowerCase();
  if (KIOTVIET_ERROR_CODE_MAP[lowerKey]) {
    return KIOTVIET_ERROR_CODE_MAP[lowerKey];
  }
  // Lỗi gateway: dịch nhãn nhưng GIỮ nguyên phần thân lỗi KiotViet trả về
  // (sau "<status> - "). Không có thân lỗi mới rơi về nhãn trần.
  for (const [pattern, label] of KIOTVIET_GATEWAY_LABELS) {
    if (pattern.test(normalized)) {
      const detailMatch = normalized.match(/:\s*\d{3}\s*-\s*([\s\S]+)$/);
      const detail = detailMatch?.[1]?.trim() ?? "";
      return detail ? `${label}: ${detail}` : `${label}.`;
    }
  }
  for (const [pattern, translation] of KIOTVIET_ERROR_PATTERN_MAP) {
    if (pattern.test(normalized)) {
      return translation;
    }
  }
  return normalized;
}

export function formatKiotVietErrorToast(errorMessage: string): string {
  const humanized = humanizeKiotVietError(errorMessage);
  if (humanized.length <= 220) return humanized;
  return `${humanized.slice(0, 217)}...`;
}
