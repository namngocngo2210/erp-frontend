import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";
import { getValidAccessToken } from "@/services/http";
import { useRangeSelect } from "@/hooks/use-range-select";
import { useI18n } from "@/i18n";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";
import {
  DEFAULT_ORDER_COLUMNS,
  ORDER_COLUMN_OPTIONS,
  type OrderColumnKey,
  type OrderRow,
} from "@/features/orders/order-types";
import type { KiotVietOrderAction } from "@/features/orders/use-orders-data";

import { useCrmCatalog } from "./crm-catalog";
import { swallowError } from "@/lib/errors";

export type OrderExportSection = "orders" | "landing-orders" | "koc-orders";

type UseOrdersTableDataParams = {
  rows: OrderRow[];
  visibleColumns: OrderColumnKey[];
  lockedColumns: OrderColumnKey[];
  /** Khóa định danh bộ lọc hiện tại — khi đổi sẽ reset selection (đổi page KHÔNG đổi key). */
  filterKey?: string;
  /** Section RBAC của trang gọi — backend check quyền `{section}:export` theo đúng trang. */
  exportSection?: OrderExportSection;
  getExportFilters?: () => Record<string, unknown> | null;
  onBulkDelete: (ids: number[]) => Promise<void>;
  onKiotVietAction: (action: KiotVietOrderAction, ids: number[]) => Promise<void>;
};

/**
 * Container hook của OrdersTable: gom toàn bộ state/data wiring + các call
 * API/auth (CRM catalog, in hóa đơn/phiếu giao, xuất Excel, KiotViet bulk)
 * để OrdersTable.tsx thuần render. Logic giữ nguyên từ components/OrdersTable.tsx.
 */
export function useOrdersTableData({
  rows,
  visibleColumns,
  lockedColumns,
  filterKey,
  exportSection = "orders",
  getExportFilters,
  onBulkDelete,
  onKiotVietAction,
}: UseOrdersTableDataParams) {
  const { t } = useI18n();
  const { startExport } = useExportJobs();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [_selectionResetToken, setSelectionResetToken] = useState(0);

  // Reset selection khi bộ lọc thay đổi (đổi page KHÔNG reset).
  useEffect(() => {
    setSelectedIds([]);
    setSelectionResetToken((previous) => previous + 1);
  }, [filterKey]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // CRM catalog (fetch 1 lần) — options cho các cell "hành vi đơn hàng".
  const crmCatalog = useCrmCatalog();

  const [openExportModal, setOpenExportModal] = useState(false);
  const [exportColumns, setExportColumns] = useState<OrderColumnKey[]>(() => {
    const saved = localStorage.getItem("desi_export_columns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        /* ignore */
        swallowError(err, "orders.table.storage");
      }
    }
    return DEFAULT_ORDER_COLUMNS;
  });

  const allRowsSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  // Compute ordered columns: locked columns first, then visible unlocked columns
  const orderedColumns = useMemo(() => {
    const lockedSet = new Set(lockedColumns);
    const visibleSet = new Set(visibleColumns);

    const lockedVisible = visibleColumns.filter((col) => lockedSet.has(col) && visibleSet.has(col));
    const unlockedVisible = visibleColumns.filter(
      (col) => !lockedSet.has(col) && visibleSet.has(col),
    );

    return [...lockedVisible, ...unlockedVisible];
  }, [visibleColumns, lockedColumns]);

  // Track which columns are locked for sticky positioning
  const lockedSet = useMemo(() => new Set(lockedColumns), [lockedColumns]);

  const toggleRowSelection = useRangeSelect(rows, selectedIds, setSelectedIds);

  const toggleSelectAllRows = useCallback(() => {
    setSelectedIds((previous) => {
      const currentPageIds = rows.map((row) => row.id);
      if (allRowsSelected) {
        const pageIdSet = new Set(currentPageIds);
        return previous.filter((id) => !pageIdSet.has(id));
      }
      const merged = new Set(previous);
      currentPageIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  }, [allRowsSelected, rows]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectionResetToken((previous) => previous + 1);
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;
    await onBulkDelete(selectedIds);
    setShowDeleteDialog(false);
    clearSelection();
  }, [clearSelection, onBulkDelete, selectedIds]);

  const handleRunKiotVietAction = useCallback(
    async (action: KiotVietOrderAction, mode: "selected" | "all") => {
      const ids = mode === "selected" ? selectedIds : [];
      await onKiotVietAction(action, ids);
      clearSelection();
    },
    [clearSelection, onKiotVietAction, selectedIds],
  );

  const printHtmlFromApi = useCallback(async (url: string, body: object, errorMsg: string) => {
    let accessToken: string | null = null;
    try {
      accessToken = await getValidAccessToken();
    } catch {
      accessToken = null;
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    // eslint-disable-next-line no-restricted-globals -- HTML print response (response.text()); fetchJson only handles JSON
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let msg = errorMsg;
      try {
        const err = await response.json();
        if (err.detail) msg = err.detail;
      } catch {
        /* ignore */
      }
      toast.error(msg);
      return;
    }
    const html = await response.text();
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;width:0;height:0;border:none;left:-9999px";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      let printed = false;
      const doPrint = () => {
        if (printed) return;
        printed = true;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 500);
      };
      iframe.onload = doPrint;
      setTimeout(doPrint, 300);
    }
  }, []);

  const handleBulkPrintInvoice = useCallback(() => {
    if (selectedIds.length === 0) return;
    printHtmlFromApi("/api/orders/bulk-invoices", { ids: selectedIds }, "Không thể tải hóa đơn.");
  }, [selectedIds, printHtmlFromApi]);

  const handleBulkPrintDeliverySlip = useCallback(() => {
    if (selectedIds.length === 0) return;
    printHtmlFromApi(
      "/api/orders/bulk-delivery-slips",
      { ids: selectedIds },
      "Không thể tải phiếu giao hàng.",
    );
  }, [selectedIds, printHtmlFromApi]);

  // Snapshot bộ lọc dùng cho lần xuất đang mở dialog. CHỐT KHI BẤM NÚT, không tính
  // trong thân render: `getExportFilters()` đọc một useRef ở tầng trên (xem
  // ordersExportFiltersRef trong use-orders-table) — ref mutation không gây
  // re-render và không phải dependency hợp lệ, nên React Compiler memo hóa biểu
  // thức theo [getExportFilters, selectedIds.length] và ĐÓNG BĂNG giá trị `null`
  // của lần render đầu (lúc list chưa load xong). Đó chính là lỗi prod 2026-08-06:
  // vào thẳng URL/F5 rồi bấm Xuất Excel luôn bị chặn "chọn ít nhất một đơn".
  // Đọc trong handler thì luôn lấy được giá trị mới nhất, bất kể memo hóa.
  const [pendingExportFilters, setPendingExportFilters] = useState<Record<string, unknown> | null>(
    null,
  );

  const handleBulkExportExcel = useCallback(() => {
    // Đã chọn đơn → ưu tiên xuất đúng các đơn đó; không chọn → xuất theo bộ lọc.
    const filters = selectedIds.length === 0 ? (getExportFilters?.() ?? null) : null;
    if (selectedIds.length === 0 && filters === null) {
      toast.error("Vui lòng chọn ít nhất một đơn hàng để xuất Excel.");
      return;
    }
    setPendingExportFilters(filters);
    setOpenExportModal(true);
  }, [selectedIds, getExportFilters]);

  const handleExportConfirm = useCallback(() => {
    // Dùng đúng snapshot đã chốt lúc mở dialog: nếu list tự reload trong lúc user
    // đang chọn cột, file xuất vẫn khớp phạm vi mà nhãn dialog đã hứa.
    const exportAllFilters = selectedIds.length === 0 ? pendingExportFilters : null;
    if (selectedIds.length === 0 && exportAllFilters === null) {
      toast.error("Vui lòng chọn ít nhất một đơn hàng để xuất Excel.");
      setOpenExportModal(false);
      return;
    }
    localStorage.setItem("desi_export_columns", JSON.stringify(exportColumns));

    const columnsPayload = exportColumns.map((key) => {
      const option = ORDER_COLUMN_OPTIONS.find((o) => o.key === key);
      const labelMsg = option ? t(option.label) : key;
      return { key, header: labelMsg };
    });

    // Chọn đơn → xuất đúng các đơn đó. Không chọn → xuất mọi đơn khớp bộ lọc hiện tại
    // (server tự quét mọi trang). Bộ lọc đi trong `filters` thay vì trải phẳng ở gốc
    // body: server ghi nguyên khối này vào job và worker đọc lại, nên nó phải là một
    // nhánh riêng, không lẫn với `section`/`columns`/`ids`.
    void startExport("orders", {
      section: exportSection,
      columns: columnsPayload,
      ids: selectedIds.length > 0 ? selectedIds : [],
      filters: selectedIds.length > 0 ? {} : (exportAllFilters ?? {}),
    });
    setOpenExportModal(false);
  }, [exportColumns, selectedIds, pendingExportFilters, exportSection, t, startExport]);

  return {
    // data
    crmCatalog,
    // selection
    selectedIds,
    allRowsSelected,
    toggleRowSelection,
    toggleSelectAllRows,
    clearSelection,
    // columns
    orderedColumns,
    lockedSet,
    // landing helpers
    // bulk delete
    showDeleteDialog,
    setShowDeleteDialog,
    handleDeleteSelected,
    // KiotViet bulk
    handleRunKiotVietAction,
    // print
    handleBulkPrintInvoice,
    handleBulkPrintDeliverySlip,
    // export excel
    openExportModal,
    setOpenExportModal,
    exportColumns,
    setExportColumns,
    handleBulkExportExcel,
    handleExportConfirm,
  };
}
