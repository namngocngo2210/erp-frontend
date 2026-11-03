import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WarrantyClaimsTable } from "@/features/warranty-claims/components/WarrantyClaimsTable";
import type { WarrantyClaim } from "@/features/warranty-claims/warranty-claim-types";

afterEach(cleanup);

const row = {
  id: 7,
  status: 1,
  status_label: "Đang xử lý",
  journeys: [],
  activation_date: "2026-01-15",
  expiry_date: "2028-01-15",
  warranty_days_left: -3,
  order: { id: 1, name: "Khách A", phone: "0900000001", shipping_code: "VD1" },
} as unknown as WarrantyClaim;

const renderTable = (onPatch = vi.fn().mockResolvedValue(true)) => {
  render(
    <WarrantyClaimsTable
      rows={[row]}
      orderedColumns={["activation_date", "expiry_date", "warranty_days_left"]}
      lockedColumns={[]}
      isLoading={false}
      onOpenDetail={vi.fn()}
      onPatch={onPatch}
      selectedIds={new Set()}
      onToggleRow={vi.fn()}
      onToggleAll={vi.fn()}
    />,
  );
  return onPatch;
};

describe("WarrantyClaimsTable — cột bảo hành", () => {
  it("hiển thị ngày hết hạn và trạng thái hết hạn", () => {
    renderTable();
    expect(
      screen.getByText(new Date("2028-01-15").toLocaleDateString("vi-VN")),
    ).toBeInTheDocument();
    expect(screen.getByText("Hết hạn")).toBeInTheDocument();
  });

  it("sửa ngày kích hoạt inline thì PATCH đúng payload", () => {
    const onPatch = renderTable();
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input.value).toBe("2026-01-15");

    fireEvent.change(input, { target: { value: "2026-02-20" } });
    fireEvent.blur(input);

    expect(onPatch).toHaveBeenCalledWith(7, { activation_date: "2026-02-20" });
  });

  it("xóa ngày kích hoạt thì gửi null", () => {
    const onPatch = renderTable();
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onPatch).toHaveBeenCalledWith(7, { activation_date: null });
  });

  it("inline select đủ 12 trạng thái, chọn Hoàn thành PATCH status 9", () => {
    const onPatch = vi.fn().mockResolvedValue(true);
    render(
      <WarrantyClaimsTable
        rows={[row]}
        orderedColumns={["status"]}
        lockedColumns={[]}
        isLoading={false}
        onOpenDetail={vi.fn()}
        onPatch={onPatch}
        selectedIds={new Set()}
        onToggleRow={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    const select = document.querySelector("select") as HTMLSelectElement;
    expect(select.options.length).toBe(12);
    fireEvent.change(select, { target: { value: "9" } });
    expect(onPatch).toHaveBeenCalledWith(7, { status: 9 });
  });

  it("PATCH ngày kích hoạt lỗi thì input rollback về giá trị server", async () => {
    const onPatch = renderTable(vi.fn().mockResolvedValue(false));
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;

    fireEvent.change(input, { target: { value: "2026-03-01" } });
    fireEvent.blur(input);

    expect(onPatch).toHaveBeenCalledWith(7, { activation_date: "2026-03-01" });
    await waitFor(() => expect(input.value).toBe("2026-01-15"));
  });
});
