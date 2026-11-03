/**
 * Type-safe extraction helpers + central handlers for caught errors.
 *
 * Lets call sites use `catch (err: unknown)` (the correct type) instead of
 * `catch (err: any)`, while preserving the existing precedence
 * `err.body.detail → err.message → fallback` used across the app.
 *
 * `handleApiError` / `swallowError` là hai cửa xử lý lỗi tập trung:
 * - `handleApiError`: chuẩn hoá message tiếng Việt + toast + báo Sentry.
 * - `swallowError`: cho các chỗ CỐ Ý nuốt lỗi (load nền, catalog fallback) —
 *   không toast, chỉ báo Sentry + log để lỗi mạng không biến mất không dấu vết.
 */

import { toast } from "sonner";

interface ApiErrorLike {
  message?: unknown;
  body?: { detail?: unknown; [key: string]: unknown } | null;
}

function asApiError(err: unknown): ApiErrorLike {
  return err && typeof err === "object" ? (err as ApiErrorLike) : {};
}

/** Best human-readable message for a caught error, falling back to `fallback`. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = asApiError(err);
  const detail = e.body?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (typeof e.message === "string" && e.message) return e.message;
  return fallback;
}

/** The structured `body` payload of an API error, if present. */
export function getApiErrorBody(err: unknown): Record<string, unknown> | undefined {
  const body = asApiError(err).body;
  return body && typeof body === "object" ? (body as Record<string, unknown>) : undefined;
}

const DEFAULT_API_ERROR_MESSAGE = "Đã có lỗi xảy ra. Vui lòng thử lại.";

/** HTTP status mà fetchJson gắn vào error (error.status), nếu có. */
function getApiErrorStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/** Abort do đổi trang/gõ tiếp (AbortController) — không phải lỗi, bỏ qua hẳn. */
function isAbortError(err: unknown): boolean {
  return (err as { name?: unknown } | null)?.name === "AbortError";
}

/**
 * Ranh giới gửi Sentry: fetchJson gắn `status` cho MỌI response !ok (xem
 * services/http.ts) — có `status` 4xx nghĩa là server đã trả lời chủ động
 * (validation 400, hết phiên 401/403, không tìm thấy 404, throttle 429...):
 * đó là lỗi nghiệp vụ, gửi Sentry chỉ tạo nhiễu. Ngược lại 5xx và lỗi KHÔNG
 * có `status` (TypeError "Failed to fetch" khi mất mạng, bug bất ngờ trong
 * chuỗi xử lý) là lỗi hệ thống — phải lên Sentry.
 */
export function isReportableApiError(err: unknown): boolean {
  const status = getApiErrorStatus(err);
  if (status !== undefined) return status >= 500;
  return true;
}

/**
 * Gửi Sentry qua dynamic import — giữ đúng thiết kế của main.tsx: bundle chính
 * không kéo @sentry/react khi VITE_SENTRY_DSN không được set.
 */
function reportToSentry(err: unknown, handler: string, context?: string): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  void import("@sentry/react")
    .then((Sentry) => {
      Sentry.captureException(err, {
        tags: { handler, ...(context ? { context } : {}) },
        contexts: {
          api: { context: context ?? "", status: getApiErrorStatus(err) ?? "none" },
        },
      });
    })
    .catch(() => undefined);
}

export type HandleApiErrorOptions = {
  /**
   * Message fallback cho toast (khi error không mang detail/message riêng),
   * hoặc `false` để tắt toast (chỉ chuẩn hoá message + báo Sentry).
   */
  toast?: string | false;
  /** Nhãn định vị call site trên Sentry, vd "orders.duplicate". */
  context?: string;
};

/**
 * Cửa xử lý lỗi API tập trung. Trả về message đã chuẩn hoá (để call site set
 * state lỗi nếu cần). AbortError trả về "" và không làm gì cả.
 */
export function handleApiError(err: unknown, opts: HandleApiErrorOptions = {}): string {
  if (isAbortError(err)) return "";
  const fallback =
    typeof opts.toast === "string" && opts.toast ? opts.toast : DEFAULT_API_ERROR_MESSAGE;
  const message = getApiErrorMessage(err, fallback);
  if (opts.toast !== false) toast.error(message);
  if (isReportableApiError(err)) reportToSentry(err, "handleApiError", opts.context);
  return message;
}

/**
 * Cho các chỗ CỐ Ý nuốt lỗi (load nền không chặn người dùng, catalog có
 * fallback local...): không toast, chỉ báo Sentry lỗi hệ thống + log console
 * để lỗi không biến mất không dấu vết. AbortError bỏ qua hẳn.
 */
export function swallowError(err: unknown, context: string): void {
  if (isAbortError(err)) return;
  if (isReportableApiError(err)) reportToSentry(err, "swallowError", context);
  // eslint no-console cho phép warn/error; warn đủ thấy khi debug, không vỡ lint.
  console.warn(`[${context}]`, err);
}
