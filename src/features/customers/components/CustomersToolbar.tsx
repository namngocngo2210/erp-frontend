import { useMemo, useState } from "react";
import { Columns3, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnManager } from "@/components/column-manager/ColumnManager";
import type { ColumnManagerGroup } from "@/components/column-manager/types";
import { useI18n } from "@/i18n";
import type { SegmentCategory } from "@/lib/api/customers";
import { COLUMN_GROUPS, type ColumnGroupKey } from "@/pages/customers/profile-columns";

import { ALL_CHANNELS, ALL_SALES_STATUS, ALL_SEGMENTS } from "../customer-types";

/**
 * Bảng khách hàng có header 2 tầng (nhóm ở tầng 1, cột con ở tầng 2) nên đơn vị
 * bật/tắt vẫn là NHÓM, không phải từng cột. Ở đây mỗi "cột" của ColumnManager
 * chính là một nhóm, và tất cả nằm chung một section.
 */
const COLUMN_MANAGER_SECTIONS: ColumnManagerGroup[] = [{ key: "all", label: "Nhóm cột" }];

interface ChannelOption {
  id: number | string;
  name: string;
}

interface SalesStatusOption {
  code: string;
  label: string;
}

interface CustomersToolbarProps {
  canManageUsers: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  segment: string;
  onSegmentChange: (value: string) => void;
  channel: string;
  onChannelChange: (value: string) => void;
  salesStatus: string;
  onSalesStatusChange: (value: string) => void;
  segmentCategories: SegmentCategory[];
  channelOptions: ChannelOption[];
  salesStatusOptions: SalesStatusOption[];
  // Column menu
  /** Nhóm đang hiện, theo đúng thứ tự cột trên bảng. */
  visibleGroupOrder: ColumnGroupKey[];
  onToggleGroupVisibility: (key: ColumnGroupKey) => void;
  onSetColumnGroups: (next: ColumnGroupKey[]) => void;
  onResetColumnGroups: () => void;
  // Selection / actions
  selectedCount: number;
  onBulkDelete: () => void;
  onCreate: () => void;
}

export function CustomersToolbar({
  canManageUsers,
  searchTerm,
  onSearchChange,
  segment,
  onSegmentChange,
  channel,
  onChannelChange,
  salesStatus,
  onSalesStatusChange,
  segmentCategories,
  channelOptions,
  salesStatusOptions,
  visibleGroupOrder,
  onToggleGroupVisibility,
  onSetColumnGroups,
  onResetColumnGroups,
  selectedCount,
  onBulkDelete,
  onCreate,
}: CustomersToolbarProps) {
  const { t } = useI18n();
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);

  const columnGroupOptions = useMemo(
    () =>
      COLUMN_GROUPS.map((group) => ({
        key: group.key,
        label: group.label,
        group: "all",
        // Nhóm định danh (Mã KH, Họ tên…) là cột cố định của bảng.
        hideable: group.key !== "identity",
      })),
    [],
  );

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="relative md:max-w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("customers.search.placeholder", "Tìm theo tên hoặc số điện thoại...")}
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-8"
        />
      </div>

      {/* Phân khúc */}
      <Select value={segment} onValueChange={onSegmentChange}>
        <SelectTrigger className="h-9 w-45">
          <SelectValue placeholder={t("customers.profile.segment", "Phân khúc")}>
            {segment === ALL_SEGMENTS
              ? t("customers.filter.allSegments", "Tất cả phân khúc")
              : (() => {
                  const found = segmentCategories.find((c) => c.code === segment);
                  return found ? `${found.code} - ${found.name}` : segment;
                })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SEGMENTS}>
            {t("customers.filter.allSegments", "Tất cả phân khúc")}
          </SelectItem>
          {segmentCategories.map((category) => (
            <SelectItem key={category.code} value={category.code}>
              {category.code} - {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Kênh bán */}
      <Select value={channel} onValueChange={onChannelChange}>
        <SelectTrigger className="h-9 w-[170px]">
          <SelectValue placeholder={t("customers.profile.channel", "Kênh bán")}>
            {channel === ALL_CHANNELS
              ? t("customers.filter.allChannels", "Tất cả kênh")
              : (channelOptions.find((o) => String(o.id) === channel)?.name ?? channel)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CHANNELS}>
            {t("customers.filter.allChannels", "Tất cả kênh")}
          </SelectItem>
          {channelOptions.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Trạng thái sale */}
      <Select value={salesStatus} onValueChange={onSalesStatusChange}>
        <SelectTrigger className="h-9 w-[170px]">
          <SelectValue placeholder={t("customers.profile.salesStatus", "Trạng thái sale")}>
            {salesStatus === ALL_SALES_STATUS
              ? t("customers.filter.allSalesStatus", "Tất cả trạng thái")
              : (salesStatusOptions.find((o) => o.code === salesStatus)?.label ?? salesStatus)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SALES_STATUS}>
            {t("customers.filter.allSalesStatus", "Tất cả trạng thái")}
          </SelectItem>
          {salesStatusOptions.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tuỳ chỉnh nhóm cột */}
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => setColumnManagerOpen(true)}
      >
        <Columns3 className="mr-2 h-4 w-4" />
        {t("customers.profile.columns", "Cột hiển thị")}
      </Button>
      <ColumnManager
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
        title={t("customers.profile.columns", "Cột hiển thị")}
        options={columnGroupOptions}
        groups={COLUMN_MANAGER_SECTIONS}
        visible={visibleGroupOrder}
        enableLock={false}
        onToggle={onToggleGroupVisibility}
        onSetColumns={onSetColumnGroups}
        onReset={onResetColumnGroups}
      />

      {canManageUsers && selectedCount > 0 && (
        <Button
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive/10"
          onClick={onBulkDelete}
        >
          {t("common.deleteSelected", "Xóa đã chọn ({count})").replace(
            "{count}",
            String(selectedCount),
          )}
        </Button>
      )}

      {canManageUsers && (
        <Button
          className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onCreate}
        >
          {t("customers.management.create", "Thêm khách hàng")}
        </Button>
      )}
    </div>
  );
}
