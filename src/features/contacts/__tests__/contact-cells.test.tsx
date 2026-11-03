import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/contacts", () => ({
  getContactActivities: vi.fn(),
  createContactActivity: vi.fn(),
}));

import { getContactActivities } from "@/lib/api/contacts";
import type { ContactActivityItem } from "@/lib/api/contacts";
import { ContactResultSelect } from "@/features/contacts/components/ContactResultSelect";
import { ContactHistoryPopover } from "@/features/contacts/components/ContactHistoryPopover";
import { ContactSkuCell } from "@/features/contacts/components/ContactSkuCell";
import { renderWithClient } from "@/test/utils";

const OPTIONS = [
  { value: "closed", label: "Đã chốt" },
  { value: "no_answer_1", label: "Không nghe máy lần 1" },
];

describe("ContactResultSelect", () => {
  it("hiển thị nhãn hiện tại theo sales_status_code", () => {
    render(<ContactResultSelect value="closed" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: /Đã chốt/i })).toBeInTheDocument();
  });

  it("hiển thị placeholder khi chưa có kết quả", () => {
    render(<ContactResultSelect value={null} options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: /chọn kết quả/i })).toBeInTheDocument();
  });

  it("chọn option mới gọi onChange với code tương ứng", async () => {
    const onChange = vi.fn();
    render(<ContactResultSelect value="closed" options={OPTIONS} onChange={onChange} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: /Đã chốt/i }));
    await user.click(screen.getByText("Không nghe máy lần 1"));

    expect(onChange).toHaveBeenCalledWith("no_answer_1");
  });

  it("disabled khi đang xử lý (mutation pending)", () => {
    render(<ContactResultSelect value="closed" options={OPTIONS} onChange={vi.fn()} disabled />);
    expect(screen.getByRole("combobox", { name: /Đã chốt/i })).toBeDisabled();
  });
});

const mockGetActivities = vi.mocked(getContactActivities);

const statusChangeItem: ContactActivityItem = {
  type: "status_change",
  at: "2026-07-15T08:30:00Z",
  actor_name: "Nguyễn Văn A",
  note: "",
  from_code: "new",
  to_code: "contacted",
  from_label: "Mới",
  to_label: "Đã liên hệ",
  order_id: 10,
  call_meta: null,
};

const noteItem: ContactActivityItem = {
  type: "note",
  at: "2026-07-15T09:00:00Z",
  actor_name: "Trần Thị B",
  note: "Khách hẹn gọi lại chiều mai",
  from_code: null,
  to_code: null,
  from_label: null,
  to_label: null,
  order_id: null,
  call_meta: null,
};

function renderPopover() {
  return renderWithClient(
    <ContactHistoryPopover customerId={1} customerName="Nguyễn Văn C">
      <span>history-icon</span>
    </ContactHistoryPopover>,
  );
}

describe("ContactHistoryPopover", () => {
  beforeEach(() => {
    mockGetActivities.mockReset();
    mockGetActivities.mockResolvedValue({ items: [statusChangeItem, noteItem], total: 2 });
  });

  it("không gọi API khi chưa mở popover (lazy)", () => {
    renderPopover();
    expect(mockGetActivities).not.toHaveBeenCalled();
  });

  it("mở popover hiển thị dòng status_change (from → to) và note", async () => {
    renderPopover();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /lịch sử liên hệ/i }));

    expect(await screen.findByText("Mới → Đã liên hệ")).toBeInTheDocument();
    expect(screen.getByText("Khách hẹn gọi lại chiều mai")).toBeInTheDocument();
    expect(mockGetActivities).toHaveBeenCalledWith(1, expect.anything());
  });

  it("hiện trạng thái rỗng khi chưa có lịch sử", async () => {
    mockGetActivities.mockResolvedValue({ items: [], total: 0 });
    renderPopover();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /lịch sử liên hệ/i }));
    expect(await screen.findByText("Chưa có lịch sử liên hệ")).toBeInTheDocument();
  });
});

describe("ContactSkuCell", () => {
  it("hiển thị SKU duy nhất, không có badge đếm thêm", () => {
    render(<ContactSkuCell items={[{ sku: "SKU-A", product_name: "San pham A", quantity: 1 }]} />);
    expect(screen.getByText("SKU-A")).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("hiển thị SKU đầu + badge +N khi đơn nhiều dòng hàng", () => {
    render(
      <ContactSkuCell
        items={[
          { sku: "SKU-A", product_name: "San pham A", quantity: 2 },
          { sku: "SKU-B", product_name: "San pham B", quantity: 1 },
          { sku: "SKU-C", product_name: "San pham C", quantity: 3 },
        ]}
      />,
    );
    expect(screen.getByText("SKU-A")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("tooltip liệt kê đầy đủ SKU kèm số lượng", () => {
    const { container } = render(
      <ContactSkuCell
        items={[
          { sku: "SKU-A", product_name: "San pham A", quantity: 2 },
          { sku: "SKU-B", product_name: "San pham B", quantity: 1 },
        ]}
      />,
    );
    expect(container.firstChild).toHaveAttribute("title", "SKU-A ×2\nSKU-B ×1");
  });

  it("hiển thị gạch ngang khi đơn không có dòng hàng", () => {
    render(<ContactSkuCell items={[]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("bỏ qua số lượng 0 trong tooltip (đơn suy từ chuỗi SKU gộp)", () => {
    const { container } = render(
      <ContactSkuCell items={[{ sku: "SKU-X", product_name: "", quantity: 0 }]} />,
    );
    expect(container.firstChild).toHaveAttribute("title", "SKU-X");
  });

  it("fallback sang product_name khi sku rỗng, không để tooltip thừa khoảng trắng", () => {
    const { container } = render(
      <ContactSkuCell items={[{ sku: "", product_name: "San pham A", quantity: 2 }]} />,
    );
    expect(screen.getByText("San pham A")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("title", "San pham A ×2");
  });

  it("hiện gạch ngang khi cả sku lẫn product_name đều rỗng", () => {
    render(<ContactSkuCell items={[{ sku: "", product_name: "", quantity: 0 }]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
