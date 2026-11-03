import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";

const LONG_LABEL =
  "MSC02-CAOCAP — Máy massage chân bấm huyệt 2 chế độ MSC02, chế độ rung và con lăn " +
  "giúp giảm đau mỏi cơ chân, tăng tuần hoàn máu, điều khiển nút bấm. Công suất: " +
  "12V/24W/50Hz, nhãn hiệu Delax. mới 100%";

describe("SearchableSelect — nhãn ô trigger", () => {
  /**
   * Nút trigger cao CỐ ĐỊNH (`h-9`). Nhãn dài mà không bị cắt sẽ tràn khỏi nút
   * và — vì wrapper của `SearchableSelect` là `position: relative` (phần tử đã
   * định vị, z-index auto) trong khi các nút bên dưới (`<Button>` của shadcn)
   * KHÔNG định vị — phần chữ tràn được vẽ ĐÈ LÊN chúng và NUỐT LUÔN cú click.
   * Đây chính là ca lỗi thật ở dialog thành phần combo: chọn một sản phẩm tên
   * dài xong thì bấm "Thêm thành phần" không ăn (click rơi vào chữ tràn của
   * dòng trên), người dùng không thêm được dòng thứ hai và tưởng là "không lưu
   * được khi chọn 2 sản phẩm".
   *
   * jsdom không tính layout nên không assert được chiều cao thật; chốt bằng hợp
   * đồng CSS: nhãn phải nằm trong phần tử có `truncate` (overflow hidden) và
   * `min-w-0` để flexbox cho phép co lại thay vì đẩy tràn.
   */
  it("cắt nhãn dài thay vì để tràn ra ngoài nút", () => {
    render(
      <SearchableSelect
        aria-label="Sản phẩm"
        value="26"
        onChange={() => {}}
        options={[{ value: "26", label: LONG_LABEL }]}
      />,
    );

    const label = screen.getByText(LONG_LABEL);
    expect(label.className).toContain("truncate");
    expect(label.className).toContain("min-w-0");
  });

  it("cắt nhãn dài trong danh sách kết quả", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn().mockResolvedValue([{ value: "26", label: LONG_LABEL }]);

    render(
      <SearchableSelect aria-label="Sản phẩm" value="" onChange={() => {}} onSearch={onSearch} />,
    );

    await user.click(screen.getByRole("combobox", { name: "Sản phẩm" }));

    const option = await screen.findByText(LONG_LABEL, {}, { timeout: 3000 });
    expect(option.className).toContain("truncate");
  });
});

const PROVINCES = [
  { value: "Hà Nội", label: "Hà Nội" },
  { value: "Hải Phòng", label: "Hải Phòng" },
  { value: "Huế", label: "Huế" },
];

describe("SearchableSelect — combobox/listbox", () => {
  it("gõ để lọc, ↓ + Enter chọn option (onSelectOption nhận object option)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSelectOption = vi.fn();
    render(
      <SearchableSelect
        aria-label="Khu vực"
        value=""
        onChange={onChange}
        onSelectOption={onSelectOption}
        options={PROVINCES}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Khu vực" });
    await user.click(combobox);
    expect(combobox).toHaveAttribute("aria-expanded", "true");
    await user.type(combobox, "h");
    expect(screen.getAllByRole("option")).toHaveLength(3);
    await user.type(combobox, "ả");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Hải Phòng"]);

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("Hải Phòng");
    expect(onSelectOption).toHaveBeenCalledWith(PROVINCES[1]);
    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-activedescendant đi theo ↑/↓ và option đang chọn có aria-selected", async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect aria-label="Khu vực" value="Huế" onChange={() => {}} options={PROVINCES} />,
    );

    const combobox = screen.getByRole("combobox", { name: "Khu vực" });
    expect(combobox).toHaveAccessibleDescription("Huế");
    combobox.focus();
    await user.keyboard("{ArrowDown}");
    const options = screen.getAllByRole("option");
    // Mở menu → active = option đang chọn.
    expect(combobox).toHaveAttribute("aria-activedescendant", options[2].id);
    expect(options[2]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(combobox).toHaveAttribute("aria-activedescendant", options[0].id);
    await user.keyboard("{ArrowUp}");
    expect(combobox).toHaveAttribute("aria-activedescendant", options[2].id);
  });

  it("creatable: từ khoá ngoài danh sách → dòng Thêm, chọn trả đúng từ khoá; value lạ vẫn hiện", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <SearchableSelect
        aria-label="Phường/Xã"
        value=""
        onChange={onChange}
        options={PROVINCES}
        creatable
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Phường/Xã" });
    await user.click(combobox);
    await user.type(combobox, "Xã Mới");
    await user.click(screen.getByRole("option", { name: 'Thêm "Xã Mới"' }));
    expect(onChange).toHaveBeenCalledWith("Xã Mới");

    // Trùng nhãn có sẵn (không phân biệt hoa thường) → không có dòng Thêm.
    await user.click(combobox);
    await user.type(combobox, "huế");
    expect(screen.queryByRole("option", { name: /Thêm/ })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    rerender(
      <SearchableSelect
        aria-label="Phường/Xã"
        value="Xã Mới"
        onChange={onChange}
        options={PROVINCES}
        creatable
      />,
    );
    expect(screen.getByText("Xã Mới")).toBeInTheDocument();
  });

  it("clearable: nút xoá gọi onChange rỗng", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect
        aria-label="Khu vực"
        value="Huế"
        onChange={onChange}
        options={PROVINCES}
        clearable
      />,
    );
    await user.click(screen.getByRole("button", { name: "Xoá lựa chọn" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("gom option theo group dưới header", async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect
        aria-label="Sản phẩm"
        value=""
        onChange={() => {}}
        options={[
          { value: "1", label: "MSC02", group: "MSC — Máy massage" },
          { value: "2", label: "DC12", group: "DC — Đệm" },
          { value: "3", label: "MSC06", group: "MSC — Máy massage" },
        ]}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "Sản phẩm" }));
    const group = screen.getByRole("group", { name: "MSC — Máy massage" });
    expect(group).toHaveTextContent("MSC02");
    expect(group).toHaveTextContent("MSC06");
    expect(screen.getByRole("group", { name: "DC — Đệm" })).toHaveTextContent("DC12");
  });

  it("menu portal ra body; Esc trong Dialog chỉ đóng menu, không đóng Dialog", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Sửa đơn</DialogTitle>
          <SearchableSelect aria-label="Khu vực" value="" onChange={() => {}} options={PROVINCES} />
        </DialogContent>
      </Dialog>,
    );
    const combobox = screen.getByRole("combobox", { name: "Khu vực" });
    await user.click(combobox);
    const listbox = screen.getByRole("listbox");
    expect(listbox.closest('[role="dialog"]')).toBeNull();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("nằm trong fieldset disabled thì không mở menu", async () => {
    const user = userEvent.setup();
    render(
      <fieldset disabled>
        <SearchableSelect aria-label="Khu vực" value="" onChange={() => {}} options={PROVINCES} />
      </fieldset>,
    );
    await user.click(screen.getByRole("combobox", { name: "Khu vực" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
