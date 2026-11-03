import { Check, ClipboardCheck, Copy, History, PhoneCall, StickyNote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CarrierBadge } from "@/components/ui/carrier-badge";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDatePattern } from "@/lib/format";
import { ORDER_SOURCE_LABELS } from "@/features/orders/order-source";
import type { OrderSource } from "@/features/orders/order-types";
import type { ContactItem } from "@/lib/api/contacts";
import {
  CONTACT_ACTIONS,
  humanizeWaiting,
  waitingTooltip,
  waitingUrgencyClass,
} from "../contact-actions";
import { ContactHistoryPopover } from "./ContactHistoryPopover";
import { ContactResultSelect, type ContactResultOption } from "./ContactResultSelect";
import { ContactSkuCell } from "./ContactSkuCell";
import { OperationCell, type OperationStageOption } from "./OperationCell";

const COLUMN_COUNT = 16;

// Class dính trái cho cột dữ liệu theo vị trí (0 = "#", 1 = "Khách hàng"); cột khác không dính.
const STICKY_DATA_COL_CLASS: Record<number, string> = {
  0: "md:sticky-col md:left-[44px]",
  1: "sticky-col sticky-col-edge md:left-[92px]",
};

function formatDateTime(iso: string | null | undefined): string {
  return formatDatePattern(iso, "HH:mm dd/MM/yyyy");
}

function sourceLabel(orderSource: string, channelName: string): string {
  if (channelName) return channelName;
  const known = ORDER_SOURCE_LABELS[orderSource as OrderSource];
  return known ?? orderSource ?? "—";
}

function PhoneCell({ phone }: { phone: string }) {
  const { copied, copy } = useCopyToClipboard();
  if (!phone) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1">
      <span className="inline-block leading-tight">
        <span className="block whitespace-nowrap">{phone}</span>
        <CarrierBadge phone={phone} />
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Sao chép số điện thoại"
        onClick={() => copy(phone)}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-action-success" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

type ContactsTableProps = {
  rows: ContactItem[];
  loading: boolean;
  /** Trang hiện tại (1-based) + kích thước trang — dùng tính STT theo trang. */
  page: number;
  pageSize: number;
  onOpenOrder: (orderId: number) => void;
  /** Bấm nút gọi — trang chịu trách nhiệm dial() qua webphone + log activity. */
  onCall?: (row: ContactItem) => void;
  /** true khi webphone chưa sẵn sàng (chưa kết nối/không có quyền) — disable nút gọi. */
  callDisabled?: boolean;
  /** Lý do hiện trong tooltip khi `callDisabled` (mặc định "Webphone chưa sẵn sàng"). */
  callDisabledReason?: string;
  /** Mở ContactNoteDialog cho row này (nút "Ghi chú" ở Thao tác nhanh). */
  onAddNote?: (row: ContactItem) => void;
  /** Options cột "Kết quả" — từ CRM catalog (fallback tĩnh do trang tự chọn). */
  resultOptions: ContactResultOption[];
  /** Đổi "Kết quả" của đơn mới nhất — trang chịu trách nhiệm bắn PATCH. */
  onResultChange?: (row: ContactItem, code: string) => void;
  /** order id đang PATCH dở (khoá đúng 1 dòng khi đang lưu). */
  pendingResultOrderId?: number | null;
  /** Mở OperationResultDialog cho row này (nút "Ghi KQ tác nghiệp" ở Thao tác nhanh). */
  onOpenOperationResult?: (row: ContactItem) => void;
  /** Mở OperationDueDialog cho row này (icon Pencil ở cột Tác nghiệp). */
  onEditOperationDue?: (row: ContactItem) => void;
  /** Options ô chọn bước ở cột Tác nghiệp (value = stage id dạng chuỗi). */
  stageOptions: OperationStageOption[];
  /** Sale chọn bước khác — trang mở dialog hỏi giờ hẹn rồi mới ghi. */
  onSelectOperationStage?: (row: ContactItem, stageId: number) => void;
  /** customer_id đang đổi bước dở (khoá đúng 1 dòng khi đang lưu). */
  pendingStageCustomerId?: number | null;
  /** customer_id đang được tích chọn — có thể gồm cả dòng ở TRANG KHÁC. */
  selectedIds: number[];
  /** Tích/bỏ tích 1 dòng. */
  onToggleRow?: (customerId: number, checked: boolean) => void;
  /** Tích/bỏ tích TOÀN BỘ dòng của trang đang xem (checkbox ở header). */
  onTogglePage?: (checked: boolean) => void;
};

/**
 * Bảng contact — thuần presentational (props vào, callback ra), không tự
 * fetch dữ liệu. `ContactsPage` giữ state/query và truyền rows đã lọc/phân
 * trang xuống.
 */
export function ContactsTable({
  rows,
  loading,
  page,
  pageSize,
  onOpenOrder,
  onCall,
  callDisabled = false,
  callDisabledReason = "Webphone chưa sẵn sàng",
  onAddNote,
  resultOptions,
  onResultChange,
  pendingResultOrderId = null,
  onOpenOperationResult,
  onEditOperationDue,
  stageOptions,
  onSelectOperationStage,
  pendingStageCustomerId = null,
  selectedIds,
  onToggleRow,
  onTogglePage,
}: ContactsTableProps) {
  const selectedSet = new Set(selectedIds);
  // Chỉ xét dòng của TRANG đang xem: checkbox header là "chọn cả trang", không phải
  // "chọn cả kết quả" (không có nút chọn toàn bộ — muốn xuất tất cả thì bỏ tích hết
  // rồi xuất theo bộ lọc).
  const pageSelectedCount = rows.filter((row) => selectedSet.has(row.customer_id)).length;
  const pageState =
    rows.length > 0 && pageSelectedCount === rows.length
      ? true
      : pageSelectedCount > 0
        ? ("indeterminate" as const)
        : false;

  return (
    <div data-main-content className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <Table className="min-w-[1560px] table-fixed [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3">
          <colgroup>
            <col className="w-[44px]" />
            <col className="w-[48px]" />
            <col className="w-[180px]" />
            <col className="w-[140px]" />
            {/* Địa chỉ: 220px — ô text truncate + tooltip toàn văn. Mỗi cột header
                PHẢI có <col> tương ứng: table-fixed thiếu 1 <col> là bề rộng trượt
                sang trái một cột, cột cuối mất bề rộng và chèn lên nhau. */}
            <col className="w-[220px]" />
            <col className="w-[90px]" />
            <col className="w-[140px]" />
            <col className="w-[130px]" />
            <col className="w-[150px]" />
            <col className="w-[110px]" />
            <col className="w-[100px]" />
            <col className="w-[170px]" />
            {/* Tác nghiệp: 130px — ô chọn `w-full` vừa đúng khung, không tràn ra
                ngoài ô như bản 150px (ô chọn 130px + chấm màu + gap > bề rộng khả
                dụng sau padding, đó là nguyên nhân cột nhìn so le). */}
            <col className="w-[130px]" />
            <col className="w-[160px]" />
            {/* Thời gian chờ: 120px — header "THỜI GIAN CHỜ" nowrap ~87px, 100px
                (còn 76px sau padding) không đủ, chữ tràn sang cột SL đơn. */}
            <col className="w-[120px]" />
            <col className="w-[80px]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              {/* Cột dính: checkbox + # (≥768) và Khách hàng (mọi cỡ, ở 375 dính mép trái
                  để không chiếm quá nửa màn); left khớp <col> 44/48px. */}
              <TableHead className="h-10 md:sticky-col">
                <Checkbox
                  checked={pageState}
                  onCheckedChange={(checked) => onTogglePage?.(checked)}
                  disabled={rows.length === 0}
                  aria-label="Chọn tất cả contact trong trang"
                />
              </TableHead>
              {[
                "#",
                "Khách hàng",
                "SĐT",
                "Địa chỉ",
                "Thao tác nhanh",
                "Nguồn khách",
                "Ngày data về",
                "SKU",
                "Giá đơn",
                "Loại khách",
                "Tác nghiệp cần",
                "Tác nghiệp",
                "Kết quả",
                "Thời gian chờ",
                "SL đơn",
              ].map((label, index) => (
                <TableHead
                  key={label}
                  className={cn(
                    "h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                    STICKY_DATA_COL_CLASS[index],
                  )}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center">
                  <LogoSpinner size={36} className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Không có contact phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => {
                const action =
                  CONTACT_ACTIONS[row.action_needed as keyof typeof CONTACT_ACTIONS] ??
                  CONTACT_ACTIONS.none;
                return (
                  <TableRow key={row.customer_id} className="align-top">
                    <TableCell className="md:sticky-col">
                      <Checkbox
                        checked={selectedSet.has(row.customer_id)}
                        onCheckedChange={(checked) => onToggleRow?.(row.customer_id, checked)}
                        aria-label={`Chọn ${row.full_name || row.customer_code}`}
                      />
                    </TableCell>
                    <TableCell
                      className={cn("text-xs text-muted-foreground", STICKY_DATA_COL_CLASS[0])}
                    >
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className={STICKY_DATA_COL_CLASS[1]}>
                      <div className="font-medium text-foreground">{row.full_name || "-"}</div>
                      <div className="text-xs text-muted-foreground">{row.customer_code}</div>
                    </TableCell>
                    <TableCell>
                      <PhoneCell phone={row.phone_raw} />
                    </TableCell>
                    <TableCell>
                      <div
                        className="max-w-[240px] truncate text-xs text-muted-foreground"
                        title={row.latest_order.address || undefined}
                      >
                        {row.latest_order.address || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          disabled={callDisabled || !row.phone_raw}
                          aria-label="Gọi khách"
                          title={callDisabled ? callDisabledReason : "Gọi khách"}
                          onClick={() => onCall?.(row)}
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Ghi chú"
                          title="Ghi chú"
                          onClick={() => onAddNote?.(row)}
                        >
                          <StickyNote className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Ghi kết quả tác nghiệp"
                          title="Ghi kết quả tác nghiệp"
                          onClick={() => onOpenOperationResult?.(row)}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {sourceLabel(row.latest_order.order_source, row.latest_order.channel_name)}
                    </TableCell>
                    <TableCell className="text-xs text-foreground whitespace-nowrap">
                      {formatDateTime(row.latest_order.created_at)}
                    </TableCell>
                    <TableCell>
                      <ContactSkuCell items={row.latest_order.items ?? []} />
                    </TableCell>
                    <TableCell className="text-xs text-foreground whitespace-nowrap">
                      {formatCurrency(row.latest_order.total_after_discount, {
                        style: "suffix",
                        maximumFractionDigits: 0,
                        fallback: "—",
                      })}
                    </TableCell>
                    <TableCell>
                      {row.is_new_customer ? (
                        <Badge className="border-0 bg-sky-100 text-sky-700 whitespace-nowrap">
                          Khách mới
                        </Badge>
                      ) : (
                        <Badge className="border-0 bg-slate-100 text-slate-600 whitespace-nowrap">
                          Khách cũ
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge className={cn("whitespace-nowrap", action.badgeClass)}>
                          {action.label}
                        </Badge>
                        <ContactHistoryPopover
                          customerId={row.customer_id}
                          customerName={row.full_name || row.customer_code}
                        >
                          <History className="h-3.5 w-3.5" />
                        </ContactHistoryPopover>
                      </div>
                    </TableCell>
                    <TableCell>
                      <OperationCell
                        operation={row.operation}
                        stageOptions={stageOptions}
                        onSelectStage={(stageId) => onSelectOperationStage?.(row, stageId)}
                        selectDisabled={pendingStageCustomerId === row.customer_id}
                        onEditDue={() => onEditOperationDue?.(row)}
                      />
                    </TableCell>
                    <TableCell>
                      <ContactResultSelect
                        value={row.latest_order.sales_status_code}
                        options={resultOptions}
                        disabled={
                          !row.latest_order.id || pendingResultOrderId === row.latest_order.id
                        }
                        onChange={(code) => onResultChange?.(row, code)}
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          waitingUrgencyClass(row.waiting_since, row.waiting_basis),
                        )}
                        title={waitingTooltip(row.waiting_since, row.waiting_basis)}
                      >
                        {humanizeWaiting(row.waiting_since)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
                        disabled={!row.latest_order.id}
                        onClick={() => onOpenOrder(row.latest_order.id)}
                      >
                        {row.order_count}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
