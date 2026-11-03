import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

import {
  useKshipDelivery,
  type UseKshipDeliveryParams,
} from "@/features/orders/use-kship-delivery";
import { type OrderRow } from "@/features/orders/order-types";

/**
 * KShip không có khoá chống trùng: tạo lại trên đơn đã có mã là sinh vận đơn THẬT thứ
 * hai bên hãng vận chuyển. Backend đã chặn (400) — lớp này chỉ để người dùng biết
 * ngay đơn nào vướng, và để không tốn một vòng gọi kship-options vô ích.
 */
function optionsPayload() {
  return {
    providers: [{ id: 1, code: "BEST", name: "BEST" }],
    services: [{ id: 2, code: "STD", name: "Chuẩn", provider_code: "BEST" }],
    shipper_notes: [
      { code: "CHOXEMHANGKHONGTHU", name: "Cho xem hàng không thử", is_default: true },
    ],
  };
}

function setup(rows: OrderRow[]) {
  const onFetchKshipOptions = vi.fn().mockResolvedValue(optionsPayload());
  const params: UseKshipDeliveryParams = {
    rows,
    onFetchKshipOptions,
    onCreateKshipDelivery: vi.fn().mockResolvedValue({ created_count: 1, detail: "" }),
    t: (_key: string, fallback?: string) => fallback ?? "",
  };
  const hook = renderHook(() => useKshipDelivery(params));
  return { hook, onFetchKshipOptions };
}

describe("useKshipDelivery — chặn tạo vận đơn trùng", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("không mở dialog khi đơn đã có mã vận đơn", async () => {
    const { hook, onFetchKshipOptions } = setup([
      { id: 11, shipping_code: "GHN-EXISTING" } as OrderRow,
    ]);

    await act(async () => {
      await hook.result.current.handleOpenCreateKshipCodeModal([11]);
    });

    expect(hook.result.current.createKshipCodeModalOpen).toBe(false);
    expect(onFetchKshipOptions).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("chặn cả lô khi chỉ một đơn đã có mã vận đơn", async () => {
    const { hook, onFetchKshipOptions } = setup([
      { id: 11, shipping_code: "" } as OrderRow,
      { id: 22, shipping_code: "GHN-EXISTING" } as OrderRow,
    ]);

    await act(async () => {
      await hook.result.current.handleOpenCreateKshipCodeModal([11, 22]);
    });

    expect(hook.result.current.createKshipCodeModalOpen).toBe(false);
    expect(onFetchKshipOptions).not.toHaveBeenCalled();
  });

  it("vẫn mở bình thường khi mọi đơn chưa có mã vận đơn", async () => {
    const { hook, onFetchKshipOptions } = setup([
      { id: 11, shipping_code: "" } as OrderRow,
      { id: 22 } as OrderRow,
    ]);

    await act(async () => {
      await hook.result.current.handleOpenCreateKshipCodeModal([11, 22]);
    });

    await waitFor(() => expect(hook.result.current.createKshipCodeModalOpen).toBe(true));
    expect(onFetchKshipOptions).toHaveBeenCalledWith([11, 22]);
  });
});
