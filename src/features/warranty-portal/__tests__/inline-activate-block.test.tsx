import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InlineActivateBlock } from "../components/product/InlineActivateBlock";

const WARRANTY = {
  serial: "DX-000123",
  code: "A8K2M4P9QX",
  product_sku: "BNC02",
  product_name: "Bồn ngâm chân",
  activated_at: "2026-08-10T09:00:00+07:00",
  expires_at: "2028-08-10",
  days_left: 730,
  months: 24,
};

afterEach(() => vi.restoreAllMocks());

describe("InlineActivateBlock", () => {
  it("hiện thẻ bảo hành khi mã đã kích hoạt", () => {
    render(<InlineActivateBlock code="A8K2M4P9QX" warranty={WARRANTY} />);

    expect(screen.getByText(/Thẻ bảo hành điện tử/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kích hoạt/ })).not.toBeInTheDocument();
  });

  it("hiện form và dòng hướng dẫn khi chưa kích hoạt", () => {
    render(<InlineActivateBlock code="A8K2M4P9QX" warranty={null} />);

    expect(screen.getByRole("button", { name: /Kích hoạt bảo hành/ })).toBeInTheDocument();
    expect(
      screen.getByText(/Delax sẽ bảo hành điện tử theo số điện thoại đăng ký/),
    ).toBeInTheDocument();
  });

  it("báo lỗi khi số điện thoại sai định dạng, không gọi API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<InlineActivateBlock code="A8K2M4P9QX" warranty={null} />);

    await userEvent.type(screen.getByLabelText(/Số điện thoại/), "123");
    await userEvent.click(screen.getByRole("button", { name: /Kích hoạt bảo hành/ }));

    expect(await screen.findByText(/Số điện thoại không hợp lệ/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("đổi sang thẻ bảo hành tại chỗ sau khi kích hoạt thành công", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ warranty: WARRANTY }), { status: 201 })),
    );
    render(<InlineActivateBlock code="A8K2M4P9QX" warranty={null} />);

    await userEvent.type(screen.getByLabelText(/Số điện thoại/), "0901234567");
    await userEvent.click(screen.getByRole("button", { name: /Kích hoạt bảo hành/ }));

    expect(await screen.findByText(/Thẻ bảo hành điện tử/)).toBeInTheDocument();
  });

  it("hiện thông báo lỗi khi API trả lỗi", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: "Mã không hợp lệ." }), { status: 404 }),
        ),
    );
    render(<InlineActivateBlock code="A8K2M4P9QX" warranty={null} />);

    await userEvent.type(screen.getByLabelText(/Số điện thoại/), "0901234567");
    await userEvent.click(screen.getByRole("button", { name: /Kích hoạt bảo hành/ }));

    expect(await screen.findByText(/Mã không hợp lệ/)).toBeInTheDocument();
  });

  it("báo lỗi bằng role alert để trình đọc màn hình tự động thông báo", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: "Mã không hợp lệ." }), { status: 404 }),
        ),
    );
    render(<InlineActivateBlock code="A8K2M4P9QX" warranty={null} />);

    await userEvent.type(screen.getByLabelText(/Số điện thoại/), "0901234567");
    await userEvent.click(screen.getByRole("button", { name: /Kích hoạt bảo hành/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Mã không hợp lệ/);
  });
});
