import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { I18nProvider } from "@/i18n";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CustomerProfile,
  CustomerProfileResponse,
  CustomerSearchHit,
  TimelineOrder,
} from "@/lib/api/customer-profile";

const { searchCustomers, getCustomerProfile } = vi.hoisted(() => ({
  searchCustomers: vi.fn(),
  getCustomerProfile: vi.fn(),
}));

vi.mock("@/lib/api/customer-profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/customer-profile")>();
  return { ...actual, searchCustomers, getCustomerProfile };
});

import CustomerProfilePage from "@/pages/CustomerProfilePage";

const HIT: CustomerSearchHit = {
  customer_id: 7,
  code: "KH-7",
  full_name: "Nguyen Van A",
  orders_gtc: 2,
  total_spent: "800000",
  last_purchase_at: "2026-08-01T03:00:00Z",
  segment_code: "S1",
  segment_name: "Thân thiết",
  era: "current",
};

/** Khách điển hình: có hành vi mua, KHÔNG có chân dung khai báo. Đây là hình
 * dạng của khoảng 98/100 khách thật, nên nó là mặc định của factory chứ không
 * phải một ca biên. */
function makeProfile(overrides: Partial<CustomerProfile> = {}): CustomerProfile {
  return {
    customer_id: 7,
    code: "KH-7",
    full_name: "Nguyen Van A",
    gender: null,
    created_at: "2025-01-01T00:00:00Z",
    is_new_customer: false,
    segment_code: "S1",
    segment_name: "Thân thiết",
    // Giá trị thật từ prod: cả hai là chuỗi, không phải số. Khai nhầm thành số
    // trong serializer đã làm mọi hồ sơ có phân khúc trả 500 (23/08/2026).
    care_priority: "Chốt đơn",
    has_problem: false,
    latest_sales_status_code: "created_order",
    orders_gtc: 2,
    orders_all: 3,
    orders_cancelled: 1,
    total_spent: "800000",
    avg_order_value: 400000,
    first_purchase_at: "2026-01-01T00:00:00Z",
    last_purchase_at: "2026-08-01T03:00:00Z",
    days_since_last_purchase: 20,
    repurchase_gap_median_days: 45,
    channels: ["Kênh A"],
    provinces: ["Hà Nội"],
    top_skus: ["SKU-1"],
    distinct_products: 1,
    call_count: 0,
    avg_quality_score: null,
    era: "current",
    price_tier_lifetime: "mid",
    purchase_rhythm_lifetime: "repeat",
    recency_bucket: "active",
    channel_affinity: "Kênh A",
    product_affinity: "SKU-1",
    buyer_role: null,
    age_text: null,
    age_text_src: null,
    occupation_code: null,
    occupation_code_src: null,
    pain_level_code: null,
    pain_level_code_src: null,
    pain_duration_code: null,
    used_massage_before: null,
    lifestyle_habit_codes: [],
    relax_time_codes: [],
    purchase_barrier_codes: [],
    delax_source_codes: [],
    need_codes: [],
    need_group_codes: [],
    filled_field_count: 0,
    ai_field_count: 0,
    ...overrides,
  };
}

function makeOrder(overrides: Partial<TimelineOrder> = {}): TimelineOrder {
  return {
    order_id: 1,
    order_code: "DH-1",
    created_at: "2026-08-01T03:00:00Z",
    created_date: "2026-08-01",
    status: 3,
    is_gtc: true,
    total_after_discount: "500000",
    channel_name: "Kênh A",
    staff_name: null,
    item_count: 1,
    primary_sku: "SKU-1",
    province: "Hà Nội",
    district: null,
    call_count: 0,
    quality_total_score: null,
    ...overrides,
  };
}

function respond(overrides: Partial<CustomerProfileResponse> = {}): CustomerProfileResponse {
  return {
    profile: makeProfile(),
    timeline: [makeOrder()],
    timeline_truncated: false,
    ...overrides,
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
  return render(<CustomerProfilePage />, { wrapper });
}

async function pickCustomer() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Tìm khách hàng"), "Nguyen");
  await user.click(await screen.findByRole("button", { name: /Nguyen Van A/ }));
  return user;
}

beforeEach(() => {
  searchCustomers.mockReset().mockResolvedValue([HIT]);
  getCustomerProfile.mockReset().mockResolvedValue(respond());
});

describe("Trang Hồ sơ khách hàng 360", () => {
  it("chưa chọn khách thì không gọi API hồ sơ", async () => {
    renderPage();

    expect(await screen.findByText("Chưa chọn khách hàng")).toBeInTheDocument();
    expect(getCustomerProfile).not.toHaveBeenCalled();
  });

  it("gõ 1 ký tự thì không bắn request tìm kiếm", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Tìm khách hàng"), "N");

    expect(searchCustomers).not.toHaveBeenCalled();
    expect(screen.getByText(/Nhập ít nhất 2 ký tự/)).toBeInTheDocument();
  });

  it("chọn khách thì hiện chi tiêu và số đơn thành công", async () => {
    renderPage();
    await pickCustomer();

    expect(await screen.findByText("Đã chi")).toBeInTheDocument();
    expect(screen.getByText("Đơn thành công")).toBeInTheDocument();
    expect(screen.getByText("1 đơn đã huỷ")).toBeInTheDocument();
  });

  it("ẩn hẳn khối chân dung khai báo khi khách không khai gì", async () => {
    // Đây là 98/100 khách. Hiện khung rỗng đầy dấu gạch ngang khiến mọi hồ sơ
    // trông như dữ liệu lỗi — test này giữ quyết định đó khỏi bị lật ngược.
    renderPage();
    await pickCustomer();

    await screen.findByText("Hành vi mua");
    expect(screen.queryByText("Chân dung khách khai báo")).not.toBeInTheDocument();
  });

  it("hiện khối chân dung kèm nhãn nguồn khi trường do AI suy ra", async () => {
    getCustomerProfile.mockResolvedValue(
      respond({
        profile: makeProfile({
          age_text: "35-44",
          age_text_src: "ai",
          filled_field_count: 1,
          ai_field_count: 1,
        }),
      }),
    );
    renderPage();
    await pickCustomer();

    expect(await screen.findByText("Chân dung khách khai báo")).toBeInTheDocument();
    expect(screen.getByText("35-44")).toBeInTheDocument();
    expect(screen.getByText("AI suy ra")).toBeInTheDocument();
  });

  it("giữ đơn huỷ trong dòng thời gian", async () => {
    // Lọc đơn huỷ đi sẽ khiến khách huỷ liên tiếp trông y hệt khách chưa từng
    // đặt gì — đúng lúc sale cần thấy điều ngược lại.
    getCustomerProfile.mockResolvedValue(
      respond({
        timeline: [
          makeOrder({ order_id: 2, order_code: "DH-2", status: 6, is_gtc: false }),
          makeOrder(),
        ],
      }),
    );
    renderPage();
    await pickCustomer();

    // "2 đơn" cũng xuất hiện ở gợi ý tìm kiếm, nên khẳng định bằng mã đơn:
    // cả đơn huỷ lẫn đơn thành công đều phải có mặt.
    expect(await screen.findByText("DH-2")).toBeInTheDocument();
    expect(screen.getByText("DH-1")).toBeInTheDocument();
  });

  it("nói rõ khi dòng thời gian bị cắt bớt", async () => {
    getCustomerProfile.mockResolvedValue(respond({ timeline_truncated: true }));
    renderPage();
    await pickCustomer();

    expect(await screen.findByText(/có nhiều đơn hơn số đang hiển thị/)).toBeInTheDocument();
  });
});
