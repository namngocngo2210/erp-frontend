import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRightLeft,
  ChevronDown,
  Download,
  FileText,
  History,
  Inbox,
  MoreHorizontal,
  Plus,
  Printer,
  RotateCcw,
  Store,
  Trash2,
  Truck,
  Upload,
} from "lucide-react";

import { toast } from "sonner";
import { getApiErrorBody, getApiErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { LogoSpinner, LogoSpinnerOverlay } from "@/components/ui/logo-spinner";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermission } from "@/hooks/usePermission";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_VIEWPORT_QUERY } from "@/lib/constants/layout";
import { useOrderFieldGrants } from "@/hooks/useOrderFieldGrants";
import { useI18n } from "@/i18n";
import { ExportColumnsDialog } from "@/features/orders/ExportColumnsDialog";
import type { OrderColumnKey, OrderRow, ProductRow } from "@/features/orders/order-types";
import type {
  AddressCatalog,
  KiotVietOption,
  KiotVietOrderAction,
} from "@/features/orders/use-orders-data";
import type { ChannelRow } from "@/features/channels/types";

import { getColumnConfig } from "./constants";
import { OrderMobileCard, type OrderMobileCellProps } from "./OrderMobileCard";
import { OrdersMobileTotalsBar, OrdersTableTotalsRow } from "./OrdersTableTotalsRow";
import { TOTALS_COLUMN_KEY } from "./order-totals";
import { OrderTableRow } from "./OrderTableRow";
import {
  CHECKBOX_MEASURE_KEY,
  resolveStickyColumns,
  useLockedColumnOffsets,
} from "./use-locked-column-offsets";
import { useOrdersTableData, type OrderExportSection } from "./useOrdersTableData";
import { useConfirm } from "@/hooks/use-confirm";

/**
 * Task 10: tìm các đơn ĐANG ĐƯỢC CHỌN mà chưa có kho xuất — dùng để chặn nút
 * "Tạo nhanh" ngay trên UI trước khi gọi API. Đây chỉ là lớp báo
 * lỗi kịp lúc: backend vẫn giữ guard riêng (400, khoá `orders_without_warehouse`)
 * làm lớp bảo vệ thật sự — xem order_action_view.py.
 *
 * Tách hàm thuần thay vì viết logic trực tiếp trong onClick để test được độc
 * lập, không phải render cả OrdersTable (kéo theo toàn bộ useOrdersTableData).
 *
 * GIỚI HẠN CỐ Ý — chỉ phủ trang hiện tại: `rows` chỉ chứa đơn của TRANG ĐANG
 * XEM, trong khi `selectedIds` KHÔNG reset khi đổi trang (chủ đích, xem
 * useOrdersTableData.ts dòng reset theo filterKey). Chọn đơn thiếu kho ở trang
 * 1 rồi sang trang 2 bấm "Tạo nhanh" → đơn đó không có trong `rows` của lần gọi
 * này nên lọt qua tiền kiểm và request vẫn gửi lên backend. Chấp nhận được vì
 * hai lý do: (1) ca cùng trang là ca phổ biến nhất, được chặn tức thì; (2) ca
 * xuyên trang vẫn được backend chặn cứng (400) và `runKiotVietOrderAction`
 * (use-orders-bulk-actions.ts) đã hiển thị nguyên văn `detail` tiếng Việt của
 * response lỗi qua toast — không phải thông báo kỹ thuật chung chung — nên
 * nhân viên vẫn biết chính xác đơn nào bị chặn, chỉ là biết SAU thay vì TRƯỚC.
 *
 * Cố tình KHÔNG chặn kèm ca "đơn đã đẩy đi vận chuyển" (order_code) mà backend
 * cũng chặn ở action này. Có một proxy rẻ: `shipping_type === "shipment"` CÓ
 * mặt trong payload list (thêm từ Task 2, không nằm trong
 * LIST_EXCLUDED_ORDER_FIELDS của OrderListSerializer) và được backend tự gắn
 * ngay khi push/KShip thành công. Nhưng proxy này KHÔNG chính xác 100%: đơn
 * tạo qua import XLSX có thể đã có `order_code` (đẩy vận chuyển) trong khi
 * `shipping_type` vẫn null (chưa từng chạy qua luồng gắn cờ) — dùng proxy sẽ
 * lọt lưới đúng ca cần chặn. Vì vậy bỏ qua, để backend tiếp tục chặn cứng ca
 * này bằng dữ liệu `order_code` thật (không có trong payload list).
 */
// eslint-disable-next-line react-refresh/only-export-components -- hàm thuần cần export để test trực tiếp, không tách file được vì gắn chặt ngữ cảnh bảng đơn
export function findOrdersWithoutWarehouse(rows: OrderRow[], selectedIds: number[]): OrderRow[] {
  const selected = new Set(selectedIds);
  return rows.filter((row) => selected.has(row.id) && !row.fulfillment_warehouse);
}

type Props = {
  rows: OrderRow[];
  /**
   * Trả về bộ lọc danh sách hiện tại (không phân trang) để "Xuất Excel" có thể xuất
   * TOÀN BỘ đơn khớp bộ lọc, không chỉ trang đang xem. null/undefined → chỉ cho xuất
   * các đơn đã chọn (Landing/KOC).
   */
  getExportFilters?: () => Record<string, unknown> | null;
  /** Section RBAC của trang gọi — backend check quyền `{section}:export` theo đúng trang. */
  exportSection?: OrderExportSection;
  products: ProductRow[];
  onPatch: (id: number, payload: Partial<OrderRow>, silent?: boolean) => Promise<void>;
  onDuplicateOrder: (id: number) => Promise<void>;
  onBulkDelete: (ids: number[]) => Promise<void>;
  onKiotVietAction: (action: KiotVietOrderAction, ids: number[]) => Promise<void>;
  visibleColumns: OrderColumnKey[];
  lockedColumns: OrderColumnKey[];
  kiotvietOptions: KiotVietOption[];
  addressCatalog: AddressCatalog;
  channelStaffByCode: Record<string, Array<{ id: number; name: string }>>;
  columnPicker?: React.ReactNode;
  leftActions?: React.ReactNode;
  preKiotVietActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  belowToolbar?: React.ReactNode;
  /** Search bar rendered as its own full-width row below the toolbar on mobile only. */
  mobileSearchBar?: React.ReactNode;
  /** Điện thoại (<768): nút "Bộ lọc" đặt cùng hàng ô tìm kiếm. */
  mobileFilterButton?: React.ReactNode;
  /** Điện thoại: mục menu "⋯" do trang cấp (Quay số, Nhập đơn, Sắp xếp…) — đặt trước các thao tác đơn. */
  mobileMenuItems?: React.ReactNode;
  /** Tabs/nav rendered ABOVE the toolbar card (e.g. /landing-orders view switcher). */
  aboveToolbar?: React.ReactNode;
  /** When true, wraps the toolbar + belowToolbar block in a bordered card. */
  wrapToolbarInCard?: boolean;
  /** Ẩn các nút thao tác hàng loạt theo đơn (In, KiotViet, Xóa) — dùng cho trang chỉ xem/sửa nhẹ như Vận đơn. */
  hideBulkOrderActions?: boolean;
  /** Callback khi user click vào dòng đơn hàng — dùng để điều hướng sang trang detail */
  onOpenDetails?: (order: OrderRow) => void;
  onOpenKiotVietLogs?: () => void;
  onOpenCreateKshipCodeModal?: (ids: number[]) => void;
  /** ID đơn đang xem (để highlight dòng trong grid) */
  activeOrderId?: number;
  /** Đang tải dữ liệu (bảng trống → spinner toàn khung) */
  isLoading?: boolean;
  /** Có query đang chạy dù bảng còn dữ liệu → lớp phủ spinner giữ dòng cũ */
  isFetching?: boolean;
  /** Chế độ Landing Page: hiển thị thêm nút chuyển đơn sang trang Orders. */
  isLandingPage?: boolean;
  /** Callback chuyển đơn landing sang đơn hàng */
  onTransferLandingOrders?: (ids: number[]) => Promise<unknown>;
  /** User là admin */
  isAdmin?: boolean;
  /** Callback hủy đơn trên KiotViet */
  onCancelKiotvietOrders?: (
    ids: number[],
  ) => Promise<{ queued_count: number; skipped_count: number; dispatch_failed_count: number }>;
  /** Callback khôi phục đơn đã hủy (tạo lại đơn mới). Hiển thị nút khi được truyền. */
  onRestoreCancelledOrders?: (
    ids: number[],
  ) => Promise<{ queued_count: number; skipped_count: number }>;
  /** Danh sách channels — cho phép inline edit cột mã kênh. */
  channels?: ChannelRow[];
  /** Khóa định danh bộ lọc hiện tại — khi đổi sẽ reset selection. Đổi page KHÔNG đổi key. */
  filterKey?: string;
  /** Danh sách kho — dùng cho ô inline chọn kho xuất (fulfillment_warehouse). */
  warehouseOptions?: Array<{ id: number; name: string }>;
  /** Bật dòng tổng "Tổng sau giảm giá" (cộng các dòng đang hiển thị) ở chân bảng. */
  showTotals?: boolean;
};

function OrdersTableImpl({
  rows,
  getExportFilters,
  exportSection,
  onPatch,
  onBulkDelete,
  onKiotVietAction,
  visibleColumns,
  lockedColumns,
  kiotvietOptions,
  addressCatalog,
  channelStaffByCode,
  columnPicker,
  leftActions,
  preKiotVietActions,
  rightActions,
  belowToolbar,
  mobileSearchBar,
  mobileFilterButton,
  mobileMenuItems,
  aboveToolbar,
  wrapToolbarInCard = false,
  hideBulkOrderActions = false,
  onOpenDetails,
  onOpenKiotVietLogs,
  onOpenCreateKshipCodeModal,
  activeOrderId,
  isLoading = false,
  isFetching = false,
  isLandingPage = false,
  onTransferLandingOrders,
  isAdmin = false,
  onCancelKiotvietOrders,
  onRestoreCancelledOrders,
  channels,
  filterKey,
  warehouseOptions = [],
  showTotals: showTotalsProp = false,
}: Props) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const can = usePermission();
  const canAssignSale = can("sale-assignment:edit");
  const canEditField = useOrderFieldGrants();

  // Toàn bộ state/data wiring + API calls (CRM catalog, in, xuất Excel,
  // KiotViet bulk) nằm trong container hook — component này chỉ render.
  const {
    crmCatalog,
    selectedIds,
    allRowsSelected,
    toggleRowSelection,
    toggleSelectAllRows,
    clearSelection,
    orderedColumns,
    lockedSet,
    showDeleteDialog,
    setShowDeleteDialog,
    handleDeleteSelected,
    handleRunKiotVietAction,
    handleBulkPrintInvoice,
    handleBulkPrintDeliverySlip,
    openExportModal,
    setOpenExportModal,
    exportColumns,
    setExportColumns,
    handleBulkExportExcel,
    handleExportConfirm,
  } = useOrdersTableData({
    rows,
    visibleColumns,
    lockedColumns,
    filterKey,
    exportSection,
    getExportFilters,
    onBulkDelete,
    onKiotVietAction,
  });

  // Offset sticky của cột ghim theo width THẬT (đo bằng ResizeObserver) —
  // công thức cũ hardcode 120px/cột khiến các cột ghim đè lên nhau.
  // Chưa ghim cột nào → tự dính cột tên/SĐT (≥768), xem resolveStickyColumns.
  const isMobileViewport = useMediaQuery(MOBILE_VIEWPORT_QUERY);
  const stickySet = useMemo(
    () => resolveStickyColumns(lockedSet, orderedColumns, isMobileViewport),
    [lockedSet, isMobileViewport, orderedColumns],
  );
  const lockedOrderedColumns = useMemo(
    () => orderedColumns.filter((columnKey) => stickySet.has(columnKey)),
    [orderedColumns, stickySet],
  );
  const { registerHeaderCell, lockedLeftByKey } = useLockedColumnOffsets(lockedOrderedColumns);
  const showTotals = showTotalsProp && !isLoading && rows.length > 0;

  const [isTransferring, setIsTransferring] = useState(false);
  const [openKiotVietMenu, setOpenKiotVietMenu] = useState(false);
  const kiotvietMenuRef = useRef<HTMLDivElement | null>(null);
  const kiotvietDropdownRef = useRef<HTMLDivElement | null>(null);
  const [kiotvietMenuPos, setKiotvietMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [openPrintMenu, setOpenPrintMenu] = useState(false);
  const printMenuRef = useRef<HTMLDivElement | null>(null);
  const printDropdownRef = useRef<HTMLDivElement | null>(null);
  const [printMenuPos, setPrintMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        kiotvietMenuRef.current &&
        !kiotvietMenuRef.current.contains(target) &&
        !kiotvietDropdownRef.current?.contains(target)
      ) {
        setOpenKiotVietMenu(false);
      }
      if (
        printMenuRef.current &&
        !printMenuRef.current.contains(target) &&
        !printDropdownRef.current?.contains(target)
      ) {
        setOpenPrintMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Giữ đúng thứ tự cũ: await action → clear selection (trong hook) → đóng menu.
  const runKiotVietAction = useCallback(
    async (action: KiotVietOrderAction, mode: "selected" | "all") => {
      await handleRunKiotVietAction(action, mode);
      setOpenKiotVietMenu(false);
    },
    [handleRunKiotVietAction],
  );

  /**
   * "Tạo nhanh" — LUÔN đi đường "xuất sau": hoá đơn KiotViet lên ngay, tồn kho
   * chỉ trừ khi kho bấm xác nhận ở màn "Chờ xuất kho". Nhánh trừ tồn ngay đã bị
   * gỡ 2026-08-28 nên hàm không còn nhận tham số action; backend vẫn nhận enum
   * cũ `quick_sale_selected` (bí danh) nhưng FE không còn chỗ nào gửi nó.
   */
  const runQuickSaleAction = useCallback(() => {
    // Chặn NGAY trên UI trước khi gọi API — backend vẫn có guard riêng
    // (400) cho ca này, đây chỉ là báo lỗi kịp lúc.
    const missing = findOrdersWithoutWarehouse(rows, selectedIds);
    if (missing.length > 0) {
      toast.error(
        t(
          "orders.toast.quickSaleMissingWarehouse",
          "Đơn bán trực tiếp phải có kho xuất. Thiếu kho: {codes}",
        ).replace(
          "{codes}",
          missing.map((order) => order.invoice_code || `#${order.id}`).join(", "),
        ),
      );
      return;
    }
    void runKiotVietAction("quick_sale_deferred_selected", "selected");
  }, [rows, selectedIds, t, runKiotVietAction]);

  const handleCancelKiotvietOrders = useCallback(async () => {
    if (!onCancelKiotvietOrders) return;
    const ok = await confirm({
      title: t(
        "orders.kiotviet.confirmCancel",
        `Hủy ${selectedIds.length} đơn trên KiotViet? Chỉ đơn có mã hóa đơn mới được xử lý.`,
      ),
      confirmText: t("orders.kiotviet.cancelOrders", "Hủy đơn"),
      destructive: true,
    });
    if (!ok) return;
    try {
      const result = await onCancelKiotvietOrders(selectedIds);
      const msgs: string[] = [];
      if (result.queued_count > 0) msgs.push(`Đã gửi hủy ${result.queued_count} đơn`);
      if (result.skipped_count > 0)
        msgs.push(`${result.skipped_count} đơn chưa có mã hóa đơn (bỏ qua)`);
      if (result.dispatch_failed_count > 0) msgs.push(`${result.dispatch_failed_count} đơn lỗi`);
      if (result.queued_count > 0) {
        toast.success(msgs.join(". "));
      } else {
        toast.warning(msgs.join(". ") || "Không có đơn nào được hủy");
      }
      clearSelection();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Hủy đơn thất bại"));
    }
  }, [onCancelKiotvietOrders, confirm, t, selectedIds, clearSelection]);

  const handleRestoreCancelledOrders = useCallback(async () => {
    if (!onRestoreCancelledOrders) return;
    const ok = await confirm({
      title: t("orders.actions.confirmRestore", `Khôi phục ${selectedIds.length} đơn đã hủy?`),
    });
    if (!ok) return;
    try {
      const result = await onRestoreCancelledOrders(selectedIds);
      const queued = Number(result?.queued_count ?? 0);
      const skipped = Number(result?.skipped_count ?? 0);
      if (queued > 0) {
        const skippedNote = skipped > 0 ? `, bỏ qua ${skipped} đơn` : "";
        toast.info(`Đang khôi phục ${queued} đơn${skippedNote}…`);
      } else {
        toast.warning("Không có đơn nào được đẩy vào hàng đợi");
      }
      clearSelection();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Khôi phục đơn thất bại"));
    }
  }, [onRestoreCancelledOrders, confirm, t, selectedIds, clearSelection]);

  const handleTransferLandingOrders = useCallback(async () => {
    if (isTransferring || !onTransferLandingOrders) return;
    const idsToTransfer = [...selectedIds];
    setIsTransferring(true);
    try {
      await onTransferLandingOrders(idsToTransfer);
      toast.success(
        t(
          "orders.actions.transferSuccess",
          `Đã chuyển ${idsToTransfer.length} đơn sang trang Đơn hàng`,
        ).replace("{count}", String(idsToTransfer.length)),
      );
      clearSelection();
    } catch (err: unknown) {
      const detail = getApiErrorMessage(err, "Chuyển đơn thất bại");
      const invalidOrders = getApiErrorBody(err)?.invalid_orders;
      if (Array.isArray(invalidOrders) && invalidOrders.length > 0) {
        // Payload chỉ còn `id`: BE đã bỏ name/phone khỏi response lỗi để
        // không rò PII khách theo `ids` (audit 2026-07-26 N1).
        const codes = (invalidOrders as Array<{ id: number }>).map((o) => `#${o.id}`).join(", ");
        toast.error(`${detail}: ${codes}`);
      } else {
        toast.error(detail);
      }
    } finally {
      setIsTransferring(false);
    }
  }, [isTransferring, onTransferLandingOrders, selectedIds, t, clearSelection]);

  const desktopToolbarRow = (
    <div
      className={`flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2 ${wrapToolbarInCard ? "py-1" : "mb-2 pt-2 sm:mb-4"}`}
    >
      {columnPicker}
      {leftActions}
      {/* Wrap thay vì cuộn ngang: nút thao tác chính (Tạo đơn) không bị giấu ở màn hẹp. */}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        {preKiotVietActions}
        {!hideBulkOrderActions && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs"
            onClick={handleBulkExportExcel}
            aria-label="Xuất Excel"
            title="Xuất Excel"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </Button>
        )}
        {!hideBulkOrderActions && (
          <>
            <div className="relative" ref={printMenuRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs"
                disabled={selectedIds.length === 0}
                aria-label="In"
                title="In"
                onClick={() => {
                  setOpenPrintMenu((prev) => {
                    if (!prev && printMenuRef.current) {
                      const rect = printMenuRef.current.getBoundingClientRect();
                      setPrintMenuPos({ top: rect.bottom + 4, left: rect.left });
                    }
                    return !prev;
                  });
                }}
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">In</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              {openPrintMenu &&
                printMenuPos &&
                createPortal(
                  <div
                    ref={printDropdownRef}
                    className="fixed z-50 w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
                    style={{ top: printMenuPos.top, left: printMenuPos.left }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      disabled={selectedIds.length === 0}
                      onClick={() => {
                        handleBulkPrintInvoice();
                        setOpenPrintMenu(false);
                      }}
                    >
                      <FileText className="h-4 w-4" />
                      Hóa đơn
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      disabled={selectedIds.length === 0}
                      onClick={() => {
                        handleBulkPrintDeliverySlip();
                        setOpenPrintMenu(false);
                      }}
                    >
                      <Truck className="h-4 w-4" />
                      Phiếu giao
                    </button>
                  </div>,
                  document.body,
                )}
            </div>
            <div className="relative" ref={kiotvietMenuRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs"
                aria-label="KiotViet"
                title="KiotViet"
                onClick={() => {
                  setOpenKiotVietMenu((prev) => {
                    if (!prev && kiotvietMenuRef.current) {
                      const rect = kiotvietMenuRef.current.getBoundingClientRect();
                      setKiotvietMenuPos({ top: rect.bottom + 4, left: rect.left });
                    }
                    return !prev;
                  });
                }}
              >
                <Store className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">KiotViet</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              {openKiotVietMenu &&
                kiotvietMenuPos &&
                createPortal(
                  <div
                    ref={kiotvietDropdownRef}
                    className="fixed z-50 w-72 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
                    style={{ top: kiotvietMenuPos.top, left: kiotvietMenuPos.left }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      disabled={selectedIds.length === 0}
                      onClick={runQuickSaleAction}
                    >
                      <Plus className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="flex flex-col">
                        <span>{t("orders.kiotviet.quickSale", "Tạo nhanh")}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {t(
                            "orders.kiotviet.quickSaleDesc",
                            "Hóa đơn lên ngay, tồn kho chỉ trừ khi kho xác nhận đã xuất",
                          )}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      disabled={selectedIds.length === 0}
                      onClick={() => runKiotVietAction("push_selected", "selected")}
                    >
                      <Upload className="h-4 w-4" />
                      {t("orders.kiotviet.push", "Đẩy đơn")}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      disabled={selectedIds.length === 0}
                      onClick={() => {
                        onOpenCreateKshipCodeModal?.(selectedIds);
                        setOpenKiotVietMenu(false);
                      }}
                    >
                      <Truck className="h-4 w-4" />
                      {t("orders.kiotviet.createKshipShippingCode", "Tạo mã vận đơn KShip")}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                      disabled={selectedIds.length === 0 || !onCancelKiotvietOrders}
                      onClick={() => {
                        setOpenKiotVietMenu(false);
                        void handleCancelKiotvietOrders();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("orders.kiotviet.cancelOrders", "Hủy đơn")}
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          onOpenKiotVietLogs?.();
                          setOpenKiotVietMenu(false);
                        }}
                      >
                        <History className="h-4 w-4" />
                        {t("orders.kiotviet.logs", "Lịch sử thao tác KiotViet")}
                      </button>
                    )}
                  </div>,
                  document.body,
                )}
            </div>
          </>
        )}
        {onRestoreCancelledOrders && (
          <Button
            type="button"
            size="sm"
            className="inline-flex h-8 items-center gap-1.5 bg-action-success px-2.5 text-xs text-white hover:bg-action-success/90"
            disabled={selectedIds.length === 0}
            onClick={() => void handleRestoreCancelledOrders()}
            aria-label={t("orders.actions.restore", "Khôi phục")}
            title={t("orders.actions.restore", "Khôi phục đơn đã hủy")}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {t("orders.actions.restore", "Khôi phục")} ({selectedIds.length})
            </span>
          </Button>
        )}
        {isLandingPage && onTransferLandingOrders && (
          <Button
            type="button"
            size="sm"
            className="inline-flex h-8 items-center gap-1.5 bg-blue-600 px-2.5 text-xs text-white hover:bg-blue-700"
            disabled={selectedIds.length === 0 || isTransferring}
            onClick={() => void handleTransferLandingOrders()}
            aria-label={t("orders.actions.transfer", "Chuyển")}
            title={t("orders.actions.transfer", "Chuyển sang Đơn hàng")}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {t("orders.actions.transfer", "Chuyển")} ({selectedIds.length})
            </span>
          </Button>
        )}
        {!hideBulkOrderActions && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={selectedIds.length === 0}
            className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs"
            aria-label={t("orders.actions.deleteSelected", "Xóa đã chọn")}
            title={t("orders.actions.deleteSelected", "Xóa đã chọn")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {t("orders.actions.deleteSelected", "Xóa đã chọn")} ({selectedIds.length})
            </span>
          </Button>
        )}
        {rightActions}
      </div>
    </div>
  );

  const noneSelected = selectedIds.length === 0;
  const mobileMenuItemClass = "gap-2 py-2";
  // Điện thoại: 1 hàng [tìm kiếm][Bộ lọc][Tạo đơn][⋯]. Thao tác còn lại vào menu "⋯"
  // với nhãn chữ — cùng handler/quyền/disabled như nút desktop.
  const mobileToolbarRow = (
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="min-w-0 flex-1">{mobileSearchBar}</div>
      {mobileFilterButton}
      {rightActions}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="relative h-9 w-9 shrink-0 p-0"
            aria-label={t("orders.mobile.moreActions", "Thao tác khác")}
            title={t("orders.mobile.moreActions", "Thao tác khác")}
          >
            <MoreHorizontal className="h-4 w-4" />
            {!noneSelected && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs leading-none font-semibold text-primary-foreground">
                {selectedIds.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70dvh] w-64 overflow-y-auto">
          {rows.length > 0 && (
            <DropdownMenuItem className={mobileMenuItemClass} onClick={toggleSelectAllRows}>
              <input
                type="checkbox"
                readOnly
                tabIndex={-1}
                checked={allRowsSelected}
                className="pointer-events-none size-4"
              />
              {t("common.selectAll", "Select all")}
              {!noneSelected && (
                <span className="ml-auto text-xs text-muted-foreground">{selectedIds.length}</span>
              )}
            </DropdownMenuItem>
          )}
          {mobileMenuItems}
          {!hideBulkOrderActions && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={mobileMenuItemClass} onClick={handleBulkExportExcel}>
                <Download className="h-4 w-4" />
                Xuất Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                className={mobileMenuItemClass}
                disabled={noneSelected}
                onClick={handleBulkPrintInvoice}
              >
                <Printer className="h-4 w-4" />
                {t("orders.mobile.printInvoice", "In hóa đơn")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={mobileMenuItemClass}
                disabled={noneSelected}
                onClick={handleBulkPrintDeliverySlip}
              >
                <Truck className="h-4 w-4" />
                {t("orders.mobile.printDeliverySlip", "In phiếu giao")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>KiotViet</DropdownMenuLabel>
              <DropdownMenuItem
                className={mobileMenuItemClass}
                disabled={noneSelected}
                onClick={runQuickSaleAction}
              >
                <Plus className="h-4 w-4" />
                {t("orders.kiotviet.quickSale", "Tạo nhanh")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={mobileMenuItemClass}
                disabled={noneSelected}
                onClick={() => void runKiotVietAction("push_selected", "selected")}
              >
                <Upload className="h-4 w-4" />
                {t("orders.kiotviet.push", "Đẩy đơn")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={mobileMenuItemClass}
                disabled={noneSelected}
                onClick={() => onOpenCreateKshipCodeModal?.(selectedIds)}
              >
                <Truck className="h-4 w-4" />
                {t("orders.kiotviet.createKshipShippingCode", "Tạo mã vận đơn KShip")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`${mobileMenuItemClass} text-destructive`}
                disabled={noneSelected || !onCancelKiotvietOrders}
                onClick={() => void handleCancelKiotvietOrders()}
              >
                <Trash2 className="h-4 w-4" />
                {t("orders.kiotviet.cancelOrders", "Hủy đơn")}
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  className={mobileMenuItemClass}
                  onClick={() => onOpenKiotVietLogs?.()}
                >
                  <History className="h-4 w-4" />
                  {t("orders.kiotviet.logs", "Lịch sử thao tác KiotViet")}
                </DropdownMenuItem>
              )}
            </>
          )}
          {(onRestoreCancelledOrders || (isLandingPage && onTransferLandingOrders)) && (
            <DropdownMenuSeparator />
          )}
          {onRestoreCancelledOrders && (
            <DropdownMenuItem
              className={mobileMenuItemClass}
              disabled={noneSelected}
              onClick={() => void handleRestoreCancelledOrders()}
            >
              <RotateCcw className="h-4 w-4" />
              {t("orders.actions.restore", "Khôi phục")} ({selectedIds.length})
            </DropdownMenuItem>
          )}
          {isLandingPage && onTransferLandingOrders && (
            <DropdownMenuItem
              className={mobileMenuItemClass}
              disabled={noneSelected || isTransferring}
              onClick={() => void handleTransferLandingOrders()}
            >
              <ArrowRightLeft className="h-4 w-4" />
              {t("orders.actions.transfer", "Chuyển")} ({selectedIds.length})
            </DropdownMenuItem>
          )}
          {!hideBulkOrderActions && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={`${mobileMenuItemClass} text-destructive`}
                disabled={noneSelected}
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                {t("orders.actions.deleteSelected", "Xóa đã chọn")} ({selectedIds.length})
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const toolbarRow = isMobileViewport ? mobileToolbarRow : desktopToolbarRow;
  // Điện thoại: ô tìm kiếm đã nằm trong hàng toolbar.
  const mobileSearchRow =
    mobileSearchBar && !isMobileViewport ? (
      <div className="mt-2 sm:hidden">{mobileSearchBar}</div>
    ) : null;

  const mobileCellProps = useMemo<OrderMobileCellProps>(
    () => ({
      canCall: isLandingPage,
      canAssignSale,
      canEditField,
      kiotvietOptions,
      addressCatalog,
      channelStaffByCode,
      channels,
      crmCatalog,
      warehouseOptions,
      onPatch,
    }),
    [
      isLandingPage,
      canAssignSale,
      canEditField,
      kiotvietOptions,
      addressCatalog,
      channelStaffByCode,
      channels,
      crmCatalog,
      warehouseOptions,
      onPatch,
    ],
  );

  const toolbarSection = wrapToolbarInCard ? (
    <div
      className={`mb-2 rounded-lg border border-border bg-card shadow-xs ${isMobileViewport ? "p-1.5" : "p-2 sm:p-2.5"}`}
    >
      {toolbarRow}
      {mobileSearchRow}
      {belowToolbar ? (
        <div className={isMobileViewport ? "mt-1.5" : "mt-2"}>{belowToolbar}</div>
      ) : null}
    </div>
  ) : (
    <>
      {toolbarRow}
      {mobileSearchRow}
      {belowToolbar}
    </>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {aboveToolbar}
      {toolbarSection}

      {isMobileViewport ? (
        // Điện thoại: danh sách thẻ cuộn dọc chiếm phần còn lại của màn.
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            data-main-content
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <LogoSpinner size={48} label={t("common.loading", "Đang tải")} />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-8">
                <EmptyState icon={Inbox} title={t("common.empty", "No data")} />
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map((row) => (
                  <OrderMobileCard
                    key={row.id}
                    row={row}
                    isSelected={selectedIds.includes(row.id)}
                    isActive={activeOrderId === row.id}
                    cellProps={mobileCellProps}
                    onOpenDetails={onOpenDetails}
                    onToggleSelection={toggleRowSelection}
                  />
                ))}
              </ul>
            )}
          </div>
          {showTotals ? <OrdersMobileTotalsBar rows={rows} /> : null}
          {isFetching && !isLoading && rows.length > 0 && (
            <LogoSpinnerOverlay label={t("common.loading", "Đang tải")} />
          )}
        </div>
      ) : (
        /* Table view */
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            data-main-content
            className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] rounded-lg border border-border/70"
          >
            <table data-slot="table" className="min-w-[1200px] w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 z-30 bg-muted">
                <TableRow>
                  {/* Checkbox column */}
                  <TableHead
                    ref={registerHeaderCell(CHECKBOX_MEASURE_KEY)}
                    className="sticky left-0 z-20 h-9 w-12 bg-muted px-2 text-center"
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 20,
                      backgroundColor: "var(--muted)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allRowsSelected}
                      onChange={toggleSelectAllRows}
                      aria-label={t("common.selectAll", "Select all")}
                      className="size-4"
                    />
                  </TableHead>
                  {/* Dynamic columns */}
                  {orderedColumns.map((columnKey) => {
                    const config = getColumnConfig(columnKey);
                    if (!config) return null;

                    const isLocked = stickySet.has(columnKey);
                    const lockedIndex = lockedOrderedColumns.indexOf(columnKey);
                    const stickyStyle = isLocked
                      ? {
                          position: "sticky" as const,
                          left: `${lockedLeftByKey[columnKey] ?? 0}px`,
                          zIndex: 10 - lockedIndex,
                          backgroundColor: "var(--muted)",
                          boxShadow: "1px 0 0 0 var(--border)",
                        }
                      : {};

                    return (
                      <TableHead
                        key={columnKey}
                        ref={isLocked ? registerHeaderCell(columnKey) : undefined}
                        className="h-9 px-2 text-xs font-semibold uppercase"
                        style={stickyStyle}
                      >
                        {t(config.label, config.label)}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={orderedColumns.length + 2} className="h-32 text-center">
                      <div className="flex items-center justify-center">
                        <LogoSpinner size={48} label={t("common.loading", "Đang tải")} />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={orderedColumns.length + 2} className="py-8">
                      <EmptyState icon={Inbox} title={t("common.empty", "No data")} />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <OrderTableRow
                      key={row.id}
                      row={row}
                      orderedColumns={orderedColumns}
                      lockedSet={stickySet}
                      lockedLeftByKey={lockedLeftByKey}
                      isActiveRow={activeOrderId === row.id}
                      isSelected={selectedIds.includes(row.id)}
                      isTransferred={isLandingPage && !!row.show_orders}
                      canCall={isLandingPage}
                      canAssignSale={canAssignSale}
                      canEditField={canEditField}
                      kiotvietOptions={kiotvietOptions}
                      addressCatalog={addressCatalog}
                      channelStaffByCode={channelStaffByCode}
                      channels={channels}
                      crmCatalog={crmCatalog}
                      warehouseOptions={warehouseOptions}
                      onPatch={onPatch}
                      onOpenDetails={onOpenDetails}
                      onToggleRowSelection={toggleRowSelection}
                    />
                  ))
                )}
              </TableBody>
              {showTotals && orderedColumns.includes(TOTALS_COLUMN_KEY) ? (
                <OrdersTableTotalsRow
                  rows={rows}
                  orderedColumns={orderedColumns}
                  stickySet={stickySet}
                  lockedLeftByKey={lockedLeftByKey}
                />
              ) : null}
            </table>
          </div>
          {/* Lớp phủ spinner cho mọi thao tác query khi bảng vẫn còn dữ liệu */}
          {isFetching && !isLoading && rows.length > 0 && (
            <LogoSpinnerOverlay label={t("common.loading", "Đang tải")} />
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("orders.deleteDialog.title")}</DialogTitle>
            <DialogDescription>{t("orders.deleteDialog.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteSelected().catch(() => null)}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ExportColumnsDialog
        open={openExportModal}
        onOpenChange={setOpenExportModal}
        exportColumns={exportColumns}
        setExportColumns={setExportColumns}
        onConfirm={handleExportConfirm}
        modeLabel={
          selectedIds.length > 0
            ? `Sẽ xuất ${selectedIds.length} đơn đã chọn.`
            : "Sẽ xuất TOÀN BỘ đơn khớp bộ lọc hiện tại (mọi trang)."
        }
      />
    </div>
  );
}

export const OrdersTable = memo(OrdersTableImpl);
