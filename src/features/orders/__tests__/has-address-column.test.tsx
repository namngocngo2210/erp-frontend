import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import {
  DEFAULT_ORDER_COLUMNS,
  ORDER_COLUMN_FIELD_BY_KEY,
  ORDER_COLUMN_GROUP_BY_KEY,
  ORDER_COLUMN_OPTIONS,
} from "@/features/orders/order-types";
import type { OrderRow } from "@/features/orders/order-types";
import { DEFAULT_ORDER_COLUMNS as DEFAULT_VISIBLE_ORDER_COLUMNS } from "@/features/orders/order-storage";
import { OrderCell } from "@/features/orders/OrdersTable/OrderCell";
import { I18nProvider } from "@/i18n";

afterEach(cleanup);

const BASE_PROPS = {
  kiotvietOptions: [],
  addressCatalog: { provinces: [], districts_by_province: {}, wards_by_district_key: {} },
  channelStaffByCode: {},
  onPatch: vi.fn().mockResolvedValue(undefined),
};

function renderCell(row: Partial<OrderRow>) {
  render(
    <I18nProvider>
      <OrderCell {...BASE_PROPS} columnKey="has_address" row={{ id: 1, ...row } as OrderRow} />
    </I18nProvider>,
  );
}

describe("cột Địa chỉ khi đổ đơn", () => {
  it("chọn được trong nhóm Khách hàng nhưng không bật sẵn", () => {
    expect(ORDER_COLUMN_OPTIONS.some((c) => c.key === "has_address")).toBe(true);
    expect(ORDER_COLUMN_GROUP_BY_KEY.has_address).toBe("customer");
    expect(ORDER_COLUMN_FIELD_BY_KEY.has_address).toBe("has_address");
    expect(DEFAULT_ORDER_COLUMNS).not.toContain("has_address");
    expect(DEFAULT_VISIBLE_ORDER_COLUMNS).not.toContain("has_address");
  });

  it("hiện 'Không có địa chỉ' khi cờ false", () => {
    renderCell({ has_address: false });
    expect(screen.getByText("Không có địa chỉ")).toBeInTheDocument();
  });

  it("hiện 'Có địa chỉ' khi cờ true", () => {
    renderCell({ has_address: true });
    expect(screen.getByText("Có địa chỉ")).toBeInTheDocument();
  });

  it("vắng field coi như có địa chỉ (khớp db_default=True)", () => {
    renderCell({});
    expect(screen.getByText("Có địa chỉ")).toBeInTheDocument();
  });
});
