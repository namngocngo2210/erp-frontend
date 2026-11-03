import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n";

// globals:false ở vitest.config.ts tắt auto-cleanup ngầm của RTL — phải tự gọi
// (như batches-tab.test.tsx) để các `it` không cộng dồn DOM của nhau.
afterEach(() => cleanup());

const row = {
  id: 1,
  seq: 1,
  serial: "DX-000001",
  code: "A8K2M4P9QX",
  batch_id: 1,
  batch_code: "LOT-20260805-001",
  product_id: 2,
  product_name: "Cà phê Chanh Tây",
  product_sku: "CF-CHANH-TAY",
  status: "assigned",
  created_at: "2026-08-05T00:00:00Z",
};

const { useWarrantyCodes } = vi.hoisted(() => ({
  useWarrantyCodes: vi.fn(() => ({ data: { results: [row], total: 1 }, isLoading: false })),
}));
vi.mock("@/features/warranty-codes/queries", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useWarrantyCodes,
}));
vi.mock("@/features/products/queries", () => ({ useProductSearch: () => async () => [] }));

import { CodesTab } from "@/features/warranty-codes/components/CodesTab";

function renderTab(props: { initialBatchId?: number | null } = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={qc}>
        <CodesTab {...props} />
      </QueryClientProvider>
    </I18nProvider>,
  );
}

describe("CodesTab", () => {
  it("hiển thị serial, mã và SKU sản phẩm", () => {
    renderTab();
    expect(screen.getByText("DX-000001")).toBeTruthy();
    expect(screen.getByText("A8K2M4P9QX")).toBeTruthy();
    expect(screen.getByText("CF-CHANH-TAY")).toBeTruthy();
  });

  it("nhận initialBatchId và đưa vào filter lô ban đầu", () => {
    renderTab({ initialBatchId: 1 });
    expect(useWarrantyCodes).toHaveBeenCalledWith(expect.objectContaining({ batch_id: 1 }));
  });
});
