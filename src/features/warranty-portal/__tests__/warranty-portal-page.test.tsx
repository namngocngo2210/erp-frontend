import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { activate, track } = vi.hoisted(() => ({ activate: vi.fn(), track: vi.fn() }));
vi.mock("@/features/warranty-portal/portal-api", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  activate,
  track,
}));

vi.mock("@/features/warranty-portal/components/PortalScanButton", () => ({
  PortalScanButton: () => null,
}));

import WarrantyPortalPage from "@/features/warranty-portal/pages/WarrantyPortalPage";

/** Đặt URL trước khi render — tab mở sẵn đọc từ `window.location.search`. */
function enterAt(search: string) {
  window.history.replaceState(null, "", `/bao-hanh${search}`);
}

beforeEach(() => {
  enterAt("");
});

afterEach(() => {
  cleanup();
  activate.mockReset();
  track.mockReset();
  vi.restoreAllMocks();
});

function openActivateTab() {
  fireEvent.click(screen.getByRole("tab", { name: /Bảo hành/i }));
}

function activateCode(code: string) {
  fireEvent.change(screen.getByLabelText(/Mã bảo hành/i), { target: { value: code } });
  fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: "0901234567" } });
  fireEvent.click(screen.getByRole("button", { name: /Kích hoạt/i }));
}

function trackCode(code: string) {
  fireEvent.change(screen.getByLabelText(/Mã vận đơn/i), { target: { value: code } });
  fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: "0901234567" } });
  fireEvent.click(screen.getByRole("button", { name: /Tra cứu vận đơn/i }));
}

const activateResponse = {
  warranty: { serial: "DX-000001", product_sku: "BNC02", days_left: 700 },
};

const trackResponse = {
  order: {
    order_code: "DH001",
    invoice_code: "HD0001",
    shipping_code: "SC00001",
    created_at: "2026-08-01T03:00:00Z",
    status: 2,
    status_label: "Đang giao hàng",
    customer_name: "Nguyễn Văn A",
    phone: "0901234567",
    province: "Hà Nội",
    items: [{ sku: "BNC02", name: "Bồn ngâm chân", quantity: 1 }],
  },
  journey: {
    results: [{ at: "2026-08-02T00:00:00Z", label: "Đang giao hàng", group: "delivering" }],
    source: "best",
  },
};

describe("WarrantyPortalPage - tab mở sẵn theo lối vào", () => {
  it("vào thẳng /bao-hanh (khách từ web) thì mở tab Vận đơn", () => {
    render(<WarrantyPortalPage />);
    expect(screen.getByLabelText(/Mã vận đơn/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Mã bảo hành/i)).toBeNull();
  });

  it("link Zalo OA ?tab=kich-hoat thì mở tab Bảo hành", () => {
    enterAt("?tab=kich-hoat");
    render(<WarrantyPortalPage />);
    expect(screen.getByLabelText(/Mã bảo hành/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Mã vận đơn/i)).toBeNull();
  });

  it("query lạ thì vẫn về tab Vận đơn, không vỡ trang", () => {
    enterAt("?tab=linh-tinh");
    render(<WarrantyPortalPage />);
    expect(screen.getByLabelText(/Mã vận đơn/i)).toBeTruthy();
  });

  it("bấm đổi tab thì ghi lại vào URL để F5 giữ nguyên tab", () => {
    render(<WarrantyPortalPage />);
    openActivateTab();
    expect(window.location.search).toBe("?tab=kich-hoat");

    fireEvent.click(screen.getByRole("tab", { name: /Vận đơn/i }));
    expect(window.location.search).toBe("?tab=van-don");
  });

  it("giữ nguyên các query khác (utm) khi ghi tab vào URL", () => {
    enterAt("?utm_source=zalo");
    render(<WarrantyPortalPage />);
    openActivateTab();
    expect(window.location.search).toContain("utm_source=zalo");
    expect(window.location.search).toContain("tab=kich-hoat");
  });
});

describe("WarrantyPortalPage - chuyển tab (2 tab)", () => {
  it("chuyển sang tab Bảo hành thì ẩn form tra cứu, hiện form kích hoạt", () => {
    render(<WarrantyPortalPage />);
    openActivateTab();
    expect(screen.queryByLabelText(/Mã vận đơn/i)).toBeNull();
    expect(screen.getByLabelText(/Mã bảo hành/i)).toBeTruthy();
  });

  it("xoá thẻ bảo hành đã kích hoạt khi chuyển sang tab Vận đơn rồi quay lại", async () => {
    activate.mockResolvedValue(activateResponse);
    enterAt("?tab=kich-hoat");
    render(<WarrantyPortalPage />);

    activateCode("ABC1234567");
    await waitFor(() => expect(screen.getByText("DX-000001")).toBeTruthy());

    fireEvent.click(screen.getByRole("tab", { name: /Vận đơn/i }));
    openActivateTab();

    expect(screen.queryByText("DX-000001")).toBeNull();
    expect(screen.getByLabelText(/Mã bảo hành/i)).toBeTruthy();
  });

  it("nhập lỗi ở tab Vận đơn rồi quay lại thì lỗi biến mất", async () => {
    render(<WarrantyPortalPage />);
    fireEvent.click(screen.getByRole("button", { name: /Tra cứu vận đơn/i }));
    expect(await screen.findByText(/Vui lòng nhập mã vận đơn/i)).toBeTruthy();

    openActivateTab();
    fireEvent.click(screen.getByRole("tab", { name: /Vận đơn/i }));
    expect(screen.queryByText(/Vui lòng nhập mã vận đơn/i)).toBeNull();
  });
});

describe("WarrantyPortalPage - kết quả hiển thị cạnh form", () => {
  it("giữ form kích hoạt hiển thị cùng thẻ bảo hành sau khi kích hoạt", async () => {
    activate.mockResolvedValue(activateResponse);
    enterAt("?tab=kich-hoat");
    render(<WarrantyPortalPage />);

    activateCode("ABC1234567");
    expect(await screen.findByText("DX-000001")).toBeTruthy();
    expect(screen.getByLabelText(/Mã bảo hành/i)).toBeTruthy();
  });

  it("hiện tóm tắt đơn + timeline cạnh form tra cứu vận đơn", async () => {
    track.mockResolvedValue(trackResponse);
    render(<WarrantyPortalPage />);

    trackCode("SC00001");
    expect(await screen.findByText("DH001")).toBeTruthy();
    expect(screen.getByText("Hành trình đơn hàng")).toBeTruthy();
    expect(screen.getByLabelText(/Mã vận đơn/i)).toBeTruthy();
  });

  it("xoá kết quả vận đơn khi chuyển sang tab Bảo hành rồi quay lại", async () => {
    track.mockResolvedValue(trackResponse);
    render(<WarrantyPortalPage />);

    trackCode("SC00001");
    expect(await screen.findByText("DH001")).toBeTruthy();

    openActivateTab();
    fireEvent.click(screen.getByRole("tab", { name: /Vận đơn/i }));

    expect(screen.queryByText("DH001")).toBeNull();
  });
});

describe("WarrantyPortalPage - cuộn tới kết quả trên mobile", () => {
  /** `matches` mặc định là false ở src/test/setup.ts → coi như mobile. */
  function stubDesktop(isDesktop: boolean) {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("min-width") ? isDesktop : false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }) as MediaQueryList,
    );
  }

  it("cuộn tới khối kết quả sau khi tra cứu thành công trên mobile", async () => {
    stubDesktop(false);
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    track.mockResolvedValue(trackResponse);
    render(<WarrantyPortalPage />);

    trackCode("SC00001");
    await screen.findByText("DH001");
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
  });

  it("không cuộn trên desktop vì kết quả đã nằm ngay cạnh form", async () => {
    stubDesktop(true);
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    track.mockResolvedValue(trackResponse);
    render(<WarrantyPortalPage />);

    trackCode("SC00001");
    await screen.findByText("DH001");
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("không cuộn khi tra cứu lỗi (chưa có kết quả)", async () => {
    stubDesktop(false);
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    track.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    render(<WarrantyPortalPage />);

    trackCode("SC00001");
    await screen.findByText(/Không tìm thấy đơn hàng/i);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("WarrantyPortalPage - tra bằng SĐT ra nhiều đơn", () => {
  const secondOrder = {
    ...trackResponse.order,
    order_code: "DH002",
    shipping_code: "SC00002",
    invoice_code: "",
  };
  const listResponse = {
    orders: [trackResponse.order, secondOrder],
    truncated: false,
  };

  /** Chỉ điền ô SĐT — nhánh tra cứu một trường của bản sửa đổi 24/08. */
  function trackByPhone() {
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), {
      target: { value: "0901234567" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Tra cứu vận đơn/i }));
  }

  it("hiện danh sách đơn để chọn, chưa hiện hành trình", async () => {
    track.mockResolvedValue(listResponse);
    render(<WarrantyPortalPage />);

    trackByPhone();

    expect(await screen.findByText("Tìm thấy 2 đơn hàng")).toBeTruthy();
    expect(screen.getByRole("button", { name: /DH001/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /DH002/ })).toBeTruthy();
    expect(screen.queryByText("Hành trình đơn hàng")).toBeNull();
  });

  it("báo danh sách bị cắt bớt khi backend trả truncated", async () => {
    track.mockResolvedValue({ ...listResponse, truncated: true });
    render(<WarrantyPortalPage />);

    trackByPhone();

    expect(await screen.findByText(/Chỉ hiển thị các đơn gần đây nhất/i)).toBeTruthy();
  });

  it("chọn một đơn thì gọi lại API kèm mã đơn và hiện hành trình", async () => {
    track.mockResolvedValueOnce(listResponse).mockResolvedValueOnce(trackResponse);
    render(<WarrantyPortalPage />);

    trackByPhone();
    fireEvent.click(await screen.findByRole("button", { name: /DH002/ }));

    await waitFor(() =>
      expect(track).toHaveBeenLastCalledWith({
        order_code: "DH002",
        shipping_code: "SC00002",
        phone: "0901234567",
      }),
    );
    expect(await screen.findByText("Hành trình đơn hàng")).toBeTruthy();
  });

  it("quay lại danh sách sau khi xem một đơn mà không phải gõ lại SĐT", async () => {
    track.mockResolvedValueOnce(listResponse).mockResolvedValueOnce(trackResponse);
    render(<WarrantyPortalPage />);

    trackByPhone();
    fireEvent.click(await screen.findByRole("button", { name: /DH002/ }));
    await screen.findByText("Hành trình đơn hàng");

    fireEvent.click(screen.getByRole("button", { name: /Chọn đơn khác/i }));

    expect(await screen.findByText("Tìm thấy 2 đơn hàng")).toBeTruthy();
    expect(track).toHaveBeenCalledTimes(2);
  });

  it("hiện lỗi khi tải hành trình của đơn đã chọn thất bại", async () => {
    track
      .mockResolvedValueOnce(listResponse)
      .mockRejectedValueOnce(Object.assign(new Error("too many"), { status: 429 }));
    render(<WarrantyPortalPage />);

    trackByPhone();
    fireEvent.click(await screen.findByRole("button", { name: /DH002/ }));

    expect(await screen.findByText(/thử quá nhiều lần/i)).toBeTruthy();
    expect(screen.getByText("Tìm thấy 2 đơn hàng")).toBeTruthy();
  });
});
