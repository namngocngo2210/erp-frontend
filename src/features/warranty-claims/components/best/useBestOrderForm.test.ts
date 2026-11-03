import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";

const mockCreateMutate = vi.fn();
const mockUpdateJourneyMutate = vi.fn();
const mockUseBestAccounts = vi.fn();

vi.mock("@/features/warranty-claims/queries", () => ({
  // Ký lại tham số `enabled` để test được đúng finding 4 (gọi API tài khoản
  // Best chỉ khi form đang sống) — không thể quan sát qua react-query thật vì
  // ta mock hẳn module, nên phải tự spy tham số truyền vào.
  useBestAccounts: (enabled: boolean) => mockUseBestAccounts(enabled),
  useCreateBestShipment: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateJourney: () => ({ mutate: mockUpdateJourneyMutate, isPending: false }),
}));

import { useBestOrderForm } from "./useBestOrderForm";

const journey = {
  id: 21,
  seq: 2,
  receiver_name: "Khách A",
  receiver_phone: "0900000001",
  // Rỗng để bỏ qua nhánh auto-parse địa chỉ (đã có test riêng ở
  // BestCreateOrderDialog.test.tsx) — hook test này chỉ quan tâm findings 4-7.
  receiver_raw_address: "",
  product_sku: "SKU-1",
  product_name: "Máy X",
  declared_value: "150000.00",
  cod_amount: "50000.00",
  resolution_declared_value: "200000.00",
  resolution_cod: "0.00",
} as unknown as WarrantyJourney;

describe("useBestOrderForm", () => {
  beforeEach(() => {
    mockCreateMutate.mockReset();
    mockUpdateJourneyMutate.mockReset();
    mockUseBestAccounts.mockReset();
    mockUseBestAccounts.mockReturnValue({
      data: [{ id: 1, name: "acc", environment: "production", is_active: true }],
    });
    window.localStorage.clear();
  });

  it("active=false → form null, submit không gọi createBestShipment", () => {
    const onCreated = vi.fn();
    const { result } = renderHook(() =>
      useBestOrderForm({ journey, leg: "new", active: false, onCreated }),
    );

    expect(result.current.form).toBeNull();
    act(() => result.current.submit());
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it("submit → tạo vận đơn, PATCH mang đủ 3 field cho chặng return rồi mới gọi onCreated với patch vừa gửi", () => {
    const onCreated = vi.fn();
    const { result } = renderHook(() =>
      useBestOrderForm({ journey, leg: "return", active: true, onCreated }),
    );

    act(() => result.current.submit());
    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    const [body, createOpts] = mockCreateMutate.mock.calls[0];
    expect(body.payload.JourneyType).toBe(1);

    act(() =>
      createOpts.onSuccess({ code_best: "BEST-1", merchant_order_code: body.payload.Code }),
    );

    expect(mockUpdateJourneyMutate).toHaveBeenCalledTimes(1);
    const [patchArgs, patchOpts] = mockUpdateJourneyMutate.mock.calls[0];
    expect(patchArgs).toEqual({
      id: journey.id,
      patch: {
        return_tracking_code: "BEST-1",
        return_carrier: "best",
        return_order_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      },
    });

    // [finding 7] onCreated nhận lại CHÍNH patch vừa PATCH — nơi gọi không cần
    // tự tính `todayIso()` lần thứ 2 (tránh lệch ngày qua nửa đêm).
    act(() => patchOpts.onSuccess());
    expect(onCreated).toHaveBeenCalledWith("BEST-1", patchArgs.patch);
  });

  it("PATCH mã lỗi → KHÔNG gọi onCreated", () => {
    const onCreated = vi.fn();
    const { result } = renderHook(() =>
      useBestOrderForm({ journey, leg: "new", active: true, onCreated }),
    );

    act(() => result.current.submit());
    const [, createOpts] = mockCreateMutate.mock.calls[0];
    act(() =>
      createOpts.onSuccess({ code_best: "84859706027573", merchant_order_code: "BHJ21N-AAAA" }),
    );

    const [, patchOpts] = mockUpdateJourneyMutate.mock.calls[0];
    act(() => patchOpts.onError(new Error("500")));

    expect(onCreated).not.toHaveBeenCalled();
  });

  it("[finding 4] chỉ gọi API tài khoản Best khi form đang sống — truyền enabled = active", () => {
    const { rerender } = renderHook(
      ({ active }) => useBestOrderForm({ journey, leg: "new", active, onCreated: vi.fn() }),
      { initialProps: { active: false } },
    );

    expect(mockUseBestAccounts).toHaveBeenLastCalledWith(false);

    rerender({ active: true });
    expect(mockUseBestAccounts).toHaveBeenLastCalledWith(true);

    rerender({ active: false });
    expect(mockUseBestAccounts).toHaveBeenLastCalledWith(false);
  });

  it("[finding 5] thu gọn (active true→false) xoá form NGAY, không đợi lần bung kế mới thay", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useBestOrderForm({ journey, leg: "new", active, onCreated: vi.fn() }),
      { initialProps: { active: true } },
    );

    expect(result.current.form).not.toBeNull();

    rerender({ active: false });
    expect(result.current.form).toBeNull();
  });

  it("[finding 6] accountId đã chọn KHÔNG sống sót qua lần thu gọn kế tiếp", () => {
    // Không có tài khoản active nào → effectiveAccountId không bị fallback che
    // mất giá trị thật của state `accountId`, lộ đúng hành vi cần kiểm.
    mockUseBestAccounts.mockReturnValue({ data: [] });

    const { result, rerender } = renderHook(
      ({ active }) => useBestOrderForm({ journey, leg: "new", active, onCreated: vi.fn() }),
      { initialProps: { active: true } },
    );

    act(() => result.current.setAccountId("42"));
    expect(result.current.accountId).toBe("42");

    rerender({ active: false });
    rerender({ active: true });

    expect(result.current.accountId).toBe("");
  });
});
