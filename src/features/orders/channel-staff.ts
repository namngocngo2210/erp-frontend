export type ChannelStaffUser = {
  id: number;
  username: string;
  department_id?: number | null;
};

export type ChannelStaffChannel = {
  code: string;
};

export type ChannelStaffOption = { id: number; name: string };

/**
 * Xây map { mã kênh -> danh sách nhân viên } cho ô chọn nhân viên trong form tạo/sửa đơn.
 *
 * Backend đã scope danh sách nhân viên theo phòng ban của trang (đơn thường/landing ->
 * Sales, KOC -> Booking) qua tham số `?department=`, không phụ thuộc phòng ban người xem.
 * Vì vậy FE chỉ hiển thị nguyên danh sách BE trả về, không lọc lại.
 *
 * Mọi kênh trong cùng một trang dùng chung danh sách này; map vẫn keyed theo mã kênh
 * (kèm khoá rỗng "" khi chưa chọn kênh) để khớp cách OrderFormDialog tra cứu staffOptions.
 */
export function buildChannelStaffByCode(
  channels: ChannelStaffChannel[],
  staffUsers: ChannelStaffUser[],
): Record<string, ChannelStaffOption[]> {
  const staff = staffUsers.map((user) => ({ id: user.id, name: user.username }));

  const result: Record<string, ChannelStaffOption[]> = { "": staff };
  for (const channel of channels) {
    result[channel.code] = staff;
  }
  return result;
}

/**
 * Danh sách nhân viên cho một mã kênh, fallback về danh sách chung khi thiếu khoá.
 *
 * Map chỉ có khoá cho các kênh BE trả về cho người xem; đơn thuộc kênh ngoài phạm vi
 * đó (vd sale xem đơn của kênh phòng khác) sẽ tra ra `undefined` → dropdown rỗng dù
 * mọi kênh vốn dùng CHUNG một danh sách. Rơi về khoá "" để không mất option.
 */
export function staffOptionsForChannel(
  channelStaffByCode: Record<string, ChannelStaffOption[]>,
  channelCode: string | null | undefined,
): ChannelStaffOption[] {
  const code = String(channelCode || "");
  return channelStaffByCode[code] ?? channelStaffByCode[""] ?? [];
}

export type StaffSelectOption = { value: string; label: string };

/**
 * Đảm bảo nhân viên đang được gán luôn có option để hiển thị.
 *
 * Danh sách nhân viên do BE scope theo phòng ban của trang và chỉ gồm user đang hoạt
 * động (xem `ChannelRepository.list_staff_users`), nên sale của đơn có thể KHÔNG nằm
 * trong đó: đã nghỉ việc, bị khoá, hoặc thuộc phòng ban khác (đơn KOC gán sale Sales).
 * Không có option khớp thì ô select hiển thị trống dù đơn vẫn có người phụ trách —
 * người dùng tưởng đơn chưa gán và gán đè lên sale thật. Chèn lại option "mồ côi",
 * nhãn lấy từ chính đơn (mirror cách `channelSelectOptions` xử lý kênh ngoài phạm vi).
 */
export function withSelectedStaffOption<T extends StaffSelectOption>(
  options: T[],
  staffId: number | null | undefined,
  staffName?: string | null,
): T[] {
  if (staffId == null) return options;
  const value = String(staffId);
  if (options.some((option) => option.value === value)) return options;
  return [{ value, label: staffName || `#${value}` } as T, ...options];
}
