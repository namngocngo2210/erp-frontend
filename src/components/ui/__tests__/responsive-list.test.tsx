import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { mockViewportWidth, restoreViewport } from "@/test/viewport";

import { ResponsiveList } from "../responsive-list";

afterEach(() => {
  cleanup();
  restoreViewport();
});

function renderList() {
  return render(
    <ResponsiveList
      items={["A", "B"]}
      table={<table aria-label="bảng" />}
      renderCard={(item) => <p>thẻ {item}</p>}
    />,
  );
}

describe("ResponsiveList — ngưỡng bảng ↔ thẻ ở `lg` (1024px)", () => {
  it.each([375, 768, 1023])("%ipx: danh sách thẻ", (width) => {
    mockViewportWidth(width);
    renderList();
    expect(screen.getByText("thẻ A")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it.each([1024, 1280])("%ipx: bảng", (width) => {
    mockViewportWidth(width);
    renderList();
    expect(screen.getByRole("table", { name: "bảng" })).toBeTruthy();
    expect(screen.queryByText("thẻ A")).toBeNull();
  });
});
