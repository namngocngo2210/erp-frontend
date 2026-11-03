import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/services/http", () => ({
  fetchJson: vi.fn((url: string) => {
    if (url.startsWith("/api/warehouses")) {
      return Promise.resolve({ items: [{ id: 1, name: "Kho A" }], total: 1 });
    }
    if (url.startsWith("/api/inventory/ledger-documents")) {
      return Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 });
    }
    if (url.startsWith("/api/orders/products")) {
      const products = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        sku: `SKU-${i + 1}`,
        name: `Sản phẩm ${i + 1}`,
      }));
      return Promise.resolve(products);
    }
    return Promise.resolve({});
  }),
}));

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => () => true,
}));

import StockDocumentsPage from "@/features/inventory/pages/StockDocumentsPage";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<StockDocumentsPage />, { wrapper });
}

async function openCreateDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /Tạo/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Phiếu kho" }));
  expect(await screen.findByText("Tạo phiếu kho")).toBeTruthy();
}

async function addProductBySearch(user: ReturnType<typeof userEvent.setup>, sku: string) {
  const search = screen.getByPlaceholderText("Nhập SKU hoặc tên...");
  await user.clear(search);
  await user.type(search, "SKU");
  const option = await screen.findByRole("button", { name: sku });
  await user.click(option);
}

describe("CreateDocumentDialog — thêm dòng sản phẩm", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("cho phép thêm nhiều hơn 5 dòng sản phẩm", async () => {
    const user = userEvent.setup();
    renderPage();

    await openCreateDialog(user);

    for (let i = 1; i <= 7; i++) {
      await addProductBySearch(user, `SKU-${i}`);
    }

    await waitFor(() => {
      expect(screen.getByText("Dòng hàng (7)")).toBeTruthy();
    });
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByLabelText(`Số lượng SKU-${i}`)).toBeTruthy();
    }
  });

  it("thêm sản phẩm đã có trong dòng thì tăng số lượng thay vì bỏ qua im lặng", async () => {
    const user = userEvent.setup();
    renderPage();

    await openCreateDialog(user);

    await addProductBySearch(user, "SKU-1");
    await addProductBySearch(user, "SKU-1");

    // Không tạo dòng trùng, nhưng phải có phản hồi: số lượng +1
    expect(screen.getByText("Dòng hàng (1)")).toBeTruthy();
    const qty = screen.getByLabelText("Số lượng SKU-1") as HTMLInputElement;
    expect(qty.value).toBe("2");
  });
});

describe("CreateDocumentDialog — ngày chứng từ", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("chặn chọn ngày tương lai vì bút toán kho không nhận ngày tương lai", async () => {
    const user = userEvent.setup();
    renderPage();

    await openCreateDialog(user);

    const input = screen.getByLabelText("Ngày chứng từ") as HTMLInputElement;
    expect(input.max).not.toBe("");
    // `max` là mốc hiện tại, không phải một hằng số bị đóng băng trong code.
    expect(new Date(input.max).getTime()).toBeGreaterThan(Date.now() - 120_000);
    expect(new Date(input.max).getTime()).toBeLessThanOrEqual(Date.now() + 120_000);
  });
});
