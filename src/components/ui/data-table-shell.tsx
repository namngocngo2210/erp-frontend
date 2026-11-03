import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";

import { useI18n } from "@/i18n";

type DataTableShellProps = {
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /**
   * Lần tải đầu (chưa có dữ liệu): thay thân bảng bằng hàng skeleton giữ chiều cao
   * → không nhảy layout khi dữ liệu về. Refetch khi đã có dữ liệu thì truyền `false`
   * để giữ nguyên bảng cũ (tránh nháy).
   */
  loading?: boolean;
  /** Số hàng skeleton khi `loading` (mặc định 8). */
  skeletonRows?: number;
  /** Số cột skeleton khi `loading` (mặc định 6). */
  skeletonColumns?: number;
};

export function DataTableShell({
  toolbar,
  children,
  className,
  bodyClassName,
  loading = false,
  skeletonRows = 8,
  skeletonColumns = 6,
}: DataTableShellProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-xs", className)}
      aria-busy={loading || undefined}
    >
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
          {toolbar}
        </div>
      ) : null}
      <div
        data-main-content
        className={cn("overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]", bodyClassName)}
      >
        {loading ? (
          <SkeletonTable
            rows={skeletonRows}
            columns={skeletonColumns}
            label={t("common.loading", "Đang tải")}
          />
        ) : (
          children
        )}
      </div>
      {!loading && children === null && (
        <EmptyState
          icon={Inbox}
          title={t("common.empty")}
          className="border-t border-border bg-muted/30"
        />
      )}
    </div>
  );
}
