import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResaleStatsPanel } from "@/features/lead-assignment/components/ResaleStatsPanel";
import type { FoxiaResaleStats } from "@/lib/api/foxia-resale";

const DATA: FoxiaResaleStats = {
  date: "2026-10-03",
  state: "no_resale_config",
  waiting: 7,
  by_status: { ok: 3, failed: 1, pending: 0, skipped_duplicate: 2, skipped_no_phone: 0 },
  by_staff: [
    { user_id: 1, username: "a", display_name: "Lan", total: 3, ok: 2, failed: 1, pending: 0 },
    { user_id: 2, username: "b", display_name: "Mai", total: 1, ok: 1, failed: 0, pending: 0 },
  ],
};

describe("ResaleStatsPanel", () => {
  it("hiện lý do chờ, số chờ, tổng đã chia và từng nhân viên", () => {
    render(<ResaleStatsPanel date="2026-10-03" data={DATA} loading={false} error={null} />);

    expect(screen.getByText("Chưa cấu hình cột Resale")).toBeInTheDocument();
    expect(screen.getByTestId("resale-waiting")).toHaveTextContent("7");
    expect(screen.getByTestId("resale-assigned")).toHaveTextContent("4");
    expect(screen.getByText("Lan")).toBeInTheDocument();
    expect(screen.getByText("Mai")).toBeInTheDocument();
  });

  it("chưa chia ai thì báo trống", () => {
    render(
      <ResaleStatsPanel
        date="2026-10-03"
        data={{ ...DATA, state: "ready", by_staff: [] }}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText("Đang chia")).toBeInTheDocument();
    expect(screen.getByText("Chưa chia cơ hội resale nào trong ngày.")).toBeInTheDocument();
  });

  it("hiện lỗi tải", () => {
    render(<ResaleStatsPanel date="2026-10-03" data={undefined} loading={false} error="Lỗi" />);
    expect(screen.getByText("Lỗi")).toBeInTheDocument();
  });
});
