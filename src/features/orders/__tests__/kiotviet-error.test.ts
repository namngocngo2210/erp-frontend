import { describe, expect, it } from "vitest";

import { formatKiotVietErrorToast, humanizeKiotVietError } from "../kiotviet-error";

describe("humanizeKiotVietError", () => {
  it("trả nguyên văn responseStatus.message của KiotViet", () => {
    const raw =
      'Exception: [stage=create_invoice] Failed to create invoice: 400 - {"responseStatus":{"errorCode":"InvalidBranch","message":"Chi nhánh không được phép bán hàng"}}';
    expect(humanizeKiotVietError(raw)).toBe("Chi nhánh không được phép bán hàng");
  });

  it("vẫn parse được khi cause chain lặp lại body JSON (nhiều khối JSON)", () => {
    const body = '{"responseStatus":{"message":"Sản phẩm SP001 không tồn tại trong kho"}}';
    const raw =
      `Exception: [stage=create_invoice] Failed to create invoice: 400 - ${body}` +
      ` | cause[1] Exception: Failed to create invoice: 400 - ${body}`;
    expect(humanizeKiotVietError(raw)).toBe("Sản phẩm SP001 không tồn tại trong kho");
  });

  it("hỗ trợ PascalCase ResponseStatus.Message", () => {
    const raw =
      'Failed to delete invoice: 400 - {"ResponseStatus":{"Message":"Hóa đơn đã hoàn thành, không thể xóa"}}';
    expect(humanizeKiotVietError(raw)).toBe("Hóa đơn đã hoàn thành, không thể xóa");
  });

  it("gộp responseStatus.errors[].message khi thiếu message tổng", () => {
    const raw =
      'Failed to create order: 400 - {"responseStatus":{"errors":[{"message":"Thiếu tên khách"},{"message":"Sai chi nhánh"}]}}';
    expect(humanizeKiotVietError(raw)).toBe("Thiếu tên khách; Sai chi nhánh");
  });

  it("giữ nguyên body plain-text của KiotViet thay vì thay bằng câu chung", () => {
    const raw =
      "Exception: [stage=create_invoice] Exception: Failed to create invoice: 400 - Branch is not allowed";
    expect(humanizeKiotVietError(raw)).toBe("KiotViet từ chối tạo hóa đơn: Branch is not allowed");
  });

  it("chỉ trả nhãn trần khi không có body kèm theo", () => {
    const raw = "Exception: Failed to create customer";
    expect(humanizeKiotVietError(raw)).toBe("KiotViet từ chối tạo khách hàng.");
  });

  it("map mã trạng thái trần sang mô tả tiếng Việt", () => {
    expect(humanizeKiotVietError("channel_unavailable")).toBe("Kênh KiotViet không khả dụng.");
  });

  it("dịch lỗi precheck hệ thống như cũ", () => {
    expect(
      humanizeKiotVietError(
        "ValueError: [stage=create_kship_delivery] Thiếu provider_code để tạo mã vận đơn.",
      ),
    ).toBe("Thiếu hãng vận chuyển KShip.");
  });

  it("trả nguyên văn message không khớp pattern nào (sau khi lột wrapper)", () => {
    const raw = "Exception: [stage=push_order] KiotViet trả lỗi 500: Internal Server Error";
    expect(humanizeKiotVietError(raw)).toBe("KiotViet trả lỗi 500: Internal Server Error");
  });

  it("ưu tiên message KiotViet ngay cả khi có nhãn gateway khớp", () => {
    const raw = 'Failed to create invoice: 422 - {"message":"Khách hàng đã bị khóa"}';
    expect(humanizeKiotVietError(raw)).toBe("Khách hàng đã bị khóa");
  });
});

describe("formatKiotVietErrorToast", () => {
  it("cắt gọn message dài quá 220 ký tự", () => {
    const longBody = "x".repeat(500);
    const result = formatKiotVietErrorToast(longBody);
    expect(result.length).toBe(220);
    expect(result.endsWith("...")).toBe(true);
  });
});
