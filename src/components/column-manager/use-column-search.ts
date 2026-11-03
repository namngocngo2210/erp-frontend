import { useMemo } from "react";

import { matchesSearchTerm } from "@/lib/text-search";
import type {
  ColumnManagerGroup,
  ColumnManagerOption,
  ColumnManagerTranslate,
} from "@/components/column-manager/types";

export type ColumnManagerSection<K extends string = string> = {
  group: ColumnManagerGroup;
  groupLabel: string;
  /** Các cột khớp từ khoá tìm kiếm (rỗng thì section bị loại khỏi kết quả). */
  options: Array<ColumnManagerOption<K> & { label: string; visible: boolean }>;
  /** Đếm trên TOÀN nhóm, không phụ thuộc từ khoá — badge "3/7" phải ổn định. */
  visibleCount: number;
  totalCount: number;
  /** Có cột nào trong nhóm tắt được không (nhóm cố định thì ẩn checkbox nhóm). */
  hideableKeys: K[];
};

/**
 * Gom cột theo nhóm và lọc theo từ khoá (bỏ dấu tiếng Việt: "van don" khớp
 * "Mã vận đơn", "sdt" khớp "SĐT").
 *
 * Từ khoá khớp cả nhãn NHÓM: gõ "vat" ra nguyên nhóm "Hoá đơn VAT". Cột không
 * thuộc nhóm nào đã khai báo sẽ rơi vào section cuối theo `groups`, không bị
 * nuốt mất.
 */
export function useColumnSearch<K extends string>({
  options,
  groups,
  visible,
  query,
  translate,
}: {
  options: Array<ColumnManagerOption<K>>;
  groups: ColumnManagerGroup[];
  visible: K[];
  query: string;
  translate?: ColumnManagerTranslate;
}): { sections: Array<ColumnManagerSection<K>>; matchCount: number } {
  return useMemo(() => {
    const label = (value: string) => translate?.(value, value) ?? value;
    const visibleSet = new Set<K>(visible);

    const optionsByGroup = new Map<string, Array<ColumnManagerOption<K>>>();
    for (const option of options) {
      const bucket = optionsByGroup.get(option.group);
      if (bucket) bucket.push(option);
      else optionsByGroup.set(option.group, [option]);
    }

    const sections: Array<ColumnManagerSection<K>> = [];
    let matchCount = 0;

    for (const group of groups) {
      const groupOptions = optionsByGroup.get(group.key);
      if (!groupOptions || groupOptions.length === 0) continue;

      const groupLabel = label(group.label);
      const groupMatches = matchesSearchTerm(query, [groupLabel]);

      const decorated = groupOptions.map((option) => ({
        ...option,
        label: label(option.label),
        visible: visibleSet.has(option.key),
      }));

      // Nhóm khớp từ khoá → giữ nguyên mọi cột của nhóm; ngược lại lọc từng cột.
      // `option.key` cũng nằm trong haystack để tìm được bằng tên field kỹ thuật.
      const filtered = groupMatches
        ? decorated
        : decorated.filter((option) => matchesSearchTerm(query, [option.label, option.key]));

      matchCount += filtered.length;

      sections.push({
        group,
        groupLabel,
        options: filtered,
        visibleCount: decorated.filter((option) => option.visible).length,
        totalCount: decorated.length,
        hideableKeys: decorated
          .filter((option) => option.hideable !== false)
          .map((option) => option.key),
      });
    }

    return { sections, matchCount };
  }, [options, groups, visible, query, translate]);
}
