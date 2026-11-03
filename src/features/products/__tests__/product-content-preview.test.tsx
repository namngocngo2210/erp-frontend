import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { clearAuthTokens, setAccessToken } from "@/services/http";

import { ProductContentForm } from "../components/ProductContentForm";

const PROFILE = {
  short_description: "Bồn ngâm chân cao cấp",
  highlights: [{ title: "24 bi lăn massage 3D", detail: "Tác động sâu vào lòng bàn chân" }],
  specs: [{ label: "Công suất", value: "800W" }],
  audience: { suitable: [], caution: [] },
  usage_steps: [],
  troubleshooting: [],
  faqs: [
    { question: "Bảo hành mấy tháng?", answer: "12 tháng", visible: true },
    { question: "Kịch bản tư vấn", answer: "Dạ Anh/Chị yên tâm ạ...", visible: false },
  ],
  videos: [],
  visible_sections: ["diem_noi_bat", "thong_so", "faq"],
  is_published: true,
  images: [],
  updated_at: null,
  display_name: "",
  product_name: "Bồn ngâm chân Delax",
};

/** Xem chú thích ở product-content-form.test.tsx: mỗi lần gọi phải là Response MỚI. */
function mockFetch(profile: object = PROFILE) {
  return vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(profile), { status: 200 })),
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

async function openPreview() {
  await userEvent.click(await screen.findByRole("button", { name: /Xem trước/ }));
  return screen.getByRole("dialog");
}

beforeEach(() => {
  setAccessToken("test-access-token");
});

afterEach(() => {
  vi.restoreAllMocks();
  clearAuthTokens();
});

it("mở xem trước dựng lại trang public bằng nội dung hiện có", async () => {
  vi.stubGlobal("fetch", mockFetch());
  renderForm();

  const dialog = await openPreview();

  expect(within(dialog).getByRole("heading", { name: "Bồn ngâm chân Delax" })).toBeInTheDocument();
  expect(within(dialog).getByText("Bồn ngâm chân cao cấp")).toBeInTheDocument();
  expect(within(dialog).getByText("24 bi lăn massage 3D")).toBeInTheDocument();
  expect(within(dialog).getByText("Công suất")).toBeInTheDocument();
});

it("xem trước KHÔNG gọi API trang public và không cộng lượt quét", async () => {
  const fetchMock = mockFetch();
  vi.stubGlobal("fetch", fetchMock);
  renderForm();

  await openPreview();

  // Cả `/api/warranty-portal/product-page/...` lẫn bất kỳ request nào khác:
  // xem trước chỉ được dựng từ state cục bộ. Một request tới endpoint trang
  // public là cộng một lượt quét thật vào mã bảo hành, hiển thị công khai
  // cho khách — đó chính là lý do nút này từng bị khoá.
  const urls = fetchMock.mock.calls.map(([url]) => String(url));
  expect(urls.filter((url) => url.includes("warranty-portal"))).toEqual([]);
});

it("tắt một khối thì khối đó biến khỏi xem trước ngay, chưa cần bấm Lưu", async () => {
  const fetchMock = mockFetch();
  vi.stubGlobal("fetch", fetchMock);
  renderForm();

  await screen.findByText(/Thông số kỹ thuật/);
  await userEvent.click(screen.getByRole("checkbox", { name: /Hiện khối Thông số/ }));

  const dialog = await openPreview();

  expect(within(dialog).queryByText("Công suất")).not.toBeInTheDocument();
  expect(within(dialog).getByText("24 bi lăn massage 3D")).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit)?.method === "PUT")).toBe(
    false,
  );
});

it("khối FAQ bật vẫn chỉ hiện những câu đã bật riêng từng dòng", async () => {
  vi.stubGlobal("fetch", mockFetch());
  renderForm();

  const dialog = await openPreview();

  expect(within(dialog).getByText("Bảo hành mấy tháng?")).toBeInTheDocument();
  expect(within(dialog).queryByText("Kịch bản tư vấn")).not.toBeInTheDocument();
});

it("trang đang ẩn thì xem trước cảnh báo và chỉ còn tên sản phẩm", async () => {
  vi.stubGlobal("fetch", mockFetch({ ...PROFILE, is_published: false }));
  renderForm();

  const dialog = await openPreview();

  expect(within(dialog).getByText(/Trang đang/)).toBeInTheDocument();
  expect(within(dialog).getByRole("heading", { name: "Bồn ngâm chân Delax" })).toBeInTheDocument();
  expect(within(dialog).queryByText("24 bi lăn massage 3D")).not.toBeInTheDocument();
  expect(within(dialog).queryByText("Bồn ngâm chân cao cấp")).not.toBeInTheDocument();
});

it("khối kích hoạt bảo hành trong xem trước bị khoá tương tác", async () => {
  vi.stubGlobal("fetch", mockFetch());
  renderForm();

  const dialog = await openPreview();

  // jsdom KHÔNG thực thi ngữ nghĩa `inert` (không chặn click/focus như trình
  // duyệt), nên chỉ khẳng định được thuộc tính có mặt đúng chỗ. Ý nghĩa: một cú
  // bấm nhầm ở màn xem trước không được kích hoạt bảo hành thật cho mã mẫu.
  const form = within(dialog).getByRole("button", { name: /Kích hoạt bảo hành/ });
  expect(form.closest("[inert]")).not.toBeNull();
});

it("gõ tên riêng thì tiêu đề xem trước đổi ngay, chưa cần Lưu", async () => {
  vi.stubGlobal("fetch", mockFetch());
  renderForm();

  const input = await screen.findByLabelText(/Tên hiển thị trên trang public/);
  await userEvent.clear(input);
  await userEvent.type(input, "Delax DX-2000");

  const dialog = await openPreview();

  expect(within(dialog).getByRole("heading", { name: "Delax DX-2000" })).toBeInTheDocument();
  expect(
    within(dialog).queryByRole("heading", { name: "Bồn ngâm chân Delax" }),
  ).not.toBeInTheDocument();
});

it("để trống tên riêng thì xem trước dùng tên trong kho", async () => {
  vi.stubGlobal("fetch", mockFetch({ ...PROFILE, display_name: "" }));
  renderForm();

  const dialog = await openPreview();

  expect(within(dialog).getByRole("heading", { name: "Bồn ngâm chân Delax" })).toBeInTheDocument();
});

it("BE cũ chưa có display_name thì không vỡ, coi như để trống", async () => {
  // Cửa sổ deploy: FE mới có thể chạy trước khi BE có field. `undefined` lọt
  // vào state là mọi chỗ `.trim()` nổ và trắng cả trang.
  const { display_name: _omit, ...withoutField } = PROFILE;
  vi.stubGlobal("fetch", mockFetch(withoutField));
  renderForm();

  const dialog = await openPreview();

  expect(within(dialog).getByRole("heading", { name: "Bồn ngâm chân Delax" })).toBeInTheDocument();
});

it("user chỉ có products:view vẫn xem trước được", async () => {
  vi.stubGlobal("fetch", mockFetch());
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProductContentForm productId={1} canEdit={false} />
    </QueryClientProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: /Xem trước/ })).toBeEnabled());
});
