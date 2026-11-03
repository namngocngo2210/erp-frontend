import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function renderSelect(onValueChange = vi.fn(), value = "") {
  render(
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label="Nguồn">
        <SelectValue placeholder="Tất cả" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Tất cả</SelectItem>
        <SelectItem value="fb">Facebook</SelectItem>
        <SelectItem value="zalo">Zalo</SelectItem>
      </SelectContent>
    </Select>,
  );
  return onValueChange;
}

describe("Select — bàn phím", () => {
  it("↓ mở listbox, ↓/↑ tô item (aria-activedescendant), Enter chọn", async () => {
    const user = userEvent.setup();
    const onValueChange = renderSelect();
    const trigger = screen.getByRole("combobox", { name: "Nguồn" });

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // Mở ra tô item đang chọn (value "").
    expect(trigger).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Tất cả" }).id,
    );

    await user.keyboard("{ArrowDown}{ArrowDown}");
    const zalo = screen.getByRole("option", { name: "Zalo" });
    expect(trigger).toHaveAttribute("aria-activedescendant", zalo.id);
    expect(zalo).toHaveAttribute("data-highlighted");

    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("zalo");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("chọn được item có value rỗng (Tất cả)", async () => {
    const user = userEvent.setup();
    const onValueChange = renderSelect(vi.fn(), "fb");
    await user.click(screen.getByRole("combobox", { name: "Nguồn" }));
    await user.click(screen.getByRole("option", { name: "Tất cả" }));
    expect(onValueChange).toHaveBeenCalledWith("");
  });
});
