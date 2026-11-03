import { useId, useState, useEffect } from "react";
import { Input } from "./input";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { ChevronDown } from "lucide-react";
import { formatDatePattern } from "@/lib/format";

export type DateFilterOption =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "last_7_days"
  | "this_month"
  | "last_month"
  | "last_30_days"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export interface DateFilterValue {
  option: DateFilterOption;
  from?: string;
  to?: string;
}

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  /**
   * Biến thể hàng ngang gọn: dropdown preset (mở xuống dưới) + 2 ô ngày tùy chọn
   * nằm cùng một hàng. Dùng cho thanh lọc 1 hàng (vd trang Vận đơn). Mặc định giữ
   * layout dọc (dùng trong ngăn kéo bộ lọc đơn hàng).
   */
  inline?: boolean;
  /**
   * Biến thể MỘT nút: nút gọn hiện khoảng ngày đang chọn, bấm mở popover chứa cả
   * lưới preset lẫn ô ngày tùy chọn. Dùng cho thanh lọc dày đặc — biến thể
   * `inline` bày 2 ô `<input type="date">` ra ngoài nên ngốn ~420px bề ngang và
   * kéo theo icon lịch của trình duyệt, quá nặng cho một thanh công cụ.
   */
  compact?: boolean;
  /**
   * Hiện nút "Xóa" để gỡ hẳn khoảng ngày (về trạng thái không lọc). Cần khi bộ
   * lọc có giá trị mặc định (vd Ngày tạo = tháng này) nhưng người dùng muốn bỏ
   * để chỉ lọc theo một chiều ngày khác. Chỉ áp dụng cho layout dọc.
   */
  clearable?: boolean;
}

const dateFilterOptions = [
  { value: "today" as const, label: "Hôm nay", group: "Theo ngày" },
  { value: "yesterday" as const, label: "Hôm qua", group: "Theo ngày" },
  { value: "this_week" as const, label: "Tuần này", group: "Theo tuần" },
  { value: "last_week" as const, label: "Tuần trước", group: "Theo tuần" },
  { value: "last_7_days" as const, label: "7 ngày qua", group: "Theo tuần" },
  { value: "this_month" as const, label: "Tháng này", group: "Theo tháng" },
  { value: "last_month" as const, label: "Tháng trước", group: "Theo tháng" },
  { value: "last_30_days" as const, label: "30 ngày qua", group: "Theo tháng" },
  { value: "this_quarter" as const, label: "Quý này", group: "Theo quý" },
  { value: "last_quarter" as const, label: "Quý trước", group: "Theo quý" },
  { value: "this_year" as const, label: "Năm nay", group: "Theo năm" },
  { value: "last_year" as const, label: "Năm trước", group: "Theo năm" },
];

// Group options by category
const groupedOptions = dateFilterOptions.reduce(
  (acc, opt) => {
    if (!acc[opt.group]) {
      acc[opt.group] = [];
    }
    acc[opt.group].push(opt);
    return acc;
  },
  {} as Record<string, typeof dateFilterOptions>,
);

export function getDateRange(option: DateFilterOption): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const formatDate = (date: Date) => formatDatePattern(date, "yyyy-MM-dd");

  switch (option) {
    case "today":
      return {
        from: formatDate(today),
        to: formatDate(today),
      };

    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: formatDate(yesterday),
        to: formatDate(yesterday),
      };
    }

    case "this_week": {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      return {
        from: formatDate(startOfWeek),
        to: formatDate(today),
      };
    }

    case "last_week": {
      const dayOfWeek = today.getDay();
      const endOfLastWeek = new Date(today);
      endOfLastWeek.setDate(today.getDate() - dayOfWeek - 1);
      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
      return {
        from: formatDate(startOfLastWeek),
        to: formatDate(endOfLastWeek),
      };
    }

    case "last_7_days": {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      return {
        from: formatDate(sevenDaysAgo),
        to: formatDate(today),
      };
    }

    case "this_month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: formatDate(startOfMonth),
        to: formatDate(today),
      };
    }

    case "last_month": {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: formatDate(startOfLastMonth),
        to: formatDate(endOfLastMonth),
      };
    }

    case "last_30_days": {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29);
      return {
        from: formatDate(thirtyDaysAgo),
        to: formatDate(today),
      };
    }

    case "this_quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      return {
        from: formatDate(startOfQuarter),
        to: formatDate(today),
      };
    }

    case "last_quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const lastQuarter = currentQuarter - 1;
      const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const quarter = lastQuarter < 0 ? 3 : lastQuarter;
      const startOfLastQuarter = new Date(year, quarter * 3, 1);
      const endOfLastQuarter = new Date(year, (quarter + 1) * 3, 0);
      return {
        from: formatDate(startOfLastQuarter),
        to: formatDate(endOfLastQuarter),
      };
    }

    case "this_year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return {
        from: formatDate(startOfYear),
        to: formatDate(today),
      };
    }

    case "last_year": {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      return {
        from: formatDate(startOfLastYear),
        to: formatDate(endOfLastYear),
      };
    }

    case "custom":
    default:
      return {
        from: "",
        to: "",
      };
  }
}

export function DateFilter({
  value,
  onChange,
  inline = false,
  compact = false,
  clearable = false,
}: DateFilterProps) {
  // Mỗi instance cần id/name riêng: khi có nhiều DateFilter trên cùng trang
  // (vd lọc theo ngày tạo + ngày hoàn), radio cùng `name` sẽ gộp thành 1 nhóm
  // chung khiến chọn ở bộ lọc này nhảy sang bộ lọc kia. useId() tách biệt chúng.
  const instanceId = useId();
  const modeName = `date-filter-mode-${instanceId}`;
  const fromInputId = `date-filter-from-${instanceId}`;
  const toInputId = `date-filter-to-${instanceId}`;
  const [customFrom, setCustomFrom] = useState(value.from || "");
  const [customTo, setCustomTo] = useState(value.to || "");
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Update customFrom and customTo when value changes
  useEffect(() => {
    if (value.option === "custom") {
      setCustomFrom(value.from || "");
      setCustomTo(value.to || "");
    }
  }, [value.option, value.from, value.to]);

  const handleRadioChange = (mode: "custom" | "preset") => {
    if (mode === "custom") {
      onChange({ option: "custom", from: customFrom, to: customTo });
    } else {
      // Default to "this_month" when switching to preset mode
      const range = getDateRange("this_month");
      onChange({ option: "this_month", from: range.from, to: range.to });
    }
  };

  const handlePresetChange = (option: DateFilterOption) => {
    const range = getDateRange(option);
    onChange({ option, from: range.from, to: range.to });
    setPopoverOpen(false);
  };

  const handleCustomFromChange = (from: string) => {
    setCustomFrom(from);
    onChange({ option: "custom", from, to: customTo });
  };

  const handleCustomToChange = (to: string) => {
    setCustomTo(to);
    onChange({ option: "custom", from: customFrom, to });
  };

  const handleClear = () => {
    setCustomFrom("");
    setCustomTo("");
    onChange({ option: "custom", from: "", to: "" });
  };

  const isCustom = value.option === "custom";
  // Có khoảng ngày đang được áp: hoặc đang chọn preset, hoặc custom đã nhập ngày.
  const hasActiveRange = !isCustom || Boolean(value.from) || Boolean(value.to);
  const selectedOption = dateFilterOptions.find((opt) => opt.value === value.option);
  const selectedLabel = selectedOption?.label || "Chọn khoảng thời gian";

  const presetGrid = (
    <div className="p-1">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-5">
        {Object.entries(groupedOptions).map(([group, options]) => (
          <div key={group} className="space-y-0.5">
            <div className="px-1 py-0.5 font-semibold text-muted-foreground">{group}</div>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePresetChange(opt.value)}
                className="w-full px-1 py-1 text-left text-[13px] hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded"
              >
                {opt.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  if (compact) {
    // Cắt chuỗi ISO chứ không dựng Date — mốc ngày ở đây là ngày lịch địa phương.
    const shortDay = (iso?: string) => {
      const parts = (iso ?? "").split("-");
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : "";
    };
    const customRange = [shortDay(value.from), shortDay(value.to)].filter(Boolean).join(" – ");
    const triggerText = isCustom ? customRange || "Chọn ngày" : selectedLabel;

    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger className="flex h-8 max-w-56 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs">
          <span className="truncate">{triggerText}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" side="bottom">
          {presetGrid}
          <div className="flex flex-wrap items-center gap-2 border-t border-border p-2">
            <span className="text-xs font-medium text-muted-foreground">Tùy chọn</span>
            <Input
              id={fromInputId}
              type="date"
              value={customFrom}
              onChange={(e) => handleCustomFromChange(e.target.value)}
              className="h-8 w-36 min-w-0 px-2 text-xs"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              id={toInputId}
              type="date"
              value={customTo}
              onChange={(e) => handleCustomToChange(e.target.value)}
              className="h-8 w-36 min-w-0 px-2 text-xs"
            />
            {clearable && hasActiveRange && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-primary hover:underline"
              >
                Xóa
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (inline) {
    return (
      // flex-wrap: màn hẹp (<420px) cặp ô ngày xuống dòng dưới nút preset thay vì tràn.
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger className="flex h-9 w-40 shrink-0 items-center justify-between rounded-md border border-input bg-background px-2.5 text-xs">
            <span className="truncate">{isCustom ? "Tùy chọn" : selectedLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto" side="bottom">
            {presetGrid}
          </PopoverContent>
        </Popover>
        <div className="flex min-w-0 items-center gap-2">
          <Input
            id={fromInputId}
            type="date"
            aria-label="Từ ngày"
            className="h-9 w-36 min-w-0 shrink px-2 text-xs"
            value={customFrom}
            onChange={(e) => handleCustomFromChange(e.target.value)}
          />
          <span className="shrink-0 text-xs text-muted-foreground">→</span>
          <Input
            id={toInputId}
            type="date"
            aria-label="Đến ngày"
            className="h-9 w-36 min-w-0 shrink px-2 text-xs"
            value={customTo}
            onChange={(e) => handleCustomToChange(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-muted-foreground">
            Chọn khoảng thời gian
          </label>
          {clearable && hasActiveRange && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-primary hover:underline"
            >
              Xóa
            </button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              name={modeName}
              checked={!isCustom}
              onChange={() => handleRadioChange("preset")}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger className="flex-1 h-9 justify-between">
                <span>{selectedLabel}</span>
                <ChevronDown className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto" side="right">
                {presetGrid}
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="radio"
              name={modeName}
              checked={isCustom}
              onChange={() => handleRadioChange("custom")}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="flex-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                id={fromInputId}
                type="date"
                className="h-9 w-full min-w-0 px-2 text-xs"
                value={customFrom}
                onChange={(e) => handleCustomFromChange(e.target.value)}
              />
              <Input
                id={toInputId}
                type="date"
                className="h-9 w-full min-w-0 px-2 text-xs"
                value={customTo}
                onChange={(e) => handleCustomToChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
