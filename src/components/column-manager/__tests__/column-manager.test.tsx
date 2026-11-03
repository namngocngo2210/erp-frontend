import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ColumnManager } from "@/components/column-manager/ColumnManager";
import type { ColumnManagerGroup, ColumnManagerOption } from "@/components/column-manager/types";

afterEach(cleanup);

type Key = "invoice_code" | "shipping_code" | "name" | "phone" | "vat" | "is_export_vat";

const GROUPS: ColumnManagerGroup[] = [
  { key: "order", label: "Đơn & hoá đơn" },
  { key: "customer", label: "Khách hàng" },
  { key: "vat", label: "Hoá đơn VAT" },
];

const OPTIONS: Array<ColumnManagerOption<Key>> = [
  { key: "invoice_code", label: "Mã hoá đơn", group: "order" },
  { key: "shipping_code", label: "Mã vận đơn", group: "order" },
  { key: "name", label: "Tên khách hàng", group: "customer" },
  { key: "phone", label: "SĐT", group: "customer" },
  { key: "vat", label: "Hình thức xuất VAT", group: "vat" },
  { key: "is_export_vat", label: "Đã xuất VAT", group: "vat" },
];

/**
 * Bọc ColumnManager bằng state thật để test đúng vòng đời người dùng thấy:
 * bấm checkbox -> state đổi -> danh sách "Đang hiện" đổi theo.
 *
 * `onToggle` cố tình mang cùng ràng buộc như trang Đơn hàng (không ẩn cột cuối
 * cùng) — đó là hợp đồng ColumnManager dựa vào chứ không tự cài.
 */
function Harness({
  initial = ["invoice_code", "name"] as Key[],
  onSetColumnsSpy,
  onResetSpy,
}: {
  initial?: Key[];
  onSetColumnsSpy?: (next: Key[]) => void;
  onResetSpy?: () => void;
}) {
  const [visible, setVisible] = useState<Key[]>(initial);

  return (
    <ColumnManager<Key>
      open
      onOpenChange={() => {}}
      options={OPTIONS}
      groups={GROUPS}
      visible={visible}
      onToggle={(key) =>
        setVisible((prev) => {
          if (!prev.includes(key)) return [...prev, key];
          return prev.length === 1 ? prev : prev.filter((item) => item !== key);
        })
      }
      onSetColumns={(next) => {
        onSetColumnsSpy?.(next);
        setVisible(next);
      }}
      onReset={
        onResetSpy
          ? () => {
              onResetSpy();
              setVisible(["invoice_code"]);
            }
          : undefined
      }
    />
  );
}

/**
 * Hai panel dùng CHUNG nhãn cột (một cột đang hiện xuất hiện ở cả hai bên), nên
 * mọi assertion về "cột nào đang thấy" đều phải scope vào đúng panel.
 */
function availablePane() {
  return screen.getByTestId("column-manager-available");
}

function visiblePane() {
  return screen.getByTestId("column-manager-visible");
}

/**
 * Nhóm chưa có cột nào đang hiện thì mặc định thu gọn — muốn click vào cột bên
 * trong phải bung nhóm ra trước, đúng như người dùng thật.
 */
async function expandGroup(user: ReturnType<typeof userEvent.setup>, groupLabel: string) {
  const header = within(availablePane()).getByRole("button", { name: groupLabel });
  if (header.getAttribute("aria-expanded") === "false") await user.click(header);
}

describe("ColumnManager — tìm cột", () => {
  it("bỏ dấu tiếng Việt khi tìm: 'van don' ra 'Mã vận đơn'", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Tìm cột…"), "van don");

    const pane = within(availablePane());
    expect(pane.getByText("Mã vận đơn")).toBeTruthy();
    expect(pane.queryByText("Mã hoá đơn")).toBeNull();
    expect(pane.queryByText("SĐT")).toBeNull();
  });

  it("tìm được cột có dấu gạch/viết tắt: 'sdt' ra 'SĐT'", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Tìm cột…"), "sdt");

    const pane = within(availablePane());
    expect(pane.getByText("SĐT")).toBeTruthy();
    expect(pane.queryByText("Tên khách hàng")).toBeNull();
  });

  it("tìm theo tên NHÓM thì giữ nguyên mọi cột của nhóm đó", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Tìm cột…"), "hoa don vat");

    const pane = within(availablePane());
    expect(pane.getByText("Hình thức xuất VAT")).toBeTruthy();
    // "Đã xuất VAT" không khớp cụm "hoa don vat" theo từng cột, chỉ khớp qua nhóm.
    expect(pane.getByText("Đã xuất VAT")).toBeTruthy();
    expect(pane.queryByText("Tên khách hàng")).toBeNull();
  });

  it("báo rõ khi không có cột nào khớp", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Tìm cột…"), "khong-ton-tai");

    expect(screen.getByText("Không có cột nào khớp")).toBeTruthy();
  });
});

describe("ColumnManager — trạng thái hiển thị", () => {
  it("đếm số cột đang hiện trên tổng số", () => {
    render(<Harness initial={["invoice_code", "name", "phone"]} />);

    expect(screen.getByTestId("column-manager-counter").textContent).toBe("Đang hiện 3/6");
  });

  it("badge mỗi nhóm đếm theo TOÀN nhóm, không đổi khi đang lọc", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["invoice_code", "name", "phone"]} />);

    expect(screen.getByText("1/2")).toBeTruthy(); // Đơn & hoá đơn
    expect(screen.getByText("2/2")).toBeTruthy(); // Khách hàng
    expect(screen.getByText("0/2")).toBeTruthy(); // Hoá đơn VAT

    await user.type(screen.getByLabelText("Tìm cột…"), "ma hoa don");

    expect(screen.getByText("1/2")).toBeTruthy();
  });

  it("cột đang hiện nằm ở panel phải theo đúng thứ tự, kèm số thứ tự", () => {
    render(<Harness initial={["phone", "invoice_code"]} />);

    const rows = within(visiblePane()).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("SĐT"),
      expect.stringContaining("Mã hoá đơn"),
    ]);
    expect(rows[0].textContent).toContain("1");
    expect(rows[1].textContent).toContain("2");
  });
});

describe("ColumnManager — bật/tắt cột", () => {
  it("tick một cột thì nó xuất hiện ở panel Đang hiện", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["invoice_code"]} />);

    expect(within(visiblePane()).queryByText("SĐT")).toBeNull();

    await expandGroup(user, "Khách hàng");
    await user.click(within(availablePane()).getByRole("checkbox", { name: "SĐT" }));

    expect(within(visiblePane()).getByText("SĐT")).toBeTruthy();
    expect(screen.getByTestId("column-manager-counter").textContent).toBe("Đang hiện 2/6");
  });

  it("bật/tắt cả nhóm bằng một cú click", async () => {
    const onSetColumns = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={["invoice_code"]} onSetColumnsSpy={onSetColumns} />);

    await user.click(screen.getByLabelText("Bật/tắt nhóm Hoá đơn VAT"));

    expect(onSetColumns).toHaveBeenCalledWith(["invoice_code", "vat", "is_export_vat"]);
    expect(screen.getByTestId("column-manager-counter").textContent).toBe("Đang hiện 3/6");
  });

  it("tắt cả nhóm sẽ gỡ đúng các cột của nhóm đó", async () => {
    const onSetColumns = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness initial={["invoice_code", "vat", "is_export_vat"]} onSetColumnsSpy={onSetColumns} />,
    );

    await user.click(screen.getByLabelText("Bật/tắt nhóm Hoá đơn VAT"));

    expect(onSetColumns).toHaveBeenCalledWith(["invoice_code"]);
  });

  /**
   * Bảng không còn cột nào thì không hiển thị được gì — đây là ràng buộc đã có
   * từ `toggleOrderColumn`, ColumnManager phải không phá được nó qua nút gỡ (X)
   * lẫn qua thao tác tắt cả nhóm.
   */
  it("không cho gỡ cột cuối cùng", async () => {
    const onSetColumns = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={["invoice_code"]} onSetColumnsSpy={onSetColumns} />);

    const removeButton = within(visiblePane()).getByRole("button", {
      name: "Ẩn cột: Mã hoá đơn",
    });
    expect(removeButton.hasAttribute("disabled")).toBe(true);

    await user.click(screen.getByLabelText("Bật/tắt nhóm Đơn & hoá đơn"));
    // Nhóm đang 1/2 nên click này là BẬT cả nhóm, không phải tắt.
    expect(onSetColumns).toHaveBeenCalledWith(["invoice_code", "shipping_code"]);
  });

  it("gỡ cột bằng nút X ở panel phải", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["invoice_code", "name"]} />);

    await user.click(within(visiblePane()).getByRole("button", { name: "Ẩn cột: Tên khách hàng" }));

    expect(within(visiblePane()).queryByText("Tên khách hàng")).toBeNull();
    expect(screen.getByTestId("column-manager-counter").textContent).toBe("Đang hiện 1/6");
  });
});

describe("ColumnManager — preset & khôi phục", () => {
  it("áp preset ghi đè cả danh sách và bỏ qua cột không khả dụng", async () => {
    const onSetColumns = vi.fn();
    const user = userEvent.setup();

    render(
      <ColumnManager<Key>
        open
        onOpenChange={() => {}}
        options={OPTIONS.filter((option) => option.group !== "vat")}
        groups={GROUPS}
        visible={["invoice_code"]}
        presets={[
          // "vat" không nằm trong options ở ngữ cảnh này -> phải bị lọc bỏ.
          { key: "sale", label: "Sale", columns: ["name", "phone", "vat"] },
        ]}
        onToggle={() => {}}
        onSetColumns={onSetColumns}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sale" }));

    expect(onSetColumns).toHaveBeenCalledWith(["name", "phone"]);
  });

  it("nút khôi phục mặc định gọi đúng handler", async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={["invoice_code", "name", "phone"]} onResetSpy={onReset} />);

    await user.click(screen.getByRole("button", { name: /Khôi phục mặc định/ }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("column-manager-counter").textContent).toBe("Đang hiện 1/6");
  });

  it("không hiện nút khôi phục khi trang không truyền onReset", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /Khôi phục mặc định/ })).toBeNull();
  });
});
