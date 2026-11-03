import type { ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

export function renderWithClient(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

/**
 * Factory body for `vi.mock("sonner", makeToastMock)`.
 * Import-safe under hoisting: creates its mock fns lazily inside the factory.
 */
export function makeToastMock() {
  return {
    toast: Object.assign(vi.fn(), {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      message: vi.fn(),
      dismiss: vi.fn(),
    }),
    Toaster: () => null,
  };
}

/**
 * Trả lời hộp xác nhận của `useConfirm()` (cần `<ConfirmProvider>` trong cây render):
 * `accept` bấm nút xác nhận (nút cuối footer), ngược lại bấm Huỷ.
 */
export async function answerConfirm(user: UserEvent, accept: boolean) {
  const dialog = await screen.findByRole("alertdialog");
  const buttons = within(dialog).getAllByRole("button");
  await user.click(accept ? buttons[buttons.length - 1] : buttons[0]);
}
