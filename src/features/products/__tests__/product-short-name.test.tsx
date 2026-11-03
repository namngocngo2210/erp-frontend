import { describe, expect, it, vi } from "vitest";
import { useState, type ChangeEvent } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@/i18n";
import { ProductFormDialog } from "../components/ProductFormDialog";
import type { ProductsPageController } from "../hooks/useProductsPage";

// Hai editor con có hook/query riêng — không liên quan tới ô tên ngắn.
vi.mock("@/features/products/components/PackagesEditor", () => ({ PackagesEditor: () => null }));
vi.mock("@/features/products/components/ComboComponentsEditor", () => ({
  ComboComponentsEditor: () => null,
}));

type FormData = ProductsPageController["formData"];

/** Controller tối thiểu: chỉ state form thật, còn lại là no-op. */
function Harness({ initial }: { initial?: Partial<FormData> }) {
  const [formData, setFormData] = useState<FormData>({
    name: "GHẾ MASSAGE OHI01 (HOÁ ĐƠN)",
    short_name: "",
    sku: "OHI01",
    is_active: true,
    packages: [],
    group_id: null,
    pancake_sync_mode: "auto",
    ...initial,
  });
  const ctrl = {
    createDialogOpen: true,
    setCreateDialogOpen: vi.fn(),
    editDialogOpen: false,
    setEditDialogOpen: vi.fn(),
    selectedProduct: null,
    combo: { loading: false, loadFailed: false, rows: [], setRows: vi.fn() },
    formData,
    setFormData,
    formErrors: {},
    setFormErrors: vi.fn(),
    submitting: false,
    priceBooks: [],
    defaultBookCode: "facebook",
    currentBookCode: "facebook",
    setActiveBookCode: vi.fn(),
    handleInputChange: (e: ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })),
    updatePackage: vi.fn(),
    updatePackagePrice: vi.fn(),
    clearPackageZeroOnFocus: vi.fn(),
    addPackageTier: vi.fn(),
    removePackageTier: vi.fn(),
    handleCreateProduct: vi.fn(),
    handleUpdateProduct: vi.fn(),
    resetForm: vi.fn(),
  } as unknown as ProductsPageController;
  return (
    <I18nProvider>
      <ProductFormDialog ctrl={ctrl} mode="create" />
    </I18nProvider>
  );
}

describe("ProductFormDialog — tên ngắn", () => {
  it("nhập tên ngắn cập nhật bộ đếm ký tự", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("Tên ngắn (bán hàng / Pancake)");
    expect(screen.getByTestId("short-name-counter")).toHaveTextContent("0/60");

    await userEvent.type(input, "Ghế OHI01");

    expect(input).toHaveValue("Ghế OHI01");
    expect(screen.getByTestId("short-name-counter")).toHaveTextContent("9/60");
    expect(screen.getByTestId("short-name-counter")).not.toHaveClass("text-action-danger");
  });

  it("vượt gợi ý 60 ký tự thì bộ đếm cảnh báo, ô chặn ở 120", () => {
    render(<Harness initial={{ short_name: "x".repeat(61) }} />);
    expect(screen.getByTestId("short-name-counter")).toHaveTextContent("61/60");
    expect(screen.getByTestId("short-name-counter")).toHaveClass("text-action-danger");
    expect(screen.getByLabelText("Tên ngắn (bán hàng / Pancake)")).toHaveAttribute(
      "maxLength",
      "120",
    );
  });
});
