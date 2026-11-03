import { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TABLE_VIEWPORT_QUERY } from "@/lib/constants/layout";

type Props<T> = {
  items: T[];
  table: ReactNode;
  renderCard: (item: T, index: number) => ReactNode;
  /** key cho mỗi card; mặc định index. */
  getKey?: (item: T, index: number) => string | number;
  emptyText?: string;
  /** Khi true và chưa có dữ liệu, hiển thị LogoSpinner thay cho EmptyState (đường mobile). */
  loading?: boolean;
  /** Nhãn cho spinner khi đang tải. */
  loadingText?: string;
};

/**
 * Hiện `table` ở >=1024px (`lg`), ngược lại render danh sách thẻ qua `renderCard`.
 * Dùng cho các bảng list chính để mobile không phải cuộn ngang.
 */
export function ResponsiveList<T>({
  items,
  table,
  renderCard,
  getKey,
  emptyText,
  loading,
  loadingText = "Đang tải...",
}: Props<T>) {
  const showTable = useMediaQuery(TABLE_VIEWPORT_QUERY);
  if (showTable) return <>{table}</>;
  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <LogoSpinner label={loadingText} />
      </div>
    );
  }
  if (items.length === 0) {
    return <EmptyState icon={Inbox} title={emptyText ?? "Không có dữ liệu."} />;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={getKey ? getKey(it, i) : i}>{renderCard(it, i)}</div>
      ))}
    </div>
  );
}
