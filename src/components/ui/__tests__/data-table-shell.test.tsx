import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render-with-i18n";

import { DataTableShell } from "../data-table-shell";

describe("DataTableShell — skeleton khi tải lần đầu", () => {
  it("loading: thay thân bảng bằng hàng skeleton, vẫn giữ toolbar", () => {
    const { container } = renderWithI18n(
      <DataTableShell toolbar={<button type="button">Lọc</button>} loading>
        <table aria-label="bảng" />
      </DataTableShell>,
    );
    expect(screen.getByRole("button", { name: "Lọc" })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    // Mặc định 8 hàng dữ liệu giả (+ 1 hàng header) để giữ chiều cao.
    const status = screen.getByRole("status");
    expect(status.querySelectorAll(":scope > div:last-child > div")).toHaveLength(8);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
  });

  it("skeletonRows / skeletonColumns tuỳ chỉnh", () => {
    renderWithI18n(
      <DataTableShell loading skeletonRows={3} skeletonColumns={4}>
        <table aria-label="bảng" />
      </DataTableShell>,
    );
    const rows = screen.getByRole("status").querySelectorAll(":scope > div:last-child > div");
    expect(rows).toHaveLength(3);
    expect(rows[0].children).toHaveLength(4);
  });

  it("không loading: render children, không có skeleton", () => {
    const { container } = renderWithI18n(
      <DataTableShell>
        <table aria-label="bảng" />
      </DataTableShell>,
    );
    expect(screen.getByRole("table", { name: "bảng" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.firstElementChild).not.toHaveAttribute("aria-busy");
  });

  it("children null: EmptyState khi không loading, ẩn khi đang loading", () => {
    const { unmount } = renderWithI18n(<DataTableShell>{null}</DataTableShell>);
    expect(screen.getByText("Trống")).toBeTruthy();
    unmount();
    renderWithI18n(<DataTableShell loading>{null}</DataTableShell>);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByText("Trống")).toBeNull();
  });
});
