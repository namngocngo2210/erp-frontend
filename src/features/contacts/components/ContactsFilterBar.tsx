import { Search } from "lucide-react";

import { DateFilter, type DateFilterValue } from "@/components/ui/date-filter";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const INTERACTION_ALL = "__all__";
export const CUSTOMER_TYPE_ALL = "__all__";

export type SourceOption = { value: string; label: string };

type ContactsFilterBarProps = {
  q: string;
  onQChange: (value: string) => void;
  dateValue: DateFilterValue;
  onDateChange: (value: DateFilterValue) => void;
  sourceValues: string[];
  onSourceChange: (values: string[]) => void;
  sourceOptions: SourceOption[];
  interaction: string;
  onInteractionChange: (value: string) => void;
  customerType: string;
  onCustomerTypeChange: (value: string) => void;
  productOptions: { value: string; label: string; keywords?: string }[];
  productIds: string[];
  onProductIdsChange: (values: string[]) => void;
};

/**
 * Thanh lọc phía trên bảng contact: tìm kiếm, khoảng ngày, sản phẩm, nguồn khách
 * (multi-select gộp kênh + nguồn đơn, BE lấy hợp), tương tác, loại khách.
 * Thuần presentational — state do ContactsPage giữ.
 */
export function ContactsFilterBar({
  q,
  onQChange,
  dateValue,
  onDateChange,
  sourceValues,
  onSourceChange,
  sourceOptions,
  interaction,
  onInteractionChange,
  customerType,
  onCustomerTypeChange,
  productOptions,
  productIds,
  onProductIdsChange,
}: ContactsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-55 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(event) => onQChange(event.target.value)}
          placeholder="Tìm tên, SĐT"
          className="h-9 pl-9"
        />
      </div>
      <DateFilter inline value={dateValue} onChange={onDateChange} />
      <MultiSelect
        className="w-[190px] shrink-0"
        options={productOptions}
        selected={productIds}
        onChange={onProductIdsChange}
        placeholder="Tất cả sản phẩm"
        menuPortal
      />
      <MultiSelect
        className="w-[190px] shrink-0"
        options={sourceOptions}
        selected={sourceValues}
        onChange={onSourceChange}
        placeholder="Tất cả nguồn"
        menuPortal
      />
      <Select value={interaction} onValueChange={onInteractionChange}>
        <SelectTrigger className="h-9 w-40 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INTERACTION_ALL}>Tất cả tương tác</SelectItem>
          <SelectItem value="none">Chưa tương tác</SelectItem>
          <SelectItem value="recent">Mới tương tác</SelectItem>
        </SelectContent>
      </Select>
      <Select value={customerType} onValueChange={onCustomerTypeChange}>
        <SelectTrigger className="h-9 w-[150px] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CUSTOMER_TYPE_ALL}>Tất cả khách</SelectItem>
          <SelectItem value="new">Khách mới</SelectItem>
          <SelectItem value="old">Khách cũ</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
