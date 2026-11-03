export function parseLandingSources(raw: string): string[] {
  return raw
    .replace(/,/g, "\n")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validateLandingSources(sources: string[]): string[] {
  const invalid: string[] = [];
  for (const source of sources) {
    try {
      const parsed = new URL(source);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        invalid.push(source);
      }
    } catch {
      invalid.push(source);
    }
  }
  return invalid;
}

export type AdAccountGroupOption = { value: string; label: string; ids: number[] };

/**
 * Gom các bản sao của cùng một tài khoản quảng cáo thành một lựa chọn.
 *
 * Cùng một TKQC thật được lưu thành nhiều dòng — mỗi FacebookApp / GoogleAdsConfig
 * quét được nó sẽ tạo một dòng riêng. Danh sách thô vì thế hiện cùng tên + cùng id
 * lặp lại nhiều lần, không cách nào phân biệt, và người gán kênh chọn trúng bản nào
 * là hoàn toàn ngẫu nhiên.
 *
 * `ids` giữ MỌI PK cùng nhóm: kênh đang trỏ một bản sao không phải bản đại diện thì
 * chip vẫn phải hiện, nếu không người dùng sẽ tưởng mình bị mất cấu hình.
 */
export function groupAdAccountOptions<T extends { id: number; name: string }>(
  accounts: T[],
  externalIdOf: (account: T) => string,
): AdAccountGroupOption[] {
  const groups = new Map<string, { label: string; ids: number[] }>();
  for (const account of accounts) {
    const externalId = externalIdOf(account);
    const group = groups.get(externalId);
    if (group) {
      group.ids.push(account.id);
      continue;
    }
    groups.set(externalId, {
      label: `${account.name} (${externalId})`,
      ids: [account.id],
    });
  }
  // Đại diện là PK nhỏ nhất — thứ tự API không đảm bảo nên lấy phần tử đầu sẽ làm
  // giá trị gửi lên đổi giữa các lần tải, sinh diff giả khi lưu kênh.
  return Array.from(groups.values()).map((group) => {
    const ids = [...group.ids].sort((a, b) => a - b);
    return { value: String(ids[0]), label: group.label, ids };
  });
}

/**
 * Dựng option + danh sách "đang chọn" cho MultiSelect từ các id đã lưu.
 *
 * KHÔNG được dùng thẳng option gốc từ `groupAdAccountOptions` — option gốc có
 * `value` là PK đại diện (nhỏ nhất trong nhóm), trong khi kênh có thể đang lưu
 * một PK khác trong cùng nhóm (bản sao không phải đại diện). Khi người dùng chỉ
 * thêm/bớt MỘT lựa chọn khác, các lựa chọn còn lại được trả nguyên qua onChange.
 * Nếu nhóm đó mang value="21" (đại diện) thay vì "172" (PK thật đang lưu), lưu
 * lại sẽ âm thầm ghi đè 172 → 21 dù người dùng không đụng vào chip đó — đúng lỗ
 * hổng gây bảng Chi phí theo kênh về 0 dù dữ liệu vẫn còn.
 *
 * Vì vậy nhóm đang chọn phải ghi đè `value` bằng đúng PK đang được lưu (tìm
 * trong `ids` của nhóm), chỉ lựa chọn MỚI mới dùng PK đại diện. Id đã lưu không
 * thuộc nhóm nào bị bỏ (không hiện, không gửi lại) — như hành vi trước đây.
 */
export function resolveAdAccountSelection(
  options: AdAccountGroupOption[],
  selectedIds: number[],
): { options: AdAccountGroupOption[]; selected: string[] } {
  const selected: string[] = [];
  const resolved = options.map((option) => {
    const savedId = option.ids.find((id) => selectedIds.includes(id));
    if (savedId === undefined) return option;
    selected.push(String(savedId));
    return { ...option, value: String(savedId) };
  });
  return { options: resolved, selected };
}
