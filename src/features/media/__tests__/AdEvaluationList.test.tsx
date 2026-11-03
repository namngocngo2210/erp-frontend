import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";

import { AdEvaluationList } from "../components/AdEvaluationList";

const LIST_RESULT = {
  items: [
    {
      id: 1,
      content_id: 12,
      rating: 3,
      note: "cũ",
      evaluator_name: "A",
      evaluated_at: "2026-09-01T00:00:00Z",
      channel: null,
      channel_id: null,
    },
  ],
};

describe("AdEvaluationList", () => {
  it("marketing thấy form; submit gửi rating step 0.5 + note; rating 0 và note rỗng bị chặn", async () => {
    fetchJson.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return Promise.resolve({ id: 99, rating: 4.5, note: "ok" });
      return Promise.resolve(LIST_RESULT);
    });
    renderWithClient(
      <I18nProvider>
        <AdEvaluationList contentId={12} role="marketing" />
      </I18nProvider>,
    );
    expect(await screen.findByText("cũ")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Gửi đánh giá/ }));
    expect(screen.getByText(/Cần điểm hoặc ghi chú/)).toBeInTheDocument();
    // Sao thứ 5, nửa trái = 4.5 — thay cho <select> điểm cũ (Task panel ads-crm).
    fireEvent.click(screen.getByRole("button", { name: "Chọn 4.5 sao" }));
    fireEvent.change(screen.getByLabelText(/Ghi chú/), { target: { value: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: /Gửi đánh giá/ }));
    await waitFor(() =>
      expect(
        fetchJson.mock.calls.some(
          (c) =>
            (c[1] as RequestInit)?.method === "POST" &&
            String((c[1] as RequestInit).body) === JSON.stringify({ rating: 4.5, note: "ok" }),
        ),
      ).toBe(true),
    );
  });

  it("viewer không thấy form và nút xoá", async () => {
    fetchJson.mockImplementation(() => Promise.resolve(LIST_RESULT));
    renderWithClient(
      <I18nProvider>
        <AdEvaluationList contentId={12} role="viewer" />
      </I18nProvider>,
    );
    expect(await screen.findByText("cũ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gửi đánh giá/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xoá/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sửa/ })).not.toBeInTheDocument();
  });
});
