import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Factory DUY NHẤT cho @/lib/api/orders — phải export ĐỦ union các hàm mà cả
// useOrderMutations lẫn useKshipSenderAddressMutations dùng; thiếu export sẽ nổ
// TypeError khó hiểu sâu trong mutation.
vi.mock("@/lib/api/orders", () => ({
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  createKshipSenderAddress: vi.fn(),
  updateKshipSenderAddress: vi.fn(),
  deleteKshipSenderAddress: vi.fn(),
}));
import {
  createOrder,
  updateOrder,
  deleteOrder,
  createKshipSenderAddress,
  deleteKshipSenderAddress,
  updateKshipSenderAddress,
} from "@/lib/api/orders";
import { useOrderMutations } from "@/features/orders/use-order-mutations";
import { useKshipSenderAddressMutations } from "@/features/orders/use-kship-sender-addresses";
import { orderKeys } from "@/features/orders/queries";

const mockCreateOrder = createOrder as ReturnType<typeof vi.fn>;
const mockUpdateOrder = updateOrder as ReturnType<typeof vi.fn>;
const mockDeleteOrder = deleteOrder as ReturnType<typeof vi.fn>;
const mockCreateAddress = createKshipSenderAddress as ReturnType<typeof vi.fn>;
const mockUpdateAddress = updateKshipSenderAddress as ReturnType<typeof vi.fn>;
const mockDeleteAddress = deleteKshipSenderAddress as ReturnType<typeof vi.fn>;

function setup<T>(hook: () => T) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(hook, { wrapper });
  return { result, invalidateSpy };
}

beforeEach(() => vi.clearAllMocks());

describe("useOrderMutations", () => {
  it("create gọi createOrder với payload và invalidate orders list khi thành công", async () => {
    mockCreateOrder.mockResolvedValue({ id: 1 });
    const { result, invalidateSpy } = setup(() => useOrderMutations());

    const payload = { channel_code: "CH1", name: "A", phone: "0900" };
    await result.current.create.mutateAsync(payload);

    expect(mockCreateOrder).toHaveBeenCalledWith(payload);
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.lists() }),
    );
  });

  it("update gọi updateOrder(id, patch) và invalidate khi thành công", async () => {
    mockUpdateOrder.mockResolvedValue({ id: 5, status: 3 });
    const { result, invalidateSpy } = setup(() => useOrderMutations());

    await result.current.update.mutateAsync({ id: 5, patch: { status: 3 } });

    expect(mockUpdateOrder).toHaveBeenCalledWith(5, { status: 3 });
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.lists() }),
    );
  });

  it("remove gọi deleteOrder(id) và invalidate khi thành công", async () => {
    mockDeleteOrder.mockResolvedValue({ deleted_count: 1 });
    const { result, invalidateSpy } = setup(() => useOrderMutations());

    await result.current.remove.mutateAsync(9);

    expect(mockDeleteOrder).toHaveBeenCalledWith(9);
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.lists() }),
    );
  });

  it("mutation lỗi → KHÔNG invalidate cache", async () => {
    mockCreateOrder.mockRejectedValue(new Error("boom"));
    const { result, invalidateSpy } = setup(() => useOrderMutations());

    await expect(
      result.current.create.mutateAsync({ channel_code: "C", name: "A", phone: "0" }),
    ).rejects.toThrow("boom");

    expect(invalidateSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.create.isError).toBe(true));
  });
});

describe("useKshipSenderAddressMutations", () => {
  it("create gọi API với body và invalidate danh sách địa chỉ khi thành công", async () => {
    mockCreateAddress.mockResolvedValue({ id: 9 });
    const { result, invalidateSpy } = setup(() => useKshipSenderAddressMutations());

    const body = { name: "Kho A", location_id: 1, ward_id: 2, address: "1 A", mobile: "0900" };
    await result.current.create.mutateAsync(body);

    expect(mockCreateAddress).toHaveBeenCalledWith(body);
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["orders", "kship-sender-addresses"],
      }),
    );
  });

  it("update gọi API (id, patch) và invalidate", async () => {
    mockUpdateAddress.mockResolvedValue({ id: 9, name: "Kho B" });
    const { result, invalidateSpy } = setup(() => useKshipSenderAddressMutations());

    await result.current.update.mutateAsync({ id: 9, patch: { name: "Kho B" } });

    expect(mockUpdateAddress).toHaveBeenCalledWith(9, { name: "Kho B" });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
  });

  it("remove gọi API (id) và invalidate", async () => {
    mockDeleteAddress.mockResolvedValue(undefined);
    const { result, invalidateSpy } = setup(() => useKshipSenderAddressMutations());

    await result.current.remove.mutateAsync(9);

    expect(mockDeleteAddress).toHaveBeenCalledWith(9);
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
  });
});
