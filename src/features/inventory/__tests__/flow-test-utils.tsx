import type { ReactElement } from "react";
import { vi } from "vitest";

import * as http from "@/services/http";
import { renderWithClient as baseRender } from "@/test/utils";
import { mockViewport } from "@/test/viewport";

import type { FlowFilters } from "../issue-history-queries";

// Rig dùng chung cho các test tab Lịch sử nhập xuất (IssueTab/ReturnTab/FlowSummaryTiles).
// File test vẫn tự khai vi.mock("@/services/http", partial factory) + usePermission/sonner;
// rig chỉ cấp filters mặc định, render helper và mockFlowHttp() đổ mockImplementation
// vào fetchJson đã được mock ở file test.

/**
 * Render tab Lịch sử nhập xuất Ở CHIỀU DESKTOP.
 *
 * Từ khi hai tab có đường mobile, `stub matchMedia` mặc định của setup.ts (luôn
 * trả matches:false) khiến `useMediaQuery(TABLE_VIEWPORT_QUERY)` cũng false →
 * component render nhánh THẺ. Toàn bộ test trong thư mục này khẳng định bố cục
 * BẢNG (số ô, thứ tự cột, ô Thao tác), nên phải chốt chiều viewport trước khi
 * render thay vì phó mặc cho mặc định.
 *
 * Test nào cần chiều mobile thì tự gọi mockViewport(true) — xem
 * inventory-mobile.test.tsx.
 */
export function renderWithClient(ui: ReactElement) {
  mockViewport(false);
  return baseRender(ui);
}

export const FLOW_FILTERS: FlowFilters = {
  dateFrom: "",
  dateTo: "",
  warehouseIds: [],
  product: "",
  productIds: [],
  order: "",
  carrier: "",
};

type Payload = Record<string, unknown> & { items?: unknown[] };

/**
 * Mock fetchJson cho các endpoint flow-history. Truyền items (và field override nếu
 * cần) cho từng nhánh; POST adjust/cancel luôn trả posted/cancelled.
 */
export function mockFlowHttp({
  dispatchPending = [],
  dispatchHistory,
  returnPending = [],
  returnHistory,
}: {
  dispatchPending?: unknown[];
  dispatchHistory?: Payload;
  returnPending?: unknown[];
  returnHistory?: Payload;
} = {}) {
  vi.mocked(http.fetchJson).mockImplementation((url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/adjust") && init?.method === "POST") {
      return Promise.resolve({ status: "posted" });
    }
    if (u.includes("/cancel") && init?.method === "POST") {
      return Promise.resolve({ status: "cancelled" });
    }
    if (u.includes("dispatch-history/pending")) {
      return Promise.resolve({ items: dispatchPending });
    }
    if (u.includes("dispatch-history/orders")) {
      const items = dispatchHistory?.items ?? [];
      return Promise.resolve({
        items,
        total: items.length,
        total_quantity: 2,
        sale_quantity: 2,
        doc_quantity: 0,
        transfer_quantity: 0,
        limit: 50,
        offset: 0,
        ...dispatchHistory,
      });
    }
    if (u.includes("return-history/pending")) {
      return Promise.resolve({ items: returnPending });
    }
    if (u.includes("return-history")) {
      const items = returnHistory?.items ?? [];
      return Promise.resolve({
        items,
        total: items.length,
        total_quantity: 0,
        limit: 50,
        offset: 0,
        ...returnHistory,
      });
    }
    return Promise.resolve({ items: [] });
  });
}
