import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ComboComponentsEditor } from "../components/ComboComponentsEditor";
import { comboRowsToPayload, makeComboRow, validateComboRows, type ComboRow } from "../combo-rows";

const searchProducts = vi.fn();
vi.mock("@/features/products/queries", () => ({
  useProductSearch: () => searchProducts,
}));

beforeEach(() => {
  searchProducts.mockClear();
  searchProducts.mockResolvedValue([
    { id: 2, sku: "SP-A", name: "Sản phẩm A" },
    { id: 3, sku: "SP-B", name: "Sản phẩm B" },
  ]);
});

/** Bọc editor (controlled) bằng state cục bộ để test thao tác người dùng thật. */
function Harness({ onRows }: { onRows: (rows: ComboRow[]) => void }) {
  const [rows, setRows] = useState<ComboRow[]>([]);
  return (
    <ComboComponentsEditor
      rows={rows}
      onRowsChange={(next) => {
        setRows(next);
        onRows(next);
      }}
    />
  );
}

describe("validateComboRows", () => {
  it("bỏ qua dòng chưa chọn sản phẩm", () => {
    // Dòng trống là dòng người dùng vừa bấm "Thêm thành phần" rồi bỏ dở — không
    // phải lỗi, chỉ đơn giản là không gửi lên.
    expect(validateComboRows([makeComboRow(), makeComboRow({ component_id: 2 })])).toBeNull();
  });

  it("chặn số lượng nhỏ hơn 1 và số lượng bỏ trống (NaN)", () => {
    expect(validateComboRows([makeComboRow({ component_id: 2, quantity: 0 })])).toMatch(
      /số lượng phải từ 1/i,
    );
    expect(validateComboRows([makeComboRow({ component_id: 2, quantity: NaN })])).toMatch(
      /số lượng phải từ 1/i,
    );
  });

  it("chặn khai trùng một sản phẩm", () => {
    expect(
      validateComboRows([
        makeComboRow({ component_id: 2 }),
        makeComboRow({ component_id: 2, quantity: 3 }),
      ]),
    ).toMatch(/đã có trong danh sách/i);
  });
});

describe("comboRowsToPayload", () => {
  it("loại dòng trống, giữ nguyên thứ tự và số lượng", () => {
    expect(
      comboRowsToPayload([
        makeComboRow({ component_id: 2, quantity: 1 }),
        makeComboRow(),
        makeComboRow({ component_id: 3, quantity: 4 }),
      ]),
    ).toEqual([
      { component_id: 2, quantity: 1 },
      { component_id: 3, quantity: 4 },
    ]);
  });
});

describe("ComboComponentsEditor", () => {
  it("thêm được nhiều dòng và chọn 2 sản phẩm khác nhau", async () => {
    // Ca lỗi gốc: chọn được 1 sản phẩm nhưng không thêm nổi dòng thứ hai vì nhãn
    // dài của dòng trên tràn ra và đè lên nút "Thêm thành phần" (wrapper của
    // SearchableSelect là position: relative nên được vẽ đè lên nút tĩnh bên
    // dưới, nuốt luôn cú click).
    const onRows = vi.fn();
    const user = userEvent.setup();
    render(<Harness onRows={onRows} />);

    await user.click(screen.getByRole("button", { name: /thêm thành phần/i }));
    await user.click(screen.getAllByRole("combobox", { name: /sản phẩm thành phần/i })[0]);
    await user.click(await screen.findByText("SP-A", {}, { timeout: 3000 }));

    await user.click(screen.getByRole("button", { name: /thêm thành phần/i }));
    await user.click(screen.getAllByRole("combobox", { name: /sản phẩm thành phần/i })[1]);
    await user.click(
      await waitFor(() => {
        const el = screen
          .queryAllByText("SP-B")
          .find((n) => n.className.includes("cursor-pointer"));
        if (!el) throw new Error("Kết quả tìm kiếm chưa render.");
        return el;
      }),
    );

    await waitFor(() =>
      expect(comboRowsToPayload(onRows.mock.lastCall![0])).toEqual([
        { component_id: 2, quantity: 1 },
        { component_id: 3, quantity: 1 },
      ]),
    );
  });

  it("hiển thị SKU, không kèm tên sản phẩm", async () => {
    const user = userEvent.setup();
    render(<Harness onRows={() => {}} />);

    await user.click(screen.getByRole("button", { name: /thêm thành phần/i }));
    await user.click(screen.getByRole("combobox", { name: /sản phẩm thành phần/i }));

    expect(await screen.findByText("SP-A", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(/Sản phẩm A/)).not.toBeInTheDocument();
  });
});
