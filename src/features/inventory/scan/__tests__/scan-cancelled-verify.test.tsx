import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";

// Backend xác minh realtime với KiotViet ở luồng XUẤT: 409 order_cancelled /
// 503 verify_unavailable. Luồng NHẬP hoàn (mode=return) KHÔNG bị chặn — đơn hủy
// thì hàng vẫn quay về kho.

vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

vi.mock("@/services/http", async () => {
  const { scanFetchJson } = await import("./scan-test-utils");
  return { fetchJson: vi.fn(scanFetchJson) };
});

import { toast } from "sonner";

import { ScanDispatchDialog } from "../ScanDispatchDialog";
import { ScanReturnDialog } from "../ScanReturnDialog";
import {
  apiError,
  lookupOutcomes,
  lookupUrls,
  resetScanHttp,
  order,
  renderScanDialog,
  scan,
} from "./scan-test-utils";

const toastError = vi.mocked(toast.error);

function errorMessages(): string[] {
  return toastError.mock.calls.map((c) => String(c[0]));
}

beforeEach(() => {
  vi.clearAllMocks();
  resetScanHttp();
});

describe("ScanDispatchDialog — lỗi xác minh từ backend", () => {
  it("409 order_cancelled → toast tiếng Việt nêu mã đơn, không thêm dòng", async () => {
    lookupOutcomes.set("SPXC01", apiError(409, { detail: "order_cancelled", order_code: "DH999" }));
    renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXC01");

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(errorMessages()).toContain("Đơn DH999 đã hủy — không thể xuất kho.");
    expect(screen.getByText("Chưa quét đơn nào.")).toBeInTheDocument();
    expect(screen.queryByText("SPXC01")).toBeNull();
  });

  it("503 verify_unavailable → toast 'chưa xác minh được với KiotViet', không thêm dòng", async () => {
    lookupOutcomes.set("SPXV01", apiError(503, { detail: "verify_unavailable" }));
    renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXV01");

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(errorMessages()).toContain(
      "Chưa xác minh được đơn của mã SPXV01 với KiotViet — chưa cho xuất kho. Thử quét lại.",
    );
    expect(screen.getByText("Chưa quét đơn nào.")).toBeInTheDocument();
  });

  it("503 hạ tầng (nginx, không có detail) → KHÔNG đổ lỗi cho KiotViet", async () => {
    lookupOutcomes.set("SPXV02", apiError(503, null));
    renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXV02");

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    const messages = errorMessages();
    expect(messages.some((m) => m.includes("KiotViet"))).toBe(false);
    expect(messages.join(" ")).toContain("SPXV02");
    expect(screen.getByText("Chưa quét đơn nào.")).toBeInTheDocument();
  });

  it("409 không phải order_cancelled → hiện lỗi chung, không nói 'đã hủy'", async () => {
    lookupOutcomes.set("SPXC02", apiError(409, { detail: "something_else" }));
    renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXC02");

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(errorMessages().some((m) => m.includes("đã hủy"))).toBe(false);
  });

  it("tra mã bằng mode=dispatch (dính gate xác minh)", async () => {
    lookupOutcomes.set("SPXM01", order(5, "SPXM01"));
    renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXM01");

    await screen.findByText("SPXM01");
    expect(lookupUrls[0]).toContain("mode=dispatch");
  });

  it("trạng thái đơn hiện tiếng Việt theo status số, không dùng status_label tiếng Anh của BE", async () => {
    lookupOutcomes.set(
      "SPXL01",
      order(6, "SPXL01", { status: 1, status_label: "Pending processing" }),
    );
    renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXL01");

    await screen.findByText("SPXL01");
    expect(screen.getByText("Chờ xử lý")).toBeInTheDocument();
    expect(screen.queryByText("Pending processing")).toBeNull();
  });

  it("đơn hủy theo DB (status=6, lookup 200) → chặn ở FE, không thêm dòng", async () => {
    lookupOutcomes.set("SPXC03", order(7, "SPXC03", { status: 6, status_label: "Đã hủy" }));
    renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXC03");

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(errorMessages()).toContain("Đơn DH7 đã hủy — không thể xuất kho.");
    expect(screen.getByText("Chưa quét đơn nào.")).toBeInTheDocument();
  });
});

describe("ScanReturnDialog — đơn hủy vẫn nhập hoàn được", () => {
  it("đơn status=6 / invoice_status=2 → vẫn thêm dòng, không toast lỗi", async () => {
    lookupOutcomes.set(
      "SPXR09",
      order(8, "SPXR09", { status: 6, status_label: "Đã hủy", invoice_status: 2 }),
    );
    renderScanDialog(<ScanReturnDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXR09");

    await screen.findByText("SPXR09");
    expect(screen.getByText("DH8")).toBeInTheDocument();
    expect(screen.queryByText("Chưa khớp đơn")).toBeNull();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("tra mã bằng mode=return (KHÔNG dính gate xác minh của backend)", async () => {
    lookupOutcomes.set("SPXR10", order(9, "SPXR10"));
    renderScanDialog(<ScanReturnDialog open onOpenChange={() => {}} />, { i18n: true });
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXR10");

    await screen.findByText("SPXR10");
    expect(lookupUrls[0]).toContain("mode=return");
    expect(lookupUrls[0]).not.toContain("mode=dispatch");
  });
});
