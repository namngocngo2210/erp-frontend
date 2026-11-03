import { SearchableSelect } from "@/components/ui/searchable-select";

export type ContactResultOption = { value: string; label: string };

type ContactResultSelectProps = {
  /** `sales_status_code` hiện tại của đơn mới nhất — null/rỗng khi chưa có kết quả. */
  value: string | null;
  options: ContactResultOption[];
  onChange: (code: string) => void;
  /** Khoá select trong lúc PATCH đang chạy hoặc chưa có đơn để ghi. */
  disabled?: boolean;
};

/**
 * Select inline cột "Kết quả" ở bảng contact (Task 10) — options từ CRM
 * catalog (fallback `SALES_STATUS_OPTIONS` tĩnh, xem ContactsPage). Chỉ
 * render + phát `onChange(code)`; nơi gọi chịu trách nhiệm bắn mutation PATCH
 * đơn (giữ component này thuần presentational).
 */
export function ContactResultSelect({
  value,
  options,
  onChange,
  disabled,
}: ContactResultSelectProps) {
  return (
    <SearchableSelect
      options={options}
      value={value ?? ""}
      onChange={onChange}
      placeholder="Chọn kết quả"
      disabled={disabled}
      className="h-8 min-w-[150px] text-xs"
    />
  );
}
