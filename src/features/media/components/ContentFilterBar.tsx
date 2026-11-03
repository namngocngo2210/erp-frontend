import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { useI18n } from "@/i18n";
import type { MediaTaxonomyItem, TaxonomyGroup } from "@/lib/api/media";

import type { ContentFilters, ContentSort } from "../filters";

type Props = {
  value: ContentFilters;
  onChange: (next: ContentFilters) => void;
  taxonomy: Record<TaxonomyGroup, MediaTaxonomyItem[]>;
};

const RATINGS = ["good", "average", "bad", "unknown"] as const;
const AD_RATINGS = ["0", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];
const toOptions = (items: MediaTaxonomyItem[]) =>
  items.map((i) => ({ value: String(i.id), label: i.code ? `${i.code} – ${i.name}` : i.name }));

export function ContentFilterBar({ value, onChange, taxonomy }: Props) {
  const { t } = useI18n();
  // Mọi thay đổi filter đưa về trang 1.
  const set = <K extends keyof ContentFilters>(key: K, v: ContentFilters[K]) =>
    onChange({ ...value, [key]: v, page: 1 });
  // width cố định + shrink-0 để cả thanh nằm gọn một hàng, cuộn ngang khi màn hẹp
  // thay vì wrap xuống dòng (yêu cầu chủ shop).
  const field = (label: string, node: React.ReactNode, width = "w-40") => (
    <div className={`flex ${width} shrink-0 flex-col gap-1`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {node}
    </div>
  );
  const ratingOptions = RATINGS.map((r) => ({ value: r, label: t(`media.rating.${r}`) }));
  return (
    <Card>
      <CardContent className="flex flex-nowrap items-end gap-3 overflow-x-auto pt-6">
        {field(
          t("media.contents.filter.source"),
          <MultiSelect
            options={toOptions(taxonomy["content-sources"])}
            selected={value.sourceIds}
            onChange={(v) => set("sourceIds", v)}
            placeholder={t("media.contents.filter.source")}
            menuPortal
          />,
        )}
        {field(
          t("media.contents.filter.type"),
          <MultiSelect
            options={toOptions(taxonomy["content-types"])}
            selected={value.contentTypeIds}
            onChange={(v) => set("contentTypeIds", v)}
            placeholder={t("media.contents.filter.type")}
            menuPortal
          />,
        )}
        {field(
          t("media.contents.filter.rating"),
          <MultiSelect
            options={ratingOptions}
            selected={value.overallRatings}
            onChange={(v) => set("overallRatings", v)}
            placeholder={t("media.contents.filter.rating")}
            menuPortal
          />,
        )}
        {field(
          t("media.contents.filter.product"),
          <MultiSelect
            options={toOptions(taxonomy.products)}
            selected={value.productIds}
            onChange={(v) => set("productIds", v)}
            placeholder={t("media.contents.filter.product")}
            menuPortal
          />,
        )}
        {field(
          t("media.contents.filter.category"),
          <MultiSelect
            options={toOptions(taxonomy["product-categories"])}
            selected={value.categoryIds}
            onChange={(v) => set("categoryIds", v)}
            placeholder={t("media.contents.filter.category")}
            menuPortal
          />,
        )}
        {field(
          t("media.contents.filter.channel"),
          <MultiSelect
            options={toOptions(taxonomy["ad-channels"])}
            selected={value.channelIds}
            onChange={(v) => set("channelIds", v)}
            placeholder={t("media.contents.filter.channel")}
            menuPortal
          />,
        )}
        {/* Điểm ads chỉ có tác dụng khi đã chọn kênh (tài liệu ads-crm §3.4). */}
        {value.channelIds.length > 0
          ? field(
              t("media.contents.filter.adRating"),
              <MultiSelect
                options={AD_RATINGS.map((r) => ({ value: r, label: r }))}
                selected={value.adRatings}
                onChange={(v) => set("adRatings", v)}
                placeholder={t("media.contents.filter.adRating")}
                menuPortal
              />,
            )
          : null}
        {field(
          t("media.contents.filter.from"),
          <Input
            type="date"
            value={value.uploadedFrom}
            onChange={(e) => set("uploadedFrom", e.target.value)}
            className="h-9"
          />,
          "w-36",
        )}
        {field(
          t("media.contents.filter.to"),
          <Input
            type="date"
            value={value.uploadedTo}
            onChange={(e) => set("uploadedTo", e.target.value)}
            className="h-9"
          />,
          "w-36",
        )}
        {field(
          t("media.contents.filter.sort"),
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={`${value.sort}:${value.order}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split(":") as [ContentSort, "asc" | "desc"];
              onChange({ ...value, sort, order, page: 1 });
            }}
          >
            {(["uploaded_at", "title", "rating"] as const).flatMap((s) =>
              (["desc", "asc"] as const).map((o) => (
                <option key={`${s}:${o}`} value={`${s}:${o}`}>
                  {t(`media.contents.sort.${s}`)} {o === "desc" ? "↓" : "↑"}
                </option>
              )),
            )}
          </select>,
          "w-44",
        )}
      </CardContent>
    </Card>
  );
}
