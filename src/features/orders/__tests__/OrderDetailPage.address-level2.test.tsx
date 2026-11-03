/**
 * Trang chi tiết đơn: khối Địa chỉ hiển thị CẢ địa chỉ 3 cấp (63 tỉnh) lẫn 2 cấp
 * (34 tỉnh, sau 01/07/2025); Khu vực/Phường xã Kiot giữ nguyên.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/orders", () => ({
  getCrmCatalogs: vi.fn(),
  getOrder: vi.fn(),
  getOrderJourneyEvents: vi.fn(),
  getKiotVietLocationData: vi.fn(),
  listKshipSenderAddresses: vi.fn(),
  parseAddress: vi.fn(),
  parseAddressLevel2: vi.fn(),
}));

vi.mock("@/lib/api/callcenter", () => ({
  fetchOrderCallRecords: vi.fn(),
}));

import {
  getCrmCatalogs,
  getKiotVietLocationData,
  getOrderJourneyEvents,
  parseAddress,
  parseAddressLevel2,
} from "@/lib/api/orders";
import { fetchOrderCallRecords } from "@/lib/api/callcenter";
import { I18nProvider } from "@/i18n";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import type { OrderRow } from "@/features/orders/order-types";

const ORDER = {
  id: 42,
  name: "Nguyễn Văn A",
  phone: "0900000001",
  status: 2,
  total_amount: "200000",
  vat: "no",
  can_edit: true,
  crm: { sales_status_code: "closed" },
  raw_address: "Số 5 ngõ 12 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội",
  address: "Số 5 Ngõ 12 Chùa Láng, Phường Láng Thượng, Quận Đống Đa, Thành phố Hà Nội",
  address_level2: "Số 5 Ngõ 12 Chùa Láng, Phường Láng, Thành phố Hà Nội",
  ward_level2: "Phường Láng",
  province_level2: "Thành phố Hà Nội",
  kiotviet_location: "Thành phố Hà Nội",
  kiotviet_ward: "Phường Láng",
} as unknown as OrderRow;

afterEach(() => cleanup());

beforeEach(() => {
  vi.mocked(getCrmCatalogs).mockReset().mockResolvedValue({ sales_status_options: [] });
  vi.mocked(getOrderJourneyEvents).mockReset().mockResolvedValue([]);
  vi.mocked(fetchOrderCallRecords).mockReset().mockResolvedValue({ items: [] });
  vi.mocked(getKiotVietLocationData).mockReset().mockResolvedValue({});
  vi.mocked(parseAddress).mockReset();
  vi.mocked(parseAddressLevel2).mockReset();
});

function renderPage(order: OrderRow) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <OrderDetailPage orderId={42} order={order} onBack={vi.fn()} onPatch={vi.fn()} />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe("OrderDetailPage — địa chỉ 2 cấp + 3 cấp", () => {
  it("hiển thị cả hai địa chỉ và Khu vực/Phường xã theo cấu trúc mới", async () => {
    renderPage(ORDER);

    expect(await screen.findByText("Địa chỉ 3 cấp")).toBeInTheDocument();
    expect(screen.getByText("Địa chỉ 2 cấp")).toBeInTheDocument();
    expect(screen.getByText(ORDER.address as string)).toBeInTheDocument();
    expect(screen.getByText(ORDER.address_level2 as string)).toBeInTheDocument();
    expect(screen.getByText("Khu vực")).toBeInTheDocument();
    expect(screen.getByText("Phường/Xã")).toBeInTheDocument();
  });

  it("nút icon Quy đổi 2 cấp parse lại từ Địa chỉ thô và điền vào form, chờ bấm Lưu", async () => {
    // Đơn tạo trước deploy: trống 2 cấp, Khu vực còn dạng cũ "Tỉnh - Quận".
    const legacy = {
      ...ORDER,
      address_level2: "",
      ward_level2: "",
      province_level2: "",
      kiotviet_location: "Hà Nội - Quận Đống Đa",
      kiotviet_ward: "Phường Láng Thượng",
    } as unknown as OrderRow;
    vi.mocked(parseAddress).mockResolvedValue({
      address: legacy.address,
      kiotviet_location: "Thành phố Hà Nội",
      kiotviet_ward: "Phường Láng",
      address_level2: "Số 5 Ngõ 12 Chùa Láng, Phường Láng, Thành phố Hà Nội",
      ward_level2: "Phường Láng",
      province_level2: "Thành phố Hà Nội",
    });
    renderPage(legacy);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Quy đổi 2 cấp" }));

    expect(parseAddress).toHaveBeenCalledWith(legacy.raw_address);
    await waitFor(() =>
      expect(
        screen.getByText("Số 5 Ngõ 12 Chùa Láng, Phường Láng, Thành phố Hà Nội"),
      ).toBeInTheDocument(),
    );
    // Khu vực/Phường xã Kiot cũng chuyển sang cấu trúc mới, chờ sale bấm Lưu.
    expect(screen.getByText("Thành phố Hà Nội")).toBeInTheDocument();
    expect(screen.getByText("Phường Láng")).toBeInTheDocument();
  });

  it("Địa chỉ 3 cấp chỉ đọc, Địa chỉ 2 cấp sửa được", async () => {
    renderPage(ORDER);
    const user = userEvent.setup();

    // 3 cấp: không còn ô bấm-để-sửa.
    await user.click(await screen.findByText(ORDER.address as string));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    // 2 cấp: bấm vào là mở input.
    await user.click(screen.getByText(ORDER.address_level2 as string));
    expect(screen.getByRole("textbox")).toHaveValue(ORDER.address_level2);
  });

  it("sửa Địa chỉ 2 cấp → tự chỉnh Khu vực/Phường xã theo tỉnh mới + phường mới, chờ Lưu", async () => {
    vi.mocked(parseAddressLevel2).mockResolvedValue({
      address_level2: "Thôn 3, xã Ea Kly, Tỉnh Đắk Lắk",
      ward_level2: "Xã Ea Kly",
      province_level2: "Tỉnh Đắk Lắk",
      ward_code_level2: "40",
      province_code_level2: "66",
      kiotviet_location: "Tỉnh Đắk Lắk",
      kiotviet_ward: "Xã Ea Kly",
    });
    renderPage(ORDER);
    const user = userEvent.setup();

    await user.click(await screen.findByText(ORDER.address_level2 as string));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Thôn 3, xã Ea Kly, Tỉnh Đắk Lắk{Enter}");

    expect(parseAddressLevel2).toHaveBeenCalledWith("Thôn 3, xã Ea Kly, Tỉnh Đắk Lắk");
    await waitFor(() => expect(screen.getByText("Tỉnh Đắk Lắk")).toBeInTheDocument());
    expect(screen.getByText("Xã Ea Kly")).toBeInTheDocument();
    // Không đụng địa chỉ thô / 3 cấp.
    expect(screen.getByText(ORDER.address as string)).toBeInTheDocument();
    expect(parseAddress).not.toHaveBeenCalled();
  });

  it("sửa Địa chỉ 2 cấp không tra được Kiot → giữ Khu vực/Phường xã cũ", async () => {
    vi.mocked(parseAddressLevel2).mockResolvedValue({
      address_level2: "abc xyz",
      ward_level2: "",
      province_level2: "",
      ward_code_level2: "",
      province_code_level2: "",
      kiotviet_location: "",
      kiotviet_ward: "",
    });
    renderPage(ORDER);
    const user = userEvent.setup();

    await user.click(await screen.findByText(ORDER.address_level2 as string));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "abc xyz{Enter}");

    await waitFor(() => expect(parseAddressLevel2).toHaveBeenCalledWith("abc xyz"));
    expect(await screen.findByText("abc xyz")).toBeInTheDocument();
    expect(screen.getByText("Thành phố Hà Nội")).toBeInTheDocument();
    expect(screen.getByText("Phường Láng")).toBeInTheDocument();
  });

  it("ẩn nút Quy đổi 2 cấp khi đơn chưa có Địa chỉ thô", async () => {
    renderPage({ ...ORDER, raw_address: "" } as unknown as OrderRow);
    expect(await screen.findByText("Địa chỉ 2 cấp")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quy đổi 2 cấp" })).not.toBeInTheDocument();
  });
});
