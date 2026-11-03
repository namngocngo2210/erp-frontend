import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OrderRow } from "@/features/orders/order-types";
import { nextRecallEntries } from "@/features/orders/OrdersTable/cell-renderers";
import { OrderCell } from "@/features/orders/OrdersTable/OrderCell";
import { BlockRecall } from "@/features/orders/BlockRecall";
import { I18nProvider } from "@/i18n";

afterEach(cleanup);

// Props tối thiểu OrderCell yêu cầu — khớp khuôn shipping-type.test.tsx.
const BASE_PROPS = {
  kiotvietOptions: [],
  addressCatalog: { provinces: [], districts_by_province: {}, wards_by_district_key: {} },
  channelStaffByCode: {},
};

const ROW = {
  id: 1,
  can_edit: true,
  recall_entries: [
    {
      id: 1,
      recall_code: "RC-01",
      recall_created_date: "2026-08-12",
      recall_received_date: "2026-08-15",
    },
    { id: 2, recall_code: "RC-02", recall_created_date: "2026-08-20", recall_received_date: null },
  ],
} as unknown as OrderRow;

describe("nextRecallEntries", () => {
  it("đổi đúng một ô, giữ nguyên các nhóm khác", () => {
    const entries = [
      { recall_code: "A", recall_created_date: null, recall_received_date: null },
      { recall_code: "B", recall_created_date: null, recall_received_date: null },
    ];
    expect(nextRecallEntries(entries, 1, "recall_code", "B2")).toEqual([
      { recall_code: "A", recall_created_date: null, recall_received_date: null },
      { recall_code: "B2", recall_created_date: null, recall_received_date: null },
    ]);
  });

  it("index vượt độ dài thì thêm nhóm mới ở cuối", () => {
    expect(nextRecallEntries([], 0, "recall_code", "A")).toEqual([
      { recall_code: "A", recall_created_date: null, recall_received_date: null },
    ]);
  });
});

describe("cột Đợt thu hồi trên lưới", () => {
  // Ba cột thu hồi rời đã gộp thành MỘT ô `recall_entries`: mỗi đợt một dòng,
  // ba input nằm cạnh nhau nên không còn cần bất biến "ba cột cao bằng nhau".
  it("render đúng một dòng cho mỗi đợt, không thừa dòng trống", () => {
    const { container } = render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="recall_entries" row={ROW} onPatch={vi.fn()} />
      </I18nProvider>,
    );
    // 2 đợt × 3 input (mã + 2 ngày). input type="date" không mang role textbox
    // trong jsdom nên đếm thẳng node DOM.
    expect(container.querySelectorAll("input")).toHaveLength(6);
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("sửa một ô gửi lại CẢ danh sách nhóm", async () => {
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="recall_entries" row={ROW} onPatch={onPatch} />
      </I18nProvider>,
    );
    const input = screen.getByLabelText("Mã đơn thu hồi #1");
    await userEvent.clear(input);
    await userEvent.type(input, "RC-99");
    await userEvent.tab();
    expect(onPatch).toHaveBeenCalledWith(1, {
      recall_entries: [
        {
          recall_code: "RC-99",
          recall_created_date: "2026-08-12",
          recall_received_date: "2026-08-15",
        },
        { recall_code: "RC-02", recall_created_date: "2026-08-20", recall_received_date: null },
      ],
    });
  });

  it("nút thêm đợt nối thêm một dòng trống ngay trong ô", async () => {
    const { container } = render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="recall_entries" row={ROW} onPatch={vi.fn()} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Thêm đợt/i }));
    expect(container.querySelectorAll("input")).toHaveLength(9);
  });

  it("nút xoá gửi lại danh sách đã bỏ đúng đợt đó", async () => {
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="recall_entries" row={ROW} onPatch={onPatch} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Xoá đợt #1" }));
    expect(onPatch).toHaveBeenCalledWith(1, {
      recall_entries: [
        { recall_code: "RC-02", recall_created_date: "2026-08-20", recall_received_date: null },
      ],
    });
  });

  it("đơn chưa có đợt nào vẫn hiện một dòng trống để gõ, không có nút xoá", () => {
    const emptyRow = { id: 2, can_edit: true, recall_entries: [] } as unknown as OrderRow;
    const { container } = render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="recall_entries" row={emptyRow} onPatch={vi.fn()} />
      </I18nProvider>,
    );
    expect(container.querySelectorAll("input")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Xoá đợt/i })).not.toBeInTheDocument();
  });

  it("đơn không sửa được thì khoá input và giấu nút thêm/xoá", () => {
    const lockedRow = { ...ROW, can_edit: false } as unknown as OrderRow;
    const { container } = render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="recall_entries" row={lockedRow} onPatch={vi.fn()} />
      </I18nProvider>,
    );
    for (const input of container.querySelectorAll("input")) {
      expect(input).toBeDisabled();
    }
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("cột return_slip_code vẫn patch qua recall.return_slip_code như cũ", async () => {
    const onPatch = vi.fn().mockResolvedValue(undefined);
    const row = {
      id: 5,
      can_edit: true,
      recall: { return_slip_code: "PT-01" },
    } as unknown as OrderRow;
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="return_slip_code" row={row} onPatch={onPatch} />
      </I18nProvider>,
    );
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "PT-99");
    await userEvent.tab();
    expect(onPatch).toHaveBeenCalledWith(5, { recall: { return_slip_code: "PT-99" } });
  });
});

describe("BlockRecall — trang chi tiết", () => {
  it("hiện một cụm cho mỗi nhóm, đánh số theo thứ tự", () => {
    render(
      <I18nProvider>
        <BlockRecall order={ROW} patch={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByText(/Đợt thu hồi #1/)).toBeInTheDocument();
    expect(screen.getByText(/Đợt thu hồi #2/)).toBeInTheDocument();
  });

  it("nút thêm đợt gửi thêm một nhóm rỗng vào cuối", async () => {
    const patch = vi.fn();
    render(
      <I18nProvider>
        <BlockRecall order={ROW} patch={patch} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Thêm đợt thu hồi/i }));
    expect(patch).toHaveBeenCalledWith({
      recall_entries: [
        {
          recall_code: "RC-01",
          recall_created_date: "2026-08-12",
          recall_received_date: "2026-08-15",
        },
        { recall_code: "RC-02", recall_created_date: "2026-08-20", recall_received_date: null },
        { recall_code: "", recall_created_date: null, recall_received_date: null },
      ],
    });
  });

  it("nút xoá bỏ đúng nhóm đó khỏi danh sách", async () => {
    const patch = vi.fn();
    render(
      <I18nProvider>
        <BlockRecall order={ROW} patch={patch} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getAllByRole("button", { name: /Xoá đợt/i })[0]);
    expect(patch).toHaveBeenCalledWith({
      recall_entries: [
        { recall_code: "RC-02", recall_created_date: "2026-08-20", recall_received_date: null },
      ],
    });
  });
});
