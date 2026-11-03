import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClaimButton } from "@/features/floating-pool/components/ClaimButton";

describe("ClaimButton", () => {
  afterEach(() => cleanup());

  it("disabled khi hết quota", () => {
    render(
      <ClaimButton
        customerName="Nhi Nhi"
        phone="0935***234"
        quotaExhausted
        pending={false}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /nhặt số/i })).toBeDisabled();
  });

  it("confirm rồi mới gọi onConfirm", () => {
    const onConfirm = vi.fn();
    render(
      <ClaimButton
        customerName="Nhi Nhi"
        phone="0935***234"
        quotaExhausted={false}
        pending={false}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /nhặt số/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /xác nhận/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
