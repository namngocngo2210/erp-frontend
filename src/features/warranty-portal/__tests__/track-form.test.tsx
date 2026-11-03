import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/features/warranty-portal/portal-api", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  track,
}));

import { TrackForm } from "@/features/warranty-portal/components/TrackForm";

const onResult = vi.fn();

afterEach(() => {
  cleanup();
  track.mockReset();
  onResult.mockReset();
});

function renderForm() {
  render(<TrackForm onResult={onResult} />);
}

function fillAndSubmit(shippingCode: string, phone: string) {
  fireEvent.change(screen.getByLabelText(/Mã vận đơn/i), { target: { value: shippingCode } });
  fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: phone } });
  fireEvent.click(screen.getByRole("button", { name: /Tra cứu vận đơn/i }));
}

const trackResponse = {
  order: {
    order_code: "DH001",
    shipping_code: "SC00001",
    created_at: "2026-08-01T03:00:00Z",
    status: 2,
    status_label: "Đang giao hàng",
    province: "Hà Nội",
    items: [{ sku: "BNC02", name: "Bồn ngâm chân", quantity: 1 }],
  },
  journey: {
    results: [{ at: "2026-08-02T00:00:00Z", label: "Đang giao hàng", group: "delivering" }],
    source: "best",
  },
};

describe("TrackForm", () => {
  it("hiện tiêu đề Tra cứu vận đơn và dòng hướng dẫn CSKH theo SĐT", () => {
    renderForm();
    expect(screen.getByRole("heading", { name: "Tra cứu vận đơn" })).toBeTruthy();
    expect(
      screen.getByText(
        "Vui lòng nhập đúng số điện thoại để tra cứu, Delax cũng sẽ hỗ trợ chăm sóc khách hàng trọn đời theo số điện thoại đăng ký của quý khách.",
      ),
    ).toBeTruthy();
  });

  it("báo lỗi khi số điện thoại sai định dạng, không gọi API", async () => {
    renderForm();
    fillAndSubmit("sc00001", "123");
    expect(await screen.findByText(/Số điện thoại không hợp lệ/i)).toBeTruthy();
    expect(track).not.toHaveBeenCalled();
  });

  it("báo lỗi khi bỏ trống CẢ HAI ô", async () => {
    renderForm();
    fillAndSubmit("", "");
    expect(await screen.findByText(/Vui lòng nhập mã vận đơn hoặc số điện thoại/i)).toBeTruthy();
    expect(track).not.toHaveBeenCalled();
  });

  it("chỉ nhập mã vận đơn cũng tra được (SĐT rỗng)", async () => {
    track.mockResolvedValue(trackResponse);
    renderForm();
    fillAndSubmit("sc00001", "");
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith({ shipping_code: "SC00001", phone: "" }),
    );
  });

  it("chỉ nhập số điện thoại cũng tra được (mã vận đơn rỗng)", async () => {
    track.mockResolvedValue({ orders: [trackResponse.order], truncated: false });
    renderForm();
    fillAndSubmit("", "0901234567");
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith({ shipping_code: "", phone: "0901234567" }),
    );
  });

  it("chuẩn hoá mã vận đơn (upper) và SĐT dạng +84 trước khi gọi API", async () => {
    track.mockResolvedValue(trackResponse);
    renderForm();
    fillAndSubmit("sc00001", "+84 901 234 567");
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith({ shipping_code: "SC00001", phone: "0901234567" }),
    );
  });

  it("đẩy kết quả lên trang qua onResult khi thành công", async () => {
    track.mockResolvedValue(trackResponse);
    renderForm();
    fillAndSubmit("SC00001", "0901234567");
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(trackResponse));
  });

  it("hiện thông báo không tìm thấy đơn và xoá kết quả cũ khi 404", async () => {
    const err = Object.assign(new Error("not found"), { status: 404 });
    track.mockRejectedValue(err);
    renderForm();
    fillAndSubmit("SC00001", "0901234567");
    expect(await screen.findByText(/Không tìm thấy đơn hàng/i)).toBeTruthy();
    expect(onResult).toHaveBeenCalledWith(null);
  });

  it("hiện thông báo thử lại sau khi 429", async () => {
    const err = Object.assign(new Error("too many"), { status: 429 });
    track.mockRejectedValue(err);
    renderForm();
    fillAndSubmit("SC00001", "0901234567");
    expect(await screen.findByText(/thử quá nhiều lần/i)).toBeTruthy();
  });
});
