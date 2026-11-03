import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleApiError, isReportableApiError, swallowError } from "@/lib/errors";
import { toast } from "sonner";
import * as Sentry from "@sentry/react";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
}));

/** Error kiểu fetchJson: message + status + body (xem services/http.ts). */
function apiError(message: string, status?: number, detail?: string): Error {
  const err = new Error(message) as Error & { status?: number; body?: unknown };
  if (status !== undefined) err.status = status;
  if (detail !== undefined) err.body = { detail };
  return err;
}

function abortError(): Error {
  const err = new Error("The operation was aborted");
  err.name = "AbortError";
  return err;
}

/** captureException chạy sau dynamic import — phải nhường microtask trước khi assert. */
async function flushSentryImport() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  // DSN phải được set thì handler mới gửi Sentry (mirror gating ở main.tsx).
  vi.stubEnv("VITE_SENTRY_DSN", "https://key@sentry.example/1");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("isReportableApiError — ranh giới gửi Sentry", () => {
  it("4xx (nghiệp vụ/validation/auth/throttle) KHÔNG gửi Sentry", () => {
    for (const status of [400, 401, 403, 404, 422, 429]) {
      expect(isReportableApiError(apiError("x", status))).toBe(false);
    }
  });

  it("5xx gửi Sentry", () => {
    expect(isReportableApiError(apiError("x", 500))).toBe(true);
    expect(isReportableApiError(apiError("x", 503))).toBe(true);
  });

  it("lỗi không có status (mất mạng, bug bất ngờ) gửi Sentry", () => {
    expect(isReportableApiError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isReportableApiError(new Error("boom"))).toBe(true);
  });
});

describe("handleApiError", () => {
  it("toast message theo precedence body.detail → message → fallback", () => {
    handleApiError(apiError("HTTP 400", 400, "Số điện thoại không hợp lệ."));
    expect(toast.error).toHaveBeenCalledWith("Số điện thoại không hợp lệ.");

    handleApiError(apiError("Đơn đã bị khóa.", 409));
    expect(toast.error).toHaveBeenCalledWith("Đơn đã bị khóa.");
  });

  it("dùng opts.toast làm fallback khi error không mang message", () => {
    const bare = { status: 400 };
    const message = handleApiError(bare, { toast: "Không thể xuất file." });
    expect(message).toBe("Không thể xuất file.");
    expect(toast.error).toHaveBeenCalledWith("Không thể xuất file.");
  });

  it("toast: false → không toast nhưng vẫn trả message chuẩn hoá", async () => {
    const message = handleApiError(apiError("HTTP 500", 500, "DB quá tải"), { toast: false });
    expect(message).toBe("DB quá tải");
    expect(toast.error).not.toHaveBeenCalled();
    // 500 vẫn gửi Sentry (async) — flush trong test này để capture không rò
    // sang test kế tiếp rồi làm assert not.toHaveBeenCalled bên đó đỏ oan.
    await flushSentryImport();
  });

  it("lỗi 4xx: toast nhưng KHÔNG captureException", async () => {
    handleApiError(apiError("HTTP 403", 403), { context: "users.update" });
    await flushSentryImport();
    expect(toast.error).toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("lỗi 5xx: captureException kèm tags handler + context", async () => {
    const err = apiError("HTTP 502", 502);
    handleApiError(err, { context: "orders.duplicate" });
    await flushSentryImport();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        tags: { handler: "handleApiError", context: "orders.duplicate" },
      }),
    );
  });

  it("lỗi mạng (không status): captureException", async () => {
    handleApiError(new TypeError("Failed to fetch"), { context: "exports.startExport" });
    await flushSentryImport();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("không có DSN → không gửi Sentry dù là 5xx", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");
    handleApiError(apiError("HTTP 500", 500));
    await flushSentryImport();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("AbortError → không toast, không Sentry, trả chuỗi rỗng", async () => {
    const message = handleApiError(abortError());
    await flushSentryImport();
    expect(message).toBe("");
    expect(toast.error).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("swallowError", () => {
  it("không bao giờ toast; log console.warn kèm context", () => {
    const err = apiError("HTTP 500", 500);
    swallowError(err, "orderForm.loadWarehouses");
    expect(toast.error).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith("[orderForm.loadWarehouses]", err);
  });

  it("5xx → captureException với tags handler swallowError", async () => {
    const err = apiError("HTTP 500", 500);
    swallowError(err, "orderForm.loadWarehouses");
    await flushSentryImport();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        tags: { handler: "swallowError", context: "orderForm.loadWarehouses" },
      }),
    );
  });

  it("4xx → chỉ log, không captureException", async () => {
    swallowError(apiError("HTTP 404", 404), "app.orders.loadStandaloneOrder");
    await flushSentryImport();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it("AbortError → không log, không Sentry", async () => {
    swallowError(abortError(), "orderForm.lookupCustomerByPhone");
    await flushSentryImport();
    expect(console.warn).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
