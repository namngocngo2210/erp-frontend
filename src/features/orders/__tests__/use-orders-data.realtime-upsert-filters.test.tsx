import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

import { I18nProvider } from "@/i18n";
import { useOrdersData } from "@/features/orders/use-orders-data";
import type { OrderRow } from "@/features/orders/order-types";

// Đơn mới đến qua WebSocket (upsertOrderFromRealtime) chỉ được thêm vào list khi
// khớp TOÀN BỘ filter đang bật. rowPassesActiveFilters từng bỏ sót 4 filter:
// Sản phẩm (product), khoảng ngày tạo (dateFilter), khoảng ngày hoàn
// (returnDateFilter) và Ghi âm cuộc gọi (hasCallRecording) → đơn mới không khớp
// vẫn bị prepend vào bảng đang lọc.

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const baseRow = (overrides: Partial<OrderRow> = {}): OrderRow =>
  ({
    id: 1,
    channel_code: "CH1",
    customer_phone: "0900000000",
    customer_code: "KH1",
    status: 1,
    invoice_status: null,
    total_amount: "0",
    shipping_fee: "0",
    shipping_code: "SC1",
    can_edit: true,
    // PHẢI là ngày động. Bộ lọc ngày tạo MẶC ĐỊNH của trang là [đầu tháng này →
    // hôm nay], và `rowPassesActiveFilters` áp nó cho cả đơn đến qua realtime.
    // Giá trị cứng "2026-07-18" (ngày viết test) nằm trong cửa sổ lúc đó nhưng
    // rơi ra ngoài ngay khi sang tháng: từ 2026-08-01 cả 5 test dưới đây đỏ với
    // `expected [] to include ...` vì mọi đơn mới bị lọc ngày loại sạch.
    // Các test tự đặt `setDateFilter` + `created_at` riêng thì vẫn dùng ngày cứng
    // — chúng tự nhất quán, không phụ thuộc "hôm nay".
    created_at: new Date().toISOString(),
    ...overrides,
  }) as OrderRow;

function setup() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
  );
  const fetchJson = vi.fn();
  const { result } = renderHook(() => useOrdersData(fetchJson), { wrapper });
  return { result, fetchJson };
}

async function seedEmptyList(
  result: ReturnType<typeof setup>["result"],
  fetchJson: ReturnType<typeof vi.fn>,
) {
  fetchJson.mockResolvedValueOnce({ items: [], count: 0, status_counts: {} });
  await act(async () => {
    await result.current.loadOrders();
  });
}

describe("useOrdersData — realtime upsert tôn trọng filter Sản phẩm", () => {
  it("không thêm đơn mới khi items không chứa product id đang lọc", async () => {
    const { result, fetchJson } = setup();
    await seedEmptyList(result, fetchJson);

    act(() => {
      result.current.setProduct(["42"]);
    });
    act(() => {
      result.current.upsertOrderFromRealtime(
        baseRow({
          id: 101,
          items: [
            {
              id: 1,
              product_id: 99,
              product_name: "Bồn ngâm chân",
              sku: "BNC-01",
              quantity: 1,
              unit_price: "0",
              line_total: "0",
            },
          ],
        }),
      );
    });

    expect(result.current.rows.map((r) => r.id)).not.toContain(101);
  });

  it("vẫn thêm đơn mới khi items chứa product id đang lọc", async () => {
    const { result, fetchJson } = setup();
    await seedEmptyList(result, fetchJson);

    act(() => {
      result.current.setProduct(["42"]);
    });
    act(() => {
      result.current.upsertOrderFromRealtime(
        baseRow({
          id: 102,
          items: [
            {
              id: 1,
              product_id: 42,
              product_name: "Bồn ngâm chân",
              sku: "BNC-01",
              quantity: 1,
              unit_price: "0",
              line_total: "0",
            },
          ],
        }),
      );
    });

    expect(result.current.rows.map((r) => r.id)).toContain(102);
  });

  it("lọc theo text khớp SKU/tên sản phẩm của dòng hàng", async () => {
    const { result, fetchJson } = setup();
    await seedEmptyList(result, fetchJson);

    act(() => {
      result.current.setProduct(["BNC-01"]);
    });
    act(() => {
      result.current.upsertOrderFromRealtime(
        baseRow({
          id: 103,
          items: [
            {
              id: 1,
              product_id: 7,
              product_name: "Ổ cắm chống giật",
              sku: "OC-99",
              quantity: 1,
              unit_price: "0",
              line_total: "0",
            },
          ],
        }),
      );
      result.current.upsertOrderFromRealtime(
        baseRow({
          id: 104,
          items: [
            {
              id: 2,
              product_id: 8,
              product_name: "Bồn ngâm chân",
              sku: "BNC-01-XL",
              quantity: 1,
              unit_price: "0",
              line_total: "0",
            },
          ],
        }),
      );
    });

    expect(result.current.rows.map((r) => r.id)).not.toContain(103);
    expect(result.current.rows.map((r) => r.id)).toContain(104);
  });
});

describe("useOrdersData — realtime upsert tôn trọng khoảng ngày tạo", () => {
  it("không thêm đơn mới có created_at ngoài khoảng ngày đang lọc", async () => {
    const { result, fetchJson } = setup();
    await seedEmptyList(result, fetchJson);

    act(() => {
      result.current.setDateFilter({ option: "custom", from: "2026-07-01", to: "2026-07-10" });
    });
    act(() => {
      result.current.upsertOrderFromRealtime(
        baseRow({ id: 111, created_at: "2026-07-18T09:00:00+07:00" }),
      );
      result.current.upsertOrderFromRealtime(
        baseRow({ id: 112, created_at: "2026-07-05T09:00:00+07:00" }),
      );
    });

    expect(result.current.rows.map((r) => r.id)).not.toContain(111);
    expect(result.current.rows.map((r) => r.id)).toContain(112);
  });

  it("bỏ qua lọc ngày tạo khi đang search q (giống backend)", async () => {
    const { result, fetchJson } = setup();
    await seedEmptyList(result, fetchJson);

    act(() => {
      result.current.setDateFilter({ option: "custom", from: "2026-07-01", to: "2026-07-10" });
      result.current.setQ("SC1");
    });
    act(() => {
      result.current.upsertOrderFromRealtime(
        baseRow({ id: 113, created_at: "2026-07-18T09:00:00+07:00", shipping_code: "SC1" }),
      );
    });

    expect(result.current.rows.map((r) => r.id)).toContain(113);
  });
});

describe("useOrdersData — realtime upsert tôn trọng khoảng ngày hoàn", () => {
  it("không thêm đơn mới không có return_date khi đang lọc ngày hoàn", async () => {
    const { result, fetchJson } = setup();
    await seedEmptyList(result, fetchJson);

    act(() => {
      result.current.setReturnDateFilter({
        option: "custom",
        from: "2026-07-01",
        to: "2026-07-31",
      });
    });
    act(() => {
      result.current.upsertOrderFromRealtime(baseRow({ id: 121, return_date: null }));
      result.current.upsertOrderFromRealtime(baseRow({ id: 122, return_date: "2026-07-15" }));
    });

    expect(result.current.rows.map((r) => r.id)).not.toContain(121);
    expect(result.current.rows.map((r) => r.id)).toContain(122);
  });
});

describe("useOrdersData — realtime upsert tôn trọng khoảng ngày tạo KiotViet", () => {
  it("chỉ giữ đơn mới có kiotviet_purchase_date trong khoảng; NULL/thiếu trường bị loại", async () => {
    const { result, fetchJson } = setup();
    await seedEmptyList(result, fetchJson);

    act(() => {
      result.current.setKiotvietPurchaseDateFilter({
        option: "custom",
        from: "2026-07-01",
        to: "2026-07-10",
      });
    });
    act(() => {
      result.current.upsertOrderFromRealtime(
        baseRow({ id: 131, kiotviet_purchase_date: "2026-07-18T09:00:00+07:00" }),
      );
      result.current.upsertOrderFromRealtime(
        baseRow({ id: 132, kiotviet_purchase_date: "2026-07-10T23:30:00+07:00" }),
      );
      result.current.upsertOrderFromRealtime(baseRow({ id: 133, kiotviet_purchase_date: null }));
      result.current.upsertOrderFromRealtime(baseRow({ id: 134 }));
    });

    const ids = result.current.rows.map((r) => r.id);
    expect(ids).not.toContain(131);
    expect(ids).toContain(132);
    expect(ids).not.toContain(133);
    expect(ids).not.toContain(134);
  });

  it("vẫn áp khi đang search q (khác lọc ngày tạo hệ thống)", async () => {
    const { result, fetchJson } = setup();
    await seedEmptyList(result, fetchJson);

    act(() => {
      result.current.setKiotvietPurchaseDateFilter({
        option: "custom",
        from: "2026-07-01",
        to: "2026-07-10",
      });
      result.current.setQ("SC2");
    });
    act(() => {
      result.current.upsertOrderFromRealtime(
        baseRow({
          id: 135,
          kiotviet_purchase_date: "2026-07-18T09:00:00+07:00",
          shipping_code: "SC2",
        }),
      );
    });

    expect(result.current.rows.map((r) => r.id)).not.toContain(135);
  });
});

describe("useOrdersData — realtime upsert tôn trọng filter Ghi âm cuộc gọi", () => {
  it("không thêm đơn mới khi lọc 'có ghi âm' (đơn mới chưa thể có ghi âm)", async () => {
    const { result, fetchJson } = setup();
    await seedEmptyList(result, fetchJson);

    act(() => {
      result.current.setHasCallRecording("yes");
    });
    act(() => {
      result.current.upsertOrderFromRealtime(baseRow({ id: 131 }));
    });

    expect(result.current.rows.map((r) => r.id)).not.toContain(131);
  });

  it("vẫn thêm đơn mới khi lọc 'không có ghi âm'", async () => {
    const { result, fetchJson } = setup();
    await seedEmptyList(result, fetchJson);

    act(() => {
      result.current.setHasCallRecording("no");
    });
    act(() => {
      result.current.upsertOrderFromRealtime(baseRow({ id: 132 }));
    });

    expect(result.current.rows.map((r) => r.id)).toContain(132);
  });

  it("KHÔNG remove row sẵn có khi patch realtime tới mà đang lọc 'có ghi âm' (server đã xác nhận khớp)", async () => {
    const { result, fetchJson } = setup();
    fetchJson.mockResolvedValueOnce({
      items: [baseRow({ id: 1, status: 1 })],
      count: 1,
      status_counts: { "1": 1 },
    });
    await act(async () => {
      await result.current.loadOrders();
    });

    act(() => {
      result.current.setHasCallRecording("yes");
    });
    act(() => {
      result.current.patchOrderFromRealtime(1, { status: 2 });
    });

    expect(result.current.rows.map((r) => r.id)).toContain(1);
  });
});
