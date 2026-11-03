import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { usePermission } from "@/hooks/usePermission";
import type { FlowLineBrief } from "@/lib/api/inventory-flow";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TABLE_VIEWPORT_QUERY } from "@/lib/constants/layout";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";

import { PendingMatchPanel } from "../PendingMatchControl";
import {
  buildFlowExportParams,
  type FlowFilters,
  type MatchFilter,
} from "../issue-history-queries";
import {
  useReturnHistory,
  useReturnPending,
  useReturnSkuReturns,
  useReturnSkus,
} from "../return-history-queries";
import { useCancelReturnEntry } from "../returns-queries";

import type { AdjustReturnTarget } from "../returns-types";
import { AdjustReturnDialog } from "./AdjustReturnDialog";
import type { ViewMode } from "./ViewModeToggle";
import {
  ExportButton,
  FlowNoteCell,
  Pager,
  PendingActions,
  PendingBadge,
  PendingNoteCell,
  PendingTime,
  ReturnNoteCell,
  SkuLines,
} from "./flow-shared";
import {
  FlowPendingMobileCard,
  FlowTotalMobileCard,
  ReturnOrderMobileCard,
  ReturnSkuMobileCard,
} from "./flow-mobile";
import { formatDateTimeVi } from "@/lib/format";
import { useConfirm } from "@/hooks/use-confirm";

export function ReturnTab({
  filters,
  matchFilter,
  viewMode,
  pageSize,
}: {
  filters: FlowFilters;
  matchFilter: MatchFilter;
  viewMode: ViewMode;
  pageSize: number;
}) {
  const { startExport } = useExportJobs();
  // Dưới 1024px (`lg`) bảng đổi sang thẻ — xem chú thích cùng chỗ ở IssueTab.
  const showTable = useMediaQuery(TABLE_VIEWPORT_QUERY);
  const [offset, setOffset] = useState(0);
  const [openProduct, setOpenProduct] = useState<number | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  // Đơn hoàn đang mở dialog Điều chỉnh SL (thực nhận khác lúc quét).
  const [adjustTarget, setAdjustTarget] = useState<AdjustReturnTarget | null>(null);

  // Huỷ đơn hoàn đã ghi sổ (đảo tồn) — chuyển từ dialog phiếu trả cũ sang đây
  // khi gỡ UI phiếu trả khỏi trang Phiếu kho (2026-07-14).
  const perm = usePermission();
  const canCancel = perm("returns:approve");
  const cancelEntry = useCancelReturnEntry();
  const confirm = useConfirm();

  async function handleCancel(returnId: number, label: string) {
    const ok = await confirm({
      title: `Huỷ đơn hoàn ${label}?`,
      description: "Tồn kho đã cộng sẽ bị đảo lại.",
      confirmText: "Huỷ đơn hoàn",
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancelEntry.mutateAsync(returnId);
      toast.success("Đã huỷ đơn hoàn.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Huỷ đơn hoàn thất bại.");
    }
  }

  // Đổi kiểu xem / số dòng mỗi trang / bộ lọc (ngày, kho, sản phẩm, mã đơn) thì
  // trang hiện tại có thể vượt tổng mới → về đầu. Trước đây việc này dựa vào
  // DispatchHistoryPage remount cả tab (key={filtersKey}) mỗi lần đổi filter —
  // cũng xoá sạch `openProduct`/`matchId` (mất dòng đang bung) mỗi lần gõ ô tìm.
  // Chỉ reset offset ở đây để giữ nguyên state bung dòng.
  useEffect(() => {
    setOffset(0);
  }, [filters, viewMode, pageSize]);

  // Phiếu trả trong lịch sử luôn là "đã khớp"; khi lọc "Chưa khớp" thì ẩn hẳn.
  const showHistory = viewMode === "order" && matchFilter !== "unmatched";
  const list = useReturnHistory(filters, { limit: pageSize, offset }, showHistory);
  const pending = useReturnPending(filters, matchFilter, viewMode === "order");
  const data = showHistory ? list.data : undefined;
  const pendingItems = viewMode === "order" ? (pending.data?.items ?? []) : [];

  const skuList = useReturnSkus(filters, { limit: pageSize, offset }, viewMode === "sku");
  const skuReturns = useReturnSkuReturns(
    openProduct,
    filters,
    viewMode === "sku" && openProduct != null,
  );
  const skuData = viewMode === "sku" ? skuList.data : undefined;

  if (viewMode === "sku") {
    // Nhãn dòng tổng dùng chung cho `<tfoot>` (desktop) và thẻ tổng (mobile) —
    // tách ra để hai đường không thể lệch cách cộng số.
    const skuTotalLabel = skuData ? (
      skuData.transfer_quantity > 0 ? (
        <>
          Tổng SL nhập ({skuData.total} SKU): hoàn {skuData.return_quantity} + chuyển kho{" "}
          {skuData.transfer_quantity} =
        </>
      ) : (
        <>Tổng SL hoàn ({skuData.total} SKU)</>
      )
    ) : null;

    if (!showTable) {
      const skuItems = skuData?.items ?? [];
      return (
        <div className="space-y-3 pt-3">
          <div className="flex justify-end">
            <ExportButton
              onClick={() => startExport("return_history", buildFlowExportParams(filters, "sku"))}
            />
          </div>
          {skuItems.length === 0 ? (
            skuList.isLoading ? (
              <LogoSpinner label="Đang tải..." className="mx-auto" />
            ) : (
              <EmptyState title="Không có dữ liệu." />
            )
          ) : (
            <div className="flex flex-col gap-2">
              {skuItems.map((r) => (
                <ReturnSkuMobileCard
                  key={r.product_id}
                  row={r}
                  expanded={openProduct === r.product_id}
                  onToggle={() =>
                    setOpenProduct((cur) => (cur === r.product_id ? null : r.product_id))
                  }
                  detailLoading={skuReturns.isLoading}
                  details={skuReturns.data?.items ?? []}
                />
              ))}
            </div>
          )}
          {skuData && <FlowTotalMobileCard label={skuTotalLabel} total={skuData.total_quantity} />}
          {skuData && skuData.total > pageSize && (
            <Pager offset={offset} total={skuData.total} pageSize={pageSize} onChange={setOffset} />
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3 pt-3">
        <div className="flex justify-end">
          <ExportButton
            onClick={() => startExport("return_history", buildFlowExportParams(filters, "sku"))}
          />
        </div>
        <div className="rounded-lg border border-border overflow-x-auto">
          <table data-slot="table" className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="whitespace-nowrap px-3 py-2">SKU</th>
                <th className="whitespace-nowrap px-3 py-2">Tên</th>
                <th className="px-3 py-2 text-right">Số phiếu</th>
                <th className="px-3 py-2 text-right">SL hoàn</th>
              </tr>
            </thead>
            <tbody>
              {(skuData?.items.length ?? 0) === 0 && (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                    {skuList.isLoading ? (
                      <LogoSpinner label="Đang tải..." className="mx-auto" />
                    ) : (
                      "Không có dữ liệu."
                    )}
                  </td>
                </tr>
              )}
              {skuData?.items.map((r) => (
                <Fragment key={r.product_id}>
                  <tr
                    className="cursor-pointer border-t border-border hover:bg-muted/50"
                    role="button"
                    tabIndex={0}
                    aria-expanded={openProduct === r.product_id}
                    onClick={() =>
                      setOpenProduct((cur) => (cur === r.product_id ? null : r.product_id))
                    }
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      setOpenProduct((cur) => (cur === r.product_id ? null : r.product_id));
                    }}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{r.sku ?? "—"}</td>
                    <td className="px-3 py-2">{r.name ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.return_count}</td>
                    <td className="px-3 py-2 text-right">
                      {r.qty_total + r.transfer_quantity}
                      {r.transfer_count > 0 && (
                        <div className="text-xs font-normal text-muted-foreground">
                          gồm {r.transfer_quantity} chuyển kho
                        </div>
                      )}
                    </td>
                  </tr>
                  {openProduct === r.product_id && (
                    <tr className="bg-muted/30">
                      <td colSpan={4} className="px-3 py-2">
                        {skuReturns.isLoading ? (
                          <LogoSpinner size={22} label="Đang tải..." className="mx-auto" />
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="text-left text-muted-foreground">
                              <tr>
                                <th className="px-2 py-1">Mã phiếu ngày</th>
                                <th className="px-2 py-1">Mã hóa đơn nguồn</th>
                                <th className="px-2 py-1">Mã vận đơn</th>
                                <th className="px-2 py-1">Kho</th>
                                <th className="px-2 py-1">Loại hoàn</th>
                                <th className="px-2 py-1 text-right">SL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {skuReturns.data?.items.map((rt) => (
                                <tr
                                  key={
                                    rt.kind === "transfer" ? `tr-${rt.code}` : `ret-${rt.return_id}`
                                  }
                                  className="border-t border-border/60"
                                >
                                  <td className="px-2 py-1 font-medium">{rt.code}</td>
                                  <td className="px-2 py-1">
                                    {rt.source_order_invoice_code ?? rt.source_order_code ?? "—"}
                                  </td>
                                  <td className="px-2 py-1">{rt.shipping_code ?? "—"}</td>
                                  <td className="px-2 py-1">{rt.warehouse_name ?? "—"}</td>
                                  <td className="px-2 py-1">{rt.return_type_label}</td>
                                  <td className="px-2 py-1 text-right">{rt.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
            {skuData && (
              <tfoot>
                <tr className="border-t border-border font-medium">
                  <td className="px-3 py-2" colSpan={3}>
                    {skuTotalLabel}
                  </td>
                  <td className="px-3 py-2 text-right">{skuData.total_quantity}</td>
                </tr>
              </tfoot>
            )}
          </table>
          {skuData && skuData.total > pageSize && (
            <Pager offset={offset} total={skuData.total} pageSize={pageSize} onChange={setOffset} />
          )}
        </div>
      </div>
    );
  }

  const orderTotalLabel = data ? (
    data.transfer_quantity > 0 ? (
      <>
        Tổng SL nhập ({data.total} dòng): hoàn {data.return_quantity} + chuyển kho{" "}
        {data.transfer_quantity} =
      </>
    ) : (
      <>Tổng SL hoàn ({data.total} phiếu)</>
    )
  ) : null;

  /** Cặp nút Điều chỉnh + Huỷ của 1 đơn hoàn ĐÃ ghi sổ — dùng chung bảng và thẻ. */
  function postedReturnActions(returnId: number, label: string, lines: FlowLineBrief[]) {
    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => setAdjustTarget({ return_id: returnId, label, lines })}
        >
          Điều chỉnh
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-destructive/30 px-2 text-xs text-destructive hover:bg-destructive/10"
          disabled={cancelEntry.isPending}
          onClick={() => void handleCancel(returnId, label)}
        >
          Huỷ
        </Button>
      </div>
    );
  }

  if (!showTable) {
    const historyItems = data?.items ?? [];
    const nothingToShow = historyItems.length === 0 && pendingItems.length === 0;
    return (
      <div className="space-y-3 pt-3">
        <div className="flex justify-end">
          <ExportButton
            onClick={() => startExport("return_history", buildFlowExportParams(filters))}
          />
        </div>
        {nothingToShow ? (
          (showHistory && list.isLoading) || pending.isLoading ? (
            <LogoSpinner label="Đang tải..." className="mx-auto" />
          ) : (
            <EmptyState title="Không có dữ liệu." />
          )
        ) : (
          <div className="flex flex-col gap-2">
            {/* Mã chờ khớp đứng đầu, đúng thứ tự của bản bảng. */}
            {pendingItems.map((p) => (
              <FlowPendingMobileCard
                key={`pending-${p.id}`}
                item={p}
                qtyLabel="SL hoàn"
                note={
                  p.return_id != null ? (
                    <ReturnNoteCell returnId={p.return_id} note={p.note} />
                  ) : (
                    <PendingNoteCell scanId={p.id} note={p.note} />
                  )
                }
                actions={
                  p.status === "matched" && p.return_id != null && canCancel ? (
                    postedReturnActions(p.return_id, p.matched_order_code || p.code, p.lines ?? [])
                  ) : (
                    <PendingActions
                      item={p}
                      onMatch={() => setMatchId((cur) => (cur === p.id ? null : p.id))}
                    />
                  )
                }
              >
                {matchId === p.id && (
                  <div className="mt-2 border-t border-border/60 pt-2">
                    <PendingMatchPanel
                      scanId={p.id}
                      kind="return"
                      onDone={() => setMatchId(null)}
                    />
                  </div>
                )}
              </FlowPendingMobileCard>
            ))}
            {historyItems.map((r) => (
              <ReturnOrderMobileCard
                key={r.kind === "transfer" ? `transfer-${r.code}` : `return-${r.return_id}`}
                row={r}
                note={
                  r.return_id != null ? (
                    <ReturnNoteCell returnId={r.return_id} note={r.note} />
                  ) : (
                    <FlowNoteCell targetType="stock_document" targetId={r.doc_id} note={r.note} />
                  )
                }
                actions={
                  canCancel && r.return_id != null
                    ? postedReturnActions(
                        r.return_id,
                        r.source_order_invoice_code ?? r.shipping_code ?? `#${r.return_id}`,
                        r.lines,
                      )
                    : null
                }
              />
            ))}
          </div>
        )}
        {data && <FlowTotalMobileCard label={orderTotalLabel} total={data.total_quantity} />}
        {data && data.total > pageSize && (
          <Pager offset={offset} total={data.total} pageSize={pageSize} onChange={setOffset} />
        )}
        <AdjustReturnDialog
          target={adjustTarget}
          onOpenChange={(o) => {
            if (!o) setAdjustTarget(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-3">
      <div className="flex justify-end">
        <ExportButton
          onClick={() => startExport("return_history", buildFlowExportParams(filters))}
        />
      </div>
      <div className="rounded-lg border border-border overflow-x-auto">
        <table data-slot="table" className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="whitespace-nowrap px-3 py-2">Thời gian</th>
              <th className="whitespace-nowrap px-3 py-2">Mã phiếu ngày</th>
              <th className="whitespace-nowrap px-3 py-2">Mã hóa đơn nguồn</th>
              <th className="whitespace-nowrap px-3 py-2">Mã vận đơn</th>
              <th className="whitespace-nowrap px-3 py-2">Kho</th>
              <th className="whitespace-nowrap px-3 py-2">Người thực hiện</th>
              <th className="whitespace-nowrap px-3 py-2">Loại hoàn</th>
              <th className="whitespace-nowrap px-3 py-2">Ghi chú</th>
              <th className="px-3 py-2 text-right">SL hoàn</th>
              {/* Luôn hiện (không gate theo quyền): nút của dòng chờ khớp nằm ở đây —
                  gate theo canCancel làm cột chỉ xuất hiện với người có quyền và nút
                  pending nằm nhầm ô SL hoàn → bảng lệch cột. */}
              <th className="px-3 py-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {/* Mã vận đơn chờ khớp — chèn đầu danh sách */}
            {pendingItems.map((p) => (
              <Fragment key={`pending-${p.id}`}>
                <tr
                  className={`border-t border-border ${
                    p.status === "matched" ? "bg-green-50/50" : "bg-amber-50/50"
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2">
                    <PendingTime item={p} />
                  </td>
                  <td className="px-3 py-2">
                    <PendingBadge item={p} />
                  </td>
                  <td className="px-3 py-2">
                    <SkuLines code={p.matched_order_code || null} lines={p.lines} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{p.code}</td>
                  <td className="whitespace-nowrap px-3 py-2">{p.warehouse_name ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{p.performed_by || "—"}</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">
                    {p.return_id != null ? (
                      <ReturnNoteCell returnId={p.return_id} note={p.note} />
                    ) : (
                      <PendingNoteCell scanId={p.id} note={p.note} />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{p.status === "matched" ? p.qty : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {p.status === "matched" && p.return_id != null && canCancel ? (
                      // Mã đã khớp = đơn hoàn ĐÃ ghi sổ → cho điều chỉnh SL + huỷ
                      // (khớp nhầm đơn) tại chỗ, khỏi đi tìm dòng lịch sử tương ứng.
                      postedReturnActions(
                        p.return_id,
                        p.matched_order_code || p.code,
                        p.lines ?? [],
                      )
                    ) : (
                      <PendingActions
                        item={p}
                        onMatch={() => setMatchId((cur) => (cur === p.id ? null : p.id))}
                      />
                    )}
                  </td>
                </tr>
                {matchId === p.id && (
                  <tr className="bg-amber-50/30">
                    <td colSpan={10} className="px-3 py-1">
                      <PendingMatchPanel
                        scanId={p.id}
                        kind="return"
                        onDone={() => setMatchId(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {(data?.items.length ?? 0) === 0 && pendingItems.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={10}>
                  {(showHistory && list.isLoading) || pending.isLoading ? (
                    <LogoSpinner label="Đang tải..." className="mx-auto" />
                  ) : (
                    "Không có dữ liệu."
                  )}
                </td>
              </tr>
            )}
            {data?.items.map((r) => (
              <tr
                key={r.kind === "transfer" ? `transfer-${r.code}` : `return-${r.return_id}`}
                className="border-t border-border"
              >
                <td className="whitespace-nowrap px-3 py-2">{formatDateTimeVi(r.created_at)}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  {r.kind === "transfer" ? (
                    <span className="whitespace-nowrap rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700">
                      {r.code}
                    </span>
                  ) : (
                    r.code
                  )}
                </td>
                <td className="px-3 py-2">
                  <SkuLines
                    code={r.source_order_invoice_code ?? r.source_order_code}
                    lines={r.lines}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">{r.shipping_code ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.warehouse_name ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.performed_by || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.return_type_label}</td>
                <td className="px-3 py-2">
                  {r.return_id != null ? (
                    <ReturnNoteCell returnId={r.return_id} note={r.note} />
                  ) : (
                    <FlowNoteCell targetType="stock_document" targetId={r.doc_id} note={r.note} />
                  )}
                </td>
                <td className="px-3 py-2 text-right">{r.qty_total}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {canCancel && r.return_id != null ? (
                    postedReturnActions(
                      r.return_id,
                      r.source_order_invoice_code ?? r.shipping_code ?? `#${r.return_id}`,
                      r.lines,
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {data && (
            <tfoot>
              <tr className="border-t border-border font-medium">
                <td className="px-3 py-2" colSpan={8}>
                  {orderTotalLabel}
                </td>
                <td className="px-3 py-2 text-right">{data.total_quantity}</td>
                <td className="px-3 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
        {data && data.total > pageSize && (
          <Pager offset={offset} total={data.total} pageSize={pageSize} onChange={setOffset} />
        )}
      </div>
      <AdjustReturnDialog
        target={adjustTarget}
        onOpenChange={(o) => {
          if (!o) setAdjustTarget(null);
        }}
      />
    </div>
  );
}
