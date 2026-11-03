import { Badge } from "@/components/ui/badge";
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
import { useI18n } from "@/i18n";
import type { ResaleTrackingRow } from "@/lib/api/customers";
import { ContactHistory } from "@/features/customers/components/ContactHistory";
import {
  daysChipClass,
  formatCurrency,
  formatDate,
  saleInitial,
  segmentBadgeClass,
} from "../resale-format";
import { ResaleRowActions, ResaleStatusBadge, type ResaleRowHandlers } from "./ResaleRowParts";

const COLUMN_LABELS = [
  "Khách hàng",
  "Phân khúc",
  "Sale PT",
  "SKU mua gần nhất",
  "Ngày mua cuối",
  "Số ngày",
  "Lịch sử liên hệ",
  "Hành động",
];

type Props = ResaleRowHandlers & {
  rows: ResaleTrackingRow[];
  loading: boolean;
};

export function ResaleTrackingList({ rows, loading, ...handlers }: Props) {
  const { t } = useI18n();
  return (
    <ResponsiveList
      items={rows}
      getKey={(row: ResaleTrackingRow) => row.order_id}
      loading={loading}
      loadingText={t("common.loading", "Đang tải")}
      emptyText="Không có kết quả phù hợp."
      table={
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <Table className="min-w-[1180px] table-fixed [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3">
              <colgroup>
                <col className="w-[190px]" />
                <col className="w-[110px]" />
                <col className="w-[120px]" />
                <col className="w-[170px]" />
                <col className="w-[120px]" />
                <col className="w-[80px]" />
                <col className="w-[300px]" />
                <col className="w-[190px]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  {COLUMN_LABELS.map((label, index) => (
                    <TableHead
                      key={label}
                      className={`h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground ${index === 0 ? "sticky-col sticky-col-edge" : ""}`}
                    >
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center">
                      <LogoSpinner label={t("common.loading", "Đang tải")} className="mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Không có kết quả phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => <ResaleTableRow key={row.order_id} row={row} {...handlers} />)
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      }
      renderCard={(row: ResaleTrackingRow) => <ResaleCard row={row} {...handlers} />}
    />
  );
}

function DaysChip({ days, spaced = false }: { days: number | null; spaced?: boolean }) {
  return (
    <span
      className={`${spaced ? "mt-1 " : ""}inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${daysChipClass(days)}`}
    >
      {days == null ? "-" : `${days}n`}
    </span>
  );
}

function ResaleTableRow({ row, ...handlers }: ResaleRowHandlers & { row: ResaleTrackingRow }) {
  return (
    <TableRow className="align-top">
      {/* Khách hàng dính trái khi cuộn ngang — cột định danh. */}
      <TableCell className="sticky-col sticky-col-edge">
        <div className="font-medium text-foreground">
          {row.recipient.name || row.customer.full_name || "-"}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.recipient.phone || row.customer.phone || "-"}
        </div>
        <div className="mt-1">
          <ResaleStatusBadge row={row} />
        </div>
      </TableCell>
      <TableCell>
        <Badge
          className={`${segmentBadgeClass(row.segment_code)} flex w-fit flex-col items-start gap-0 px-2 py-1 leading-tight`}
        >
          <span>{row.segment_code || "-"}</span>
          {row.segment_name && <span className="font-normal">{row.segment_name}</span>}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 pt-1">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {saleInitial(row.sale_staff_name)}
          </span>
          <span className="text-sm text-foreground">{row.sale_staff_name || "-"}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="line-clamp-2 text-xs font-medium text-foreground">
          {row.products.length > 0 ? row.products.join(", ") : "-"}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatCurrency(row.order_value)} đ
        </div>
      </TableCell>
      <TableCell>
        <div className="text-xs text-foreground">
          {formatDate(row.last_purchase_at || row.delivered_at)}
        </div>
        <DaysChip days={row.days_since_last_purchase} spaced />
      </TableCell>
      <TableCell className="text-center">
        <DaysChip days={row.days_since_last_purchase} />
      </TableCell>
      <TableCell>
        <ContactHistory row={row} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1.5">
          <ResaleRowActions row={row} {...handlers} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function ResaleCard({ row, ...handlers }: ResaleRowHandlers & { row: ResaleTrackingRow }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {row.recipient.name || row.customer.full_name || "-"}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.recipient.phone || row.customer.phone || "-"}
          </p>
          <div className="mt-1">
            <ResaleStatusBadge row={row} />
          </div>
        </div>
        <Badge
          className={`${segmentBadgeClass(row.segment_code)} flex shrink-0 flex-col items-start gap-0 px-2 py-1 leading-tight`}
        >
          <span>{row.segment_code || "-"}</span>
          {row.segment_name && <span className="font-normal">{row.segment_name}</span>}
        </Badge>
      </div>
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Sale PT: </span>
          <span className="text-foreground">{row.sale_staff_name || "-"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">SKU mua gần nhất: </span>
          <span className="font-medium text-foreground">
            {row.products.length > 0 ? row.products.join(", ") : "-"}
          </span>
          <span className="text-muted-foreground"> · {formatCurrency(row.order_value)} đ</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Ngày mua cuối: </span>
          <span className="text-foreground">
            {formatDate(row.last_purchase_at || row.delivered_at)}
          </span>
          <DaysChip days={row.days_since_last_purchase} />
        </div>
        <div className="border-t border-border/60 pt-2">
          <ContactHistory row={row} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <ResaleRowActions row={row} {...handlers} />
      </div>
    </div>
  );
}
