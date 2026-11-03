import { createElement } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TimeField24 } from "@/components/ui/time-field-24";
import { normalizeTime24 } from "@/lib/time24";

describe("normalizeTime24", () => {
  it("chuẩn hoá về HH:MM:SS, mặc định giây :00 (floor)", () => {
    expect(normalizeTime24("09:00")).toBe("09:00:00");
    expect(normalizeTime24("21:30")).toBe("21:30:00");
    expect(normalizeTime24("23:59")).toBe("23:59:00");
    expect(normalizeTime24("00:00")).toBe("00:00:00");
  });

  it("pad số 0 và chấp nhận gõ nhanh", () => {
    expect(normalizeTime24("9")).toBe("09:00:00");
    expect(normalizeTime24("09")).toBe("09:00:00");
    expect(normalizeTime24("9:5")).toBe("09:05:00");
    expect(normalizeTime24("930")).toBe("09:30:00");
    expect(normalizeTime24("0930")).toBe("09:30:00");
    expect(normalizeTime24("1730")).toBe("17:30:00");
  });

  it("fillSeconds='ceil' điền :59 khi không gõ giây (giờ kết thúc ca)", () => {
    expect(normalizeTime24("17:29", { fillSeconds: "ceil" })).toBe("17:29:59");
    expect(normalizeTime24("23:59", { fillSeconds: "ceil" })).toBe("23:59:59");
    expect(normalizeTime24("1129", { fillSeconds: "ceil" })).toBe("11:29:59");
  });

  it("tôn trọng giây gõ tường minh (bỏ qua fillSeconds)", () => {
    expect(normalizeTime24("17:29:30")).toBe("17:29:30");
    expect(normalizeTime24("17:29:30", { fillSeconds: "ceil" })).toBe("17:29:30");
    expect(normalizeTime24("235959")).toBe("23:59:59");
  });

  it("trả '' cho trống hoặc không hợp lệ", () => {
    expect(normalizeTime24("")).toBe("");
    expect(normalizeTime24("   ")).toBe("");
    expect(normalizeTime24("abc")).toBe("");
    expect(normalizeTime24(":30")).toBe("");
  });

  it("từ chối giờ/phút/giây ngoài khoảng (không còn nhầm 12h/AM-PM)", () => {
    expect(normalizeTime24("24:00")).toBe("");
    expect(normalizeTime24("25")).toBe("");
    expect(normalizeTime24("09:60")).toBe("");
    expect(normalizeTime24("9:99")).toBe("");
    expect(normalizeTime24("17:29:60")).toBe("");
  });
});

describe("TimeField24 component", () => {
  it("hiển thị text 24h (không phải input type=time locale-phụ-thuộc) và chuẩn hoá khi blur", () => {
    const onChange = vi.fn();
    render(createElement(TimeField24, { value: "", onChange, "aria-label": "Giờ bắt đầu" }));
    const input = screen.getByLabelText("Giờ bắt đầu") as HTMLInputElement;
    // Là ô text 24h, không phải native time picker (vốn hiện AM/PM theo locale trình duyệt).
    expect(input.getAttribute("type")).toBe("text");
    expect(input.getAttribute("placeholder")).toBe("HH:MM:SS");

    fireEvent.change(input, { target: { value: "9" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("09:00:00");
    expect(input.value).toBe("09:00:00");
  });

  it("giờ kết thúc (fillSeconds=ceil) tự điền :59", () => {
    const onChange = vi.fn();
    render(
      createElement(TimeField24, {
        value: "",
        onChange,
        fillSeconds: "ceil",
        "aria-label": "Giờ KT",
      }),
    );
    const input = screen.getByLabelText("Giờ KT") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "17:29" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("17:29:59");
    expect(input.value).toBe("17:29:59");
  });

  it("để trống khi nhập không hợp lệ (không im lặng suy diễn sai giờ)", () => {
    const onChange = vi.fn();
    render(createElement(TimeField24, { value: "17:29:59", onChange, "aria-label": "Giờ 2" }));
    const input = screen.getByLabelText("Giờ 2") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "25:00" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("");
    expect(input.value).toBe("");
  });
});
