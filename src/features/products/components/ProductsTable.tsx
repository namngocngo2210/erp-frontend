import { Fragment } from "react";
import { ChevronDown, ChevronRight, Edit, FileText, PackageOpen, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PaginationPages } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";
import { Product, ProductGroupedEntry } from "@/lib/api/products";
import {
  DEFAULT_ENTRY_PAGE_SIZE,
  formatPrice,
  groupPriceLabel,
} from "@/features/products/constants";
import { formatDateVi } from "@/lib/format";
import type { ProductsPageController } from "@/features/products/hooks/useProductsPage";

/** Bảng (desktop) + thẻ (mobile) sản phẩm/nhóm, kèm phân trang. */
export function ProductsTable({ ctrl }: { ctrl: ProductsPageController }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
    entries,
    loading,
    normalizedSearchTerm,
    selectedProductIds,
    toggleSelectProduct,
    togglingProductIds,
    handleToggleProductStatus,
    openEditDialog,
    handleDeleteProduct,
    allChecked,
    toggleSelectAllVisible,
    expandedGroupIds,
    loadingGroupIds,
    groupVariants,
    toggleGroupExpanded,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
  } = ctrl;

  // Một dòng sản phẩm desktop — dùng chung cho sản phẩm rời (isVariant=false) và
  // biến thể trong nhóm đã mở (isVariant=true, thụt lề + nền nhạt).
  const renderDesktopProductRow = (product: Product, isVariant: boolean) => (
    <TableRow key={product.id} className={isVariant ? "bg-muted/5" : ""}>
      <TableCell
        className={`sticky left-0 z-10 w-8 px-1! text-center shadow-[1px_0_0_0_var(--border)] ${
          isVariant ? "bg-card" : "bg-card"
        }`}
      >
        <input
          className="size-3.5"
          type="checkbox"
          checked={selectedProductIds.includes(product.id)}
          onChange={() => toggleSelectProduct(product.id)}
          aria-label={t("products.actions.selectRow", "Select product {name}").replace(
            "{name}",
            product.name,
          )}
        />
      </TableCell>
      <TableCell className="px-1!" />
      <TableCell className={`font-medium ${isVariant ? "pl-6 text-foreground" : ""}`}>
        {product.name}
        {product.short_name && (
          <span className="block text-xs font-normal text-muted-foreground">
            {product.short_name}
          </span>
        )}
      </TableCell>
      <TableCell className="font-medium text-foreground">{product.sku}</TableCell>
      <TableCell className="text-foreground">{formatPrice(product.price ?? 0)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={product.is_active}
            disabled={togglingProductIds.includes(product.id)}
            onCheckedChange={(checked) => handleToggleProductStatus(product, checked)}
          />
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDateVi(product.created_at)}</TableCell>
      <TableCell className="text-right">
        <Button
          title={t("products.actions.content", "Nội dung trang")}
          aria-label={t("products.actions.content", "Nội dung trang")}
          size="icon-sm"
          variant="outline"
          className="border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
          onClick={() => navigate(`/catalog/products/${product.id}/content`)}
        >
          <FileText className="w-4 h-4" />
        </Button>
        <Button
          title={t("products.actions.edit")}
          aria-label={t("products.actions.edit")}
          size="icon-sm"
          variant="outline"
          className="border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground ml-1"
          onClick={() => openEditDialog(product)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          title={t("products.actions.delete")}
          aria-label={t("products.actions.delete")}
          size="icon-sm"
          variant="outline"
          className="border-border bg-background text-destructive hover:bg-accent hover:text-destructive-foreground ml-1"
          onClick={() => handleDeleteProduct(product.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );

  // Một thẻ sản phẩm mobile — dùng chung cho sản phẩm rời và biến thể trong nhóm.
  const renderMobileProductCard = (product: Product, isVariant: boolean) => (
    <div
      key={product.id}
      className={`rounded-lg border border-border/70 bg-card p-3 shadow-xs ${
        isVariant ? "ml-3 border-l-2 border-l-primary/40" : ""
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{product.sku}</p>
          <p className="font-medium text-foreground">{product.name}</p>
          {product.short_name && (
            <p className="text-xs text-muted-foreground">{product.short_name}</p>
          )}
        </div>
        <input
          type="checkbox"
          checked={selectedProductIds.includes(product.id)}
          onChange={() => toggleSelectProduct(product.id)}
          aria-label={t("products.actions.selectRow", "Select product {name}").replace(
            "{name}",
            product.name,
          )}
        />
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">{t("products.columns.price")}: </span>
          <span>{formatPrice(product.price ?? 0)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("products.columns.status")}: </span>
          <span className="ml-1 inline-flex items-center align-middle">
            <Switch
              checked={product.is_active}
              disabled={togglingProductIds.includes(product.id)}
              onCheckedChange={(checked) => handleToggleProductStatus(product, checked)}
            />
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("products.columns.createdAt")}: </span>
          <span>{formatDateVi(product.created_at)}</span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          title={t("products.actions.content", "Nội dung trang")}
          aria-label={t("products.actions.content", "Nội dung trang")}
          size="sm"
          variant="outline"
          className="flex-1 border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
          onClick={() => navigate(`/catalog/products/${product.id}/content`)}
        >
          <FileText className="mr-2 w-4 h-4" /> {t("products.actions.content", "Nội dung trang")}
        </Button>
        <Button
          title={t("products.actions.edit")}
          aria-label={t("products.actions.edit")}
          size="sm"
          variant="outline"
          className="flex-1 border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
          onClick={() => openEditDialog(product)}
        >
          <Edit className="mr-2 w-4 h-4" /> {t("products.actions.edit")}
        </Button>
        <Button
          title={t("products.actions.delete")}
          aria-label={t("products.actions.delete")}
          size="sm"
          variant="outline"
          className="flex-1 border-border bg-background text-destructive hover:bg-accent hover:text-destructive-foreground"
          onClick={() => handleDeleteProduct(product.id)}
        >
          <Trash2 className="mr-2 w-4 h-4" /> {t("products.actions.delete")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <ResponsiveList
        items={entries}
        getKey={(entry: ProductGroupedEntry) =>
          entry.kind === "product" ? `p-${entry.product.id}` : `group-${entry.id}`
        }
        loading={loading}
        loadingText={t("common.loading", "Đang tải...")}
        emptyText={
          normalizedSearchTerm ? t("products.list.emptyFiltered") : t("products.list.empty")
        }
        table={
          <Table className="min-w-[800px] [&_td]:px-3 [&_th]:px-3">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 h-11 w-8 px-1! bg-muted/40 text-center shadow-[1px_0_0_0_var(--border)]">
                  <input
                    className="size-3.5"
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleSelectAllVisible}
                    aria-label={t("products.actions.selectAll", "Select all products")}
                  />
                </TableHead>
                <TableHead className="h-11 w-8" />
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("products.columns.name")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("products.columns.sku")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("products.columns.price")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("products.columns.status")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("products.columns.createdAt")}
                </TableHead>
                <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8">
                    {loading ? (
                      <LogoSpinner label={t("common.loading", "Đang tải...")} className="mx-auto" />
                    ) : (
                      <EmptyState
                        icon={PackageOpen}
                        title={
                          normalizedSearchTerm
                            ? t("products.list.emptyFiltered")
                            : t("products.list.empty")
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  if (entry.kind === "product") {
                    return renderDesktopProductRow(entry.product, false);
                  }
                  const expanded = expandedGroupIds.has(entry.id);
                  const variantsLoading = loadingGroupIds.has(entry.id);
                  const variants = groupVariants.get(entry.id) ?? [];
                  return (
                    <Fragment key={`group-${entry.id}`}>
                      <TableRow
                        className="cursor-pointer border-b border-border/70 bg-muted/20 hover:bg-muted/40"
                        onClick={() => toggleGroupExpanded(entry.id)}
                      >
                        <TableCell
                          className="sticky left-0 z-10 w-8 px-1! bg-muted/20 text-center shadow-[1px_0_0_0_var(--border)]"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <TableCell className="px-1! text-center text-muted-foreground">
                          {expanded ? (
                            <ChevronDown className="mx-auto h-4 w-4" />
                          ) : (
                            <ChevronRight className="mx-auto h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground" title={entry.name}>
                          {entry.name}
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">
                          {entry.code}
                        </TableCell>
                        <TableCell className="text-foreground">{groupPriceLabel(entry)}</TableCell>
                        <TableCell colSpan={3} className="text-muted-foreground">
                          {t("products.group.variants", "{count} biến thể").replace(
                            "{count}",
                            String(entry.variant_count),
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded && variantsLoading && (
                        <TableRow>
                          <TableCell colSpan={8} className="py-3 text-center">
                            <LogoSpinner size={24} />
                          </TableCell>
                        </TableRow>
                      )}
                      {expanded &&
                        !variantsLoading &&
                        variants.map((variant) => renderDesktopProductRow(variant, true))}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        }
        renderCard={(entry: ProductGroupedEntry) => {
          if (entry.kind === "product") {
            return renderMobileProductCard(entry.product, false);
          }
          const expanded = expandedGroupIds.has(entry.id);
          const variantsLoading = loadingGroupIds.has(entry.id);
          const variants = groupVariants.get(entry.id) ?? [];
          return (
            <div key={`group-${entry.id}`} className="space-y-2">
              <button
                type="button"
                onClick={() => toggleGroupExpanded(entry.id)}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-left"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.code} ·{" "}
                    {t("products.group.variants", "{count} biến thể").replace(
                      "{count}",
                      String(entry.variant_count),
                    )}{" "}
                    · {groupPriceLabel(entry)}
                  </p>
                </div>
              </button>
              {expanded && variantsLoading && (
                <div className="py-2 text-center">
                  <LogoSpinner size={24} />
                </div>
              )}
              {expanded &&
                !variantsLoading &&
                variants.map((variant) => renderMobileProductCard(variant, true))}
            </div>
          );
        }}
      />
      {(entries.length > 0 || currentPage > 1) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {t("products.pagination.summary", "Mục trang hiện tại: {{count}}").replace(
              "{{count}}",
              String(entries.length),
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("products.pagination.pageSize", "Mỗi trang")}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const nextPageSize = Number(value);
                const nextSafe =
                  Number.isFinite(nextPageSize) && nextPageSize > 0
                    ? Math.trunc(nextPageSize)
                    : DEFAULT_ENTRY_PAGE_SIZE;
                setPageSize(nextSafe);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <PaginationPages
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </>
  );
}
