import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContactsTable } from "@/features/contacts/components/ContactsTable";

describe("ContactsTable layout", () => {
  it("số <col> trong colgroup khớp số cột header (table-fixed lệch cột nếu thiếu)", () => {
    // Bảng dùng `table-fixed` + colgroup định bề rộng từng cột: thêm cột mà quên
    // thêm <col> thì mọi bề rộng từ cột đó trở đi trượt sang trái một ô, cột cuối
    // không còn bề rộng → text các cột cuối chèn lên nhau (lỗi cột Thời gian chờ /
    // SL đơn sau khi thêm cột Địa chỉ).
    const { container } = render(
      <ContactsTable
        rows={[]}
        loading={false}
        page={1}
        pageSize={20}
        onOpenOrder={vi.fn()}
        resultOptions={[]}
        stageOptions={[]}
        selectedIds={[]}
      />,
    );
    const cols = container.querySelectorAll("colgroup col").length;
    const headers = container.querySelectorAll("thead th").length;
    expect(cols).toBe(headers);
  });
});
