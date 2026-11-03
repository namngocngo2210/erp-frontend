/**
 * Hộp thoại tuỳ chỉnh cột của trang đơn.
 *
 * Trọng tâm là phần LỌC THEO NGỮ CẢNH — thứ duy nhất OrdersColumnPicker còn giữ
 * sau khi phần trình bày chuyển hết sang <ColumnManager>. Hành vi của bản thân
 * ColumnManager (tìm kiếm, gom nhóm, bật/tắt) được phủ ở
 * src/components/column-manager/__tests__.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider, useI18n } from "@/i18n";
import { OrdersColumnPicker } from "@/features/orders/orders-page/OrdersColumnPicker";
import { RECALL_COLUMN_KEYS } from "@/features/orders/order-import-format";
import {
  EXPORT_ONLY_COLUMN_KEYS,
  ORDER_COLUMN_OPTIONS,
  type OrderColumnKey,
} from "@/features/orders/order-types";

afterEach(cleanup);

const RECALL_LABELS = ORDER_COLUMN_OPTIONS.filter((option) =>
  RECALL_COLUMN_KEYS.includes(option.key),
).map((option) => option.label);

function Harness({ isKoc }: { isKoc: boolean }) {
  const { t } = useI18n();
  return (
    <OrdersColumnPicker
      t={t}
      visibleOrderColumns={["invoice_code", "name"] as OrderColumnKey[]}
      lockedOrderColumns={[]}
      isKoc={isKoc}
      onToggleOrderColumn={() => {}}
      onToggleLockOrderColumn={() => {}}
      onSetOrderColumns={() => {}}
      onResetOrderColumns={() => {}}
    />
  );
}

async function openPicker(isKoc: boolean) {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <Harness isKoc={isKoc} />
    </I18nProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Tuỳ chỉnh cột" }));
  return user;
}

describe("OrdersColumnPicker — lọc cột theo ngữ cảnh trang", () => {
  it("ẩn nhóm cột thu hồi khi KHÔNG phải trang KOC", async () => {
    const user = await openPicker(false);
    const pane = within(screen.getByTestId("column-manager-available"));

    // Gõ vào ô tìm kiếm để bung hết nhóm, tránh phụ thuộc trạng thái thu gọn.
    await user.type(screen.getByLabelText("Tìm cột…"), "ma");
    expect(pane.queryByText("Mã thu hồi")).toBeNull();

    expect(screen.getByTestId("column-manager-counter").textContent).toBe(
      `Đang hiện 2/${ORDER_COLUMN_OPTIONS.length - RECALL_COLUMN_KEYS.length}`,
    );
  });

  it("hiện đủ nhóm cột thu hồi ở trang KOC", async () => {
    const user = await openPicker(true);

    // Trừ 3 cột thu hồi rời: trên lưới chúng đã gộp thành một cột "Đợt thu hồi",
    // chỉ còn chọn được trong hộp thoại cột xuất Excel.
    expect(screen.getByTestId("column-manager-counter").textContent).toBe(
      `Đang hiện 2/${ORDER_COLUMN_OPTIONS.length - EXPORT_ONLY_COLUMN_KEYS.length}`,
    );

    const pane = within(screen.getByTestId("column-manager-available"));
    await user.type(screen.getByLabelText("Tìm cột…"), "thu hồi");
    expect(pane.getByText("Đợt thu hồi")).toBeTruthy();
    expect(pane.queryByText("Ngày tạo đơn thu hồi")).toBeNull();
    expect(pane.queryByText("Ngày nhận hàng thu hồi")).toBeNull();
    // Nhóm "Hoàn & thu hồi" phải tồn tại và đếm đủ số cột thu hồi.
    expect(
      within(screen.getByTestId("column-manager-available")).getByRole("button", {
        name: "Hoàn & thu hồi",
      }),
    ).toBeTruthy();
  });

  it("chỉ 5 cột thu hồi bị lọc, không đụng cột nào khác", () => {
    expect(RECALL_LABELS.length).toBe(RECALL_COLUMN_KEYS.length);
    expect(
      ORDER_COLUMN_OPTIONS.filter((option) => !RECALL_COLUMN_KEYS.includes(option.key)).length,
    ).toBe(ORDER_COLUMN_OPTIONS.length - RECALL_COLUMN_KEYS.length);
  });
});

describe("OrdersColumnPicker — bộ cột dựng sẵn", () => {
  it("giấu preset KOC ở trang đơn thường", async () => {
    await openPicker(false);

    expect(screen.getByRole("button", { name: "Sale" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kho & vận đơn" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "KOC" })).toBeNull();
  });

  it("hiện preset KOC ở trang KOC", async () => {
    await openPicker(true);

    expect(screen.getByRole("button", { name: "KOC" })).toBeTruthy();
  });
});
