import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

import {
  useKshipDelivery,
  type UseKshipDeliveryParams,
} from "@/features/orders/use-kship-delivery";
import { type OrderRow } from "@/features/orders/order-types";

const ORDER_IDS = [11, 22];

/** SPX bắt buộc chọn ca lấy hàng (PickShift); BEST thì không có mục nào. */
function optionsPayload() {
  return {
    providers: [
      { id: 9, code: "BEST", name: "BEST" },
      { id: 17, code: "SPX", name: "SPX Express" },
    ],
    services: [
      { id: 3, code: "STD", name: "Chuẩn", provider_code: "BEST" },
      { id: 186, code: "1", name: "Tiêu chuẩn", provider_code: "SPX" },
    ],
    shipper_notes: [{ code: "CHOXEMHANGKHONGTHU", name: "Cho xem", is_default: true }],
    service_extras: [
      {
        provider_code: "SPX",
        service_code: "1",
        code: "PickShift",
        name: "Chọn ca lấy hàng",
        view_type: "DropdownList",
        options: [
          { value: "1789030800-1", name: "Ca lấy 10-09 (10h-18h)" },
          { value: "1789030800-2", name: "Ca lấy 10-09 (18h-21h)" },
        ],
      },
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

async function openDialog(hook: ReturnType<typeof setup>["hook"]) {
  await act(async () => {
    await hook.result.current.handleOpenCreateKshipCodeModal(ORDER_IDS);
  });
  await waitFor(() => expect(hook.result.current.createKshipCodeModalOpen).toBe(true));
}

describe("useKshipDelivery — mục SERVICE_EXTRA hãng bắt buộc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hiện ca lấy hàng và prefill ca sớm nhất khi đơn chọn SPX", async () => {
    const { hook } = setup();
    await openDialog(hook);

    act(() => {
      for (const id of ORDER_IDS) hook.result.current.handleChangeKshipProvider(id, "SPX");
    });

    await waitFor(() => expect(hook.result.current.kshipRequiredServiceExtras.length).toBe(1));
    expect(hook.result.current.kshipRequiredServiceExtras.map((item) => item.code)).toEqual([
      "PickShift",
    ]);
    expect(hook.result.current.kshipServiceExtraValues).toEqual({ PickShift: "1789030800-1" });
  });

  it("đổi sang hãng không cần chọn ca thì bỏ luôn giá trị đã chọn", async () => {
    const { hook } = setup();
    await openDialog(hook);

    act(() => {
      for (const id of ORDER_IDS) hook.result.current.handleChangeKshipProvider(id, "SPX");
    });
    await waitFor(() => expect(hook.result.current.kshipRequiredServiceExtras.length).toBe(1));

    act(() => {
      for (const id of ORDER_IDS) hook.result.current.handleChangeKshipProvider(id, "BEST");
    });

    await waitFor(() => expect(hook.result.current.kshipRequiredServiceExtras).toEqual([]));
    // Còn sót PickShift là gửi ca của SPX kèm vận đơn BEST.
    expect(hook.result.current.kshipServiceExtraValues).toEqual({});
  });

  it("gửi ca người dùng chọn khi submit", async () => {
    const { hook, onCreateKshipDelivery } = setup();
    await openDialog(hook);

    act(() => {
      for (const id of ORDER_IDS) hook.result.current.handleChangeKshipProvider(id, "SPX");
    });
    act(() => {
      hook.result.current.setKshipServiceExtraValues({ PickShift: "1789030800-2" });
    });
    await act(async () => {
      await hook.result.current.handleSubmitKshipDelivery();
    });

    expect(onCreateKshipDelivery).toHaveBeenCalledWith(
      ORDER_IDS,
      "SPX",
      "1",
      expect.anything(),
      null,
      expect.anything(),
      { PickShift: "1789030800-2" },
    );
  });

  it("hiện ca ngay khi chọn SPX ở ô 'Nhà vận chuyển' chung, chưa bấm Áp dụng", async () => {
    // Ô chọn ca nằm cùng hàng với ô hãng chung. Nếu chỉ bám vào lựa chọn của từng
    // đơn thì người dùng đổi hãng chung sang SPX sẽ KHÔNG thấy ô ca hiện ra.
    const { hook } = setup();
    await openDialog(hook);

    act(() => {
      hook.result.current.setKshipBulkProvider("SPX");
      hook.result.current.setKshipBulkService("1");
    });

    await waitFor(() =>
      expect(hook.result.current.kshipRequiredServiceExtras.map((item) => item.code)).toEqual([
        "PickShift",
      ]),
    );
    expect(hook.result.current.kshipServiceExtraValues).toEqual({ PickShift: "1789030800-1" });
  });

  it("chưa chọn ca thì chặn nút tạo vận đơn", async () => {
    const { hook } = setup();
    await openDialog(hook);

    act(() => {
      for (const id of ORDER_IDS) hook.result.current.handleChangeKshipProvider(id, "SPX");
    });
    act(() => {
      hook.result.current.setKshipServiceExtraValues({ PickShift: "" });
    });

    await waitFor(() => expect(hook.result.current.allKshipRowsConfigured).toBe(false));
  });
});
