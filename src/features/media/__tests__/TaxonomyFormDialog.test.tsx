import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";

import { renderWithI18n } from "@/test/render-with-i18n";
import type { MediaTaxonomyItem } from "@/lib/api/media";

import { TaxonomyFormDialog } from "../components/TaxonomyFormDialog";

describe("TaxonomyFormDialog", () => {
  it("group products, để trống Mã → báo lỗi, không gọi onSubmit", () => {
    const onSubmit = vi.fn();
    renderWithI18n(
      <TaxonomyFormDialog open onOpenChange={() => {}} group="products" onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Mã bắt buộc.")).toBeInTheDocument();
  });

  it("group content-types, có tên nhưng chưa chọn nhóm → báo lỗi Chọn nhóm", () => {
    const onSubmit = vi.fn();
    renderWithI18n(
      <TaxonomyFormDialog open onOpenChange={() => {}} group="content-types" onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByLabelText(/^Tên$/), { target: { value: "Review" } });
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Chọn nhóm.")).toBeInTheDocument();
  });

  it("group ad-channels: điền tên → payload chỉ { name }, không có is_active", () => {
    const onSubmit = vi.fn();
    renderWithI18n(
      <TaxonomyFormDialog open onOpenChange={() => {}} group="ad-channels" onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByLabelText(/^Tên$/), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "X" });
  });

  it("sửa: có initial → hiện Switch is_active, payload gồm is_active", () => {
    const onSubmit = vi.fn();
    const initial: MediaTaxonomyItem = { id: 3, name: "Facebook Ads", is_active: true };
    renderWithI18n(
      <TaxonomyFormDialog
        open
        onOpenChange={() => {}}
        group="ad-channels"
        initial={initial}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByLabelText(/Đang dùng/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "Facebook Ads", is_active: true });
  });
});
