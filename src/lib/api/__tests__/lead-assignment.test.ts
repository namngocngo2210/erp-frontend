import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  getLeadAssignment,
  saveLeadAssignment,
  deleteLeadAssignmentDay,
  getWorkload,
  transferOrders,
} from "@/lib/api/lead-assignment";

vi.mock("@/services/http", () => ({ fetchJson: vi.fn() }));
import { fetchJson } from "@/services/http";

describe("lead-assignment api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getLeadAssignment hits shares url with date and shift", async () => {
    (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue({
      date: "2026-06-13",
      shift: "morning",
      current_shift: "morning",
      sheets: [],
      rows: [],
    });
    await getLeadAssignment("2026-06-13", "morning");
    expect(fetchJson).toHaveBeenCalledWith(
      "/api/orders/lead-assignment/shares?date=2026-06-13&shift=morning",
    );
  });

  it("saveLeadAssignment PUTs rows", async () => {
    (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue({
      date: "2026-06-13",
      shift: "morning",
      current_shift: "morning",
      sheets: [],
      rows: [],
    });
    await saveLeadAssignment({
      date: "2026-06-13",
      shift: "morning",
      rows: [{ user_id: 1, weights: { sheet1: 50 } }],
    });
    expect(fetchJson).toHaveBeenCalledWith("/api/orders/lead-assignment/shares", {
      method: "PUT",
      body: JSON.stringify({
        date: "2026-06-13",
        shift: "morning",
        rows: [{ user_id: 1, weights: { sheet1: 50 } }],
      }),
    });
  });

  it("deleteLeadAssignmentDay DELETEs whole day by date", async () => {
    (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue({ deleted: 3, date: "2026-06-19" });
    await deleteLeadAssignmentDay("2026-06-19");
    expect(fetchJson).toHaveBeenCalledWith("/api/orders/lead-assignment/shares?date=2026-06-19", {
      method: "DELETE",
    });
  });

  it("getWorkload hits workload url with date", async () => {
    (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue({ sheet: "sheet1", items: [] });
    await getWorkload("sheet1", "2026-06-16");
    expect(fetchJson).toHaveBeenCalledWith(
      "/api/orders/lead-assignment/workload?sheet=sheet1&date=2026-06-16",
    );
  });

  it("transferOrders POSTs body with date", async () => {
    (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue({ transferred_count: 2 });
    await transferOrders({
      sheet: "sheet1",
      from_user_id: 1,
      to_user_id: 2,
      count: 2,
      date: "2026-06-16",
    });
    expect(fetchJson).toHaveBeenCalledWith("/api/orders/lead-assignment/transfer", {
      method: "POST",
      body: JSON.stringify({
        sheet: "sheet1",
        from_user_id: 1,
        to_user_id: 2,
        count: 2,
        date: "2026-06-16",
      }),
    });
  });
});
