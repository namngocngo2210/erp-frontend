import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import type { AdsReportPayload } from "../../ads-report-selectors";

afterEach(cleanup);

// useAdsReport (React Query) đã dùng placeholderData: keepPreviousData (queries.ts) nên
// khi đổi filter, `data` cũ được giữ và `isLoading` không bật lại — bug 7.4 chỉ xảy ra ở
// LẦN TẢI ĐẦU (chưa có data cũ để keep). Mock trực tiếp shape trả về của hook để kiểm
// soát chính xác trạng thái isLoading/data mà không cần dựng network thật.
const mockUseAdsReport = vi.fn();
// usePageCostReport (chiều Page, D9): trang mặc định mở ở chiều Kênh nên panel
// Page chưa mount, nhưng hook vẫn được gọi (React hook, không điều kiện) — mock
// trả về rỗng/không loading để không đụng tới QueryClient thật trong test này.
type PageCostReportStub = {
  data: { rows: unknown[]; revenue_available_from: string | null } | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};
const mockUsePageCostReport = vi.fn(
  (..._args: unknown[]): PageCostReportStub => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  }),
);
// useCampaignCostReport (tab "Chiến dịch", D9): mock trả về hai query rỗng/không loading
// — các test trong file này không cần dựng network thật cho tab Chiến dịch.
type CampaignQueryStub = {
  data: { rows: unknown[]; truncated: boolean; accessible_accounts?: number | null } | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};
const emptyCampaignQueryStub = (): CampaignQueryStub => ({
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
});
const mockUseCampaignCostReport = vi.fn((..._args: unknown[]) => ({
  facebook: emptyCampaignQueryStub(),
  google: emptyCampaignQueryStub(),
}));
// useCampaignProducts/useSetCampaignProduct (tab "Gán sản phẩm"): Tabs chỉ render tab
// đang mở nên các test ở đây không chạm tới, nhưng vi.mock thay CẢ module nên phải khai
// đủ — thiếu một export là lỗi "is not a function" ở tab khác.
vi.mock("@/features/ads/queries", () => ({
  useAdsReport: (...args: unknown[]) => mockUseAdsReport(...args),
  // Bung theo sản phẩm là tải lười — ở trang này chưa hàng nào được bung nên
  // query luôn ở trạng thái tắt, chỉ cần stub rỗng.
  useAdsDigitalProducts: () => ({ data: undefined, isError: false, isLoading: false }),
  usePageCostReport: (...args: unknown[]) => mockUsePageCostReport(...args),
  useCampaignCostReport: (...args: unknown[]) => mockUseCampaignCostReport(...args),
  useCampaignProducts: () => ({
    facebook: emptyCampaignQueryStub(),
    google: emptyCampaignQueryStub(),
  }),
  useSetCampaignProduct: () => ({ mutate: vi.fn() }),
}));
// Ô lọc sản phẩm của 2 tab digital gọi useAllProductOptions (React Query thật) — mock
// để test không phải dựng QueryClientProvider.
vi.mock("@/features/products/queries", () => ({
  useAllProductOptions: () => ({ data: [], isLoading: false }),
}));

import { AdsReportPage } from "../AdsReportPage";

function renderPage() {
  return render(
    <I18nProvider>
      <AdsReportPage channels={[]} />
    </I18nProvider>,
  );
}

describe("AdsReportPage — first-load state (7.4)", () => {
  it("shows a loading spinner instead of zero KPI tiles on first load", () => {
    mockUseAdsReport.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
      error: null,
    });
    renderPage();

    // Chưa có data → không được hiện KPI tile "0" (nhìn như không có dữ liệu).
    expect(screen.queryByText("Đơn đã chốt")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders the KPI tiles once data has loaded", () => {
    const payload: AdsReportPayload = {
      revenue_by_channel: [],
      top_products: [],
      daily_breakdown: [],
      revenue_by_province: [],
      revenue_by_gender: [],
    };
    mockUseAdsReport.mockReturnValue({
      isLoading: false,
      isError: false,
      data: payload,
      error: null,
    });
    renderPage();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Đơn đã chốt")).toBeInTheDocument();
  });

  it("keeps showing previous KPI tiles (not the spinner) while refetching with existing data", () => {
    const payload: AdsReportPayload = {
      revenue_by_channel: [],
      top_products: [],
      daily_breakdown: [],
      revenue_by_province: [],
      revenue_by_gender: [],
    };
    // isLoading = isPending && isFetching in React Query v5 — once placeholderData/data
    // exists from a previous fetch, isPending (and thus isLoading) is false even while a
    // background refetch (isFetching) runs. Simulate that state directly.
    mockUseAdsReport.mockReturnValue({
      isLoading: false,
      isFetching: true,
      isError: false,
      data: payload,
      error: null,
    });
    renderPage();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Đơn đã chốt")).toBeInTheDocument();
  });
});

describe("AdsReportPage — tab", () => {
  const PAYLOAD: AdsReportPayload = {
    revenue_by_channel: [],
    top_products: [],
    daily_breakdown: [
      {
        date: "2026-03-01",
        revenue: "0",
        cost: "0",
        closed_orders: 0,
        leads: 0,
        ratio_pct: null,
        channels: [
          {
            channel_id: 1,
            channel__code: "fb-1",
            channel__name: "Kênh A",
            revenue: "4000",
            cost: "800",
            closed_orders: 5,
            leads: 20,
            ratio_pct: 20,
          },
        ],
      },
    ],
    revenue_by_province: [],
    revenue_by_gender: [],
  };

  function renderLoaded() {
    mockUseAdsReport.mockReturnValue({
      isLoading: false,
      isError: false,
      data: PAYLOAD,
      error: null,
    });
    return renderPage();
  }

  it("hiện đủ 3 tab, mặc định mở Tổng quan", () => {
    renderLoaded();
    for (const label of ["Tổng quan", "Báo cáo theo digital", "Báo cáo chi tiết theo digital"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("Đơn đã chốt")).toBeInTheDocument();
  });

  it("chuyển sang tab theo digital thì hiện bảng chỉ số của kênh", () => {
    renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Báo cáo theo digital" }));

    expect(screen.queryByText("Đơn đã chốt")).not.toBeInTheDocument();
    expect(screen.getByText("Kênh A")).toBeInTheDocument();
    expect(screen.getByText("Số data")).toBeInTheDocument();
    expect(screen.getByText("CPL")).toBeInTheDocument();
  });

  it("tab chi tiết ẩn bộ lọc ngày chung và hiện ô chọn tháng riêng", () => {
    renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Báo cáo chi tiết theo digital" }));

    expect(screen.queryByLabelText("Kênh bán hàng")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tháng")).toBeInTheDocument();
  });
});

const EMPTY_STATE_TEXT = "Chưa có dữ liệu chi phí trong khoảng đã chọn.";

describe("AdsReportPage — tab Theo page: loading & error", () => {
  const LOADED_CHANNEL_PAYLOAD: AdsReportPayload = {
    revenue_by_channel: [],
    top_products: [],
    daily_breakdown: [],
    revenue_by_province: [],
    revenue_by_gender: [],
  };

  function openPageTab() {
    mockUseAdsReport.mockReturnValue({
      isLoading: false,
      isError: false,
      data: LOADED_CHANNEL_PAYLOAD,
      error: null,
    });
    renderPage();
    // Chiều Page nằm trong tab "Tổng quan" (đang mở mặc định) nên chỉ cần bấm
    // nút con "Theo page" của Tabs lồng bên trong.
    fireEvent.click(screen.getByRole("button", { name: "Theo page" }));
  }

  afterEach(() => {
    mockUsePageCostReport.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it("shows a spinner while the page cost report is loading", () => {
    mockUsePageCostReport.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    openPageTab();

    expect(screen.getByRole("status")).toBeInTheDocument();
    // Đang tải KHÔNG được đọc thành "không tốn đồng nào".
    expect(screen.queryByText(EMPTY_STATE_TEXT)).not.toBeInTheDocument();
  });

  it("shows the error message and hides the table when the request fails", () => {
    mockUsePageCostReport.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("HTTP 500"),
    });
    openPageTab();

    expect(screen.getByText("HTTP 500")).toBeInTheDocument();
    // Bug đang sửa: request hỏng mà bảng vẫn render empty state, tức là màn hình
    // khẳng định chắc nịch "ads không tiêu đồng nào trong khoảng này".
    expect(screen.queryByText(EMPTY_STATE_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText("Chi phí theo Page")).not.toBeInTheDocument();
  });

  it("still shows the empty state when the request succeeds with no rows", () => {
    mockUsePageCostReport.mockReturnValue({
      data: { rows: [], revenue_available_from: null },
      isLoading: false,
      isError: false,
      error: null,
    });
    openPageTab();

    expect(screen.getByText(EMPTY_STATE_TEXT)).toBeInTheDocument();
  });
});

describe("AdsReportPage — tab Chiến dịch: khoá việc truyền prop cảnh báo thiếu TKQC (Việc 3)", () => {
  // `accessibleAccounts` truyền xuống CampaignCostTable là prop optional với default
  // {facebook: null, google: null} — nếu ai đó lỡ xoá dòng truyền prop ở AdsReportPage,
  // băng cảnh báo "chưa gán TKQC" im lặng biến mất trong khi test riêng của
  // CampaignCostTable vẫn xanh (nó tự truyền prop trực tiếp, không đi qua trang thật).
  // Test này render cả trang thật để khoá đường truyền prop đó.
  afterEach(() => {
    mockUseCampaignCostReport.mockReturnValue({
      facebook: emptyCampaignQueryStub(),
      google: emptyCampaignQueryStub(),
    });
  });

  it("cả hai nguồn accessible_accounts = 0 → mở tab Chiến dịch hiện băng cảnh báo chưa gán TKQC", () => {
    mockUseAdsReport.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        revenue_by_channel: [],
        top_products: [],
        daily_breakdown: [],
        revenue_by_province: [],
        revenue_by_gender: [],
      } satisfies AdsReportPayload,
      error: null,
    });
    mockUseCampaignCostReport.mockReturnValue({
      facebook: {
        data: { rows: [], truncated: false, accessible_accounts: 0 },
        isLoading: false,
        isError: false,
        error: null,
      },
      google: {
        data: { rows: [], truncated: false, accessible_accounts: 0 },
        isLoading: false,
        isError: false,
        error: null,
      },
    });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Chiến dịch" }));

    expect(
      screen.getByText("Bạn chưa được gán tài khoản quảng cáo nào.", { exact: false }),
    ).toBeInTheDocument();
  });
});
