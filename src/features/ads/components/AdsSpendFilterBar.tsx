import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdsSelectOption } from "@/features/ads/useAdsPlatformReport";

/** Preset thời gian dùng chung 2 trang chi tiêu ads (value là giá trị gửi BE). */
const DATE_PRESETS: Array<{ value: string; label: string }> = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "last_7d", label: "7 ngày" },
  { value: "last_30d", label: "30 ngày" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "this_year", label: "Năm nay" },
  { value: "maximum", label: "Tất cả" },
];

export interface AdsSpendFilterBarProps {
  /** Nhãn ô chọn parent ("FB App (BM)" / "Cấu hình (MCC)"). */
  parentLabel: string;
  parentOptions: AdsSelectOption[];
  selectedParentId: number | null;
  onSelectParent: (id: number | null) => void;
  accountOptions: AdsSelectOption[];
  selectedAccountIds: string[];
  onSelectAccounts: (ids: string[]) => void;
  /** Placeholder ô chọn account ("Chọn TKQC..." / "Chọn tài khoản..."). */
  accountsPlaceholder: string;
  filterMode: "preset" | "custom";
  onFilterModeChange: (mode: "preset" | "custom") => void;
  filterPreset: string;
  onFilterPresetChange: (preset: string) => void;
  filterSince: string;
  onFilterSinceChange: (value: string) => void;
  filterUntil: string;
  onFilterUntilChange: (value: string) => void;
  metricsLoading: boolean;
  /** FB hiện nút sync cho mọi người, Google chỉ admin — page tự quyết. */
  showSyncButton: boolean;
  syncTitle: string;
  syncing: boolean;
  syncDisabled: boolean;
  onSync: () => void;
}

/**
 * Thanh bộ lọc dùng chung của 2 trang chi tiêu FB/Google Ads: chọn parent,
 * chọn tập account hiển thị, khoảng thời gian (preset/tùy chỉnh) và nút
 * đồng bộ chi tiêu on-demand. Markup giữ nguyên từ 2 page cũ.
 */
export function AdsSpendFilterBar({
  parentLabel,
  parentOptions,
  selectedParentId,
  onSelectParent,
  accountOptions,
  selectedAccountIds,
  onSelectAccounts,
  accountsPlaceholder,
  filterMode,
  onFilterModeChange,
  filterPreset,
  onFilterPresetChange,
  filterSince,
  onFilterSinceChange,
  filterUntil,
  onFilterUntilChange,
  metricsLoading,
  showSyncButton,
  syncTitle,
  syncing,
  syncDisabled,
  onSync,
}: AdsSpendFilterBarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-end gap-3">
      <div className="min-w-55">
        <label className="block text-xs font-medium">{parentLabel}</label>
        <SearchableSelect
          options={parentOptions}
          value={selectedParentId != null ? String(selectedParentId) : ""}
          onChange={(v) => onSelectParent(v ? Number(v) : null)}
          placeholder="-- Chọn --"
        />
      </div>
      <div className="min-w-65 flex-1">
        <label className="block text-xs font-medium">Tài khoản hiển thị</label>
        <MultiSelect
          options={accountOptions}
          selected={selectedAccountIds}
          onChange={onSelectAccounts}
          placeholder={accountsPlaceholder}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Khoảng thời gian</label>
        <div className="flex gap-1">
          <button
            type="button"
            className={`h-9 rounded border px-3 text-sm ${filterMode === "preset" ? "bg-primary text-white" : ""}`}
            onClick={() => onFilterModeChange("preset")}
          >
            Preset
          </button>
          <button
            type="button"
            className={`h-9 rounded border px-3 text-sm ${filterMode === "custom" ? "bg-primary text-white" : ""}`}
            onClick={() => onFilterModeChange("custom")}
          >
            Tùy chỉnh
          </button>
        </div>
      </div>
      {filterMode === "preset" ? (
        <div>
          <label className="block text-xs font-medium">Preset</label>
          <Select value={filterPreset} onValueChange={onFilterPresetChange}>
            <SelectTrigger className="h-9 w-auto text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-xs font-medium">Từ</label>
            <Input
              type="date"
              value={filterSince}
              onChange={(e) => onFilterSinceChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Đến</label>
            <Input
              type="date"
              value={filterUntil}
              onChange={(e) => onFilterUntilChange(e.target.value)}
            />
          </div>
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        {metricsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {showSyncButton && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={syncDisabled}
            onClick={onSync}
            title={syncTitle}
          >
            {syncing ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Đang đồng bộ
              </>
            ) : (
              "Đồng bộ chi tiêu"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
