import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// CameraScanner thật đụng navigator.mediaDevices — thay bằng stub bắn mã giả.
vi.mock("@/features/inventory/scan/CameraScanner", () => ({
  CameraScanner: ({ onCode }: { onCode: (c: string) => void }) => (
    <button type="button" onClick={() => onCode("VD12345")}>
      fake-scan
    </button>
  ),
}));

import { CameraScanButton } from "@/features/inventory/scan/CameraScanButton";

describe("CameraScanButton", () => {
  afterEach(() => cleanup());

  it("mở overlay camera, đếm mã quét được và gọi onScan", async () => {
    const user = userEvent.setup();
    const onScan = vi.fn();
    render(<CameraScanButton onScan={onScan} />);

    // Chưa mở → không có camera
    expect(screen.queryByText("fake-scan")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Quét bằng camera/ }));
    expect(screen.getByText("Đưa mã vạch vào khung để quét")).toBeTruthy();
    expect(screen.getByText("Đã quét 0 mã")).toBeTruthy();

    await user.click(screen.getByText("fake-scan"));
    expect(onScan).toHaveBeenCalledWith("VD12345");
    expect(screen.getByText("Đã quét 1 mã")).toBeTruthy();
  });

  it("bấm Xong đóng overlay và unmount camera; mở lại reset bộ đếm", async () => {
    const user = userEvent.setup();
    render(<CameraScanButton onScan={() => {}} />);

    await user.click(screen.getByRole("button", { name: /Quét bằng camera/ }));
    await user.click(screen.getByText("fake-scan"));
    expect(screen.getByText("Đã quét 1 mã")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Xong" }));
    expect(screen.queryByText("fake-scan")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Quét bằng camera/ }));
    expect(screen.getByText("Đã quét 0 mã")).toBeTruthy();
  });
});
