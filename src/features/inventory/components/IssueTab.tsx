import { Fragment, useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TABLE_VIEWPORT_QUERY } from "@/lib/constants/layout";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";

import { PendingMatchPanel } from "../PendingMatchControl";
import { PendingReplacementPanel } from "../PendingReplacementPanel";
import {
  buildFlowExportParams,
  useIssueOrders,
  useIssuePending,
  useIssueSkuOrders,
  useIssueSkus,
  type FlowFilters,
  type MatchFilter,
} from "../issue-history-queries";
import { displayQty, shippingCodeLabel } from "../flow-quantity";

import type { ViewMode } from "./ViewModeToggle";
import {
  ExportButton,
  FlowNoteCell,
  Pager,
  PendingActions,
  PendingBadge,
  PendingNoteCell,
  PendingTime,
  SkuLines,
} from "./flow-shared";
import {
  FlowPendingMobileCard,
  FlowTotalMobileCard,
  IssueOrderMobileCard,
  IssueSkuMobileCard,
} from "./flow-mobile";
import { formatDateTimeVi } from "@/lib/format";

export function IssueTab({
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
  // Dưới 1024px (`lg`) bảng đổi sang thẻ. Quyết định ở đây (thay vì bọc ResponsiveList)
  // vì tab còn dòng tổng và phân trang phải đi kèm đúng một trong hai đường.
  const showTable = useMediaQuery(TABLE_VIEWPORT_QUERY);
  const [offset, setOffset] = useState(0);
  const [openProduct, setOpenProduct] = useState<number | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  // Dòng đã khớp đang mở form tạo phiếu bù (ca cũ) — tách khỏi `matchId` vì hai luồng
  // khác nhau: một cái khớp đơn, một cái chỉ sinh chứng từ cho mã đã khớp.
  const [replacementId, setReplacementId] = useState<number | null>(null);

  // Đổi kiểu xem / số dòng mỗi trang / bộ lọc (ngày, kho, sản phẩm, mã đơn) thì
  // trang hiện tại có thể vượt tổng mới → về đầu. Trước đây việc này dựa vào
  // DispatchHistoryPage remount cả tab (key={filtersKey}) mỗi lần đổi filter —
  // cũng xoá sạch `openProduct`/`matchId` (mất dòng đang bung) mỗi lần gõ ô tìm.
  // Chỉ reset offset ở đây để giữ nguyên state bung dòng.
  useEffect(() => {
    setOffset(0);
  }, [filters, viewMode, pageSize]);

  // Lịch sử đơn đã xuất luôn là "đã khớp"; khi lọc "Chưa khớp" thì ẩn hẳn.
  const showHistory = viewMode === "order" && matchFilter !== "unmatched";
  const list = useIssueOrders(filters, { limit: pageSize, offset }, showHistory);
  const pending = useIssuePending(filters, matchFilter, viewMode === "order");
  const data = showHistory ? list.data : undefined;
  const pendingItems = viewMode === "order" ? (pending.data?.items ?? []) : [];

  const skuList = useIssueSkus(filters, { limit: pageSize, offset }, viewMode === "sku");
  const skuOrders = useIssueSkuOrders(
    openProduct,
    filters,
    viewMode === "sku" && openProduct != null,
  );
  const skuData = viewMode === "sku" ? skuList.data : undefined;

  if (viewMode === "sku") {
    // Nhãn dòng tổng dùng chung cho `<tfoot>` (desktop) và thẻ tổng (mobile) —
    // tách ra để hai đường không thể lệch cách cộng số.
    const skuTotalLabel = skuData ? (
      skuData.doc_quantity > 0 || skuData.transfer_quantity > 0 ? (
        <>
          Tổng SL xuất ({skuData.total} SKU): theo đơn {skuData.sale_quantity} + phiếu kho{" "}
          {skuData.doc_quantity} + chuyển kho {skuData.transfer_quantity} =
        </>
      ) : (
        <>Tổng SL xuất ({skuData.total} SKU)</>
      )
    ) : null;

    if (!showTable) {
      const skuItems = skuData?.items ?? [];
      return (
        <div className="space-y-3 pt-3">
          <div className="flex justify-end">
            <ExportButton
              onClick={() => startExport("dispatch_history", buildFlowExportParams(filters, "sku"))}
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
                <IssueSkuMobileCard
                  key={r.product_id}
                  row={r}
                  expanded={openProduct === r.product_id}
                  onToggle={() =>
                    setOpenProduct((cur) => (cur === r.product_id ? null : r.product_id))
                  }
                  detailLoading={skuOrders.isLoading}
                  details={skuOrders.data?.items ?? []}
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
            onClick={() => startExport("dispatch_history", buildFlowExportParams(filters, "sku"))}
          />
        </div>
        <div className="rounded-lg border border-border overflow-x-auto">
          <table data-slot="table" className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="whitespace-nowrap px-3 py-2">SKU</th>
                <th className="whitespace-nowrap px-3 py-2">Tên</th>
                <th className="px-3 py-2 text-right">Số đơn</th>
                <th className="px-3 py-2 text-right">SL xuất</th>
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
                    <td className="px-3 py-2 text-right">{r.order_count}</td>
                    <td className="px-3 py-2 text-right">
                      {displayQty(
                        r.net + r.doc_quantity + r.transfer_quantity,
                        r.dispatched + r.doc_quantity + r.transfer_quantity,
                      )}
                      {r.doc_count > 0 && (
                        <div className="text-xs font-normal text-muted-foreground">
                          gồm {r.doc_quantity} phiếu kho
                        </div>
                      )}
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
                        {skuOrders.isLoading ? (
                          <LogoSpinner size={22} label="Đang tải..." className="mx-auto" />
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="text-left text-muted-foreground">
                              <tr>
                                <th className="px-2 py-1">Mã hóa đơn</th>
                                <th className="px-2 py-1">Mã vận đơn</th>
                                <th className="px-2 py-1">Kho</th>
                                <th className="px-2 py-1 text-right">SL xuất</th>
                              </tr>
                            </thead>
                            <tbody>
                              {skuOrders.data?.items.map((o) => (
                                <tr
                                  key={
                                    o.kind === "order" ? `order-${o.order_id}` : `doc-${o.doc_code}`
                                  }
                                  className="border-t border-border/60"
                                >
                                  <td className="px-2 py-1 font-medium">
                                    {o.kind === "document"
                                      ? `Phiếu xuất kho ${o.doc_code ?? ""}`
                                      : o.kind === "transfer"
                                        ? `Phiếu chuyển kho ${o.doc_code ?? ""}`
                                        : (o.invoice_code ?? o.order_code ?? "—")}
                                  </td>
                                  <td className="px-2 py-1">{o.shipping_code ?? "—"}</td>
                                  <td className="px-2 py-1">{o.warehouse_name ?? "—"}</td>
                                  <td className="px-2 py-1 text-right">
                                    {displayQty(o.net, o.dispatched)}
                                  </td>
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
    data.doc_quantity > 0 || data.transfer_quantity > 0 ? (
      <>
        Tổng SL xuất ({data.total} dòng): theo đơn {data.sale_quantity} + phiếu kho{" "}
        {data.doc_quantity} + chuyển kho {data.transfer_quantity} =
      </>
    ) : (
      <>Tổng SL xuất ({data.total} đơn)</>
    )
  ) : null;

  if (!showTable) {
    const historyItems = data?.items ?? [];
    const nothingToShow = historyItems.length === 0 && pendingItems.length === 0;
    return (
      <div className="space-y-3 pt-3">
        <div className="flex justify-end">
          <ExportButton
            onClick={() => startExport("dispatch_history", buildFlowExportParams(filters))}
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
                qtyLabel="SL xuất"
                note={<PendingNoteCell scanId={p.id} note={p.note} />}
                actions={
                  <PendingActions
                    item={p}
                    onMatch={() => setMatchId((cur) => (cur === p.id ? null : p.id))}
                    onReplacementIssue={() =>
                      setReplacementId((cur) => (cur === p.id ? null : p.id))
                    }
                  />
                }
              >
                {matchId === p.id && (
                  <div className="mt-2 border-t border-border/60 pt-2">
                    <PendingMatchPanel
                      scanId={p.id}
                      kind="dispatch"
                      onDone={() => setMatchId(null)}
                    />
                  </div>
                )}
                {replacementId === p.id && (
                  <div className="mt-2 border-t border-border/60 pt-2">
                    <PendingReplacementPanel
                      scanId={p.id}
                      code={p.code}
                      orderCode={p.matched_order_code}
                      lines={p.lines.map((l) => ({
                        product_id: l.product_id,
                        sku: l.sku ?? "",
                        quantity: l.qty,
                      }))}
                      onDone={() => setReplacementId(null)}
                    />
                  </div>
                )}
              </FlowPendingMobileCard>
            ))}
            {historyItems.map((r) => (
              <IssueOrderMobileCard
                key={r.kind === "order" ? `order-${r.order_id}` : `doc-${r.doc_code}`}
                row={r}
              />
            ))}
          </div>
        )}
        {data && <FlowTotalMobileCard label={orderTotalLabel} total={data.total_quantity} />}
        {data && data.total > pageSize && (
          <Pager offset={offset} total={data.total} pageSize={pageSize} onChange={setOffset} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-3">
      <div className="flex justify-end">
        <ExportButton
          onClick={() => startExport("dispatch_history", buildFlowExportParams(filters))}
        />
      </div>
      <div className="rounded-lg border border-border overflow-x-auto">
        <table data-slot="table" className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="whitespace-nowrap px-3 py-2">Thời gian</th>
              <th className="whitespace-nowrap px-3 py-2">Mã hóa đơn</th>
              <th className="whitespace-nowrap px-3 py-2">Mã vận đơn</th>
              <th className="whitespace-nowrap px-3 py-2">Kho</th>
              <th className="whitespace-nowrap px-3 py-2">Người thực hiện</th>
              <th className="whitespace-nowrap px-3 py-2">Ghi chú</th>
              <th className="px-3 py-2 text-right">Số SKU</th>
              <th className="px-3 py-2 text-right">SL xuất</th>
              {/* Luôn hiện: nút của dòng mã quét nằm ở đây — trước kia nằm trong ô
                  SL xuất nên dòng đã khớp hiện "—" dưới header SL xuất, kho đọc
                  thành "xuất nhưng trừ tồn 0" (ca prod 84859721026220). */}
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
                    <div className="flex items-start gap-1.5">
                      <PendingBadge item={p} />
                      <SkuLines code={p.matched_order_code || null} lines={p.lines} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{p.code}</td>
                  <td className="whitespace-nowrap px-3 py-2">{p.warehouse_name ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{p.performed_by || "—"}</td>
                  <td className="px-3 py-2">
                    <PendingNoteCell scanId={p.id} note={p.note} />
                  </td>
                  <td className="px-3 py-2 text-right">{p.sku_count || "—"}</td>
                  <td className="px-3 py-2 text-right">{p.status === "matched" ? p.qty : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <PendingActions
                      item={p}
                      onMatch={() => setMatchId((cur) => (cur === p.id ? null : p.id))}
                      onReplacementIssue={() =>
                        setReplacementId((cur) => (cur === p.id ? null : p.id))
                      }
                    />
                  </td>
                </tr>
                {matchId === p.id && (
                  <tr className="bg-amber-50/30">
                    <td colSpan={9} className="px-3 py-1">
                      <PendingMatchPanel
                        scanId={p.id}
                        kind="dispatch"
                        onDone={() => setMatchId(null)}
                      />
                    </td>
                  </tr>
                )}
                {replacementId === p.id && (
                  <tr className="bg-amber-50/30">
                    <td colSpan={9} className="px-3 py-1">
                      <PendingReplacementPanel
                        scanId={p.id}
                        code={p.code}
                        orderCode={p.matched_order_code}
                        lines={p.lines.map((l) => ({
                          product_id: l.product_id,
                          sku: l.sku ?? "",
                          quantity: l.qty,
                        }))}
                        onDone={() => setReplacementId(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {(data?.items.length ?? 0) === 0 && pendingItems.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={9}>
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
                key={r.kind === "order" ? `order-${r.order_id}` : `doc-${r.doc_code}`}
                className="border-t border-border"
              >
                <td className="whitespace-nowrap px-3 py-2">
                  {r.last_at ? formatDateTimeVi(r.last_at) : "—"}
                </td>
                <td className="px-3 py-2">
                  {r.kind === "document" || r.kind === "transfer" ? (
                    <div className="flex items-start gap-1.5">
                      <span
                        className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs ${
                          r.kind === "transfer"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {r.kind === "transfer" ? "Phiếu chuyển kho" : "Phiếu xuất kho"} {r.doc_code}
                      </span>
                      <SkuLines code={null} lines={r.lines} />
                    </div>
                  ) : (
                    <SkuLines code={r.invoice_code ?? r.order_code} lines={r.lines} />
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{shippingCodeLabel(r)}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.warehouse_name ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.performed_by || "—"}</td>
                <td className="px-3 py-2">
                  <FlowNoteCell
                    targetType={r.kind === "order" ? "order_dispatch" : "stock_document"}
                    targetId={r.kind === "order" ? r.order_id : r.doc_id}
                    note={r.note ?? ""}
                  />
                </td>
                <td className="px-3 py-2 text-right">{r.sku_count}</td>
                <td className="px-3 py-2 text-right">{displayQty(r.net, r.dispatched)}</td>
                <td className="px-3 py-2 text-muted-foreground">—</td>
              </tr>
            ))}
          </tbody>
          {data && (
            <tfoot>
              <tr className="border-t border-border font-medium">
                <td className="px-3 py-2" colSpan={7}>
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
    </div>
  );
}
