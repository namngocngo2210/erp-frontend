import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VC_GROUP_BADGE_CLASS, VC_GROUP_LABELS } from "@/features/warranty-claims/journey-enums";

export const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";
const sectionTitleClass = "mb-3 flex items-center gap-2 text-sm font-semibold text-foreground";

/** Tiêu đề mục trong thẻ hành trình/form Best — icon lucide trang trí, không đọc. */
export function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h4 className={sectionTitleClass}>
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      {children}
    </h4>
  );
}

/** Badge nhóm trạng thái VC tự động theo Best — null/undefined (chưa có mã) → ẩn. */
export function VcGroupBadge({ group }: { group: string | null | undefined }) {
  if (!group) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${VC_GROUP_BADGE_CLASS[group] ?? "bg-gray-200 text-gray-600"}`}
    >
      {VC_GROUP_LABELS[group] ?? group}
    </span>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Select nhỏ cho các field enum §3-§7 — kèm option "— Chưa chọn —" để clear
 * (BlankEnum). Generic theo giá trị option: form state giữ đúng union type
 * của payload OpenAPI mà không cần cast (giá trị trả về luôn nằm trong
 * `options` hoặc là "").
 */
export function EnumSelect<V extends string>({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Chưa chọn",
}: {
  id?: string;
  value: V | "";
  onValueChange: (value: V | "") => void;
  options: readonly { value: V; label: string }[];
  placeholder?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(options.find((o) => o.value === v)?.value ?? "")}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">— Chưa chọn —</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
