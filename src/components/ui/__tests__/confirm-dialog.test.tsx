import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";

import { ConfirmProvider } from "../confirm-dialog";
import { useConfirm, type ConfirmFn, type ConfirmOptions } from "@/hooks/use-confirm";
import { I18nProvider } from "@/i18n";

function Harness({
  options,
  onResult,
}: {
  options: ConfirmOptions;
  onResult: (ok: boolean) => void;
}) {
  const confirm = useConfirm();
  return (
    <button type="button" onClick={async () => onResult(await confirm(options))}>
      Mở
    </button>
  );
}

function renderHarness(options: ConfirmOptions) {
  const results: boolean[] = [];
  render(
    <I18nProvider>
      <ConfirmProvider>
        <Harness options={options} onResult={(ok) => results.push(ok)} />
      </ConfirmProvider>
    </I18nProvider>,
  );
  return results;
}

// Lấy hàm confirm ra ngoài để gọi trực tiếp (kiểm tra gọi liên tiếp / thiếu provider).
function Capture({ onReady }: { onReady: (fn: ConfirmFn) => void }) {
  const confirm = useConfirm();
  useEffect(() => onReady(confirm), [confirm, onReady]);
  return null;
}

describe("ConfirmDialog / useConfirm", () => {
  it("hiện alertdialog có tiêu đề + mô tả, focus mặc định nút Huỷ", async () => {
    const user = userEvent.setup();
    renderHarness({ title: "Xoá phiếu?", description: "Không hoàn tác được." });

    await user.click(screen.getByRole("button", { name: "Mở" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Xoá phiếu?" });
    expect(dialog).toHaveAccessibleDescription("Không hoàn tác được.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Hủy" })).toHaveFocus());
  });

  it("bấm xác nhận → resolve true và đóng dialog", async () => {
    const user = userEvent.setup();
    const results = renderHarness({ title: "Lưu?", confirmText: "Đồng ý" });

    await user.click(screen.getByRole("button", { name: "Mở" }));
    await user.click(await screen.findByRole("button", { name: "Đồng ý" }));

    await waitFor(() => expect(results).toEqual([true]));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("Huỷ hoặc Escape → resolve false", async () => {
    const user = userEvent.setup();
    const results = renderHarness({ title: "Xoá?" });

    await user.click(screen.getByRole("button", { name: "Mở" }));
    await user.click(await screen.findByRole("button", { name: "Hủy" }));
    await waitFor(() => expect(results).toEqual([false]));

    await user.click(screen.getByRole("button", { name: "Mở" }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(results).toEqual([false, false]));
  });

  it("destructive → nút xác nhận mặc định 'Xóa' với variant destructive", async () => {
    const user = userEvent.setup();
    renderHarness({ title: "Xoá?", destructive: true });

    await user.click(screen.getByRole("button", { name: "Mở" }));

    expect(await screen.findByRole("button", { name: "Xóa" })).toHaveClass("bg-destructive");
  });

  it("gọi lần mới khi lần trước chưa trả lời → lần trước resolve false", async () => {
    let confirmRef: ConfirmFn | null = null;
    const capture = (fn: ConfirmFn) => {
      confirmRef = fn;
    };
    render(
      <I18nProvider>
        <ConfirmProvider>
          <Capture onReady={capture} />
        </ConfirmProvider>
      </I18nProvider>,
    );

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = confirmRef!({ title: "Lần 1" });
    });
    act(() => {
      second = confirmRef!({ title: "Lần 2" });
    });

    await expect(first).resolves.toBe(false);
    expect(await screen.findByRole("alertdialog", { name: "Lần 2" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Xác nhận" }));
    await expect(second).resolves.toBe(true);
  });

  it("Escape trong confirm không lan xuống dialog bên dưới", async () => {
    const user = userEvent.setup();
    let outerClosed = false;
    function Outer() {
      const confirm = useConfirm();
      return (
        <button type="button" onClick={() => void confirm({ title: "Chắc chưa?" })}>
          Mở
        </button>
      );
    }
    // Sheet/Dialog nghe Escape ở document (bubble) — giả lập bằng listener cùng kiểu.
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") outerClosed = true;
    };
    document.addEventListener("keydown", onDocKey);
    render(
      <I18nProvider>
        <ConfirmProvider>
          <Outer />
        </ConfirmProvider>
      </I18nProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Mở" }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(outerClosed).toBe(false);
    document.removeEventListener("keydown", onDocKey);
  });

  it("không có provider → lời gọi reject (không treo)", async () => {
    let confirmRef: ConfirmFn | null = null;
    const capture = (fn: ConfirmFn) => {
      confirmRef = fn;
    };
    render(<Capture onReady={capture} />);
    await expect(confirmRef!({ title: "x" })).rejects.toThrow(/ConfirmProvider/);
  });
});
