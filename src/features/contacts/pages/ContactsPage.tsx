import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Contact, FileDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { type DateFilterValue } from "@/components/ui/date-filter";
import { TablePagination } from "@/components/ui/table-pagination";
import { sanitizePhoneForDial } from "@/features/callcenter/webphone-bridge";
import { useWebphone } from "@/features/callcenter/webphone-context";
import { useAllChannelsQuery } from "@/features/channels/queries";
import { useCrmCatalogs } from "@/features/customers/queries";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";
import { ORDER_SOURCE_OPTIONS } from "@/features/orders/order-source";
import { SALES_STATUS_OPTIONS } from "@/features/orders/OrdersTable/constants";
import { useAllProductOptions } from "@/features/products/queries";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { orderDetailPath } from "@/lib/routes";
import type { ContactItem, ContactListParams } from "@/lib/api/contacts";

import { PAGE_SIZE_OPTIONS_STANDARD } from "@/lib/constants/pagination";
import { type ContactActionKey, defaultDateFilter } from "../contact-actions";
import { evaluateTrackedCallEnd, type TrackedCall } from "../contact-call-log";
import type { OperationBucketKey } from "../operation-buckets";
import { ContactActionChips } from "../components/ContactActionChips";
import { ContactNoteDialog } from "../components/ContactNoteDialog";
import {
  ContactsFilterBar,
  CUSTOMER_TYPE_ALL,
  INTERACTION_ALL,
  type SourceOption,
} from "../components/ContactsFilterBar";
import { ContactsTable } from "../components/ContactsTable";
import { OperationBucketChips } from "../components/OperationBucketChips";
import { OperationDueDialog } from "../components/OperationDueDialog";
import { OperationStageDialog } from "../components/OperationStageDialog";
import { OperationResultDialog } from "../components/OperationResultDialog";
import {
  useContacts,
  useCreateContactActivity,
  useOperationStages,
  useUpdateContactResult,
} from "../queries";

const DEFAULT_PAGE_SIZE = 20;
const CHANNEL_PREFIX = "chn:";
const SOURCE_PREFIX = "src:";

export function ContactsPage() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(defaultDateFilter);
  const dateFrom = dateFilter.from ?? "";
  const dateTo = dateFilter.to ?? "";
  const [sourceValues, setSourceValues] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [interaction, setInteraction] = useState(INTERACTION_ALL);
  const [customerType, setCustomerType] = useState(CUSTOMER_TYPE_ALL);
  const [actionFilter, setActionFilter] = useState<ContactActionKey | null>(null);
  const [operationBucket, setOperationBucket] = useState<OperationBucketKey | null>(null);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [noteDialogRow, setNoteDialogRow] = useState<ContactItem | null>(null);
  const [operationResultRow, setOperationResultRow] = useState<ContactItem | null>(null);
  const [operationDueRow, setOperationDueRow] = useState<ContactItem | null>(null);
  // Bước sale vừa chọn ở cột Tác nghiệp — giữ cả row lẫn stage cho tới khi dialog
  // giờ hẹn xác nhận (chọn xong CHƯA ghi gì, xem OperationStageDialog).
  const [stageChange, setStageChange] = useState<{ row: ContactItem; stageId: number } | null>(
    null,
  );
  // Dòng đã tích để xuất Excel. GIỮ NGUYÊN khi lật trang (gom khách qua nhiều trang
  // rồi xuất một lần) nhưng reset khi đổi bộ lọc — xem effect dưới `filterKey`.
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Trang hiện tại được "neo" vào chữ ký bộ lọc lúc set. Đổi bất kỳ filter nào
  // (kể cả debouncedQ settle hay pageSize) → chữ ký lệch → trang hiệu lực về 1
  // NGAY TRONG CÙNG RENDER, nên mỗi lần đổi filter chỉ bắn đúng 1 GET (không
  // còn effect setPage(1) chạy SAU khi query đã fetch với trang cũ).
  const filterKey = JSON.stringify([
    debouncedQ,
    dateFrom,
    dateTo,
    sourceValues,
    productIds,
    interaction,
    customerType,
    actionFilter,
    operationBucket,
    pageSize,
  ]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });

  // Đổi bộ lọc thì bỏ hết tích: dòng đã tích có thể không còn nằm trong tập kết quả,
  // giữ lại là xuất ra file những khách người dùng không còn nhìn thấy. `filterKey`
  // KHÔNG chứa số trang nên lật trang không kích hoạt effect này.
  useEffect(() => {
    setSelectedIds([]);
  }, [filterKey]);

  const channelsQuery = useAllChannelsQuery(true);
  const sourceOptions = useMemo<SourceOption[]>(() => {
    const channelOptions = (channelsQuery.data ?? []).map((channel) => ({
      value: `${CHANNEL_PREFIX}${channel.id}`,
      label: channel.name,
    }));
    const orderSourceOptions = ORDER_SOURCE_OPTIONS.map((opt) => ({
      value: `${SOURCE_PREFIX}${opt.value}`,
      label: opt.label,
    }));
    return [...channelOptions, ...orderSourceOptions];
  }, [channelsQuery.data]);

  // Danh mục sản phẩm cho bộ lọc (label = SKU, tìm được theo tên qua `keywords`)
  // — cùng hook/quy ước với các trang lọc theo SP khác. Hook nạp TOÀN BỘ catalog
  // (phân trang lặp) vì ô tìm lọc phía client: nạp 1 trang là các SKU xếp sau
  // biến mất khỏi kết quả tìm.
  const productsQuery = useAllProductOptions(true);
  const productOptions = useMemo(
    () =>
      (Array.isArray(productsQuery.data) ? productsQuery.data : []).map((item) => ({
        value: String(item.id),
        label: item.sku || String(item.id),
        keywords: item.name || undefined,
      })),
    [productsQuery.data],
  );

  // Options cột "Kết quả" — CRM catalog (nguồn thật, đổi được ở BE); fallback
  // hằng tĩnh SALES_STATUS_OPTIONS (mirror OrdersTable) khi catalog rỗng/lỗi.
  const crmCatalogsQuery = useCrmCatalogs();
  const resultOptions = useMemo(() => {
    const fromCatalog = crmCatalogsQuery.data?.sales_status_options;
    if (fromCatalog && fromCatalog.length > 0) {
      return fromCatalog.map((opt) => ({ value: opt.code, label: opt.label }));
    }
    return SALES_STATUS_OPTIONS;
  }, [crmCatalogsQuery.data]);

  // Options ô chọn cột Tác nghiệp — chỉ bước đang bật, giữ thứ tự `position` của BE.
  const stagesQuery = useOperationStages();
  const stageOptions = useMemo(
    () =>
      (stagesQuery.data ?? [])
        .filter((stage) => stage.is_active !== false)
        .map((stage) => ({ value: String(stage.id), label: stage.name })),
    [stagesQuery.data],
  );

  const updateResult = useUpdateContactResult();
  const pendingResultOrderId = updateResult.isPending
    ? (updateResult.variables?.orderId ?? null)
    : null;

  const handleResultChange = (row: ContactItem, code: string) => {
    const orderId = row.latest_order.id;
    if (!orderId) return;
    updateResult.mutate(
      { orderId, code },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Cập nhật kết quả thất bại.");
        },
      },
    );
  };

  // Nút gọi Zenify: dial() qua webphone provider (mounted ở app shell) + log
  // 1 activity kind=call khi CUỘC GỌI DO TRANG NÀY KHỞI TẠO kết thúc. `enabled`
  // = token + SDK đã init (khác `canUse` chỉ là quyền) — đúng ý "sẵn sàng gọi".
  const { enabled: webphoneEnabled, dialCall, callState, currentCall } = useWebphone();
  const createActivity = useCreateContactActivity();
  const activeCallRef = useRef<TrackedCall | null>(null);
  const prevCallStateRef = useRef(callState);
  const prevCurrentCallRef = useRef(currentCall);

  useEffect(() => {
    const prevStatus = prevCallStateRef.current;
    const prevCall = prevCurrentCallRef.current;
    prevCallStateRef.current = callState;
    prevCurrentCallRef.current = currentCall;

    // Về idle từ trạng thái khác = một cuộc gọi vừa kết thúc. Ref clear Ở MỌI
    // NHÁNH: nếu cuộc kết thúc không phải cuộc mình dial (cuộc gọi đến chen
    // ngang thay thế state, dial từ trang khác) thì cuộc mình dial cũng đã bị
    // reducer thay thế từ trước — giữ ref chỉ gây log nhầm cuộc sau.
    if (callState === "idle" && prevStatus !== "idle") {
      const tracked = activeCallRef.current;
      activeCallRef.current = null;
      // Chỉ log khi cuộc vừa kết thúc ĐÚNG là cuộc trang này dial: direction
      // "out" + SĐT (đã sanitize) khớp — logic thuần ở contact-call-log.ts.
      const result = evaluateTrackedCallEnd(prevStatus, prevCall, tracked, Date.now());
      if (result) {
        createActivity.mutate(
          {
            customerId: result.customerId,
            payload: {
              kind: "call",
              call_meta: {
                direction: "outbound",
                duration_s: result.duration_s,
                answered: result.answered,
              },
            },
          },
          {
            onError: () => toast.error("Ghi log cuộc gọi thất bại."),
          },
        );
      }
    }
  }, [callState, currentCall, createActivity]);

  const handleCall = (row: ContactItem) => {
    // Guard mirror điều kiện disable của nút (chống race enabled flip giữa
    // render và click): dialCall lúc chưa sẵn sàng chỉ toast rồi no-op — arm
    // ref trước đó sẽ để ref "treo" và log nhầm cuộc gọi sau (review r1).
    if (!webphoneEnabled || callState !== "idle") return;
    // Sanitize TRƯỚC khi arm ref, cùng lý do: dialCall no-op với số rỗng.
    const phone = sanitizePhoneForDial(row.phone_raw ?? "");
    if (!phone) {
      toast.error("Số điện thoại không hợp lệ.");
      return;
    }
    activeCallRef.current = { customerId: row.customer_id, phone, dialedAt: Date.now() };
    dialCall(phone);
  };

  const listParams = useMemo<ContactListParams>(() => {
    const params: ContactListParams = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (debouncedQ.trim()) params.q = debouncedQ.trim();
    if (actionFilter) params.action_needed = [actionFilter];
    if (operationBucket) params.operation_bucket = operationBucket;
    if (productIds.length > 0) params.product = productIds.map(Number);
    if (interaction !== INTERACTION_ALL) params.interaction = interaction;
    if (customerType !== CUSTOMER_TYPE_ALL) params.customer_type = customerType;
    // Một multi-select gộp kênh (chn:) + nguồn đơn (src:) → tách về 2 param;
    // BE lấy HỢP hai trục nên chọn lẫn kênh và nguồn vẫn ra đúng "một trong các nguồn".
    const channelIds = sourceValues
      .filter((v) => v.startsWith(CHANNEL_PREFIX))
      .map((v) => Number(v.slice(CHANNEL_PREFIX.length)));
    const orderSources = sourceValues
      .filter((v) => v.startsWith(SOURCE_PREFIX))
      .map((v) => v.slice(SOURCE_PREFIX.length));
    if (channelIds.length > 0) params.channel = channelIds;
    if (orderSources.length > 0) params.order_source = orderSources;
    return params;
  }, [
    dateFrom,
    dateTo,
    debouncedQ,
    actionFilter,
    operationBucket,
    productIds,
    interaction,
    customerType,
    sourceValues,
    page,
    pageSize,
  ]);

  const contactsQuery = useContacts(listParams);
  const data = contactsQuery.data;
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const loading = contactsQuery.isPending;

  // Xuất Excel: job chạy nền qua engine apps.exports (tiến độ + tải file do
  // ExportDock ở app shell lo). Gửi ĐÚNG bộ lọc đang áp trên màn hình, bỏ
  // limit/offset — file luôn là TOÀN BỘ tập khớp bộ lọc, không phải trang đang xem.
  const can = usePermission();
  const { startExport } = useExportJobs();
  const handleExport = () => {
    const { limit: _limit, offset: _offset, ...filters } = listParams;
    // Có dòng đã tích → xuất ĐÚNG các dòng đó (BE giao `customer_ids` với bộ lọc);
    // không tích dòng nào → giữ nguyên hành vi xuất theo bộ lọc.
    void startExport("contacts", {
      filters: selectedIds.length > 0 ? { ...filters, customer_ids: selectedIds } : filters,
    });
  };

  const toggleRow = (customerId: number, checked: boolean) =>
    setSelectedIds((prev) =>
      checked ? [...prev, customerId] : prev.filter((id) => id !== customerId),
    );

  const togglePage = (checked: boolean) => {
    const pageIds = rows.map((row) => row.customer_id);
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((id) => !pageIds.includes(id));
      const merged = new Set(prev);
      pageIds.forEach((id) => merged.add(id));
      return [...merged];
    });
  };

  const resetFilters = () => {
    setQ("");
    // Về mặc định THÁNG NÀY, không về trống — trống = quét toàn bộ khách (chậm).
    setDateFilter(defaultDateFilter());
    setSourceValues([]);
    setProductIds([]);
    setInteraction(INTERACTION_ALL);
    setCustomerType(CUSTOMER_TYPE_ALL);
    setActionFilter(null);
    setOperationBucket(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex min-w-60 flex-1 items-center text-base font-medium text-foreground">
          <Contact className="mr-2 h-4 w-4 text-primary" />
          Danh sách contact
        </h2>
        <ContactsFilterBar
          q={q}
          onQChange={setQ}
          dateValue={dateFilter}
          onDateChange={setDateFilter}
          sourceValues={sourceValues}
          onSourceChange={setSourceValues}
          sourceOptions={sourceOptions}
          interaction={interaction}
          onInteractionChange={setInteraction}
          customerType={customerType}
          onCustomerTypeChange={setCustomerType}
          productOptions={productOptions}
          productIds={productIds}
          onProductIdsChange={setProductIds}
        />
        {can("contacts:export") && (
          <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
            <FileDown className="mr-1.5 h-4 w-4" />
            {selectedIds.length > 0 ? `Xuất Excel (${selectedIds.length})` : "Xuất Excel"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ContactActionChips
          actionCounts={data?.action_counts}
          selected={actionFilter}
          onSelect={setActionFilter}
        />
        <OperationBucketChips
          operationCounts={data?.operation_counts}
          selected={operationBucket}
          onSelect={setOperationBucket}
        />
      </div>

      <ContactsTable
        rows={rows}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onOpenOrder={(orderId) => navigate(orderDetailPath(orderId))}
        onAddNote={(row) => setNoteDialogRow(row)}
        onCall={handleCall}
        callDisabled={!webphoneEnabled || callState !== "idle"}
        callDisabledReason={
          webphoneEnabled && callState !== "idle"
            ? "Đang có cuộc gọi — kết thúc trước khi gọi tiếp"
            : "Webphone chưa sẵn sàng"
        }
        resultOptions={resultOptions}
        onResultChange={handleResultChange}
        pendingResultOrderId={pendingResultOrderId}
        onOpenOperationResult={(row) => setOperationResultRow(row)}
        onEditOperationDue={(row) => setOperationDueRow(row)}
        stageOptions={stageOptions}
        onSelectOperationStage={(row, stageId) => setStageChange({ row, stageId })}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onTogglePage={togglePage}
      />

      <ContactNoteDialog
        customerId={noteDialogRow?.customer_id ?? 0}
        open={noteDialogRow !== null}
        onOpenChange={(open) => {
          if (!open) setNoteDialogRow(null);
        }}
      />

      <OperationResultDialog
        customerId={operationResultRow?.customer_id ?? null}
        customerName={operationResultRow?.full_name || operationResultRow?.customer_code || ""}
        open={operationResultRow !== null}
        onOpenChange={(open) => {
          if (!open) setOperationResultRow(null);
        }}
      />

      <OperationStageDialog
        customerId={stageChange?.row.customer_id ?? null}
        customerName={stageChange?.row.full_name || stageChange?.row.customer_code || ""}
        stageId={stageChange?.stageId ?? null}
        stageName={
          stageOptions.find((option) => option.value === String(stageChange?.stageId))?.label ?? ""
        }
        currentDueAt={stageChange?.row.operation.due_at ?? null}
        open={stageChange !== null}
        onOpenChange={(open) => {
          if (!open) setStageChange(null);
        }}
      />

      <OperationDueDialog
        customerId={operationDueRow?.customer_id ?? null}
        customerName={operationDueRow?.full_name || operationDueRow?.customer_code || ""}
        currentDueAt={operationDueRow?.operation.due_at ?? null}
        open={operationDueRow !== null}
        onOpenChange={(open) => {
          if (!open) setOperationDueRow(null);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Hiển thị {rows.length}/{total} dòng
          </span>
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={resetFilters}>
            Xóa lọc
          </Button>
          {selectedIds.length > 0 && (
            <>
              <span className="text-foreground">Đã chọn {selectedIds.length}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setSelectedIds([])}
              >
                Bỏ chọn
              </Button>
            </>
          )}
        </div>
        <TablePagination
          summary={null}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          pageSizeOptions={PAGE_SIZE_OPTIONS_STANDARD}
          // pageSize nằm trong filterKey → trang hiệu lực tự về 1, không cần setPage.
          onPageSizeChange={setPageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

export default ContactsPage;
