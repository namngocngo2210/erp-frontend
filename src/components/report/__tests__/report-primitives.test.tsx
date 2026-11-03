import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CollapsibleTable } from "../CollapsibleTable";
import { DonutChart } from "../DonutChart";

describe("CollapsibleTable", () => {
  it("renders the label and its children", () => {
    render(
      <CollapsibleTable label="Xem bảng chi tiết">
        <span>inner content</span>
      </CollapsibleTable>,
    );
    expect(screen.getByText("Xem bảng chi tiết")).toBeInTheDocument();
    expect(screen.getByText("inner content")).toBeInTheDocument();
  });
});

const SLICES = [
  { name: "Kênh A", value: 3000, color: "#3b82f6" },
  { name: "Kênh B", value: 1000, color: "#22c55e" },
];

describe("DonutChart", () => {
  it("renders the center total and a legend row per slice with its share", () => {
    render(
      <DonutChart
        slices={SLICES}
        centerValue="4.000"
        centerLabel="Tổng doanh thu"
        formatValue={(v) => String(v)}
      />,
    );
    expect(screen.getByText("4.000")).toBeInTheDocument();
    expect(screen.getByText("Tổng doanh thu")).toBeInTheDocument();
    expect(screen.getByText("Kênh A")).toBeInTheDocument();
    expect(screen.getByText("3000 · 75.0%")).toBeInTheDocument();
    expect(screen.getByText("1000 · 25.0%")).toBeInTheDocument();
  });
});
