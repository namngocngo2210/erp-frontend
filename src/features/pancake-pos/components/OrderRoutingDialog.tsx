import { useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { routePancakePosOrder, type PancakePosRoutingContext } from "@/lib/api/pancakePos";
import {
  MAX_PARTS,
  defaultWarehouse,
  remainingByProduct,
  singleWarehouseParts,
  splitParts,
  suggestSplit,
  type PartDraft,
} from "@/features/pancake-pos/order-push-logic";
import { pancakePosKeys, usePancakePosOrderRouting } from "@/features/pancake-pos/queries";

type Props = { orderId: number | null; onClose: () => void };

/**
 * "Chọn cách xuất" (two-way-sync §6b): không kho nào đủ hàng cho cả đơn → người điều
 * phối chọn (a) một kho (chuyển kho gom hàng trên Pancake rồi gửi 1 kiện) hoặc (b) tách
 * thành N đơn Pancake, mỗi kiện một kho. Bảng hiện tồn Hàng hoá CRM từng kho.
 */
export function OrderRoutingDialog({ orderId, onClose }: Props) {
  const { t } = useI18n();
  const query = usePancakePosOrderRouting(orderId);
  return (
    <Dialog open={orderId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="panel">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>
            {t("pancakePos.routing.title").replace("{id}", String(orderId ?? ""))}
          </DialogTitle>
          <DialogDescription>{t("pancakePos.routing.description")}</DialogDescription>
        </DialogHeader>
        {query.isLoading && (
          <p className="px-4 py-3 text-muted-foreground">{t("pancakePos.routing.loading")}</p>
        )}
        {query.isError && (
          <p className="px-4 py-3 text-destructive">{t("pancakePos.routing.loadFailed")}</p>
        )}
        {query.data && orderId !== null && (
          // key: mở đơn khác → dựng lại trạng thái soạn từ đầu.
          <RoutingForm key={orderId} orderId={orderId} ctx={query.data} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Mode = "single" | "split";

function RoutingForm({
  orderId,
  ctx,
  onDone,
}: {
  orderId: number;
  ctx: PancakePosRoutingContext;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("single");
  const [single, setSingle] = useState<number | null>(() => defaultWarehouse(ctx));
  const [parts, setParts] = useState<PartDraft[]>(() => suggestSplit(ctx));
  const [saving, setSaving] = useState(false);
  const names = new Map(ctx.warehouses.map((w) => [w.warehouse_id, w.name]));
  const remaining = remainingByProduct(ctx.lines, parts);
  const result = mode === "single" ? singleWarehouseParts(single) : splitParts(ctx.lines, parts);
  const noWarehouses = ctx.warehouses.length === 0;

  const setQty = (index: number, productId: number, value: string) =>
    setParts((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, quantities: { ...p.quantities, [String(productId)]: value } } : p,
      ),
    );

  const submit = async () => {
    if (!result.ok) return;
    setSaving(true);
    try {
      await routePancakePosOrder(orderId, result.parts);
      toast.success(t("pancakePos.routing.saved"));
      await queryClient.invalidateQueries({ queryKey: pancakePosKeys.all });
      onDone();
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.routing.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          {ctx.name || "—"} · {ctx.order_source || "—"}
        </p>
        {noWarehouses && <p className="text-destructive">{t("pancakePos.routing.noWarehouses")}</p>}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pancakePos.routing.sku")}</TableHead>
                <TableHead className="text-right">{t("pancakePos.routing.ordered")}</TableHead>
                {ctx.warehouses.map((w) => (
                  <TableHead key={w.warehouse_id} className="text-right">
                    {w.name || `#${w.warehouse_id}`}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ctx.lines.map((line) => (
                <TableRow key={line.product_id}>
                  <TableCell>
                    <div className="font-medium">{line.sku}</div>
                    <div className="text-xs text-muted-foreground">{line.name}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                  {ctx.warehouses.map((w) => {
                    const stock = w.stock[String(line.product_id)] ?? 0;
                    return (
                      <TableCell
                        key={w.warehouse_id}
                        className={`text-right tabular-nums ${stock < line.quantity ? "text-destructive" : ""}`}
                      >
                        {stock}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} className="text-xs text-muted-foreground">
                  {t("pancakePos.routing.enoughRow")}
                </TableCell>
                {ctx.warehouses.map((w) => (
                  <TableCell key={w.warehouse_id} className="text-right">
                    <StatusBadge tone={w.enough ? "success" : "neutral"}>
                      {w.enough ? t("pancakePos.routing.enough") : t("pancakePos.routing.short")}
                    </StatusBadge>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <fieldset className="space-y-2">
          <legend className="font-medium">{t("pancakePos.routing.how")}</legend>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="ppos-route-mode"
              className="mt-0.5 h-4 w-4 accent-sky-600"
              checked={mode === "single"}
              onChange={() => setMode("single")}
            />
            <span>
              {t("pancakePos.routing.single")}
              <span className="block text-xs text-muted-foreground">
                {t("pancakePos.routing.singleHint")}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="ppos-route-mode"
              className="mt-0.5 h-4 w-4 accent-sky-600"
              checked={mode === "split"}
              onChange={() => setMode("split")}
            />
            <span>
              {t("pancakePos.routing.split")}
              <span className="block text-xs text-muted-foreground">
                {t("pancakePos.routing.splitHint")}
              </span>
            </span>
          </label>
        </fieldset>

        {mode === "single" ? (
          <WarehouseSelect
            ctx={ctx}
            value={single}
            onChange={setSingle}
            label={t("pancakePos.routing.warehouse")}
          />
        ) : (
          <div className="space-y-3">
            {parts.map((part, index) => (
              <div key={index} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {t("pancakePos.routing.part").replace("{n}", String(index + 1))}
                  </span>
                  <WarehouseSelect
                    ctx={ctx}
                    value={part.warehouseId}
                    onChange={(id) =>
                      setParts((prev) =>
                        prev.map((p, i) => (i === index ? { ...p, warehouseId: id } : p)),
                      )
                    }
                    label={t("pancakePos.routing.warehouse")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto"
                    disabled={parts.length <= 1}
                    aria-label={t("pancakePos.routing.removePart")}
                    onClick={() => setParts((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ctx.lines.map((line) => (
                    <label key={line.product_id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate">{line.sku}</span>
                      <Input
                        inputMode="numeric"
                        className="w-20"
                        value={part.quantities[String(line.product_id)] ?? ""}
                        aria-label={`${line.sku} — ${names.get(part.warehouseId ?? 0) ?? ""}`}
                        onChange={(e) => setQty(index, line.product_id, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={parts.length >= MAX_PARTS}
                onClick={() =>
                  setParts((prev) => [
                    ...prev,
                    { warehouseId: ctx.warehouses[0]?.warehouse_id ?? null, quantities: {} },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                {t("pancakePos.routing.addPart")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setParts(suggestSplit(ctx))}
              >
                <Wand2 className="mr-1 h-4 w-4" />
                {t("pancakePos.routing.suggest")}
              </Button>
            </div>
            <ul className="text-xs text-muted-foreground">
              {ctx.lines.map((line) => {
                const left = remaining[String(line.product_id)] ?? 0;
                return (
                  <li key={line.product_id} className={left !== 0 ? "text-destructive" : ""}>
                    {t("pancakePos.routing.remaining")
                      .replace("{sku}", line.sku)
                      .replace("{count}", String(left))}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {!result.ok && !noWarehouses && (
          <p className="text-xs text-destructive">
            {t(`pancakePos.routing.error.${result.error}`)}
          </p>
        )}
      </div>
      <DialogFooter className="border-t px-4 py-3">
        <Button type="button" variant="outline" onClick={onDone}>
          {t("pancakePos.routing.cancel")}
        </Button>
        <Button type="button" disabled={!result.ok || saving} onClick={submit}>
          {mode === "single"
            ? t("pancakePos.routing.submitSingle")
            : t("pancakePos.routing.submitSplit")}
        </Button>
      </DialogFooter>
    </>
  );
}

function WarehouseSelect({
  ctx,
  value,
  onChange,
  label,
}: {
  ctx: PancakePosRoutingContext;
  value: number | null;
  onChange: (id: number) => void;
  label: string;
}) {
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-56" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {ctx.warehouses.map((w) => (
          <SelectItem key={w.warehouse_id} value={String(w.warehouse_id)}>
            {w.name || `#${w.warehouse_id}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
