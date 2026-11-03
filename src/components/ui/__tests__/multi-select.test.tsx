import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MultiSelect } from "@/components/ui/multi-select";

const CHANNELS = [
  { value: "1", label: "Facebook" },
  { value: "2", label: "Shopee" },
  { value: "3", label: "TikTok" },
];

describe("MultiSelect — combobox/listbox", () => {
  it("label htmlFor trỏ vào combobox; click option bật/tắt, giữ menu mở", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <label htmlFor="ms-channel">Kênh</label>
        <MultiSelect id="ms-channel" options={CHANNELS} selected={["1"]} onChange={onChange} />
      </>,
    );

    const combobox = screen.getByLabelText("Kênh");
    expect(combobox).toHaveAttribute("role", "combobox");
    await user.click(combobox);

    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveAttribute("aria-multiselectable", "true");
    expect(screen.getByRole("option", { name: "Facebook" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(screen.getByRole("option", { name: "Shopee" }));
    expect(onChange).toHaveBeenLastCalledWith(["1", "2"]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("bàn phím: ↓ ở ô mở menu, ↓ + Enter trong ô tìm bật option, Esc đóng và trả focus", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiSelect aria-label="Kênh" options={CHANNELS} selected={[]} onChange={onChange} />);

    const combobox = screen.getByRole("combobox", { name: "Kênh" });
    combobox.focus();
    await user.keyboard("{ArrowDown}");
    const search = screen.getByRole("textbox", { name: "Tìm" });
    expect(search).toHaveFocus();

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["2"]);
    expect(search).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Shopee" }).id,
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(combobox).toHaveFocus();
  });

  it("chip có nút bỏ chọn theo tên", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MultiSelect
        aria-label="Kênh"
        options={CHANNELS}
        selected={["1", "3"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Bỏ TikTok" }));
    expect(onChange).toHaveBeenCalledWith(["1"]);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("gom option theo group", async () => {
    const user = userEvent.setup();
    render(
      <MultiSelect
        aria-label="Nhu cầu"
        options={[
          { value: "a", label: "Đau lưng", group: "Sức khoẻ" },
          { value: "b", label: "Quà tặng", group: "Mục đích" },
          { value: "c", label: "Mất ngủ", group: "Sức khoẻ" },
        ]}
        selected={[]}
        onChange={() => {}}
        menuPortal
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "Nhu cầu" }));
    const group = screen.getByRole("group", { name: "Sức khoẻ" });
    expect(group).toHaveTextContent("Đau lưng");
    expect(group).toHaveTextContent("Mất ngủ");
  });
});
