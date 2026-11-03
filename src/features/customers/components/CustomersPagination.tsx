import { TablePagination } from "@/components/ui/table-pagination";
import { useI18n } from "@/i18n";

import { PAGE_SIZE_OPTIONS_STANDARD } from "@/lib/constants/pagination";

interface CustomersPaginationProps {
  total: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  onPageSizeChange: (value: string) => void;
  onPageChange: (page: number) => void;
}

export function CustomersPagination({
  total,
  pageSize,
  currentPage,
  totalPages,
  onPageSizeChange,
  onPageChange,
}: CustomersPaginationProps) {
  const { t } = useI18n();
  return (
    <TablePagination
      className="mt-4 gap-3 px-3 pb-3"
      total={total}
      page={currentPage}
      pageSize={pageSize}
      totalPages={totalPages}
      pageSizeOptions={PAGE_SIZE_OPTIONS_STANDARD}
      pageSizeLabel={t("customers.pagination.pageSize", "Mỗi trang")}
      onPageSizeChange={(size) => onPageSizeChange(String(size))}
      onPageChange={onPageChange}
      summary={
        <span className="text-sm text-muted-foreground">
          {t("customers.pagination.total", "Tổng {count} khách hàng").replace(
            "{count}",
            String(total),
          )}
        </span>
      }
    />
  );
}
