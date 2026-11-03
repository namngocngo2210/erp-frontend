import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n";
import type { ScanLogRow } from "@/features/warranty-codes/types";

afterEach(() => cleanup());

// keyword là chuỗi khách thực sự gõ (chữ thường, có thể lệch case/khoảng trắng so
// với mã đã chuẩn hóa); code_value là mã đã được hệ thống khớp/chuẩn hóa. Hai giá
// trị này thường khác nhau kể cả khi quét thành công — trang Nhật ký là audit log
// nên phải hiện đúng cả hai, không được coi trùng-thường-gặp là lý do ẩn bớt.
const row: ScanLogRow = {
  id: 1,
  keyword: "a8k2m4p9qx",
  code_value: "A8K2M4P9QX",
  serial: "DX-000001",
  product_sku: "BNC02",
  phone_masked: "090****567",
  result: "activated",
  result_label: "Kích hoạt thành công",
  channel: "web",
  ip_address: "1.2.3.4",
  user_agent: "Mozilla/5.0",
  created_at: "2026-08-06T03:00:00Z",
};

const notFoundRow: ScanLogRow = {
  id: 2,
  keyword: "sai-ma-qua-roi",
  code_value: null,
  serial: null,
  product_sku: null,
  phone_masked: null,
  result: "not_found",
  result_label: "Không tìm thấy mã",
  channel: "zalo_oa",
  ip_address: "5.6.7.8",
  user_agent: "Mozilla/5.0",
  created_at: "2026-08-06T04:00:00Z",
};

const { useScanLogs } = vi.hoisted(() => ({
  useScanLogs: vi.fn(() => ({ data: { results: [row], total: 1 }, isLoading: false })),
}));
vi.mock("@/features/warranty-codes/queries", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useScanLogs,
}));

import { ScanLogsTab } from "@/features/warranty-codes/components/ScanLogsTab";

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <QueryClientProvider client={qc}>
        <ScanLogsTab />
      </QueryClientProvider>
    </I18nProvider>,
  );
}

describe("ScanLogsTab", () => {
  it("hiện dòng nhật ký với mã, SKU, IP và kết quả", () => {
    useScanLogs.mockReturnValue({ data: { results: [row], total: 1 }, isLoading: false });
    renderTab();
    expect(screen.getByText("A8K2M4P9QX")).toBeTruthy();
    expect(screen.getByText("a8k2m4p9qx")).toBeTruthy();
    expect(screen.getByText("BNC02")).toBeTruthy();
    expect(screen.getByText("1.2.3.4")).toBeTruthy();
    expect(screen.getByText("Kích hoạt thành công")).toBeTruthy();
  });

  it("hiện dòng từ khóa và badge đúng cho bản ghi không tìm thấy mã", () => {
    useScanLogs.mockReturnValue({ data: { results: [notFoundRow], total: 1 }, isLoading: false });
    renderTab();
    expect(screen.getByText("sai-ma-qua-roi")).toBeTruthy();
    expect(screen.getByText("Không tìm thấy mã")).toBeTruthy();
  });
});
