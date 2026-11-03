import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";

// Một mã có thể đang pending ở KIND KHÁC (model cho phép (code, dispatch) và
// (code, return) tồn tại đồng thời) — dialog không được coi đó là trùng của
// chính kind mình đang quét. Xem finding #2 (cross-kind false duplicate block).

vi.mock("@/services/http", async () => {
  const { scanFetchJson } = await import("./scan-test-utils");
  return { fetchJson: vi.fn(scanFetchJson) };
});

import { ScanDispatchDialog } from "../ScanDispatchDialog";
import { ScanReturnDialog } from "../ScanReturnDialog";
import { apiError, lookupOutcomes, resetScanHttp, renderScanDialog, scan } from "./scan-test-utils";

function notFoundWith(pendingScanKind?: string): Error {
  return apiError(
    404,
    pendingScanKind
      ? {
          detail: "not_found",
          pending_scan: { kind: pendingScanKind, created_at: "2026-07-06T00:00:00Z" },
        }
      : { detail: "not_found" },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  resetScanHttp();
});

describe("ScanDispatchDialog — pending_scan kind khác không bị chặn trùng", () => {
  it("kind=return (khác) → vẫn thêm dòng unmatched", async () => {
    lookupOutcomes.set("SPXR01", notFoundWith("return"));
    renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXR01");

    await screen.findByText("SPXR01");
    expect(screen.getByText("Chưa khớp đơn")).toBeInTheDocument();
  });

  it("kind=dispatch (cùng kind) → coi là trùng, không thêm dòng", async () => {
    lookupOutcomes.set("SPXD01", notFoundWith("dispatch"));
    renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXD01");

    await screen.findByText("Chưa quét đơn nào.");
    expect(screen.queryByText("SPXD01")).toBeNull();
  });
});

describe("ScanReturnDialog — pending_scan kind khác không bị chặn trùng", () => {
  it("kind=dispatch (khác) → vẫn thêm dòng unmatched", async () => {
    lookupOutcomes.set("SPXD02", notFoundWith("dispatch"));
    renderScanDialog(<ScanReturnDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXD02");

    await screen.findByText("SPXD02");
    expect(screen.getByText("Chưa khớp đơn")).toBeInTheDocument();
  });

  it("kind=return (cùng kind) → coi là trùng, không thêm dòng", async () => {
    lookupOutcomes.set("SPXR02", notFoundWith("return"));
    renderScanDialog(<ScanReturnDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXR02");

    await screen.findByText("Chưa quét mã nào.");
    expect(screen.queryByText("SPXR02")).toBeNull();
  });
});
