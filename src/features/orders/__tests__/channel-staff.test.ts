import { describe, it, expect } from "vitest";

import {
  buildChannelStaffByCode,
  staffOptionsForChannel,
  withSelectedStaffOption,
} from "@/features/orders/channel-staff";

const STAFF = [
  { id: 1, username: "sale.a" },
  { id: 2, username: "sale.b" },
];

describe("staffOptionsForChannel", () => {
  it("trả danh sách của kênh đang chọn", () => {
    const map = buildChannelStaffByCode([{ code: "CH1" }], STAFF);
    expect(staffOptionsForChannel(map, "CH1").map((s) => s.id)).toEqual([1, 2]);
  });

  // Đơn thuộc kênh ngoài phạm vi phòng ban của người xem không có khoá trong map;
  // rơi về danh sách chung thay vì trả rỗng (mọi kênh vốn dùng chung một danh sách).
  it("fallback về danh sách chung khi mã kênh không có trong map", () => {
    const map = buildChannelStaffByCode([{ code: "CH1" }], STAFF);
    expect(staffOptionsForChannel(map, "CH-KHAC").map((s) => s.id)).toEqual([1, 2]);
  });

  it("trả rỗng khi map hoàn toàn trống", () => {
    expect(staffOptionsForChannel({}, "CH1")).toEqual([]);
  });
});

describe("withSelectedStaffOption", () => {
  const options = [
    { value: "1", label: "sale.a" },
    { value: "2", label: "sale.b" },
  ];

  it("giữ nguyên khi nhân viên đang gán đã có option", () => {
    expect(withSelectedStaffOption(options, 1)).toBe(options);
  });

  it("giữ nguyên khi đơn chưa có nhân viên", () => {
    expect(withSelectedStaffOption(options, null)).toBe(options);
    expect(withSelectedStaffOption(options, undefined)).toBe(options);
  });

  // Sale đã nghỉ / bị khoá / khác phòng ban không nằm trong danh sách BE trả về —
  // thiếu option thì ô select hiện trống như thể đơn chưa gán ai.
  it("chèn option cho nhân viên ngoài danh sách, nhãn lấy từ đơn", () => {
    const result = withSelectedStaffOption(options, 9, "sale.nghi.viec");
    expect(result[0]).toEqual({ value: "9", label: "sale.nghi.viec" });
    expect(result).toHaveLength(3);
  });

  it("thiếu tên thì dùng id làm nhãn", () => {
    expect(withSelectedStaffOption(options, 9)[0]).toEqual({ value: "9", label: "#9" });
  });
});
