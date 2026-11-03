import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AddressLookupPage from "@/features/address-lookup/pages/AddressLookupPage";
import { lookupAddress, type AddressLookupResult } from "@/lib/api/orders";

vi.mock("@/lib/api/orders", () => ({ lookupAddress: vi.fn() }));

const SAMPLE: AddressLookupResult = {
  raw_address: "5 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội",
  level3: {
    address: "5 Chùa Láng, Phường Láng Thượng, Quận Đống Đa, Thành phố Hà Nội",
    street: "5 Chùa Láng",
    ward: "Phường Láng Thượng",
    district: "Quận Đống Đa",
    province: "Thành phố Hà Nội",
    ward_code: "00187",
    district_code: "006",
    province_code: "01",
  },
  level2: {
    address: "5 Chùa Láng, Phường Láng, Thành phố Hà Nội",
    street: "5 Chùa Láng",
    ward: "Phường Láng",
    province: "Thành phố Hà Nội",
    ward_code: "00199",
    province_code: "01",
    source: "converted",
  },
};

describe("AddressLookupPage", () => {
  afterEach(() => {
    cleanup();
    vi.mocked(lookupAddress).mockReset();
  });

  it("nút Tra cứu disabled khi chưa nhập", () => {
    render(<AddressLookupPage />);
    expect(screen.getByRole("button", { name: /tra cứu/i })).toBeDisabled();
  });

  it("Enter gửi địa chỉ đã trim và hiện cả 2 khối kết quả", async () => {
    vi.mocked(lookupAddress).mockResolvedValue(SAMPLE);
    render(<AddressLookupPage />);

    const input = screen.getByLabelText("Địa chỉ thô");
    fireEvent.change(input, { target: { value: "  5 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByText(SAMPLE.level2.address)).toBeTruthy());
    expect(lookupAddress).toHaveBeenCalledWith("5 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội");
    expect(screen.getByText(SAMPLE.level3.address)).toBeTruthy();
    expect(screen.getByText("Quận Đống Đa")).toBeTruthy();
    expect(screen.getByText("Phường Láng")).toBeTruthy();
    expect(screen.getByText(/Quy đổi từ địa chỉ 3 cấp/)).toBeTruthy();
  });

  it("không nhận ra địa chỉ → báo rõ thay vì ô trống", async () => {
    vi.mocked(lookupAddress).mockResolvedValue({
      raw_address: "abc",
      level3: { ...SAMPLE.level3, address: "", street: "", ward: "", district: "", province: "" },
      level2: { ...SAMPLE.level2, address: "", street: "", ward: "", province: "", source: "" },
    });
    render(<AddressLookupPage />);
    fireEvent.change(screen.getByLabelText("Địa chỉ thô"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /tra cứu/i }));

    await waitFor(() => expect(screen.getAllByText("Không nhận ra địa chỉ")).toHaveLength(2));
  });

  it("API lỗi → hiện thông báo lỗi", async () => {
    vi.mocked(lookupAddress).mockRejectedValue(new Error("Mất kết nối"));
    render(<AddressLookupPage />);
    fireEvent.change(screen.getByLabelText("Địa chỉ thô"), { target: { value: "Hà Nội" } });
    fireEvent.click(screen.getByRole("button", { name: /tra cứu/i }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Mất kết nối"));
  });
});
