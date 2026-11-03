import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { onCodeHolder } = vi.hoisted(() => ({ onCodeHolder: { current: (_code: string) => {} } }));
vi.mock("@/features/inventory/scan/CameraScanner", () => ({
  CameraScanner: ({ onCode }: { onCode: (code: string) => void }) => {
    onCodeHolder.current = onCode;
    return <div data-testid="camera-scanner-stub" />;
  },
}));

import { PortalScanButton } from "@/features/warranty-portal/components/PortalScanButton";

afterEach(() => {
  cleanup();
});

function stubCamera() {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  });
}

describe("PortalScanButton", () => {
  it("hiện nút khi trình duyệt hỗ trợ camera", () => {
    stubCamera();
    render(<PortalScanButton onDetected={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Quét mã trên tem/i })).toBeTruthy();
  });

  it("không render nút khi trình duyệt không có getUserMedia", () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    render(<PortalScanButton onDetected={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Quét mã trên tem/i })).toBeNull();
  });

  it("bấm mở overlay quét, quét được mã thì trích mã và tự đóng", async () => {
    stubCamera();
    const onDetected = vi.fn();
    render(<PortalScanButton onDetected={onDetected} />);

    fireEvent.click(screen.getByRole("button", { name: /Quét mã trên tem/i }));
    await waitFor(() => expect(screen.getByTestId("camera-scanner-stub")).toBeTruthy());

    onCodeHolder.current("http://qcheck.vn/A8K2M4P9QX");

    expect(onDetected).toHaveBeenCalledWith("A8K2M4P9QX");
    await waitFor(() => expect(screen.queryByTestId("camera-scanner-stub")).toBeNull());
  });
});
