import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AiFilledBadge } from "../AiFilledBadge";

describe("AiFilledBadge", () => {
  it("không render gì khi field không do AI điền", () => {
    const { container } = render(<AiFilledBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it("hiện nhãn AI và trích dẫn làm căn cứ", () => {
    render(
      <AiFilledBadge
        info={{ call_record_id: 7, quote: "em 45 tuổi", at: "2026-07-24T09:00:00+07:00" }}
      />,
    );
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByLabelText(/em 45 tuổi/)).toBeInTheDocument();
  });
});
