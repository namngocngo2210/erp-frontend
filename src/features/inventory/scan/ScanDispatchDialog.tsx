import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson } from "@/services/http";
import { useI18n } from "@/i18n";
import { getApiErrorBody, getApiErrorMessage } from "@/lib/errors";
import type { WarehouseListResponse } from "@/lib/api/warehouses";
import type { PendingScanBatchResult } from "@/lib/api/pending-scans";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_VIEWPORT_QUERY } from "@/lib/constants/layout";
import { useCreatePendingScans } from "@/features/inventory/pending-scans-queries";
import { useManualDispatch } from "@/features/inventory/manual-dispatch-queries";

import { ScanResultLabel } from "./ScanResultLabel";
import { ScanShipmentInput } from "./ScanShipmentInput";
import type { ScanShipmentInputHandle } from "./ScanShipmentInput";
import { beepError, beepSuccess } from "./scan-sound";
import { isMultiple, lookupByShippingCode, useDispatchBatch } from "./scan-queries";
import type { DispatchResult, LookupOrder } from "./scan-types";
import { summarizeDispatched } from "./dispatch-summary";
import {
  addDispatchScanRow,
  dispatchErrorMessage,
  dispatchResultBadge,
} from "./scan-dispatch-rows";
import {
  missingWarehouseResults,
  splitMatchedRowsByDispatchRoute,
  toDispatchResults,
} from "./scan-dispatch-groups";
import { cancelledScanMessage, isCancelledOrder } from "./scan-cancelled";
import { dispatchLookupErrorMessage } from "./scan-lookup-error";
import type { LookupErrorBody } from "./scan-lookup-error";
import { validateShippingCode } from "./shipping-code-validation";
import type { DispatchRowAddResult, ScanDispatchRow } from "./scan-dispatch-rows";
import { CameraScanButton } from "./CameraScanButton";
import { ScanRowCard, ScanSummaryCard } from "./scan-mobile-cards";
import { useScannerGun } from "./useScannerGun";
import { ScannerGunBadge } from "./ScannerGunBadge";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
};

type MatchedRow = Extract<ScanDispatchRow, { kind: "matched" }>;
type UnmatchedRow = Extract<ScanDispatchRow, { kind: "unmatched" }>;
type MatchedRowResult = { kind: "matched"; result: DispatchResult };
type UnmatchedRowResult = { kind: "unmatched"; result: PendingScanBatchResult };
type RowResult = MatchedRowResult | UnmatchedRowResult;

export function ScanDispatchDialog({ open, onOpenChange, onDone }: Props) {
  const [warehouseId, setWarehouseId] = useState("");
  const [rows, setRows] = useState<ScanDispatchRow[]>([]);
  const [results, setResults] = useState<Record<string, RowResult>>({});
  const isMobile = useMediaQuery(MOBILE_VIEWPORT_QUERY);
  const { t } = useI18n();

  const scanRef = useRef<ScanShipmentInputHandle>(null);
  const inFlight = useRef<Set<string>>(new Set());
  // Bắt súng quét ở cấp document (ăn cả khi focus không ở ô quét).
  const { active: gunActive } = useScannerGun({ enabled: open, onScan: handleScan });

  const { data: whData } = useQuery({
    queryKey: ["warehouses", "list"],
    queryFn: () =>
      fetchJson("/api/warehouses?limit=200&offset=0") as Promise<WarehouseListResponse>,
    staleTime: 60_000,
  });
  const warehouses = whData?.items ?? [];
  const dispatchBatch = useDispatchBatch();
  const createPendingScans = useCreatePendingScans();
  // Đơn khớp mã HOÁ ĐƠN (matched_by === "invoice") không đi qua dispatchBatch — nó
  // chỉ nhận MỘT kho cho cả lô, còn đơn này phải trừ ở kho CỦA ĐƠN. Task 1's endpoint.
  // silent: true — dispatchBatch/createPendingScans không tự bắn toast, dialog này
  // là TIẾNG NÓI DUY NHẤT (1 toast tổng kết ở cuối handleConfirm). Để hook tự bắn
  // toast riêng sẽ chồng lên (thậm chí ngược dấu) với toast tổng kết đó.
  const manualDispatch = useManualDispatch({ silent: true });

  // Check trùng chạy BÊN TRONG functional updater của setRows (luôn thấy `prev`
  // mới nhất) thay vì dựa vào biến `rows` đóng gói ở lần render tạo ra pushRow —
  // hai lookup chồng nhau (quét A rồi B trước khi A resolve, cùng resolve trong
  // 1 tick) mà đọc `rows` cũ có thể báo "added" sai cho 1 mã thực ra đã trùng.
  // Dùng flushSync để BẮT BUỘC React chạy updater đồng bộ trước khi đọc
  // `outcomeBox.current` — không dựa vào tối ưu "eager state" nội bộ của React (không
  // đảm bảo chạy đồng bộ mọi lúc, đã thấy flaky khi có setState khác đang chờ xử lý).
  function pushRow(code: string, order: LookupOrder | null): DispatchRowAddResult {
    const outcomeBox: { current: DispatchRowAddResult } = { current: "added" };
    flushSync(() => {
      setRows((prev) => {
        const { rows: nextRows, result } = addDispatchScanRow(prev, code, order);
        outcomeBox.current = result;
        return nextRows;
      });
      // Chỉ gỡ kết quả (nếu có) của chính mã đang thêm — giữ các dấu ✓ đã tạo
      // trước đó để lần xác nhận sau bỏ qua những dòng đã thành công; mã KHÔNG
      // được thêm (trùng/đã xuất) phải giữ nguyên results. Guard đọc được
      // outcomeBox vì updater của `rows` chạy trước (useState khai báo trước →
      // queue xử lý trước trong cùng lượt render); gộp vào cùng flushSync để 2
      // update render 1 lần.
      setResults((prev) => {
        if (outcomeBox.current !== "added" || !(code in prev)) return prev;
        const next = { ...prev };
        delete next[code];
        return next;
      });
    });
    const outcome = outcomeBox.current;
    if (outcome === "duplicate") {
      beepError();
      toast.warning(order ? `Đơn ${order.order_code} đã quét rồi.` : `Mã ${code} đã quét rồi.`);
    } else if (outcome === "already-dispatched") {
      beepError();
      toast.warning(`Đơn ${order?.order_code ?? code} đã xuất kho trước đó.`);
    }
    return outcome;
  }

  async function handleScan(raw: string) {
    const valid = validateShippingCode(raw);
    if (!valid.ok) {
      beepError();
      toast.error(valid.message);
      if (!isMobile) scanRef.current?.focus();
      return;
    }
    const code = valid.code;
    if (inFlight.current.has(code)) return;
    inFlight.current.add(code);
    try {
      const res = await lookupByShippingCode(code, "dispatch");
      const scanned = isMultiple(res) ? res.orders[0] : res;
      // Lớp chặn phụ (đơn ngoài KiotViet / kill-switch tắt): backend đã verify realtime
      // và trả 409 cho đơn hủy, nhưng DB vẫn là nguồn sự thật khi không verify được.
      if (isCancelledOrder(scanned)) {
        beepError();
        toast.error(cancelledScanMessage(scanned));
        return;
      }
      if (isMultiple(res)) {
        toast.message(`Mã ${code} khớp ${res.orders.length} đơn — chọn 1:`, {
          description: res.orders.map((o) => o.order_code).join(", "),
        });
        // simplest UX: add the first; staff can remove if wrong
        const order = res.orders[0];
        if (pushRow(code, order) === "added") {
          beepSuccess();
          toast.success(`Đã quét xong mã vận đơn ${order.shipping_code}`);
        }
        return;
      }
      if (pushRow(code, res) === "added") {
        beepSuccess();
        toast.success(`Đã quét xong mã vận đơn ${res.shipping_code}`);
      }
    } catch (err) {
      // fetchJson gắn `.status` + `.body` (JSON lỗi) vào Error (services/http.ts).
      const status = err instanceof Error ? (err as Error & { status?: number }).status : undefined;
      // Backend xác minh realtime với KiotViet: 409 `order_cancelled` = đơn đã hủy,
      // 503 `verify_unavailable` = chưa xác minh được (fail-closed) → không thêm dòng.
      // Chỉ tin MÃ NGHIỆP VỤ trong body.detail: 409/503 từ nginx/gateway (backend chết)
      // không được hiện sai nguyên nhân.
      if (status === 409 || status === 503) {
        const body = getApiErrorBody(err) as LookupErrorBody;
        beepError();
        toast.error(
          dispatchLookupErrorMessage(status, body, code) ??
            `Không tra được mã ${code} — lỗi hệ thống (${getApiErrorMessage(err, `HTTP ${status}`)}). Thử lại sau.`,
        );
        return;
      }
      if (status === 404) {
        const body = (err as Error & { body?: { pending_scan?: { kind?: string } } }).body;
        // Mã có thể đang pending ở kind KHÁC (vd return) — không tính là trùng của
        // dòng xuất kho này, vẫn cho thêm dòng unmatched bình thường.
        if (body?.pending_scan?.kind === "dispatch") {
          // Mã này đã được ghi nhận chờ khớp từ 1 lượt quét trước — không thêm dòng nữa.
          beepError();
          toast.error(`Mã ${code} đã được ghi nhận trước đó — đang chờ khớp đơn.`);
        } else if (pushRow(code, null) === "added") {
          beepError();
          toast.error(
            `Không tìm thấy đơn cho mã ${code} — đã ghi nhận, hệ thống sẽ tự khớp khi đơn về.`,
          );
        }
      } else {
        beepError();
        toast.error(`Không tìm thấy đơn cho mã: ${code}`);
      }
    } finally {
      inFlight.current.delete(code);
      // Mobile: không refocus — ô nhập nằm sau overlay camera, focus sẽ bật bàn phím ảo đè camera.
      if (!isMobile) scanRef.current?.focus();
    }
  }

  function removeRow(code: string) {
    setRows((prev) => prev.filter((r) => r.code !== code));
    setResults((prev) => {
      if (!(code in prev)) return prev;
      const next = { ...prev };
      delete next[code];
      return next;
    });
  }

  async function handleConfirm() {
    if (!warehouseId) {
      toast.error("Vui lòng chọn kho xuất.");
      return;
    }
    if (rows.length === 0) {
      toast.error("Chưa quét đơn nào.");
      return;
    }

    const matched = rows.filter((r): r is MatchedRow => r.kind === "matched");
    const unmatched = rows.filter((r): r is UnmatchedRow => r.kind === "unmatched");
    // Dòng unmatched đã ghi nhận thành công ở lần xác nhận trước → bỏ qua, tránh
    // POST lại (backend trả reason "duplicate" cho mã đã có pending scan).
    const unmatchedToSend = unmatched.filter((r) => {
      const prev = results[r.code];
      return !(prev?.kind === "unmatched" && prev.result.ok);
    });

    const next: Record<string, RowResult> = { ...results };
    let dispatchedOk = 0;
    let hadError = false;
    const errorMessages: string[] = [];

    // Task 7: mỗi dòng matched đi 1 trong 2 đường theo `matched_by` — xem
    // scan-dispatch-groups.ts. "shipping"/"recall" giữ nguyên dispatchBatch (kho màn
    // quét, hành vi cũ). "invoice" đi qua endpoint xuất kho tay (Task 1), theo đúng
    // kho CỦA ĐƠN — dispatchBatch chỉ nhận MỘT kho cho cả lô nên không diễn tả được.
    const { viaScanWarehouse, invoiceGroups, missingWarehouse } =
      splitMatchedRowsByDispatchRoute(matched);

    if (viaScanWarehouse.length > 0) {
      try {
        const resp = await dispatchBatch.mutateAsync({
          fulfillment_warehouse_id: Number(warehouseId),
          order_ids: viaScanWarehouse.map((r) => r.order.order_id),
        });
        for (const result of resp.results) {
          const row = viaScanWarehouse.find((m) => m.order.order_id === result.order_id);
          if (row) next[row.code] = { kind: "matched", result };
        }
        dispatchedOk += resp.results.filter((r) => r.ok).length;
      } catch (err) {
        hadError = true;
        errorMessages.push(getApiErrorMessage(err, "Xuất kho thất bại."));
      }
    }

    for (const group of invoiceGroups) {
      try {
        const manualResult = await manualDispatch.mutateAsync({
          orderIds: group.rows.map((r) => r.order.order_id),
          warehouseId: group.warehouseId,
        });
        const dispatchResults = toDispatchResults(group.rows, manualResult);
        for (const result of dispatchResults) {
          const row = group.rows.find((m) => m.order.order_id === result.order_id);
          if (row) next[row.code] = { kind: "matched", result };
        }
        dispatchedOk += dispatchResults.filter((r) => r.ok).length;
      } catch (err) {
        hadError = true;
        errorMessages.push(getApiErrorMessage(err, "Xuất kho thất bại (kho của đơn)."));
      }
    }

    if (missingWarehouse.length > 0) {
      // Không gọi API — fail-loud tại chỗ, tuyệt đối không rơi về kho màn quét.
      for (const result of missingWarehouseResults(missingWarehouse)) {
        const row = missingWarehouse.find((m) => m.order.order_id === result.order_id);
        if (row) next[row.code] = { kind: "matched", result };
      }
    }

    if (unmatchedToSend.length > 0) {
      try {
        const resp = await createPendingScans.mutateAsync({
          kind: "dispatch",
          warehouse_id: Number(warehouseId),
          return_type: "",
          codes: unmatchedToSend.map((r) => r.code),
        });
        for (const result of resp.results) {
          next[result.code] = { kind: "unmatched", result };
        }
      } catch (err) {
        hadError = true;
        errorMessages.push(getApiErrorMessage(err, "Ghi nhận mã chờ khớp thất bại."));
      }
    }

    setResults(next);

    if (hadError) {
      beepError();
      // Passthrough nguyên văn lỗi BE (kể cả lỗi KiotViet) thay vì câu chung chung.
      toast.error(errorMessages.join(" • ") || "Xác nhận xuất kho thất bại, vui lòng thử lại.");
      return;
    }

    // Đơn bị backend từ chối (đã hủy / chưa xác minh được) → nêu rõ TỪNG đơn bằng
    // tiếng Việt, không để nhân viên kho đọc mã máy trong badge dòng.
    const failed = matched
      .map((row) => {
        const r = next[row.code];
        if (r?.kind !== "matched" || r.result.ok) return null;
        return `${row.order.order_code}: ${dispatchErrorMessage(r.result.error)}`;
      })
      .filter((m): m is string => m !== null);
    if (failed.length > 0) {
      beepError();
      toast.error(`${failed.length} đơn không xuất kho được`, {
        description: failed.join(" • "),
      });
    }

    // Đơn backend báo đã xuất từ TRƯỚC: ok=true nhưng KHÔNG ghi thêm gì (idempotent).
    // Chốt chặn lúc quét đọc dữ liệu tại thời điểm quét — hai người quét cùng 1 đơn,
    // hoặc quét xong vài phút mới bấm Xác nhận, thì nó không thấy. Badge nhỏ trên dòng
    // dễ trôi khi xác nhận cả lô 50 kiện → nói thẳng, đừng để dấu ✓ chung làm hiểu nhầm.
    const alreadyDispatched = matched
      .map((row) => {
        const r = next[row.code];
        if (r?.kind !== "matched" || !r.result.ok) return null;
        return r.result.warnings?.includes("already_dispatched") ? row.order.order_code : null;
      })
      .filter((c): c is string => c !== null);
    if (alreadyDispatched.length > 0) {
      beepError();
      toast.warning(`${alreadyDispatched.length} đơn đã xuất kho trước đó — không ghi lại`, {
        description: alreadyDispatched.join(", "),
      });
    }

    const pendingOk = unmatched.filter((r) => {
      const r2 = next[r.code];
      return r2?.kind === "unmatched" && r2.result.ok;
    }).length;
    toast.success(
      `Đã xuất kho ${dispatchedOk}/${matched.length} đơn — ghi nhận ${pendingOk} mã chờ khớp.`,
    );
    onDone?.();
  }

  function reset() {
    setWarehouseId("");
    setRows([]);
    setResults({});
  }

  /**
   * Nội dung ô "Mã sản phẩm" / "Trạng thái" của 1 dòng đã quét.
   *
   * Tách khỏi JSX của bảng vì bản thẻ (mobile) phải hiện đúng y hệt — chép sang
   * thẻ thì mỗi lần đổi luật hiển thị kết quả xuất lại phải sửa hai chỗ.
   */
  function rowProducts(r: ScanDispatchRow) {
    if (r.kind === "unmatched" || r.order.items.length === 0) {
      return <span className="text-muted-foreground">—</span>;
    }
    return (
      <div className="flex flex-col gap-0.5">
        {r.order.items.map((it, i) => (
          <span key={it.product_id ?? `x-${i}`}>
            {it.sku} <span className="text-muted-foreground">×{it.quantity}</span>
          </span>
        ))}
      </div>
    );
  }

  /**
   * Dòng khớp bằng MÃ HOÁ ĐƠN trừ tồn ở kho CỦA ĐƠN, không phải kho đang chọn ở
   * đầu màn hình — phải hiện rõ ngay lúc quét, kẻo người quét tưởng cả lô cùng
   * trừ một kho. Thiếu kho xuất trên đơn thì báo luôn tại đây (đồng bộ với lỗi
   * fail-loud lúc Xác nhận — xem scan-dispatch-groups.ts).
   */
  function invoiceMatchBadge(r: ScanDispatchRow) {
    if (r.kind !== "matched" || r.order.matched_by !== "invoice") return null;
    const warehouseId = r.order.fulfillment_warehouse_id;
    const warehouseName = warehouses.find((w) => w.id === warehouseId)?.name;
    return (
      <span
        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
          warehouseId == null
            ? "bg-action-danger/10 text-action-danger"
            : "bg-action-info/10 text-action-info"
        }`}
      >
        {warehouseId == null
          ? "Khớp mã hoá đơn — thiếu kho xuất"
          : `Khớp mã hoá đơn — trừ kho ${warehouseName ?? `#${warehouseId}`}`}
      </span>
    );
  }

  function rowStatus(r: ScanDispatchRow) {
    const res = results[r.code];
    let resultNode = null;
    if (res && res.kind === "matched") {
      const badge = dispatchResultBadge(res.result);
      resultNode = (
        <ScanResultLabel tone={badge.tone} className="ml-2">
          {badge.text}
        </ScanResultLabel>
      );
    } else if (res && res.kind === "unmatched") {
      resultNode = (
        <ScanResultLabel tone={res.result.ok ? "ok" : "error"} className="ml-2">
          {res.result.ok
            ? "Đã ghi nhận — chờ khớp"
            : res.result.reason === "duplicate"
              ? "đã ghi nhận trước đó"
              : (res.result.reason ?? "lỗi")}
        </ScanResultLabel>
      );
    }
    return (
      <>
        {r.kind === "unmatched" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span>{t(`status.${r.order.status}`, r.order.status_label)}</span>
        )}
        {invoiceMatchBadge(r)}
        {resultNode}
      </>
    );
  }

  const matchedRows = rows.filter((r): r is MatchedRow => r.kind === "matched");
  const matchedResults = matchedRows
    .map((r) => results[r.code])
    .filter((r): r is MatchedRowResult => r?.kind === "matched")
    .map((r) => r.result);
  const summary =
    matchedResults.length > 0
      ? summarizeDispatched(
          matchedRows.map((r) => r.order),
          matchedResults,
        )
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <FormDialogShell
        title="Quét xuất kho (giao hàng)"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Đóng
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                dispatchBatch.isPending || createPendingScans.isPending || manualDispatch.isPending
              }
            >
              Xác nhận xuất kho ({rows.length})
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Kho xuất</label>
            <Select
              value={warehouseId}
              onValueChange={(v) => {
                setWarehouseId(v);
                scanRef.current?.focus();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn kho xuất" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-sm text-muted-foreground">Quét mã vận đơn</label>
              <ScannerGunBadge active={gunActive} />
            </div>
            <ScanShipmentInput ref={scanRef} onScan={handleScan} autoFocusOnMount={!isMobile} />
            {isMobile && (
              <div className="mt-2">
                <CameraScanButton onScan={handleScan} />
              </div>
            )}
          </div>

          {isMobile ? (
            <div className="flex flex-col gap-2">
              {rows.length === 0 ? (
                <p className="rounded-lg border border-border px-3 py-3 text-sm text-muted-foreground">
                  Chưa quét đơn nào.
                </p>
              ) : (
                rows.map((r) => (
                  <ScanRowCard
                    key={r.code}
                    code={r.code}
                    unmatched={r.kind === "unmatched"}
                    onRemove={() => removeRow(r.code)}
                    removeLabel={`Xoá ${r.code}`}
                    fields={[
                      { label: "Mã sản phẩm", value: rowProducts(r) },
                      { label: "Trạng thái", value: rowStatus(r) },
                    ]}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table data-slot="table" className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Mã vận đơn</th>
                    <th className="px-3 py-2">Mã sản phẩm</th>
                    <th className="px-3 py-2">Trạng thái</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                        Chưa quét đơn nào.
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => {
                    return (
                      <tr
                        key={r.code}
                        className={`border-t border-border transition-colors ${
                          r.kind === "unmatched"
                            ? "bg-action-danger/5 hover:bg-action-danger/10"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <td className="px-3 py-2 font-medium">
                          {r.code}
                          {r.kind === "unmatched" && (
                            <span className="ml-2 rounded-full bg-action-danger/10 px-2 py-0.5 text-xs font-medium text-action-danger">
                              Chưa khớp đơn
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">{rowProducts(r)}</td>
                        <td className="px-3 py-2">{rowStatus(r)}</td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => removeRow(r.code)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {summary && (
            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2 text-sm font-medium">
                Đã xuất {summary.orderCount} đơn — {summary.totalQuantity} sản phẩm
              </div>
              {isMobile ? (
                <div>
                  {summary.lines.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      Không có sản phẩm nào được xuất.
                    </p>
                  ) : (
                    <>
                      {summary.lines.map((l, i) => (
                        <ScanSummaryCard
                          key={l.sku || `line-${i}`}
                          sku={l.sku}
                          name={l.name}
                          quantity={l.quantity}
                        />
                      ))}
                      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-sm font-medium">
                        <span>Tổng</span>
                        <span>{summary.totalQuantity}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <table data-slot="table" className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Mã SP</th>
                      <th className="px-3 py-2">Tên</th>
                      <th className="px-3 py-2 text-right">SL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.lines.length === 0 && (
                      <tr>
                        <td className="px-3 py-3 text-muted-foreground" colSpan={3}>
                          Không có sản phẩm nào được xuất.
                        </td>
                      </tr>
                    )}
                    {summary.lines.map((l, i) => (
                      <tr key={l.sku || `line-${i}`} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">{l.sku}</td>
                        <td className="px-3 py-2">{l.name}</td>
                        <td className="px-3 py-2 text-right">{l.quantity}</td>
                      </tr>
                    ))}
                    {summary.lines.length > 0 && (
                      <tr className="border-t border-border font-medium">
                        <td className="px-3 py-2">Tổng</td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-right">{summary.totalQuantity}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
