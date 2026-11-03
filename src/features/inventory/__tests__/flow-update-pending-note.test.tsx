import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/services/http", () => ({ fetchJson: vi.fn() }));
import { fetchJson } from "@/services/http";
import { useFlowUpdatePendingNote } from "@/features/inventory/flow-match-queries";

const mockFetchJson = fetchJson as ReturnType<typeof vi.fn>;

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useFlowUpdatePendingNote(), { wrapper });
  return { result, invalidateSpy };
}

describe("useFlowUpdatePendingNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH note của dòng chờ khớp và invalidate cả 2 danh sách pending", async () => {
    mockFetchJson.mockResolvedValue({ id: 7, note: "kho ghi chú" });
    const { result, invalidateSpy } = setup();

    await result.current.mutateAsync({ scanId: 7, note: "kho ghi chú" });

    expect(mockFetchJson).toHaveBeenCalledWith("/api/inventory/flow-pending/7/note", {
      method: "PATCH",
      body: JSON.stringify({ note: "kho ghi chú" }),
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["inventory", "issue-pending"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["inventory", "return-pending"],
      });
    });
  });
});
