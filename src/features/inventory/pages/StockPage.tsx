import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PageHeader } from "@/components/ui/page-header";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWarehouses } from "@/lib/api/warehouses";
import { usePermission } from "@/hooks/usePermission";
import { useStockList, useStockMovements } from "@/features/inventory/queries";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";
import { ExportButton } from "@/features/inventory/components/flow-shared";
import { MOVEMENT_TYPE_LABELS, type StockRow } from "@/features/inventory/types";
import { StockCard, type StockPivotRow } from "@/features/inventory/components/StockCard";
import { formatRate } from "@/features/inventory/stock-run-rate";
import { isPastDate, toIsoDate } from "@/features/inventory/stock-as-of";
import { StockMovementHistory } from "@/features/inventory/components/StockMovementHistory";
import {
  ResolveStockDialog,
  type ResolveStockTarget,
} from "@/features/inventory/pages/ResolveStockDialog";
import { useI18n } from "@/i18n";
import { formatDateTimeVi } from "@/lib/format";

type PivotRow = StockPivotRow;

function buildPivot(items: StockRow[]): PivotRow[] {
  const map = new Map<string, PivotRow>();

  for (const item of items) {
    const key = `${item.warehouse}-${item.product}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        warehouse: item.warehouse,
        warehouse_name: item.warehouse_name,
        product: item.product,
        product_sku: item.product_sku,
        product_name: item.product_name,
        sellable: 0,
        warranty: 0,
        defect: 0,
        total: 0,
        // rr3/rr7 tính theo (kho, mã) — mọi dòng state mang cùng giá trị.
        rr3: item.rr3,
        rr7: item.rr7,
      });
    }
    const row = map.get(key)!;
    row[item.state] += item.quantity;
    row.total += item.quantity;
  }

  return Array.from(map.values());
}

function qtyClass(value: number, variant?: "warranty" | "defect"): string {
  if (value < 0) return "font-semibold text-destructive";
  if (value === 0) return "text-muted-foreground";
  if (variant === "warranty") return "font-medium text-action-warning";
  if (variant === "defect") return "font-medium text-action-danger";
  return "";
}

function ExpandableStockRow({
  row,
  warehouseId,
  expanded,
  onToggle,
  onResolve,
  colSpan,
  asOf,
  readOnly,
}: {
  row: PivotRow;
  warehouseId: number | null;
  expanded: boolean;
  onToggle: () => void;
  onResolve: (r: PivotRow) => void;
  colSpan: number;
  asOf: string;
  readOnly: boolean;
}) {
  const { data, isLoading } = useStockMovements(warehouseId, row.product, expanded, asOf);
  return (
    <>
      <tr className="cursor-pointer border-t border-border hover:bg-muted/40" onClick={onToggle}>
        <td className="px-2 py-2 text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="px-3 py-2 font-medium">{row.product_sku}</td>
        <td className={`px-3 py-2 text-right ${qtyClass(row.sellable)}`}>{row.sellable}</td>
        <td className={`px-3 py-2 text-right ${qtyClass(row.warranty, "warranty")}`}>
          {row.warranty}
        </td>
        <td className={`px-3 py-2 text-right ${qtyClass(row.defect, "defect")}`}>{row.defect}</td>
        <td className={`px-3 py-2 text-right ${qtyClass(row.total)}`}>{row.total}</td>
        <td className={`px-3 py-2 text-right ${row.rr3 > 0 ? "" : "text-muted-foreground"}`}>
          {formatRate(row.rr3)}
        </td>
        <td className={`px-3 py-2 text-right ${row.rr7 > 0 ? "" : "text-muted-foreground"}`}>
          {formatRate(row.rr7)}
        </td>
        <td className="px-3 py-2 text-center">
          {!readOnly && (row.warranty > 0 || row.defect > 0) && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onResolve(row);
              }}
            >
              <Wrench className="mr-1 h-3 w-3" />
              Xử lý
            </Button>
          )}
        </td>
      </tr>
      {expanded && (
        <StockMovementHistory rows={data?.items ?? []} isLoading={isLoading} colSpan={colSpan} />
      )}
    </>
  );
}

function ExpandableStockCard({
  row,
  warehouseId,
  expanded,
  onToggle,
  onResolve,
  asOf,
  readOnly,
}: {
  row: PivotRow;
  warehouseId: number | null;
  expanded: boolean;
  onToggle: () => void;
  onResolve: (r: PivotRow) => void;
  asOf: string;
  readOnly: boolean;
}) {
  const { data, isLoading } = useStockMovements(warehouseId, row.product, expanded, asOf);
  return (
    <StockCard
      row={row}
      onResolve={readOnly ? undefined : onResolve}
      onToggleHistory={onToggle}
      expanded={expanded}
    >
      <div className="mt-2 space-y-2 border-t border-border pt-2 text-xs">
        {isLoading && <LogoSpinner size={22} label="Đang tải..." className="mx-auto" />}
        {!isLoading && (data?.items ?? []).length === 0 && (
          <p className="text-muted-foreground">Chưa có giao dịch.</p>
        )}
        {(data?.items ?? []).map((m) => (
          <div key={m.id} className="rounded-md bg-muted/40 px-2 py-1.5">
            <div className="flex justify-between">
              <span>{MOVEMENT_TYPE_LABELS[m.movement_type] ?? m.movement_type}</span>
              <span className={m.qty_delta > 0 ? "text-action-success" : "text-destructive"}>
                {m.qty_delta > 0 ? `+${m.qty_delta}` : m.qty_delta}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{m.reference_label ?? "—"}</span>
              <span>Tồn: {m.balance_after}</span>
            </div>
            <div className="text-muted-foreground">{formatDateTimeVi(m.created_at)}</div>
          </div>
        ))}
      </div>
    </StockCard>
  );
}

export default function StockPage() {
  const { t } = useI18n();
  const can = usePermission();
  const { startExport } = useExportJobs();
  const [search, setSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [asOf, setAsOf] = useState("");
  // "Hôm nay" phải là STATE, không phải một biểu thức tính thẳng trong thân
  // render. Frontend bật React Compiler (vite.config.ts + vitest.config.ts,
  // babel-plugin-react-compiler) — compiler này memo hoá cả lời gọi không
  // thuần như `toIsoDate(new Date())`, y hệt kiểu nó từng đóng băng biểu thức
  // đọc `ref.current` trong render (xem sự cố nút Xuất Excel 06/08, MR !1158).
  // Đã biên dịch thử và kiểm chứng: scope memo của `todayIso` bị KHOÁ THEO
  // `asOf` (vì `isPastDate(asOf, todayIso)` nằm chung scope với nó) — không
  // phải một "hằng số" tính một lần cho cả vòng đời component. Tức là bỏ
  // `useMemo` KHÔNG tạo ra "tính lại mỗi render" như tưởng, nhưng cũng không
  // vô hại: `todayIso` chỉ được tính lại khi `asOf` đổi.
  //
  // Ca hỏng vẫn còn hẹp nhưng thật: người dùng chọn mốc = hôm nay TRƯỚC nửa
  // đêm rồi để tab mở qua đêm, không đổi `asOf` nữa. Scope không invalidate
  // → `viewingPast` vẫn `false`, nút "Xử lý" vẫn mở, `max` của ô ngày vẫn kẹt
  // ở hôm qua — dù server đã sang ngày mới và tồn trả về đã là quá khứ.
  //
  // Đưa vào `useState` + tự làm mới bằng interval: giá trị đọc từ state luôn
  // là state HIỆN TẠI theo React, compiler không (và không thể) memo hoá một
  // giá trị hook trả về theo cách khoá vĩnh viễn như trên. Chu kỳ 60s đủ để
  // bắt mốc nửa đêm trong vòng chưa đầy một phút, không cần chờ người dùng
  // tình cờ đổi `asOf`. `setTodayIso` gọi với cùng một chuỗi thì React tự
  // bail-out theo `Object.is` — 1439 lần bắn interval mỗi ngày chỉ gây đúng
  // MỘT re-render thật, đúng tại mốc nửa đêm.
  const [todayIso, setTodayIso] = useState(() => toIsoDate(new Date()));
  useEffect(() => {
    const id = setInterval(() => setTodayIso(toIsoDate(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);
  // Mốc = hôm nay CHÍNH LÀ tồn hiện tại, nên không tính là "xem quá khứ": không
  // cảnh báo, không khoá thao tác.
  const viewingPast = isPastDate(asOf, todayIso);

  const { data: whData } = useQuery({
    queryKey: ["warehouses", "all-active"],
    queryFn: () => getWarehouses({ isActive: true, limit: 200 }),
  });
  const warehouses = useMemo(
    () => (whData?.items ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [whData?.items],
  );

  useEffect(() => {
    if (warehouseId == null && warehouses.length > 0) setWarehouseId(warehouses[0].id);
  }, [warehouseId, warehouses]);

  const { data, isLoading } = useStockList(warehouseId, search, asOf);
  const [resolveTarget, setResolveTarget] = useState<ResolveStockTarget | null>(null);
  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);

  const pivotRows = useMemo<PivotRow[]>(() => buildPivot(data?.items ?? []), [data?.items]);

  const colSpan = 9;

  function handleResolve(r: PivotRow) {
    setResolveTarget({
      warehouse: r.warehouse,
      warehouse_name: r.warehouse_name,
      product: r.product,
      product_sku: r.product_sku,
      product_name: r.product_name,
      warranty: r.warranty,
      defect: r.defect,
    });
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={t("topnav.tabs.stock")}
        actions={
          <>
            <Select
              value={warehouseId != null ? String(warehouseId) : undefined}
              onValueChange={(v) => {
                setWarehouseId(Number(v));
                setExpandedKey(null);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Chọn kho" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search", "Tìm SKU / tên")}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-hidden focus:border-primary"
            />
            <div className="flex items-center gap-1">
              <input
                type="date"
                aria-label="Xem tồn đến ngày"
                value={asOf}
                max={todayIso}
                onChange={(e) => {
                  setAsOf(e.target.value);
                  setExpandedKey(null);
                }}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-hidden focus:border-primary"
              />
              {asOf !== "" && (
                <Button variant="ghost" size="sm" onClick={() => setAsOf("")}>
                  Hiện tại
                </Button>
              )}
            </div>
            {/* File xuất ĐỦ dòng tồn của kho, không giới hạn 200 dòng như bảng dưới — chạy
                nền qua job export (Task 17), server tự đặt tên file theo mã kho. */}
            {can("stock:export") && selectedWarehouse && (
              <ExportButton
                onClick={() =>
                  startExport("stock", {
                    warehouse_id: selectedWarehouse.id,
                    search: search.trim(),
                    as_of: asOf,
                  })
                }
              />
            )}
          </>
        }
      />

      {viewingPast && (
        <div className="rounded-lg border border-action-warning/30 bg-action-warning/10 px-3 py-2 text-sm text-action-warning">
          Đang xem tồn cuối ngày {asOf.split("-").reverse().join("/")} — số liệu tra cứu, không phản
          ánh tồn hiện tại.
        </div>
      )}

      <ResponsiveList
        items={isLoading ? [] : pivotRows}
        getKey={(r) => r.key}
        loading={isLoading}
        emptyText="Chưa có dữ liệu tồn."
        renderCard={(r) => (
          <ExpandableStockCard
            row={r}
            warehouseId={warehouseId}
            expanded={expandedKey === r.key}
            onToggle={() => setExpandedKey((c) => (c === r.key ? null : r.key))}
            onResolve={handleResolve}
            asOf={asOf}
            readOnly={viewingPast}
          />
        )}
        table={
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <table data-slot="table" className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="w-8" />
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2 text-right">Bán được</th>
                  <th className="px-3 py-2 text-right">Bảo hành</th>
                  <th className="px-3 py-2 text-right">Lỗi</th>
                  <th className="px-3 py-2 text-right">Tổng</th>
                  <th className="px-3 py-2 text-right" title="Số bán trung bình/ngày trong 3 ngày">
                    RR3
                  </th>
                  <th className="px-3 py-2 text-right" title="Số bán trung bình/ngày trong 7 ngày">
                    RR7
                  </th>
                  <th className="px-3 py-2 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td className="px-3 py-3" colSpan={colSpan}>
                      <LogoSpinner label={t("common.loading", "Đang tải...")} className="mx-auto" />
                    </td>
                  </tr>
                )}
                {!isLoading && pivotRows.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={colSpan}>
                      Chưa có dữ liệu tồn.
                    </td>
                  </tr>
                )}
                {pivotRows.map((r) => (
                  <ExpandableStockRow
                    key={r.key}
                    row={r}
                    warehouseId={warehouseId}
                    expanded={expandedKey === r.key}
                    onToggle={() => setExpandedKey((cur) => (cur === r.key ? null : r.key))}
                    onResolve={handleResolve}
                    colSpan={colSpan}
                    asOf={asOf}
                    readOnly={viewingPast}
                  />
                ))}
              </tbody>
            </table>
          </div>
        }
      />

      {resolveTarget && (
        <ResolveStockDialog
          open={resolveTarget !== null}
          onClose={() => setResolveTarget(null)}
          target={resolveTarget}
        />
      )}
    </div>
  );
}
