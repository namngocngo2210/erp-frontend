import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";

vi.mock("../scan/scan-sound", () => ({
  beepError: vi.fn(),
  beepSuccess: vi.fn(),
}));

vi.mock("@/services/http", async () => {
  const { scanFetchJson } = await import("../scan/__tests__/scan-test-utils");
  return { fetchJson: vi.fn(scanFetchJson) };
});

import { mockViewport, mockViewportWidth, restoreViewport } from "@/test/viewport";

import { ScanDispatchDialog } from "@/features/inventory/scan/ScanDispatchDialog";
import {
  lookupOutcomes,
  order,
  renderScanDialog,
  resetScanHttp,
  scan,
} from "../scan/__tests__/scan-test-utils";

function renderDialog() {
  return renderScanDialog(<ScanDispatchDialog open onOpenChange={() => {}} />, { i18n: true });
}

/** Quét 1 mã có sẵn kết quả lookup → dialog có đúng 1 dòng đã quét. */
async function scanOneOrder() {
  lookupOutcomes.set(
    "GY83XRR4",
    order(1, "GY83XRR4", {
      items: [{ product_id: 1, sku: "TMS01-PROMAX", name: "Thảm massage toàn thân", quantity: 1 }],
    }),
  );
  const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
  scan(input, "GY83XRR4");
  await screen.findByText("GY83XRR4");
}

beforeEach(() => {
  vi.clearAllMocks();
  resetScanHttp();
});

afterEach(() => {
  cleanup();
  restoreViewport();
});

describe("ScanDispatchDialog — chọn nút quét theo viewport", () => {
  it("mobile: hiện nút quét bằng camera, ẩn nút nối QR điện thoại", async () => {
    mockViewport(true);
    renderDialog();
    expect(await screen.findByRole("button", { name: /Quét bằng camera/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Dùng điện thoại để quét/ })).toBeNull();
  });

  it("desktop: không render nút camera lẫn nút QR — chỉ còn ô nhập quét", async () => {
    mockViewport(false);
    renderDialog();
    expect(await screen.findByPlaceholderText("Quét mã vận đơn…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Quét bằng camera/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Dùng điện thoại để quét/ })).toBeNull();
  });

  it("tablet 800px: vẫn là desktop với camera (ngưỡng camera giữ <768)", async () => {
    mockViewportWidth(800);
    renderDialog();
    expect(await screen.findByPlaceholderText("Quét mã vận đơn…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Quét bằng camera/ })).toBeNull();
  });

  it("mobile: ô nhập quét không tự focus (tránh bàn phím ảo tự bật)", async () => {
    mockViewport(true);
    renderDialog();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    expect(document.activeElement).not.toBe(input);
  });
});

describe("ScanDispatchDialog — danh sách đã quét theo viewport", () => {
  // Đây là màn chạy trên điện thoại nhiều nhất của phần kho. Bảng 4 cột trước đây
  // không có vùng cuộn riêng nên cột Trạng thái và nút Xoá tràn khỏi thân dialog.
  it("mobile: dòng đã quét là thẻ — đọc được mã SP, trạng thái và nút xoá, không có bảng", async () => {
    mockViewport(true);
    renderDialog();
    await scanOneOrder();

    expect(screen.getByText(/TMS01-PROMAX/)).toBeInTheDocument();
    // Nhãn trạng thái đi qua i18n (status.11), không phải status_label của payload.
    expect(screen.getByText("Chờ chuyển hàng")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xoá GY83XRR4/ })).toBeInTheDocument();
    expect(document.querySelector("table")).toBeNull();
  });

  it("desktop: vẫn giữ nguyên bảng đã quét", async () => {
    mockViewport(false);
    renderDialog();
    await scanOneOrder();

    expect(document.querySelector("table")).not.toBeNull();
    expect(screen.getByText(/TMS01-PROMAX/)).toBeInTheDocument();
  });
});
