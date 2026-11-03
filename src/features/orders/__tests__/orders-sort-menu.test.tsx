import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { OrdersSortMenu } from "@/features/orders/orders-page/OrdersToolbarActions";
import { useOrdersData } from "@/features/orders/use-orders-data";
import { I18nProvider, useI18n } from "@/i18n";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

afterEach(cleanup);

/**
 * Menu sắp xếp trang đơn: 4 tuỳ chọn (ngày tạo / ngày chốt × hai chiều).
 *
 * Hai tầng được kiểm riêng vì hỏng độc lập nhau:
 * - Menu bắn đúng giá trị `sort` ra ngoài (component).
 * - `useOrdersData` nhét giá trị đó vào body request thật (buildBody trong
 *   use-load-orders.ts) — cùng khuôn với channel-type-filter.test.tsx.
 */

function SortMenuHarness({
  sort,
  onSortChange,
  onApplyFilters,
}: {
  sort: Parameters<typeof OrdersSortMenu>[0]["sort"];
  onSortChange: (value: Parameters<typeof OrdersSortMenu>[0]["sort"]) => void;
  onApplyFilters: () => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <OrdersSortMenu t={t} sort={sort} onSortChange={onSortChange} onApplyFilters={onApplyFilters} />
  );
}

function renderMenu(sort: Parameters<typeof OrdersSortMenu>[0]["sort"] = "newest") {
  const onSortChange = vi.fn();
  const onApplyFilters = vi.fn().mockResolvedValue(undefined);
  render(
    <I18nProvider>
      <SortMenuHarness sort={sort} onSortChange={onSortChange} onApplyFilters={onApplyFilters} />
    </I18nProvider>,
  );
  return { onSortChange, onApplyFilters, user: userEvent.setup() };
}

describe("OrdersSortMenu", () => {
  it("mở menu hiện đủ 4 tuỳ chọn theo ngày tạo và ngày chốt", async () => {
    const { user } = renderMenu();

    await user.click(screen.getByRole("button"));

    for (const label of [
      "Ngày tạo: Cũ → Mới",
      "Ngày tạo: Mới → Cũ",
      "Ngày chốt: Cũ → Mới",
      "Ngày chốt: Mới → Cũ",
    ]) {
      expect(await screen.findByRole("menuitem", { name: new RegExp(label) })).toBeTruthy();
    }
  });

  it("chọn 'Ngày chốt: Mới → Cũ' bắn sort closed_newest và nạp lại danh sách", async () => {
    const { onSortChange, onApplyFilters, user } = renderMenu();

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByRole("menuitem", { name: /Ngày chốt: Mới → Cũ/ }));

    expect(onSortChange).toHaveBeenCalledWith("closed_newest");
    expect(onApplyFilters).toHaveBeenCalledWith({ sort: "closed_newest" });
  });

  it("chọn 'Ngày chốt: Cũ → Mới' bắn sort closed_oldest", async () => {
    const { onSortChange, user } = renderMenu();

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByRole("menuitem", { name: /Ngày chốt: Cũ → Mới/ }));

    expect(onSortChange).toHaveBeenCalledWith("closed_oldest");
  });

  it("bấm lại đúng tuỳ chọn đang chọn thì không nạp lại danh sách", async () => {
    const { onSortChange, onApplyFilters, user } = renderMenu("closed_newest");

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByRole("menuitem", { name: /Ngày chốt: Mới → Cũ/ }));

    expect(onSortChange).not.toHaveBeenCalled();
    expect(onApplyFilters).not.toHaveBeenCalled();
  });

  it("nút hiển thị nhãn của thứ tự đang áp dụng", () => {
    renderMenu("closed_oldest");
    expect(screen.getByRole("button").textContent).toContain("Ngày chốt: Cũ → Mới");
  });
});

describe("useOrdersData — payload sort", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup() {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider>{children}</I18nProvider>
    );
    const fetchJson = vi.fn().mockResolvedValue({ items: [], count: 0 });
    const { result } = renderHook(() => useOrdersData(fetchJson), { wrapper });
    return { result, fetchJson };
  }

  function lastRequestBody(fetchJson: ReturnType<typeof vi.fn>): Record<string, unknown> {
    const calls = fetchJson.mock.calls;
    const call = calls[calls.length - 1];
    return JSON.parse((call[1] as RequestInit).body as string) as Record<string, unknown>;
  }

  it("mặc định gửi sort: newest", async () => {
    const { result, fetchJson } = setup();

    await act(async () => {
      await result.current.loadOrders();
    });

    expect(lastRequestBody(fetchJson).sort).toBe("newest");
  });

  it.each(["closed_newest", "closed_oldest", "oldest"] as const)(
    "đặt sort=%s thì request gửi đúng giá trị đó",
    async (sort) => {
      const { result, fetchJson } = setup();

      act(() => {
        result.current.setOrdersSort(sort);
      });
      await act(async () => {
        await result.current.loadOrders();
      });

      await waitFor(() => expect(lastRequestBody(fetchJson).sort).toBe(sort));
    },
  );
});
