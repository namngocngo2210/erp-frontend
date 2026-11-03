import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n";

const { startExport, permissions, stockListArgs } = vi.hoisted(() => ({
  startExport: vi.fn().mockResolvedValue(undefined),
  permissions: new Set<string>(),
  stockListArgs: [] as unknown[][],
}));

vi.mock("@/features/exports/ExportJobsProvider", () => ({
  useExportJobs: () => ({
    jobs: [],
    activeCount: 0,
    isOpen: false,
    setOpen: vi.fn(),
    startExport: (...args: unknown[]) => startExport(...args),
    cancel: vi.fn(),
    dismiss: vi.fn(),
  }),
}));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => (code: string) => permissions.has(code),
}));
vi.mock("@/lib/api/warehouses", () => ({
  getWarehouses: vi.fn(() =>
    Promise.resolve({
      items: [{ id: 7, code: "WH-A", name: "Kho A", is_active: true }],
      total: 1,
    }),
  ),
}));
vi.mock("@/features/inventory/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/inventory/queries")>();
  return {
    ...actual,
    useStockList: (...args: unknown[]) => {
      stockListArgs.push(args);
      return {
        data: {
          items: [
            {
              id: 1,
              warehouse: 7,
              warehouse_code: "WH-A",
              warehouse_name: "Kho A",
              product: 11,
              product_sku: "SKU-A",
              product_name: "Áo",
              quantity: 3,
              state: "defect",
              updated_at: "2026-08-01T00:00:00Z",
              rr3: 0,
              rr7: 0,
            },
          ],
          total: 1,
          limit: 200,
          offset: 0,
        },
        isLoading: false,
      };
    },
    useStockMovements: () => ({ data: { items: [] }, isLoading: false }),
  };
});

import StockPage from "@/features/inventory/pages/StockPage";
import { isPastDate, toIsoDate } from "@/features/inventory/stock-as-of";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
  return render(<StockPage />, { wrapper });
}

// jsdom setup mặc định stub matchMedia luôn trả matches:false → ResponsiveList
// luôn chọn nhánh THẺ MOBILE (isDesktop = false) trừ khi test tự override theo
// chiều query, đúng khuôn ScanDispatchDialog.viewport.test.tsx.
const originalMatchMedia = window.matchMedia;

function mockViewport(mobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) =>
      ({
        matches: mobile ? query.includes("max-width") : query.includes("min-width"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }) as MediaQueryList,
  });
}

/** Ngày hôm kia theo lịch địa phương — tương đối, không cắm cứng. */
function twoDaysAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// tsconfig lib đang chốt ES2020 (không có Array.prototype.at), nên dùng chỉ số
// thay vì `.at(-1)` để lấy phần tử cuối.
function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

beforeEach(() => {
  startExport.mockClear();
  permissions.clear();
  stockListArgs.length = 0;
});
afterEach(() => {
  cleanup();
  // Trả matchMedia về stub mặc định của setup.ts để test sau không kế thừa
  // override viewport của test trước (thứ tự chạy không được phép ảnh hưởng kết quả).
  Object.defineProperty(window, "matchMedia", { writable: true, value: originalMatchMedia });
});

describe("StockPage — xem tồn theo mốc ngày", () => {
  it("mặc định không gửi mốc nào", async () => {
    renderPage();
    await screen.findByText("SKU-A");

    expect(last(stockListArgs)?.[2]).toBe("");
    expect(screen.queryByText(/Đang xem tồn cuối ngày/)).toBeNull();
  });

  it("chọn ngày quá khứ thì hiện dải cảnh báo và ẩn nút Xử lý (thẻ mobile — viewport mặc định của jsdom)", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("SKU-A");
    expect(screen.getByRole("button", { name: /Xử lý/ })).toBeTruthy();

    const picker = screen.getByLabelText("Xem tồn đến ngày");
    await user.clear(picker);
    await user.type(picker, twoDaysAgoIso());

    await waitFor(() => expect(screen.getByText(/Đang xem tồn cuối ngày/)).toBeTruthy());
    expect(screen.queryByRole("button", { name: /Xử lý/ })).toBeNull();
    expect(last(stockListArgs)?.[2]).toBe(twoDaysAgoIso());
  });

  it("chọn ngày quá khứ thì ẩn nút Xử lý trên bảng desktop (matchMedia override isDesktop=true)", async () => {
    mockViewport(false);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("SKU-A");
    expect(screen.getByRole("button", { name: /Xử lý/ })).toBeTruthy();

    const picker = screen.getByLabelText("Xem tồn đến ngày");
    await user.clear(picker);
    await user.type(picker, twoDaysAgoIso());

    await waitFor(() => expect(screen.getByText(/Đang xem tồn cuối ngày/)).toBeTruthy());
    expect(screen.queryByRole("button", { name: /Xử lý/ })).toBeNull();
    expect(last(stockListArgs)?.[2]).toBe(twoDaysAgoIso());
  });

  it("nút Hiện tại đưa bảng về tồn hiện tại", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("SKU-A");
    const picker = screen.getByLabelText("Xem tồn đến ngày");
    await user.clear(picker);
    await user.type(picker, twoDaysAgoIso());
    await waitFor(() => expect(screen.getByText(/Đang xem tồn cuối ngày/)).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "Hiện tại" }));

    await waitFor(() => expect(screen.queryByText(/Đang xem tồn cuối ngày/)).toBeNull());
    expect(last(stockListArgs)?.[2]).toBe("");
    expect(screen.getByRole("button", { name: /Xử lý/ })).toBeTruthy();
  });

  it("xuất Excel kèm mốc đang xem", async () => {
    permissions.add("stock:export");
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("SKU-A");
    const picker = screen.getByLabelText("Xem tồn đến ngày");
    await user.clear(picker);
    await user.type(picker, twoDaysAgoIso());

    await user.click(screen.getByRole("button", { name: "Xuất Excel" }));

    await waitFor(() => expect(startExport).toHaveBeenCalled());
    const [, params] = last(startExport.mock.calls) as [string, Record<string, unknown>];
    expect(params.as_of).toBe(twoDaysAgoIso());
  });
});

describe("StockPage — todayIso tự làm mới qua nửa đêm", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Bối cảnh quan trọng cho test này (xem chú thích tại chỗ khai báo
  // `todayIso` trong StockPage.tsx): frontend bật React Compiler cho cả
  // `vite.config.ts` lẫn `vitest.config.ts`, và compiler này memo hoá cả một
  // lời gọi không thuần như `toIsoDate(new Date())` đọc thẳng trong thân
  // render — nhưng scope memo bị khoá theo `asOf`, không phải một hằng số
  // tính một lần cho cả vòng đời component. Nghĩa là nếu để tab mở qua đêm
  // mà không đổi `asOf`, biểu thức tính thẳng sẽ KHÔNG tự cập nhật. Vì vậy
  // `todayIso` phải là `useState` tự làm mới bằng `setInterval` (60s) — nên
  // test ở đây phải mô phỏng đúng cơ chế đó: nhảy đồng hồ hệ thống qua nửa
  // đêm rồi cho interval tự bắn, không dựa vào một re-render "tình cờ" nào
  // khác.
  //
  // Dùng `vi.useFakeTimers()` ĐẦY ĐỦ (cả Date lẫn setInterval) + tự đẩy thời
  // gian bằng `vi.advanceTimersByTimeAsync` thay vì `waitFor`/`userEvent`:
  // testing-library tự chuyển `waitFor` sang chế độ chờ fake-timer ngay khi
  // phát hiện `vi.useFakeTimers` đang bật, rồi treo vô thời hạn nếu không ai
  // chủ động advance — nên bài test tránh hẳn `waitFor` và dùng `fireEvent`
  // (đồng bộ) cho mọi thao tác DOM.
  it("interval cập nhật todayIso/viewingPast sau khi đồng hồ hệ thống qua nửa đêm", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 5, 23, 59));

    renderPage();
    // Flush promise của `getWarehouses` (react-query) trước khi đọc DOM —
    // thay cho `findByText`/`waitFor` vốn không dùng được dưới fake timers.
    // Bọc `act()` để React thực sự flush state update vào DOM (chỉ advance
    // timers không đủ — đã kiểm chứng riêng: thiếu `act()` thì state cập nhật
    // nhưng DOM không re-render lại).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("SKU-A")).toBeTruthy();

    const picker = screen.getByLabelText("Xem tồn đến ngày") as HTMLInputElement;
    // `max` khoá ở "hôm nay" theo đồng hồ hệ thống lúc mount: 05/08.
    expect(picker.max).toBe("2026-08-05");

    fireEvent.change(picker, { target: { value: "2026-08-05" } });
    expect(picker.value).toBe("2026-08-05");
    // Mốc = hôm nay (theo đồng hồ hiện tại) nên CHƯA phải quá khứ.
    expect(screen.queryByText(/Đang xem tồn cuối ngày/)).toBeNull();
    expect(screen.getByRole("button", { name: /Xử lý/ })).toBeTruthy();

    // Đồng hồ hệ thống đi qua nửa đêm — màn hình vẫn đang mở, không remount —
    // rồi cho interval 60s tự bắn để todayIso làm mới.
    vi.setSystemTime(new Date(2026, 7, 6, 0, 1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    // Mốc 05/08 giờ đã ở TRƯỚC "hôm nay" mới (06/08): phải lộ dải cảnh báo và
    // khoá nút Xử lý — đúng ca sự cố "hôm qua tưởng là hôm nay" của việc 1.
    expect(picker.max).toBe("2026-08-06");
    expect(screen.getByText(/Đang xem tồn cuối ngày/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Xử lý/ })).toBeNull();
  });
});

describe("stock-as-of helpers", () => {
  it("đọc ngày theo LỊCH ĐỊA PHƯƠNG, không qua chuỗi ISO UTC", () => {
    // Giờ RẠNG SÁNG mới lộ bẫy toISOString() ở múi giờ dương (VN = UTC+7):
    // 00:30 giờ máy ngày 05 → toISOString() trừ 7 tiếng, lùi về 17:30 UTC
    // ngày 04, tức slice(0, 10) sẽ ra "2026-08-04" — sai một ngày.
    expect(toIsoDate(new Date(2026, 7, 5, 0, 30))).toBe("2026-08-05");
  });

  it("giờ cuối ngày (23:30) vẫn đọc đúng ngày địa phương", () => {
    expect(toIsoDate(new Date(2026, 7, 5, 23, 30))).toBe("2026-08-05");
  });

  it("đệm số 0 cho tháng và ngày một chữ số", () => {
    expect(toIsoDate(new Date(2026, 0, 9))).toBe("2026-01-09");
  });

  it("chỉ coi là quá khứ khi mốc nhỏ hơn hôm nay", () => {
    expect(isPastDate("2026-08-04", "2026-08-05")).toBe(true);
    expect(isPastDate("2026-08-05", "2026-08-05")).toBe(false);
    expect(isPastDate("", "2026-08-05")).toBe(false);
  });
});
