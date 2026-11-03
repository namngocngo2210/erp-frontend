import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Hook đã chuyển sang react-query (lô 1 hợp nhất data-fetching): contract cần giữ là
// chữ ký trả về cũ — presets/loading/error/refresh/ensureLoaded/create/update/remove —
// và cache được merge tại chỗ từ response server sau mỗi mutation (không đợi refetch).

const fetchJsonMock = vi.fn();

vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJsonMock(...args),
}));

import { useKshipNotePresets } from "../use-kship-note-presets";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const LIST = {
  items: [
    { id: 2, text: "Giao giờ hành chính", sort_order: 1 },
    { id: 1, text: "Gọi trước khi giao", sort_order: 0 },
  ],
  total: 2,
};

beforeEach(() => {
  fetchJsonMock.mockReset();
});

afterEach(cleanup);

describe("useKshipNotePresets (react-query)", () => {
  it("tự load khi mount, GET đúng endpoint, chuẩn hóa item", async () => {
    fetchJsonMock.mockResolvedValueOnce(LIST);
    const { result } = renderHook(() => useKshipNotePresets(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.presets).toHaveLength(2));
    expect(fetchJsonMock).toHaveBeenCalledWith("/api/orders/kship-note-presets", {
      method: "GET",
    });
    expect(result.current.error).toBe("");
    expect(result.current.loading).toBe(false);
  });

  it("create merge vào cache và sort theo sort_order rồi id — không refetch danh sách", async () => {
    fetchJsonMock.mockResolvedValueOnce(LIST);
    const { result } = renderHook(() => useKshipNotePresets(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.presets).toHaveLength(2));

    fetchJsonMock.mockResolvedValueOnce({ id: 3, text: "Cho xem hàng", sort_order: 0 });
    await act(async () => {
      const created = await result.current.create("  Cho xem hàng  ");
      expect(created.id).toBe(3);
    });

    // POST gửi text đã trim
    expect(fetchJsonMock).toHaveBeenLastCalledWith("/api/orders/kship-note-presets", {
      method: "POST",
      body: JSON.stringify({ text: "Cho xem hàng" }),
    });
    // Thông báo observer của react-query là async → chờ render kế tiếp.
    await waitFor(() => expect(result.current.presets.map((p) => p.id)).toEqual([1, 3, 2]));
    // 1 GET + 1 POST, không có GET thứ hai
    expect(fetchJsonMock).toHaveBeenCalledTimes(2);
  });

  it("create chuỗi rỗng bị chặn trước khi gọi API", async () => {
    fetchJsonMock.mockResolvedValueOnce(LIST);
    const { result } = renderHook(() => useKshipNotePresets(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.presets).toHaveLength(2));

    await expect(result.current.create("   ")).rejects.toThrow(
      "Nội dung ghi chú không được để trống.",
    );
    expect(fetchJsonMock).toHaveBeenCalledTimes(1); // chỉ GET ban đầu
  });

  it("update thay item trong cache, remove loại item khỏi cache", async () => {
    fetchJsonMock.mockResolvedValueOnce(LIST);
    const { result } = renderHook(() => useKshipNotePresets(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.presets).toHaveLength(2));

    fetchJsonMock.mockResolvedValueOnce({ id: 1, text: "Gọi trước 15 phút", sort_order: 0 });
    await act(async () => {
      await result.current.update(1, { text: "Gọi trước 15 phút" });
    });
    await waitFor(() =>
      expect(result.current.presets.find((p) => p.id === 1)?.text).toBe("Gọi trước 15 phút"),
    );

    fetchJsonMock.mockResolvedValueOnce(null); // DELETE 204
    await act(async () => {
      await result.current.remove(1);
    });
    await waitFor(() => expect(result.current.presets.map((p) => p.id)).toEqual([2]));
  });

  it("load đầu lỗi → error là message backend, ensureLoaded retry lại", async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error("HTTP 500"));
    const { result } = renderHook(() => useKshipNotePresets(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.error).toBe("HTTP 500"));

    fetchJsonMock.mockResolvedValueOnce(LIST);
    act(() => {
      result.current.ensureLoaded();
    });
    await waitFor(() => expect(result.current.presets).toHaveLength(2));
    expect(result.current.error).toBe("");
  });
});
