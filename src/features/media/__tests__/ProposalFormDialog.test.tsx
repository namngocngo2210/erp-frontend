import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";

import { renderWithI18n } from "@/test/render-with-i18n";
import type { MediaProposal, MediaTaxonomyItem, TaxonomyGroup } from "@/lib/api/media";

import { ProposalFormDialog } from "../components/ProposalFormDialog";

const TAX: Record<TaxonomyGroup, MediaTaxonomyItem[]> = {
  "content-types": [],
  products: [{ id: 5, code: "SP5", name: "Serum", is_active: true }],
  "product-categories": [],
  "ad-channels": [],
  "content-sources": [],
};

const PROPOSAL: MediaProposal = {
  id: 4,
  main_key: "Từ khoá chính",
  idea: "Ý tưởng",
  due_date: "2026-10-01T00:00:00Z",
  status: "in_progress",
  product_id: 5,
  product: { id: 5, code: "SP5", name: "Serum", is_active: true },
  content_id: null,
  content: null,
  created_by: 7,
  creator: { id: 7, name: "Hùng", username: "hung" },
  created_at: "",
  updated_at: "",
};

describe("ProposalFormDialog", () => {
  it("main_key trống → báo lỗi, không gọi onSubmit", () => {
    const onSubmit = vi.fn();
    renderWithI18n(
      <ProposalFormDialog open onOpenChange={() => {}} taxonomy={TAX} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Từ khoá chính bắt buộc/)).toBeInTheDocument();
  });

  it("tạo mới: điền form → submit đủ field, KHÔNG có status; ẩn select trạng thái", () => {
    const onSubmit = vi.fn();
    renderWithI18n(
      <ProposalFormDialog open onOpenChange={() => {}} taxonomy={TAX} onSubmit={onSubmit} />,
    );
    expect(screen.queryByLabelText(/Trạng thái/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Từ khoá chính/), { target: { value: "k" } });
    fireEvent.change(screen.getByLabelText(/Ý tưởng/), { target: { value: "i" } });
    fireEvent.change(screen.getByLabelText(/Hạn hoàn thành/), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText(/Sản phẩm/), { target: { value: "Serum" } });
    fireEvent.click(screen.getByRole("option", { name: "SP5 – Serum" }));
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));

    expect(onSubmit).toHaveBeenCalledWith({
      main_key: "k",
      idea: "i",
      due_date: "2026-10-01",
      product_id: 5,
      content_id: null,
    });
  });

  it("sửa: có initial → hiện select trạng thái, payload gồm status", () => {
    const onSubmit = vi.fn();
    renderWithI18n(
      <ProposalFormDialog
        open
        onOpenChange={() => {}}
        initial={PROPOSAL}
        taxonomy={TAX}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByLabelText(/Trạng thái/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "in_progress", main_key: "Từ khoá chính" }),
    );
  });
});
