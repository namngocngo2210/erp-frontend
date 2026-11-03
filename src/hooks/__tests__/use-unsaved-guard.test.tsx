import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { I18nProvider } from "@/i18n";

function Harness({ dirty, onResult }: { dirty: boolean; onResult: (ok: boolean) => void }) {
  const confirmLeave = useUnsavedGuard(dirty);
  return (
    <button type="button" onClick={async () => onResult(await confirmLeave())}>
      Rời
    </button>
  );
}

function renderHarness(dirty: boolean) {
  const results: boolean[] = [];
  render(
    <I18nProvider>
      <ConfirmProvider>
        <Harness dirty={dirty} onResult={(ok) => results.push(ok)} />
      </ConfirmProvider>
    </I18nProvider>,
  );
  return results;
}

describe("useUnsavedGuard", () => {
  it("không có thay đổi → cho đi ngay, không hỏi", async () => {
    const user = userEvent.setup();
    const results = renderHarness(false);

    await user.click(screen.getByRole("button", { name: "Rời" }));

    await waitFor(() => expect(results).toEqual([true]));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("có thay đổi → hỏi; 'Ở lại' giữ nguyên, 'Bỏ thay đổi' cho đi", async () => {
    const user = userEvent.setup();
    const results = renderHarness(true);

    await user.click(screen.getByRole("button", { name: "Rời" }));
    expect(await screen.findByRole("alertdialog", { name: "Có thay đổi chưa lưu" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Ở lại" }));
    await waitFor(() => expect(results).toEqual([false]));

    await user.click(screen.getByRole("button", { name: "Rời" }));
    await user.click(await screen.findByRole("button", { name: "Bỏ thay đổi" }));
    await waitFor(() => expect(results).toEqual([false, true]));
  });
});
