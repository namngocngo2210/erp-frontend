import type { ReactNode } from "react";
import { Tags } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { TAXONOMY_GROUPS, type MediaTaxonomyItem, type TaxonomyGroup } from "@/lib/api/media";

import { mediaCan, type MediaRole } from "../access";
import { useTaxonomy } from "../queries";

type Props = {
  group: TaxonomyGroup;
  onGroupChange: (g: TaxonomyGroup) => void;
  includeInactive: boolean;
  onIncludeInactiveChange: (v: boolean) => void;
  role: MediaRole | null;
  headerActions?: ReactNode;
  rowActions?: (item: MediaTaxonomyItem) => ReactNode;
};

/** Bảng của 1 nhóm taxonomy — cột động theo group (code cho products, group cho content-types). */
function GroupTable({
  group,
  includeInactive,
  rowActions,
}: Pick<Props, "group" | "includeInactive" | "rowActions">) {
  const { t } = useI18n();
  const { data, isLoading } = useTaxonomy(group, includeInactive);
  if (isLoading || !data) return <LogoSpinner />;
  if (data.items.length === 0) return <EmptyState icon={Tags} title={t("media.common.empty")} />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">ID</TableHead>
          {group === "products" ? <TableHead>{t("media.taxonomy.col.code")}</TableHead> : null}
          <TableHead>{t("media.taxonomy.col.name")}</TableHead>
          {group === "content-types" ? (
            <TableHead>{t("media.taxonomy.col.group")}</TableHead>
          ) : null}
          <TableHead>{t("media.taxonomy.col.active")}</TableHead>
          {rowActions ? <TableHead className="w-10" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.id}</TableCell>
            {group === "products" ? (
              <TableCell className="font-mono text-xs">{item.code}</TableCell>
            ) : null}
            <TableCell>{item.name}</TableCell>
            {group === "content-types" ? <TableCell>{item.group}</TableCell> : null}
            <TableCell>
              <Switch
                checked={item.is_active}
                disabled
                aria-label={t("media.taxonomy.col.active")}
              />
            </TableCell>
            {rowActions ? <TableCell>{rowActions(item)}</TableCell> : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * 5 tab danh mục (content-types/products/product-categories/ad-channels/content-sources).
 * `headerActions`/`rowActions` để trống ở task này — Task 19 gắn create/edit/delete.
 * Toggle "hiện cả đã tắt" chỉ hiện khi role có quyền `taxonomy.include_inactive` (admin).
 */
export function TaxonomyTabs({
  group,
  onGroupChange,
  includeInactive,
  onIncludeInactiveChange,
  role,
  headerActions,
  rowActions,
}: Props) {
  const { t } = useI18n();
  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className="flex items-center gap-2">
        {mediaCan(role, "taxonomy.include_inactive") ? (
          // Checkbox tự bọc <label> quanh input (xem checkbox.tsx) — không bọc thêm
          // <label> ở đây (label lồng label là HTML không hợp lệ, gây double toggle/
          // announce). Dùng aria-label trên Checkbox làm accessible name duy nhất,
          // chữ hiển thị là <span aria-hidden> đi kèm.
          <div className="flex items-center gap-2">
            <Checkbox
              id="media-tax-include-inactive"
              checked={includeInactive}
              onCheckedChange={(v) => onIncludeInactiveChange(v === true)}
              aria-label={t("media.taxonomy.includeInactive")}
            />
            <span aria-hidden className="text-sm">
              {t("media.taxonomy.includeInactive")}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex gap-2">{headerActions}</div>
    </div>
  );
  return (
    <Tabs
      active={group}
      onChange={(k) => onGroupChange(k as TaxonomyGroup)}
      tabs={TAXONOMY_GROUPS.map((g) => ({
        key: g,
        label: t(`media.taxonomy.group.${g}`),
        content: (
          <div className="rounded-lg border">
            {toolbar}
            <GroupTable group={g} includeInactive={includeInactive} rowActions={rowActions} />
          </div>
        ),
      }))}
    />
  );
}
