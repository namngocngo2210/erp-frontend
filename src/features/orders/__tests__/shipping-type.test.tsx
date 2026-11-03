import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { DEFAULT_ORDER_COLUMNS, ORDER_COLUMN_OPTIONS } from "@/features/orders/order-types";
import type { OrderRow } from "@/features/orders/order-types";
import { findOrdersWithoutWarehouse } from "@/features/orders/OrdersTable/OrdersTable";
// Có 3 hằng số trùng tên `DEFAULT_ORDER_COLUMNS` trong codebase (order-types.ts
// cho cột export Excel, order-storage.ts cho cột hiển thị THẬT trên bảng qua
// getStoredOrderColumns(), và constants/index.ts — nợ dead code). Yêu cầu
// "mặc định ẩn, không đẩy bố cục bảng" nói về hằng số chi phối UI thật, tức
// bản của order-storage.ts — alias để không nhầm với bản import ở trên.
import { DEFAULT_ORDER_COLUMNS as DEFAULT_VISIBLE_ORDER_COLUMNS } from "@/features/orders/order-storage";
import { OrderCell } from "@/features/orders/OrdersTable/OrderCell";
import { SHIPPING_TYPE_FILTER_VALUES } from "@/features/orders/orders-page/use-orders-filter-options";
import { useOrdersData } from "@/features/orders/use-orders-data";
import { I18nProvider } from "@/i18n";

// use-orders-data.ts (qua use-orders-table.ts) gọi toast.error khi request lỗi —
// mirror mock của use-orders-data.filter-overrides.test.tsx để không cần sonner thật.
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

afterEach(cleanup);

// Props tối thiểu OrderCell yêu cầu — khớp khuôn của sale-assignment-gate.test.tsx
// (kiotvietOptions/addressCatalog/channelStaffByCode là bắt buộc dù case
// shipping_type không dùng tới).
const BASE_PROPS = {
  kiotvietOptions: [],
  addressCatalog: { provinces: [], districts_by_province: {}, wards_by_district_key: {} },
  channelStaffByCode: {},
  onPatch: vi.fn().mockResolvedValue(undefined),
};

describe("cột Loại xuất hàng", () => {
  it("nằm trong danh sách cột chọn được nhưng không bật sẵn", () => {
    expect(ORDER_COLUMN_OPTIONS.some((c) => c.key === "shipping_type")).toBe(true);
    // Mặc định ẩn: bật sẵn là đẩy bố cục bảng của mọi người sang phải một cột.
    expect(DEFAULT_ORDER_COLUMNS).not.toContain("shipping_type");
    // Hằng số thực sự chi phối cột hiển thị trên bảng (qua getStoredOrderColumns()
    // ở OrdersPage) — đây mới là nơi "đẩy bố cục" thật sự xảy ra nếu bật sẵn.
    expect(DEFAULT_VISIBLE_ORDER_COLUMNS).not.toContain("shipping_type");
  });

  it("hiện nhãn tiếng Việt cho từng giá trị", () => {
    const row = { id: 1, shipping_type: "direct" } as unknown as OrderRow;
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="shipping_type" row={row} />
      </I18nProvider>,
    );
    expect(screen.getByText("Bán trực tiếp")).toBeInTheDocument();
  });

  it("hiện nhãn 'Giao vận' cho giá trị shipment", () => {
    const row = { id: 3, shipping_type: "shipment" } as unknown as OrderRow;
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="shipping_type" row={row} />
      </I18nProvider>,
    );
    expect(screen.getByText("Giao vận")).toBeInTheDocument();
  });

  it("hiện gạch ngang khi chưa xác định", () => {
    const row = { id: 2, shipping_type: null } as unknown as OrderRow;
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="shipping_type" row={row} />
      </I18nProvider>,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("giá trị lạ ngoài shipment/direct: không crash, fallback hiện đúng mã thô", () => {
    // Đọc nhánh render thật: `styles[value] ?? ""` không match → class rỗng (không tô
    // màu), `t(\`shippingType.${value}\`, value)` không có key dịch cho "xyz" → i18n
    // trả về đúng tham số fallback là `value` (xem i18n.tsx: `MESSAGES[..][key] ?? fallback`).
    // Vậy hành vi đúng là hiện thẳng mã thô "xyz", không phải rỗng hay lỗi.
    const row = { id: 4, shipping_type: "xyz" } as never;
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="shipping_type" row={row} />
      </I18nProvider>,
    );
    expect(screen.getByText("xyz")).toBeInTheDocument();
  });
});

describe("bộ lọc Loại xuất hàng", () => {
  it("có đủ 3 lựa chọn, gồm cả 'none' cho đơn cũ chưa xác định", () => {
    // "none" phải có: toàn bộ đơn cũ đều chưa xác định (shipping_type IS NULL ở BE),
    // thiếu nó là mất một tập lớn khỏi bộ lọc — xem task-9-brief.md.
    expect(SHIPPING_TYPE_FILTER_VALUES).toEqual(["shipment", "direct", "none"]);
  });
});

/**
 * Bám khuôn use-orders-data.filter-overrides.test.tsx (test dựng payload lọc đã có
 * sẵn cho order_type/vat) — đổi trục lọc sang shipping_type. Test qua useOrdersData
 * thay vì OrdersPage vì đây là nơi payload/override THẬT được dựng (buildBody trong
 * use-orders-table.ts, filtersToLoadOverrides trong use-orders-filters.ts).
 */
describe("useOrdersData — payload shipping_type", () => {
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

  beforeEach(() => {
    localStorage.clear();
  });

  it("chọn 'direct' → request gửi shipping_type: ['direct']", async () => {
    const { result, fetchJson } = setup();

    act(() => {
      result.current.setShippingType(["direct"]);
    });
    await act(async () => {
      await result.current.loadOrders();
    });

    const body = lastRequestBody(fetchJson);
    expect(body.shipping_type).toEqual(["direct"]);
  });

  it("bấm Xoá lọc sau khi đã chọn shipping_type → request kế tiếp KHÔNG còn shipping_type", async () => {
    // Cạm bẫy đã biết: filtersToLoadOverrides từng thiếu vat/order_type nên "Xoá lọc"
    // xong list vẫn bị lọc theo trục đó. Canh đúng ca này cho shipping_type.
    const { result, fetchJson } = setup();

    act(() => {
      result.current.setShippingType(["direct"]);
    });
    await act(async () => {
      await result.current.clearFilters();
    });

    const body = lastRequestBody(fetchJson);
    expect(body.shipping_type).toBeUndefined();
    // Payload của LẦN GỌI clearFilters ép cứng từ createDefaultStoredFilters(),
    // độc lập hoàn toàn với state — assert riêng STATE đã về rỗng, nếu không thì
    // bài test dưới (nhịp lọc TIẾP THEO) mới là nơi bắt được rò rỉ thật.
    expect(result.current.shippingType).toEqual([]);
  });

  it("sau Xoá lọc, đổi một trục lọc KHÁC → request đó cũng không rò lại shipping_type", async () => {
    // Bẫy trễ một nhịp: nếu reset() lỡ thiếu dòng setShippingType(defaults.shippingType)
    // thì test trên vẫn xanh (vì clearFilters ép override cứng ở LẦN GỌI ĐÓ), nhưng state
    // shippingType trong closure vẫn còn "direct" — lần đổi filter TIẾP THEO chỉ override
    // đúng trục nó đổi (giống mọi handler thật, vd handleVatChange chỉ truyền { vat })
    // nên sẽ rò shipping_type cũ vào request. Xác minh test này canh được ca đó — xem
    // task-9-report.md mục "kiểm chứng test canary".
    const { result, fetchJson } = setup();

    act(() => {
      result.current.setShippingType(["direct"]);
    });
    await act(async () => {
      await result.current.clearFilters();
    });

    act(() => {
      result.current.setVat(["1"]);
    });
    await act(async () => {
      await result.current.loadOrders({ vat: ["1"] });
    });

    const body = lastRequestBody(fetchJson);
    expect(body.shipping_type).toBeUndefined();
  });
});

/**
 * Task 10: chặn "Tạo nhanh" ở FE khi đơn được chọn thiếu kho xuất —
 * báo lỗi KỊP LÚC cho nhân viên trước khi hoá đơn KiotViet được tạo, backend
 * vẫn giữ guard riêng (400 với khoá `orders_without_warehouse`) làm lớp bảo vệ
 * thật sự.
 *
 * Chỉ chặn ca thiếu kho, KHÔNG chặn ca "đã đẩy đi vận chuyển" (order_code) mà
 * backend cũng chặn: có proxy rẻ (`shipping_type === "shipment"`, CÓ mặt trong
 * payload list) nhưng không chính xác 100% (đơn import XLSX có thể có
 * order_code mà shipping_type vẫn null) nên bỏ qua, để backend tiếp tục chặn
 * cứng ca này bằng dữ liệu order_code thật — xem comment đầy đủ tại
 * `findOrdersWithoutWarehouse` trong OrdersTable.tsx.
 *
 * Tiền kiểm này CHỈ PHỦ TRANG HIỆN TẠI (round 1 review, Important #1): `rows`
 * chỉ chứa đơn của trang đang xem trong khi `selectedIds` cố ý không reset khi
 * đổi trang. Đơn được chọn ở trang khác thì lọt qua hàm này — đó là hành vi
 * CỐ Ý (xem test "bỏ qua id được chọn nhưng không có trong rows của trang hiện
 * tại" bên dưới), không phải bug: ca xuyên trang vẫn được backend chặn cứng và
 * `runKiotVietOrderAction` đã hiển thị nguyên văn `detail` lỗi từ response.
 *
 * Test hàm thuần thay vì render OrdersTable: OrdersTable kéo theo toàn bộ
 * useOrdersTableData (CRM catalog, export Excel, KiotViet bulk...) nên dựng
 * props render nổi cả hàng chục field không liên quan tới guard này.
 */
describe("findOrdersWithoutWarehouse — chặn Tạo nhanh khi thiếu kho xuất", () => {
  const rows = [
    { id: 1, invoice_code: "HD001", fulfillment_warehouse: null } as OrderRow,
    { id: 2, invoice_code: "HD002", fulfillment_warehouse: 5 } as OrderRow,
    { id: 3, fulfillment_warehouse: undefined } as OrderRow,
  ];

  it("trả về đơn đang được chọn mà chưa có kho xuất (null)", () => {
    expect(findOrdersWithoutWarehouse(rows, [1, 2])).toEqual([rows[0]]);
  });

  it("undefined cũng tính là thiếu kho (đơn cũ chưa có cột này)", () => {
    expect(findOrdersWithoutWarehouse(rows, [3])).toEqual([rows[2]]);
  });

  it("đơn đã có kho xuất thì không bị chặn", () => {
    expect(findOrdersWithoutWarehouse(rows, [2])).toEqual([]);
  });

  it("selectedIds rỗng → không đơn nào bị coi là vi phạm", () => {
    expect(findOrdersWithoutWarehouse(rows, [])).toEqual([]);
  });

  it("bỏ qua id được chọn nhưng không có trong rows của trang hiện tại (CỐ Ý — xem comment trên)", () => {
    // Mô phỏng đúng ca review nêu: chọn đơn thiếu kho ở trang 1 (id=99, không
    // nằm trong `rows` — vốn chỉ chứa đơn TRANG HIỆN TẠI), rồi bấm "Tạo nhanh"
    // sau khi đã sang trang 2. Tiền kiểm không thấy id=99 trong rows nên KHÔNG
    // chặn — request vẫn gửi lên backend, backend chặn cứng và hiển thị detail.
    expect(findOrdersWithoutWarehouse(rows, [99])).toEqual([]);
  });
});
