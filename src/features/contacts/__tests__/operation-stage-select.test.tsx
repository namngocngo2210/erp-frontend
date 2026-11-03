import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OperationCell } from "@/features/contacts/components/OperationCell";
import type { ContactOperation } from "@/lib/api/contacts";

const STAGE_OPTIONS = [
  { value: "1", label: "Gọi lần đầu" },
  { value: "7", label: "D7" },
  { value: "30", label: "D30" },
];

function operation(overrides: Partial<ContactOperation> = {}): ContactOperation {
  return {
    stage_name: "Gọi lần đầu",
    stage_color: "#0ea5e9",
    allow_edit_due: true,
    due_at: "2026-08-19T01:51:00Z",
    bucket: "overdue",
    ...overrides,
  } as ContactOperation;
}

afterEach(() => cleanup());

/** Ô combobox của SearchableSelect — tên a11y LÀ `aria-label`, không phải nhãn đang
 * hiện, nên phải tra bằng aria-label rồi mới xem nhãn hiển thị bên cạnh. */
const trigger = () => screen.getByRole("combobox", { name: "Chọn tác nghiệp" });
/** Vùng hiển thị giá trị/placeholder (span nằm cạnh input). */
const shown = () => trigger().parentElement as HTMLElement;

describe("OperationCell — ô chọn bước tác nghiệp", () => {
  it("hiển thị bước hiện tại trong ô chọn", () => {
    render(<OperationCell operation={operation()} stageOptions={STAGE_OPTIONS} />);
    expect(shown()).toHaveTextContent("Gọi lần đầu");
  });

  it("chọn bước khác phát onSelectStage với id của bước", async () => {
    const onSelectStage = vi.fn();
    render(
      <OperationCell
        operation={operation()}
        stageOptions={STAGE_OPTIONS}
        onSelectStage={onSelectStage}
      />,
    );
    const user = userEvent.setup();

    await user.click(trigger());
    await user.click(screen.getByText("D7"));

    // Số, không phải chuỗi: payload BE khai `stage_id: integer`.
    expect(onSelectStage).toHaveBeenCalledWith(7);
  });

  it("khách CHƯA vào flow vẫn chọn được bước", async () => {
    const onSelectStage = vi.fn();
    render(
      <OperationCell
        operation={operation({
          stage_name: "",
          stage_color: "",
          due_at: null,
          bucket: "none",
          allow_edit_due: false,
        })}
        stageOptions={STAGE_OPTIONS}
        onSelectStage={onSelectStage}
      />,
    );
    const user = userEvent.setup();

    await user.click(trigger());
    await user.click(screen.getByText("D30"));

    expect(onSelectStage).toHaveBeenCalledWith(30);
  });

  it("khách chưa vào flow không hiện giờ hẹn lẫn nút sửa giờ", () => {
    render(
      <OperationCell
        operation={operation({ stage_name: "", due_at: null, bucket: "none" })}
        stageOptions={STAGE_OPTIONS}
      />,
    );
    expect(screen.queryByRole("button", { name: "Sửa giờ hẹn" })).not.toBeInTheDocument();
  });

  it("khoá ô chọn khi dòng này đang lưu", () => {
    render(<OperationCell operation={operation()} stageOptions={STAGE_OPTIONS} selectDisabled />);
    expect(trigger()).toBeDisabled();
  });

  it("bước đã bị tắt (không còn trong danh sách) hiện placeholder chứ không vỡ", () => {
    render(
      <OperationCell
        operation={operation({ stage_name: "Bước đã tắt" })}
        stageOptions={STAGE_OPTIONS}
      />,
    );
    expect(shown()).toHaveTextContent("Chọn tác nghiệp");
    expect(shown()).not.toHaveTextContent("Bước đã tắt");
  });
});
