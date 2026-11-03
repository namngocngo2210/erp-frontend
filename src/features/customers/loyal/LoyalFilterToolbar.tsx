import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { ALL_CATEGORIES, ALL_SEGMENTS, type PresetKey } from "./loyal-format";
import type { LoyalFilters } from "./use-loyal-customers-list";

/** Thanh lọc: khoảng thời gian (preset + tuỳ chọn), phân khúc, danh mục sản phẩm. */
export function LoyalFilterToolbar({ filters }: { filters: LoyalFilters }) {
  const { t } = useI18n();
  const {
    activePreset,
    customFrom,
    customTo,
    segment,
    category,
    segmentCategories,
    productCategories,
    applyPreset,
    changeCustomFrom,
    changeCustomTo,
    handleSegmentChange,
    handleCategoryChange,
  } = filters;

  const presetButtons: { key: Exclude<PresetKey, "custom">; label: string }[] = [
    { key: "all", label: t("loyalCustomers.filter.allTime", "Toàn thời gian") },
    { key: "this_month", label: t("loyalCustomers.filter.thisMonth", "Tháng này") },
    { key: "this_quarter", label: t("loyalCustomers.filter.thisQuarter", "Quý này") },
    { key: "this_year", label: t("loyalCustomers.filter.thisYear", "Năm nay") },
  ];

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">
        {t("loyalCustomers.filter.label", "Khoảng thời gian")}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {presetButtons.map((preset) => (
          <Button
            key={preset.key}
            size="sm"
            variant={activePreset === preset.key ? "default" : "outline"}
            onClick={() => applyPreset(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={customFrom}
          max={customTo || undefined}
          onChange={(event) => changeCustomFrom(event.target.value)}
          className="h-9 w-[150px]"
          aria-label={t("loyalCustomers.filter.from", "Từ ngày")}
        />
        <span className="text-muted-foreground">—</span>
        <Input
          type="date"
          value={customTo}
          min={customFrom || undefined}
          onChange={(event) => changeCustomTo(event.target.value)}
          className="h-9 w-[150px]"
          aria-label={t("loyalCustomers.filter.to", "Đến ngày")}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {t("loyalCustomers.filter.segment", "Phân khúc")}
        </span>
        <Select value={segment} onValueChange={handleSegmentChange}>
          <SelectTrigger className="h-9 w-70">
            <SelectValue>
              {segment === ALL_SEGMENTS
                ? t("loyalCustomers.filter.allSegments", "Tất cả phân khúc (S1-S7)")
                : (() => {
                    const selected = segmentCategories.find((item) => item.code === segment);
                    return selected ? `${selected.code} - ${selected.name}` : segment;
                  })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SEGMENTS}>
              {t("loyalCustomers.filter.allSegments", "Tất cả phân khúc (S1-S7)")}
            </SelectItem>
            {segmentCategories.map((item) => (
              <SelectItem key={item.code} value={item.code}>
                {item.code} - {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {t("loyalCustomers.filter.category", "Danh mục sản phẩm")}
        </span>
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="h-9 w-[210px]">
            <SelectValue>
              {category === ALL_CATEGORIES
                ? t("loyalCustomers.filter.allCategories", "Tất cả danh mục")
                : (productCategories.find((c) => String(c.id) === category)?.name ?? category)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>
              {t("loyalCustomers.filter.allCategories", "Tất cả danh mục")}
            </SelectItem>
            {productCategories.map((productCategory) => (
              <SelectItem key={productCategory.id} value={String(productCategory.id)}>
                {productCategory.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
