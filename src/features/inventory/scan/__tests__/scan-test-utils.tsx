import type { ReactElement } from "react";
import { fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";

import type { LookupOrder } from "../scan-types";

// Rig dùng chung cho các test quét xuất/nhập (ScanDispatchDialog / ScanReturnDialog).
// Các lệnh vi.mock() vẫn nằm ở TỪNG file test (vi.mock hoist theo file); file test
// tham chiếu rig qua dynamic import bên trong factory:
//
//   vi.mock("@/services/http", async () => {
//     const { scanFetchJson } = await import("./scan-test-utils");
//     return { fetchJson: vi.fn(scanFetchJson) };
//   });
//
// State mock ở module-scope (lookups/lookupOutcomes/postHandlers/lookupUrls) tích lũy
// giữa các test — file test PHẢI gọi resetScanHttp() trong beforeEach.

export type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };

export function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Lookup treo theo mã — test chủ động resolve từng mã theo thứ tự bất kỳ để
 *  giả lập 2 lượt quét súng chồng nhau (mã không có trong lookupOutcomes sẽ treo ở đây). */
export const lookups = new Map<string, Deferred<LookupOrder>>();

/** Lookup trả kết quả NGAY theo mã: LookupOrder → resolve, Error → reject. */
export const lookupOutcomes = new Map<string, LookupOrder | Error>();

/** URL các lượt lookup, theo thứ tự gọi (để assert mode=dispatch / mode=return). */
export const lookupUrls: string[] = [];

type BodyHandler = (body: Record<string, unknown>) => Promise<unknown>;

/** Handler cho các endpoint POST — set trong beforeEach của từng describe cần đến. */
export const postHandlers: {
  dispatchBatch?: BodyHandler;
  returns?: BodyHandler;
  // Task 1's endpoint, dùng cho dòng khớp mã HOÁ ĐƠN (kho của đơn, không phải kho màn
  // quét) — xem manual-dispatch-queries.ts. Có thể gọi nhiều lần (1 lần/kho khác nhau).
  manualDispatch?: BodyHandler;
} = {};

/** URL/body các lượt gọi manualDispatch, theo thứ tự — để assert số lần gọi / kho đích. */
export const manualDispatchCalls: { order_ids: number[]; warehouse_id: number }[] = [];

export function resetScanHttp() {
  lookups.clear();
  lookupOutcomes.clear();
  lookupUrls.length = 0;
  manualDispatchCalls.length = 0;
  postHandlers.dispatchBatch = undefined;
  postHandlers.returns = undefined;
  postHandlers.manualDispatch = undefined;
}

/** Lỗi API dạng fetchJson: Error kèm status + body. */
export function apiError(status: number, body: unknown): Error {
  const err = new Error(`HTTP ${status}`) as Error & { status?: number; body?: unknown };
  err.status = status;
  err.body = body;
  return err;
}

/** Thân fetchJson dùng chung — bọc bằng vi.fn(scanFetchJson) trong factory của vi.mock. */
export function scanFetchJson(url: string, init?: RequestInit): Promise<unknown> {
  if (url.startsWith("/api/warehouses")) {
    return Promise.resolve({
      items: [
        { id: 1, name: "Kho A" },
        // Kho B: dùng cho test khớp mã HOÁ ĐƠN (kho CỦA ĐƠN, khác kho chọn ở đầu
        // màn — xem scan-dispatch-groups.ts). KHÔNG chọn được từ dropdown ở đầu
        // dialog, chỉ hiện ở badge dòng đã quét.
        { id: 2, name: "Kho B" },
      ],
      total: 2,
    });
  }
  if (url.startsWith("/api/orders/lookup-by-shipping-code")) {
    lookupUrls.push(url);
    const code = new URL(url, "http://local").searchParams.get("code") ?? "";
    const outcome = lookupOutcomes.get(code);
    if (outcome instanceof Error) return Promise.reject(outcome);
    if (outcome) return Promise.resolve(outcome);
    const d = deferred<LookupOrder>();
    lookups.set(code, d);
    return d.promise;
  }
  if (
    url === "/api/orders/dispatch-batch" &&
    init?.method === "POST" &&
    postHandlers.dispatchBatch
  ) {
    return postHandlers.dispatchBatch(JSON.parse(String(init.body)) as Record<string, unknown>);
  }
  if (url === "/api/inventory/returns" && init?.method === "POST" && postHandlers.returns) {
    return postHandlers.returns(JSON.parse(String(init.body)) as Record<string, unknown>);
  }
  if (url === "/api/inventory/orders/dispatch" && init?.method === "POST") {
    const body = JSON.parse(String(init.body)) as { order_ids: number[]; warehouse_id: number };
    manualDispatchCalls.push(body);
    if (postHandlers.manualDispatch) return postHandlers.manualDispatch(body);
    return Promise.resolve({ confirmed: body.order_ids, skipped: [] });
  }
  return Promise.resolve({});
}

export const order = (id: number, code: string, over: Partial<LookupOrder> = {}): LookupOrder => ({
  order_id: id,
  order_code: `DH${id}`,
  shipping_code: code,
  status: 11,
  status_label: "Chờ giao",
  invoice_status: 1,
  customer_name: `Khách ${id}`,
  customer_phone: "0900000000",
  fulfillment_warehouse_id: null,
  already_dispatched: false,
  matched_by: "shipping",
  items: [],
  ...over,
});

/** Render dialog trong QueryClientProvider (retry off); i18n: true bọc thêm I18nProvider. */
export function renderScanDialog(ui: ReactElement, { i18n = false }: { i18n?: boolean } = {}) {
  return renderWithClient(i18n ? <I18nProvider>{ui}</I18nProvider> : ui);
}

/** Giả lập máy quét: đổ mã vào ô nhập rồi Enter. */
export function scan(input: HTMLElement, code: string) {
  fireEvent.change(input, { target: { value: code } });
  fireEvent.keyDown(input, { key: "Enter" });
}
