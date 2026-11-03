import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { clearAuthTokens, setAccessToken } from "@/services/http";

import { ProductContentForm } from "../components/ProductContentForm";

const EMPTY = {
  short_description: "",
  highlights: [],
  specs: [],
  audience: { suitable: [], caution: [] },
  usage_steps: [],
  troubleshooting: [],
  faqs: [],
  videos: [],
  visible_sections: [],
  is_published: false,
  images: [],
  updated_at: null,
};

// `mockResolvedValue` trả về CÙNG một Response instance ở mọi lần gọi — body
// của Response chỉ đọc (`.json()`) được MỘT lần. `fetchJson` (services/http.ts)
// tự gọi `response.json()` nội bộ (đọc `data.access` để refresh token), và có
// thể gọi `fetch()` nhiều lần trong 1 request (thử refresh token trước, rồi
// mới gọi request thật). Dùng `mockImplementation` để mỗi lần gọi trả về một
// Response MỚI, tránh lỗi "body stream already read".
function mockFetchAlwaysEmpty() {
  return vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(EMPTY), { status: 200 })),
    );
}

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProductContentForm productId={1} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // fetchJson tự refresh access token khi rỗng (POST /api/users/token/refresh)
  // trước MỌI request — set sẵn 1 token giả (không phải JWT thật) để
  // shouldRefreshAccessToken() luôn trả false, tránh chuỗi test này phải quan
  // tâm tới cơ chế auth không liên quan tới form.
  setAccessToken("test-access-token");
});

afterEach(() => {
  vi.restoreAllMocks();
  clearAuthTokens();
});

it("thêm được một dòng thông số", async () => {
  vi.stubGlobal("fetch", mockFetchAlwaysEmpty());
  renderForm();

  await screen.findByText(/Thông số kỹ thuật/);
  await userEvent.click(screen.getByRole("button", { name: /Thêm thông số/ }));

  expect(screen.getByPlaceholderText(/Nhãn/)).toBeInTheDocument();
});

it("xoá được dòng vừa thêm", async () => {
  vi.stubGlobal("fetch", mockFetchAlwaysEmpty());
  renderForm();

  await screen.findByText(/Thông số kỹ thuật/);
  await userEvent.click(screen.getByRole("button", { name: /Thêm thông số/ }));
  await userEvent.click(screen.getByRole("button", { name: /Xoá dòng 1/ }));

  expect(screen.queryByPlaceholderText(/Nhãn/)).not.toBeInTheDocument();
});

it("bật khối thì thêm vào visible_sections khi lưu", async () => {
  const fetchMock = mockFetchAlwaysEmpty();
  vi.stubGlobal("fetch", fetchMock);
  renderForm();

  await screen.findByText(/Thông số kỹ thuật/);
  await userEvent.click(screen.getByRole("checkbox", { name: /Hiện khối Thông số/ }));
  await userEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));

  await waitFor(() => {
    const put = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === "PUT");
    expect(put).toBeTruthy();
    const body = JSON.parse((put as [string, RequestInit])[1].body as string);
    expect(body.visible_sections).toContain("thong_so");
  });
});

it("nói rõ xem trước KHÔNG cộng lượt quét cho mã nào", async () => {
  vi.stubGlobal("fetch", mockFetchAlwaysEmpty());
  renderForm();

  // Đảo ngược ghi chú cũ ("xem trước sẽ cộng một lượt quét"): xem trước nay
  // dựng tại chỗ, không mở trang public bằng mã thật nữa. Số lượt quét hiển
  // thị công khai cho khách, nên câu trấn an này phải còn — biên tập viên né
  // nút Xem trước vì sợ làm sai số thì tính năng coi như không tồn tại.
  expect(await screen.findByText(/không cộng lượt quét/i)).toBeInTheDocument();
});

it("bật đủ cả 7 khối gửi đủ 7 key khi lưu, tắt hết gửi mảng rỗng", async () => {
  const fetchMock = mockFetchAlwaysEmpty();
  vi.stubGlobal("fetch", fetchMock);
  renderForm();

  await screen.findByText(/Thông số kỹ thuật/);

  // Đúng 7 key BE chấp nhận (PROFILE_SECTIONS — backend/apps/orders/models.py),
  // đối chiếu bằng tên hiển thị của từng toggle "Hiện khối ...". Test này khác
  // test "bật khối thì thêm vào visible_sections" ở trên: test kia chỉ động tới
  // 1/7 key (thong_so) — 6 key còn lại (map sai 1 chữ là ăn 400 từ BE) chưa có gì
  // xác nhận tới tận request PUT thật sự gửi gì.
  const sectionToggleLabels = [
    "Hiện khối Điểm nổi bật",
    "Hiện khối Thông số kỹ thuật",
    "Hiện khối Hướng dẫn sử dụng",
    "Hiện khối Xử lý sự cố",
    "Hiện khối FAQ",
    "Hiện khối Video",
    "Hiện khối Đối tượng sử dụng",
  ];

  for (const label of sectionToggleLabels) {
    await userEvent.click(screen.getByRole("checkbox", { name: label }));
  }
  await userEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));

  await waitFor(() => {
    const puts = fetchMock.mock.calls.filter(([, init]) => (init as RequestInit)?.method === "PUT");
    expect(puts.length).toBeGreaterThan(0);
    const lastPut = puts[puts.length - 1] as [string, RequestInit];
    const body = JSON.parse(lastPut[1].body as string);
    expect(body.visible_sections).toHaveLength(7);
    expect(body.visible_sections.sort()).toEqual(
      ["diem_noi_bat", "doi_tuong", "faq", "huong_dan", "su_co", "thong_so", "video"].sort(),
    );
  });

  for (const label of sectionToggleLabels) {
    await userEvent.click(screen.getByRole("checkbox", { name: label }));
  }
  await userEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));

  await waitFor(() => {
    const puts = fetchMock.mock.calls.filter(([, init]) => (init as RequestInit)?.method === "PUT");
    const lastPut = puts[puts.length - 1] as [string, RequestInit];
    const body = JSON.parse(lastPut[1].body as string);
    expect(body.visible_sections).toEqual([]);
  });
});

it("user chỉ có products:view: không có nút Lưu, ô nhập bị khoá", async () => {
  vi.stubGlobal("fetch", mockFetchAlwaysEmpty());
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProductContentForm productId={1} canEdit={false} />
    </QueryClientProvider>,
  );

  await screen.findByText(/Thông số kỹ thuật/);

  // BE trả 403 cho PUT /profile và cả 3 endpoint ảnh khi user chỉ có
  // products:view (test_product_profile_api.py) — FE phải khoá TRƯỚC khi
  // request bay đi, không phải hiện toast lỗi sau khi user đã gõ xong.
  expect(screen.queryByRole("button", { name: /^Lưu$/ })).not.toBeInTheDocument();
  expect(screen.getByText(/chỉ có quyền xem/i)).toBeInTheDocument();

  const addSpecButton = screen.getByRole("button", { name: /Thêm thông số/ });
  expect(addSpecButton).toBeDisabled();

  const specsToggle = screen.getByRole("checkbox", { name: /Hiện khối Thông số/ });
  expect(specsToggle).toBeDisabled();

  const uploadButton = screen.getByRole("button", { name: /Thêm ảnh/ });
  expect(uploadButton).toBeDisabled();
});

it("đổi productId thì nạp lại dữ liệu sản phẩm mới, không giữ dữ liệu sản phẩm cũ", async () => {
  const PRODUCT_2 = { ...EMPTY, short_description: "Mô tả sản phẩm B" };
  const fetchMock = vi.fn().mockImplementation((url: unknown) => {
    const body = typeof url === "string" && url.includes("/products/2/") ? PRODUCT_2 : EMPTY;
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  });
  vi.stubGlobal("fetch", fetchMock);

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { rerender } = render(
    <QueryClientProvider client={client}>
      <ProductContentForm productId={1} />
    </QueryClientProvider>,
  );

  await screen.findByText(/Thông số kỹ thuật/);
  expect(screen.queryByDisplayValue("Mô tả sản phẩm B")).not.toBeInTheDocument();

  // Re-render CÙNG instance (không remount qua key) với productId khác — đúng
  // kịch bản lỗi đã sửa: hydrate-once trước đây chỉ theo dõi `hydrated` (boolean
  // trơn), không theo dõi `productId`, nên sẽ giữ nguyên dữ liệu sản phẩm 1 dù
  // đang hiển thị dưới nhãn sản phẩm 2 — corruption âm thầm nếu lỡ bấm Lưu.
  rerender(
    <QueryClientProvider client={client}>
      <ProductContentForm productId={2} />
    </QueryClientProvider>,
  );

  expect(await screen.findByDisplayValue("Mô tả sản phẩm B")).toBeInTheDocument();
});
