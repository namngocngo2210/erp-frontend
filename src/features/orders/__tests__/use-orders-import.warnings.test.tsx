import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useOrdersImport } from "@/features/orders/use-orders-import";

/**
 * Task 4 (backend) tính `result.warnings` khi import bỏ qua cột "Nhân viên" vì
 * người import thiếu quyền `sale-assignment:edit`, nhưng trước Task 7 không ai
 * đọc field này ở FE — người bị chặn chỉ thấy toast "Import thành công" và
 * tưởng cột đã có tác dụng. Test này khoá lại: warnings phải lên toast RIÊNG
 * (toast.warning), không được gộp vào toast tổng kết thành công/thất bại.
 */

const toastWarning = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    warning: (...args: unknown[]) => toastWarning(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
    message: vi.fn(),
  },
}));

vi.mock("@/services/http", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("token"),
}));

class FakeXHR {
  static instances: FakeXHR[] = [];
  status = 200;
  statusText = "";
  responseText = "";
  withCredentials = false;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn();
  constructor() {
    FakeXHR.instances.push(this);
  }
}

const t = (_key: string, fallback?: string) => fallback ?? _key;

function setup() {
  return renderHook(() =>
    useOrdersImport({
      isLandingPage: false,
      isKoc: false,
      t,
      onClearFilters: vi.fn().mockResolvedValue(undefined),
      onOrdersPageChange: vi.fn().mockResolvedValue(undefined),
      onRefreshOrdersAfterImport: vi.fn().mockResolvedValue(undefined),
    }),
  );
}

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  FakeXHR.instances = [];
  toastWarning.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useOrdersImport — cảnh báo cấp file từ response import", () => {
  it("hiện toast.warning riêng cho từng cảnh báo, tách khỏi toast tổng kết", async () => {
    const { result } = setup();

    act(() => {
      result.current.setImportText("dữ liệu import");
    });

    let submitPromise!: Promise<void>;
    act(() => {
      submitPromise = result.current.handleSubmitImport();
    });
    await act(flushMicrotasks);

    const xhr = FakeXHR.instances[0];
    expect(xhr).toBeDefined();
    xhr.status = 200;
    xhr.responseText = JSON.stringify({
      total_rows: 2,
      success_count: 2,
      failed_count: 0,
      failures: [],
      warnings: ["Bỏ qua cột Nhân viên vì tài khoản không có quyền gán sale phụ trách."],
    });
    act(() => {
      xhr.onload?.();
    });
    await act(async () => {
      await submitPromise;
    });

    expect(toastWarning).toHaveBeenCalledTimes(1);
    expect(toastWarning).toHaveBeenCalledWith(
      "Bỏ qua cột Nhân viên vì tài khoản không có quyền gán sale phụ trách.",
    );
    // Toast tổng kết vẫn hiện riêng — warnings không được nuốt mất nó.
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it("không có warnings thì không gọi toast.warning", async () => {
    const { result } = setup();

    act(() => {
      result.current.setImportText("dữ liệu import");
    });

    let submitPromise!: Promise<void>;
    act(() => {
      submitPromise = result.current.handleSubmitImport();
    });
    await act(flushMicrotasks);

    const xhr = FakeXHR.instances[0];
    xhr.status = 200;
    xhr.responseText = JSON.stringify({
      total_rows: 1,
      success_count: 1,
      failed_count: 0,
      failures: [],
    });
    act(() => {
      xhr.onload?.();
    });
    await act(async () => {
      await submitPromise;
    });

    expect(toastWarning).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });
});
