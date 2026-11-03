import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { activate } = vi.hoisted(() => ({ activate: vi.fn() }));
vi.mock("@/features/warranty-portal/portal-api", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  activate,
}));

const { onDetectedHolder } = vi.hoisted(() => ({
  onDetectedHolder: { current: (_code: string) => {} },
}));
vi.mock("@/features/warranty-portal/components/PortalScanButton", () => ({
  PortalScanButton: ({ onDetected }: { onDetected: (code: string) => void }) => {
    onDetectedHolder.current = onDetected;
    return (
      <button type="button" aria-label="Quét mã trên tem">
        Quét
      </button>
    );
  },
}));

import { ActivateForm } from "@/features/warranty-portal/components/ActivateForm";

afterEach(() => {
  cleanup();
  activate.mockReset();
});

function renderForm(onSuccess = vi.fn()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <ActivateForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  );
  return onSuccess;
}

function fillAndSubmit(keyword: string, phone: string) {
  fireEvent.change(screen.getByLabelText(/Mã bảo hành/i), { target: { value: keyword } });
  fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: phone } });
  fireEvent.click(screen.getByRole("button", { name: /Kích hoạt/i }));
}

describe("ActivateForm", () => {
  it("có ô số điện thoại và dòng hướng dẫn đăng ký bảo hành theo SĐT", () => {
    renderForm();
    expect(screen.getByLabelText(/Số điện thoại/i)).toBeTruthy();
    expect(
      screen.getByText(
        "Vui lòng nhập đúng số điện thoại để được bảo hành, Delax sẽ bảo hành điện tử theo số điện thoại đăng ký của quý khách.",
      ),
    ).toBeTruthy();
  });

  it("báo lỗi khi mã ngắn hơn 6 ký tự, không gọi API", async () => {
    renderForm();
    fillAndSubmit("AB1", "0901234567");
    expect(await screen.findByText(/Vui lòng nhập mã/i)).toBeTruthy();
    expect(activate).not.toHaveBeenCalled();
  });

  it("báo lỗi khi số điện thoại sai định dạng, không gọi API", async () => {
    renderForm();
    fillAndSubmit("abc1234567", "123");
    expect(await screen.findByText(/Số điện thoại không hợp lệ/i)).toBeTruthy();
    expect(activate).not.toHaveBeenCalled();
  });

  it("gọi API với keyword và phone đã chuẩn hoá rồi báo thành công", async () => {
    activate.mockResolvedValue({ warranty: { serial: "DX-000001" } });
    const onSuccess = renderForm();
    fillAndSubmit("abc1234567", "+84 901 234 567");
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(activate).toHaveBeenCalledWith({ keyword: "ABC1234567", phone: "0901234567" });
  });

  it("quét QR điền mã vào ô nhập", () => {
    renderForm();
    act(() => onDetectedHolder.current("ABC1234567"));
    expect((screen.getByLabelText(/Mã bảo hành/i) as HTMLInputElement).value).toBe("ABC1234567");
  });

  it("hiện thông báo mã không hợp lệ khi 404", async () => {
    const err = Object.assign(new Error("not found"), { status: 404 });
    activate.mockRejectedValue(err);
    renderForm();
    fillAndSubmit("ABC1234567", "0901234567");
    expect(await screen.findByText(/Mã không hợp lệ/i)).toBeTruthy();
  });

  it("hiện thông báo thử lại sau khi 429", async () => {
    const err = Object.assign(new Error("too many"), { status: 429 });
    activate.mockRejectedValue(err);
    renderForm();
    fillAndSubmit("ABC1234567", "0901234567");
    expect(await screen.findByText(/thử quá nhiều lần/i)).toBeTruthy();
  });
});
