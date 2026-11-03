/**
 * Chuẩn hoá thông báo lỗi tiếng Việt dùng chung cho toàn bộ portal — tránh mỗi
 * component tự viết lại cùng một bảng mã lỗi (ActivateForm/TrackForm).
 *
 * `scope` phân biệt câu 404 giữa 2 tab: cùng status code nhưng khác nghĩa
 * nghiệp vụ — "activate" là mã tem sai, "track" là cặp mã vận đơn + SĐT không
 * khớp — nên không thể dùng chung một câu.
 */

function statusOf(error: unknown): number | undefined {
  return (error as { status?: number } | null)?.status;
}

export function portalErrorMessage(
  error: unknown,
  scope: "activate" | "track" = "activate",
): string {
  const status = statusOf(error);
  if (status === 404) {
    return scope === "track"
      ? "Không tìm thấy đơn hàng. Kiểm tra lại mã vận đơn hoặc số điện thoại."
      : "Mã không hợp lệ. Sản phẩm có thể không phải hàng chính hãng.";
  }
  if (status === 429) return "Bạn thử quá nhiều lần. Vui lòng chờ ít phút rồi thử lại.";
  return error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại.";
}
