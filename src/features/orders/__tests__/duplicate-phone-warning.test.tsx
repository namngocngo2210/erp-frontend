import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { OrderRow } from "@/features/orders/order-types";
import { OrderCell } from "@/features/orders/OrdersTable/OrderCell";
import { SALES_STATUS_TINT } from "@/features/orders/OrdersTable/constants";
import { resolveRowTint } from "@/features/orders/OrdersTable/row-tint";
import { I18nProvider } from "@/i18n";

afterEach(cleanup);

const BASE_PROPS = {
  kiotvietOptions: [],
  addressCatalog: { provinces: [], districts_by_province: {}, wards_by_district_key: {} },
  channelStaffByCode: {},
  onPatch: vi.fn().mockResolvedValue(undefined),
};

const NO_TINT = {
  isSelected: false,
  hasDuplicatePhone: false,
  hasReturningOrder: false,
  slaBreach: false,
  isActiveRow: false,
  salesStatusCode: "",
};

function renderCell(row: Partial<OrderRow>, columnKey: "phone" | "name") {
  render(
    <I18nProvider>
      <OrderCell {...BASE_PROPS} columnKey={columnKey} row={row as OrderRow} />
    </I18nProvider>,
  );
}

describe("cảnh báo đơn đang vận chuyển ở cột số điện thoại", () => {
  it("hiện cảnh báo kèm số đơn trùng và mã đơn", () => {
    renderCell({ id: 1, phone: "0912000111", duplicate_order_ids: [77, 88] }, "phone");

    const warning = screen.getByTestId("duplicate-phone-warning");
    expect(warning).toBeInTheDocument();
    expect(warning.getAttribute("title")).toContain("2");
    expect(warning.getAttribute("title")).toContain("#77");
    expect(warning.getAttribute("title")).toContain("#88");
    expect(warning.getAttribute("title")).toContain("vận chuyển");
  });

  it("không hiện gì khi đơn không trùng", () => {
    renderCell({ id: 1, phone: "0912000111", duplicate_order_ids: [] }, "phone");
    expect(screen.queryByTestId("duplicate-phone-warning")).not.toBeInTheDocument();
  });

  it("không hiện gì khi backend chưa trả field (trang cũ / payload chi tiết)", () => {
    renderCell({ id: 1, phone: "0912000111" }, "phone");
    expect(screen.queryByTestId("duplicate-phone-warning")).not.toBeInTheDocument();
    expect(screen.queryByTestId("returning-order-warning")).not.toBeInTheDocument();
  });

  it("cũng hiện ở SĐT nằm dưới tên (Sheet 1/2 gộp cell)", () => {
    // contact_count là cờ bật nhánh gộp nguồn + tên + SĐT của Sheet 1/2.
    renderCell(
      { id: 1, name: "Khach A", phone: "0912000111", contact_count: 0, duplicate_order_ids: [5] },
      "name",
    );
    expect(screen.getByTestId("duplicate-phone-warning")).toBeInTheDocument();
  });
});

describe("cảnh báo đơn đang hoàn ở cột số điện thoại", () => {
  it("hiện icon riêng, không dùng chung với cảnh báo trùng vận chuyển", () => {
    renderCell({ id: 1, phone: "0912000111", returning_order_ids: [91] }, "phone");

    const warning = screen.getByTestId("returning-order-warning");
    expect(warning).toBeInTheDocument();
    expect(warning.getAttribute("title")).toContain("#91");
    expect(warning.getAttribute("title")).toContain("hoàn");
    expect(screen.queryByTestId("duplicate-phone-warning")).not.toBeInTheDocument();
  });

  it("hiện đồng thời hai icon khi khách vừa có đơn đang giao vừa có đơn hoàn", () => {
    renderCell(
      {
        id: 1,
        phone: "0912000111",
        duplicate_order_ids: [77],
        returning_order_ids: [91],
      },
      "phone",
    );

    expect(screen.getByTestId("duplicate-phone-warning")).toBeInTheDocument();
    expect(screen.getByTestId("returning-order-warning")).toBeInTheDocument();
  });

  it("cũng hiện ở SĐT nằm dưới tên (Sheet 1/2 gộp cell)", () => {
    renderCell(
      { id: 1, name: "Khach A", phone: "0912000111", contact_count: 0, returning_order_ids: [5] },
      "name",
    );
    expect(screen.getByTestId("returning-order-warning")).toBeInTheDocument();
  });
});

describe("màu nền dòng", () => {
  it('trạng thái sale "Lặp" không còn dùng chung màu đỏ với spam/bom/sai số', () => {
    const duplicate = SALES_STATUS_TINT.duplicate;
    expect(duplicate).toBeDefined();
    for (const code of ["spam", "customer_bombed", "wrong_number", "unreachable"]) {
      expect(duplicate.row).not.toBe(SALES_STATUS_TINT[code].row);
      expect(duplicate.stickyBg).not.toBe(SALES_STATUS_TINT[code].stickyBg);
    }
  });

  it("đỏ cảnh báo dành cho đơn trùng SĐT do hệ thống phát hiện", () => {
    const tint = resolveRowTint({
      ...NO_TINT,
      hasDuplicatePhone: true,
      salesStatusCode: "scheduled",
    });
    expect(tint.row).toContain("destructive");
  });

  it("cam cảnh báo dành cho khách đang có đơn hoàn", () => {
    const tint = resolveRowTint({
      ...NO_TINT,
      hasReturningOrder: true,
      salesStatusCode: "scheduled",
    });
    expect(tint.row).toContain("amber");
  });

  it.each(["closed", "closed_express", "closed_scheduled_date"])(
    "đơn đã chốt (%s) giữ màu xanh dù có cảnh báo hoàn hoặc trùng",
    (code) => {
      const expected = SALES_STATUS_TINT[code];
      for (const flags of [
        { hasDuplicatePhone: true },
        { hasReturningOrder: true },
        { hasDuplicatePhone: true, hasReturningOrder: true },
      ]) {
        const tint = resolveRowTint({ ...NO_TINT, ...flags, salesStatusCode: code });
        expect(tint.row).toBe(expected.row);
        expect(tint.stickyBg).toBe(expected.stickyBg);
      }
    },
  );

  it("nguy cơ bom hàng thắng cảnh báo trùng vận chuyển khi có cả hai", () => {
    const both = resolveRowTint({
      ...NO_TINT,
      hasDuplicatePhone: true,
      hasReturningOrder: true,
    });
    const onlyReturning = resolveRowTint({ ...NO_TINT, hasReturningOrder: true });
    expect(both.row).toBe(onlyReturning.row);
    expect(both.stickyBg).toBe(onlyReturning.stickyBg);
  });

  it("dòng đang chọn thắng cả hai cảnh báo", () => {
    const tint = resolveRowTint({
      ...NO_TINT,
      isSelected: true,
      hasDuplicatePhone: true,
      hasReturningOrder: true,
    });
    expect(tint.row).toBe("bg-muted");
  });

  it("cảnh báo trùng thắng màu theo trạng thái sale", () => {
    const withDuplicate = resolveRowTint({
      ...NO_TINT,
      hasDuplicatePhone: true,
      salesStatusCode: "duplicate",
    });
    const withoutDuplicate = resolveRowTint({ ...NO_TINT, salesStatusCode: "duplicate" });
    expect(withDuplicate.row).not.toBe(withoutDuplicate.row);
    expect(withoutDuplicate.row).toBe(SALES_STATUS_TINT.duplicate.row);
  });

  it("cảnh báo hoàn thắng cảnh báo quá hạn SLA", () => {
    const tint = resolveRowTint({ ...NO_TINT, hasReturningOrder: true, slaBreach: true });
    expect(tint.row).toContain("amber");
  });
});
