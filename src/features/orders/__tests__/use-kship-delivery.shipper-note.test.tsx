import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

import {
  useKshipDelivery,
  type UseKshipDeliveryParams,
} from "@/features/orders/use-kship-delivery";
import { type OrderRow } from "@/features/orders/order-types";

const ORDER_IDS = [11, 22];

function optionsPayload() {
  return {
    providers: [{ id: 1, code: "BEST", name: "BEST" }],
    services: [{ id: 2, code: "STD", name: "Chuẩn", provider_code: "BEST" }],
    shipper_notes: [
      { code: "CHOXEMHANGKHONGTHU", name: "Cho xem hàng không thử", is_default: true },
      { code: "CHOTHUHANG", name: "Cho thử hàng", is_default: false },
      { code: "KHONGCHOXEMHANG", name: "Không cho xem hàng", is_default: false },
    ],
  };
}

function setup(overrides: Partial<UseKshipDeliveryParams> = {}) {
  const onCreateKshipDelivery = vi.fn().mockResolvedValue({ created_count: 2, detail: "" });
  const params: UseKshipDeliveryParams = {
    rows: ORDER_IDS.map((id) => ({ id }) as OrderRow),
    onFetchKshipOptions: vi.fn().mockResolvedValue(optionsPayload()),
    onCreateKshipDelivery,
    t: (_key: string, fallback?: string) => fallback ?? "",
    ...overrides,
  };
  const hook = renderHook(() => useKshipDelivery(params));
  return { hook, onCreateKshipDelivery };
}

describe("useKshipDelivery — quy định xem hàng", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefill mọi đơn bằng option is_default khi mở dialog", async () => {
    const { hook } = setup();

    await act(async () => {
      await hook.result.current.handleOpenCreateKshipCodeModal(ORDER_IDS);
    });

    await waitFor(() => expect(hook.result.current.createKshipCodeModalOpen).toBe(true));
    expect(hook.result.current.kshipShipperNotes).toEqual({
      11: "CHOXEMHANGKHONGTHU",
      22: "CHOXEMHANGKHONGTHU",
    });
    // Ô "Áp dụng tất cả" cũng phải khớp, không thì bấm nút là ghi đè bằng chuỗi rỗng.
    expect(hook.result.current.kshipBulkShipperNote).toBe("CHOXEMHANGKHONGTHU");
  });

  it("gửi lựa chọn theo TỪNG đơn khi submit", async () => {
    const { hook, onCreateKshipDelivery } = setup();

    await act(async () => {
      await hook.result.current.handleOpenCreateKshipCodeModal(ORDER_IDS);
    });
    act(() => {
      hook.result.current.setKshipShipperNotes((prev) => ({ ...prev, 22: "KHONGCHOXEMHANG" }));
    });
    await act(async () => {
      await hook.result.current.handleSubmitKshipDelivery();
    });

    expect(onCreateKshipDelivery).toHaveBeenCalledTimes(1);
    expect(onCreateKshipDelivery.mock.calls[0][5]).toEqual({
      11: "CHOXEMHANGKHONGTHU",
      22: "KHONGCHOXEMHANG",
    });
  });

  it("không có option nào thì để rỗng, backend tự rơi về mặc định", async () => {
    const { hook } = setup({
      onFetchKshipOptions: vi.fn().mockResolvedValue({ ...optionsPayload(), shipper_notes: [] }),
    });

    await act(async () => {
      await hook.result.current.handleOpenCreateKshipCodeModal(ORDER_IDS);
    });

    await waitFor(() => expect(hook.result.current.createKshipCodeModalOpen).toBe(true));
    expect(hook.result.current.kshipShipperNotes).toEqual({ 11: "", 22: "" });
  });
});
