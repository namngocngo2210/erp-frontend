import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";

const mockCreateMutate = vi.fn();
const mockUpdateJourneyMutate = vi.fn();

vi.mock("@/features/warranty-claims/queries", () => ({
  useBestAccounts: () => ({
    data: [{ id: 1, name: "acc", environment: "production", is_active: true }],
  }),
  useCreateBestShipment: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateJourney: () => ({ mutate: mockUpdateJourneyMutate, isPending: false }),
}));

const mockParseAddress = vi.fn();

vi.mock("@/lib/api/orders", () => ({
  parseAddress: (raw: string) => mockParseAddress(raw),
}));

import { BestCreateOrderButton } from "./BestCreateOrderButton";

const journey = {
  id: 21,
  seq: 2,
  receiver_name: "Khách A",
  receiver_phone: "0900000001",
  receiver_raw_address: "12 Lê Lợi, Hà Nội",
  product_sku: "SKU-1",
  product_name: "Máy X",
  declared_value: "150000.00",
  cod_amount: "50000.00",
  resolution_declared_value: "0.00",
  resolution_cod: "0.00",
} as unknown as WarrantyJourney;

describe("BestCreateOrderButton + Dialog", () => {
  beforeEach(() => {
    mockCreateMutate.mockReset();
    mockUpdateJourneyMutate.mockReset();
    window.localStorage.clear();
    mockParseAddress.mockReset();
    mockParseAddress.mockResolvedValue({
      province: "Hà Nội",
      district: "Quận Hoàn Kiếm",
      ward: "Phường Tràng Tiền",
      address: "12 Lê Lợi, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội",
    });
  });
  afterEach(cleanup);

  it("ô đã có mã → KHÔNG hiện nút tạo đơn", () => {
    render(<BestCreateOrderButton journey={journey} leg="new" currentCode="GHN123" />);
    expect(screen.queryByRole("button", { name: /tạo đơn best/i })).not.toBeInTheDocument();
  });

  it("ô trống → mở dialog, submit gọi API đúng payload và PATCH đúng field mã", () => {
    render(<BestCreateOrderButton journey={journey} leg="recall" currentCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(thu hồi\)/i }));

    // Prefill chiều thu hồi: bên gửi = khách.
    expect(screen.getByLabelText("Tên", { selector: "#best-from-name" })).toHaveValue("Khách A");

    // Điền tối thiểu địa chỉ kho (bên nhận) rồi submit.
    fireEvent.change(document.querySelector("#best-to-name") as HTMLInputElement, {
      target: { value: "Kho Đại Mỗ" },
    });
    fireEvent.change(document.querySelector("#best-to-city") as HTMLInputElement, {
      target: { value: "Hà Nội" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn" }));

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    const [body, opts] = mockCreateMutate.mock.calls[0];
    expect(body.account_id).toBe(1);
    expect(body.payload.Code).toMatch(/^BHJ21R-/);
    expect(body.payload.SourceName).toBe("Khách A"); // thu hồi: source = khách
    expect(body.payload.DestName).toBe("Kho Đại Mỗ");
    expect(body.payload.JourneyType).toBe(2); // chặng thu hồi → đơn thu hồi

    // Thành công → PATCH code_best vào đúng field recall_code.
    opts.onSuccess({ code_best: "BEST-XYZ", merchant_order_code: body.payload.Code });
    const [vars] = mockUpdateJourneyMutate.mock.calls[0];
    expect(vars).toEqual({ id: 21, patch: { recall_code: "BEST-XYZ" } });
  });

  it("chỉ đóng dialog SAU khi PATCH mã xong, và báo mã cho form hành trình", () => {
    const onCreated = vi.fn();
    render(
      <BestCreateOrderButton journey={journey} leg="new" currentCode="" onCreated={onCreated} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(gửi đi\)/i }));
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn" }));

    const [, createOpts] = mockCreateMutate.mock.calls[0];
    createOpts.onSuccess({ code_best: "84859706027573", merchant_order_code: "BHJ21N-AAAA" });

    // PATCH đã bắn nhưng CHƯA xong → dialog phải còn sống, nếu không mutation
    // chết theo component và mã Best mất trắng.
    expect(onCreated).not.toHaveBeenCalled();
    expect(document.querySelector("#best-code")).toBeInTheDocument();

    // Gọi callback của React Query ngoài act() thì React không flush việc đóng
    // dialog trước lúc assert — bọc act() để kiểm được hành vi thật.
    const [, patchOpts] = mockUpdateJourneyMutate.mock.calls[0];
    act(() => patchOpts.onSuccess());
    expect(onCreated).toHaveBeenCalledWith("84859706027573");
    expect(document.querySelector("#best-code")).not.toBeInTheDocument();
  });

  it("PATCH mã thất bại → KHÔNG đóng dialog, không báo thành công", () => {
    const onCreated = vi.fn();
    render(
      <BestCreateOrderButton journey={journey} leg="new" currentCode="" onCreated={onCreated} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(gửi đi\)/i }));
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn" }));

    const [, createOpts] = mockCreateMutate.mock.calls[0];
    createOpts.onSuccess({ code_best: "84859706027573", merchant_order_code: "BHJ21N-AAAA" });
    // Bọc act() để assert "dialog VẪN mở" là thật, không phải pass giả do
    // React chưa kịp flush.
    const [, patchOpts] = mockUpdateJourneyMutate.mock.calls[0];
    act(() => patchOpts.onError(new Error("403")));

    expect(onCreated).not.toHaveBeenCalled();
    expect(document.querySelector("#best-code")).toBeInTheDocument();
  });

  it("Best không trả mã → không PATCH rỗng", () => {
    render(<BestCreateOrderButton journey={journey} leg="new" currentCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(gửi đi\)/i }));
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn" }));

    const [, createOpts] = mockCreateMutate.mock.calls[0];
    createOpts.onSuccess({ code_best: "", merchant_order_code: "" });

    expect(mockUpdateJourneyMutate).not.toHaveBeenCalled();
  });

  it("nhãn 2 khối địa chỉ đổi theo loại đơn", () => {
    render(<BestCreateOrderButton journey={journey} leg="recall" currentCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(thu hồi\)/i }));

    // Mặc định chặng thu hồi = JourneyType 2 → Người mua giao cho Shop.
    expect(screen.getByText("Người mua")).toBeInTheDocument();
    expect(screen.getByText("Shop")).toBeInTheDocument();
  });

  it("đổi select Loại đơn hàng → nhãn và nội dung 2 khối swap theo applyJourneyType", async () => {
    const user = userEvent.setup();
    render(<BestCreateOrderButton journey={journey} leg="new" currentCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(gửi đi\)/i }));

    // Mặc định chặng gửi đi = JourneyType 1 → Người gửi/Người nhận; kho (from)
    // chưa lưu địa chỉ nên rỗng, khách (to) đã prefill tên.
    expect(screen.getByText("Người gửi")).toBeInTheDocument();
    expect(screen.getByText("Người nhận")).toBeInTheDocument();
    expect(document.querySelector("#best-from-name")).toHaveValue("");
    expect(document.querySelector("#best-to-name")).toHaveValue("Khách A");

    // Chỉ 1 tài khoản Best active → chỉ có đúng 1 combobox trên form: select loại đơn.
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Thu hồi" }));

    // Shop đổi từ phía "from" sang "to" (JourneyType 1 → 2) → applyJourneyType
    // swap nội dung 2 khối, không chỉ đổi nhãn.
    expect(screen.getByText("Người mua")).toBeInTheDocument();
    expect(screen.getByText("Shop")).toBeInTheDocument();
    expect(document.querySelector("#best-from-name")).toHaveValue("Khách A");
    expect(document.querySelector("#best-to-name")).toHaveValue("");
  });

  it("mở dialog → tự parse địa chỉ khách vào đúng khối", async () => {
    render(<BestCreateOrderButton journey={journey} leg="new" currentCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(gửi đi\)/i }));

    expect(mockParseAddress).toHaveBeenCalledWith("12 Lê Lợi, Hà Nội");

    // Chặng gửi đi: khách là bên NHẬN.
    await waitFor(() => {
      expect(document.querySelector("#best-to-city")).toHaveValue("Hà Nội");
    });
    expect(document.querySelector("#best-to-district")).toHaveValue("Quận Hoàn Kiếm");
    expect(document.querySelector("#best-to-ward")).toHaveValue("Phường Tràng Tiền");
  });

  it("dán địa chỉ đầy đủ vào khối kho → blur là parse và điền 4 ô", async () => {
    render(<BestCreateOrderButton journey={journey} leg="new" currentCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(gửi đi\)/i }));

    const raw = document.querySelector("#best-from-raw") as HTMLInputElement;
    fireEvent.change(raw, { target: { value: "12 Lê Lợi, Hà Nội" } });
    fireEvent.blur(raw);

    await waitFor(() => {
      expect(document.querySelector("#best-from-city")).toHaveValue("Hà Nội");
    });
    expect(document.querySelector("#best-from-district")).toHaveValue("Quận Hoàn Kiếm");
  });

  it("parse lỗi → form vẫn dùng được, không văng", async () => {
    mockParseAddress.mockRejectedValue(new Error("403"));
    render(<BestCreateOrderButton journey={journey} leg="new" currentCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(gửi đi\)/i }));

    await waitFor(() => expect(mockParseAddress).toHaveBeenCalled());
    expect(document.querySelector("#best-to-name")).toHaveValue("Khách A");
  });

  it("nhập kích thước + bấm chip ghi chú → payload có Length/Height và Note", () => {
    render(<BestCreateOrderButton journey={journey} leg="new" currentCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(gửi đi\)/i }));

    fireEvent.change(document.querySelector("#best-length") as HTMLInputElement, {
      target: { value: "30" },
    });
    fireEvent.change(document.querySelector("#best-height") as HTMLInputElement, {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gọi điện cho khách trước khi giao" }));
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn" }));

    const [body] = mockCreateMutate.mock.calls[0];
    expect(body.payload.Length).toBe(30);
    expect(body.payload.Height).toBe(10);
    expect(body.payload.Width).toBeUndefined();
    expect(body.payload.Note).toBe("Gọi điện cho khách trước khi giao");
  });

  it("chặng gửi lại: PATCH mang cả mã, ĐVVC và ngày lên đơn", () => {
    render(<BestCreateOrderButton journey={journey} leg="return" currentCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(gửi lại khách\)/i }));
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn" }));

    const [, createOpts] = mockCreateMutate.mock.calls[0];
    createOpts.onSuccess({ code_best: "84859706027573", merchant_order_code: "BHJ21S-AAAA" });

    const [vars] = mockUpdateJourneyMutate.mock.calls[0];
    expect(vars.patch.return_tracking_code).toBe("84859706027573");
    expect(vars.patch.return_carrier).toBe("best");
    expect(vars.patch.return_order_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("chặng thu hồi: PATCH CHỈ mang mã, không đè ĐVVC/ngày của §4", () => {
    render(<BestCreateOrderButton journey={journey} leg="recall" currentCode="" />);
    fireEvent.click(screen.getByRole("button", { name: /tạo đơn best \(thu hồi\)/i }));
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn" }));

    const [, createOpts] = mockCreateMutate.mock.calls[0];
    createOpts.onSuccess({ code_best: "BEST-RC", merchant_order_code: "BHJ21R-AAAA" });

    const [vars] = mockUpdateJourneyMutate.mock.calls[0];
    expect(vars.patch).toEqual({ recall_code: "BEST-RC" });
  });
});
