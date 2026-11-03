export type KiotVietOption = {
  id: number;
  name: string;
  branch_id?: string;
  branch_ids?: string[];
};

export type BranchSelectOption = { value: string; label: string };

/**
 * Danh sách chi nhánh của một kênh KiotViet: gồm chi nhánh mặc định
 * (`branch_id`) đứng đầu, kèm các chi nhánh trong `branch_ids` (đã loại trùng).
 * Dùng chung cho form tạo đơn, trang chi tiết và inline-edit trên grid để
 * tránh lệch logic giữa các nơi.
 */
export function getBranchIdsForChannel(channel?: KiotVietOption | null): string[] {
  if (!channel) return [];
  const ids = [...(channel.branch_ids ?? [])];
  if (channel.branch_id && !ids.includes(channel.branch_id)) {
    ids.unshift(channel.branch_id);
  }
  return ids;
}

/** Như {@link getBranchIdsForChannel} nhưng trả về dạng option cho React Select. */
export function getBranchOptionsForChannel(channel?: KiotVietOption | null): BranchSelectOption[] {
  return getBranchIdsForChannel(channel).map((id) => ({ value: String(id), label: String(id) }));
}
