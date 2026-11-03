import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n";

import { StarRating } from "../components/StarRating";

function renderStars(value: number, onChange?: (v: number) => void, readOnly = false) {
  return render(
    <I18nProvider>
      <StarRating value={value} onChange={onChange} readOnly={readOnly} />
    </I18nProvider>,
  );
}

describe("StarRating", () => {
  it("bấm nửa trái sao thứ 3 → 2.5; nửa phải sao thứ 3 → 3", () => {
    const onChange = vi.fn();
    renderStars(0, onChange);
    fireEvent.click(screen.getByRole("button", { name: "Chọn 2.5 sao" }));
    expect(onChange).toHaveBeenCalledWith(2.5);
    fireEvent.click(screen.getByRole("button", { name: "Chọn 3 sao" }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("có đường quay lại 0 qua nút 'Xoá điểm'", () => {
    const onChange = vi.fn();
    renderStars(4, onChange);
    fireEvent.click(screen.getByRole("button", { name: "Xoá điểm" }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("readOnly không render nút bấm nào", () => {
    renderStars(3, undefined, true);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
