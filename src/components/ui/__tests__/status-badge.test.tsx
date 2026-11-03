import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it.each([
    ["success", "text-action-success"],
    ["warning", "text-action-warning"],
    ["danger", "text-action-danger"],
    ["info", "text-action-info"],
    ["neutral", "text-muted-foreground"],
  ] as const)("tone %s dùng token %s", (tone, cls) => {
    render(<StatusBadge tone={tone}>Nhãn</StatusBadge>);
    const badge = screen.getByText("Nhãn");
    expect(badge).toHaveClass(cls);
    expect(badge).toHaveAttribute("data-tone", tone);
  });

  it("mặc định neutral, nhận className bổ sung", () => {
    render(<StatusBadge className="ml-2">Mặc định</StatusBadge>);
    const badge = screen.getByText("Mặc định");
    expect(badge).toHaveAttribute("data-tone", "neutral");
    expect(badge).toHaveClass("ml-2", "text-xs");
  });
});
