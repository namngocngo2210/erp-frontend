import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateStockDocument,
  useUpdateStockDocument,
} from "@/features/inventory/documents-queries";
import type {
  CreateStockDocumentPayload,
  StockDocumentRow,
} from "@/features/inventory/documents-types";
import type { ImportLine } from "@/features/inventory/import-lines";
import { getProductOptions, type ProductOption } from "@/lib/api/products";
import { ScanShipmentInput } from "@/features/inventory/scan/ScanShipmentInput";
import type { ScanShipmentInputHandle } from "@/features/inventory/scan/ScanShipmentInput";
import { lookupByShippingCode, isMultiple } from "@/features/inventory/scan/scan-queries";
import { beepSuccess, beepError } from "@/features/inventory/scan/scan-sound";
import { mergeOrderItemsIntoLines } from "@/features/inventory/scan/merge-order-lines";
import { useScannerGun } from "@/features/inventory/scan/useScannerGun";
import { ScannerGunBadge } from "@/features/inventory/scan/ScannerGunBadge";

type DocType = "receipt" | "issue" | "adjustment" | "transfer";

type LineForm = { product_id: string; sku: string; name: string; quantity: string };

function useProducts(search: string) {
  // Ô tìm SP của phiếu kho chỉ hiện SKU → payload slim, đi qua tầng api chung.
  return useQuery({
    queryKey: ["products", "options", "search", search],
    queryFn: () => getProductOptions({ limit: 50, offset: 0, q: search }),
    staleTime: 30_000,
    enabled: search.trim().length >= 1,
  });
}

/** ISO (UTC) → chuỗi cho input datetime-local theo giờ địa phương ("YYYY-MM-DDTHH:mm"). */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function nowLocalInput(): string {
  return isoToLocalInput(new Date().toISOString());
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: { id: number; name: string }[];
  initialLines?: ImportLine[];
  editDocument?: StockDocumentRow | null;
};

export function CreateStockDocumentDialog({
  open,
  onOpenChange,
  warehouses,
  initialLines,
  editDocument,
}: Props) {
  const [docType, setDocType] = useState<DocType>("receipt");
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>("");
  const [destWarehouseId, setDestWarehouseId] = useState<string>("");
  const [note, setNote] = useState("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const [lines, setLines] = useState<LineForm[]>([]);
  const [scannedOrderIds, setScannedOrderIds] = useState<number[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const scanRef = useRef<ScanShipmentInputHandle>(null);
  const { active: gunActive } = useScannerGun({ enabled: open, onScan: handleScanCode });

  const { data: productResults } = useProducts(productSearch);
  const createMutation = useCreateStockDocument();
  const updateMutation = useUpdateStockDocument();
  const isEdit = !!editDocument;
  const saving = createMutation.isPending || updateMutation.isPending;

  const needsSource = docType === "issue" || docType === "transfer";
  const needsDest = docType === "receipt" || docType === "adjustment" || docType === "transfer";
  const isTransfer = docType === "transfer";

  // Latest-ref: effect seed dưới đây chủ đích chỉ chạy khi `open` đổi — không
  // re-seed (đè thao tác user) khi editDocument/initialLines đổi identity.
  const editDocumentRef = useRef(editDocument);
  const initialLinesRef = useRef(initialLines);
  useEffect(() => {
    editDocumentRef.current = editDocument;
    initialLinesRef.current = initialLines;
  });

  useEffect(() => {
    if (!open) return;
    const editDocument = editDocumentRef.current;
    const initialLines = initialLinesRef.current;
    if (editDocument) {
      setDocType(editDocument.doc_type);
      setSourceWarehouseId(
        editDocument.source_warehouse ? String(editDocument.source_warehouse) : "",
      );
      setDestWarehouseId(editDocument.dest_warehouse ? String(editDocument.dest_warehouse) : "");
      setNote(editDocument.note ?? "");
      setCreatedAt(
        editDocument.created_at ? isoToLocalInput(editDocument.created_at) : nowLocalInput(),
      );
      setLines(
        editDocument.lines.map((l) => ({
          product_id: String(l.product),
          sku: l.product_sku,
          name: l.product_name,
          quantity: String(l.quantity),
        })),
      );
      setProductSearch("");
      return;
    }
    if (initialLines && initialLines.length > 0) {
      const seeded: LineForm[] = [];
      for (const il of initialLines) {
        const existingIdx = seeded.findIndex((l) => l.product_id === String(il.product_id));
        if (existingIdx >= 0) {
          const existing = seeded[existingIdx];
          seeded[existingIdx] = {
            ...existing,
            quantity: String(Number(existing.quantity) + il.quantity),
          };
        } else {
          seeded.push({
            product_id: String(il.product_id),
            sku: il.sku,
            name: il.name,
            quantity: String(il.quantity),
          });
        }
      }
      setLines(seeded);
      return;
    }
    resetForm();
  }, [open]);

  // Sau khi thêm/gộp dòng, cuộn dòng đó vào tầm nhìn — dialog chỉ hiển thị vài
  // dòng một lúc nên dòng mới ở cuối dễ nằm ngoài vùng thấy (user tưởng thêm hỏng).
  const scrollToLineRef = useRef<string | null>(null);
  useEffect(() => {
    const pid = scrollToLineRef.current;
    if (!pid) return;
    scrollToLineRef.current = null;
    document.querySelector(`[data-line-id="${pid}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [lines]);

  function addProductLine(p: ProductOption) {
    const pid = String(p.id);
    if (lines.some((l) => l.product_id === pid)) {
      setLines((prev) =>
        prev.map((l) =>
          l.product_id === pid ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l,
        ),
      );
      toast.info(`${p.sku} đã có trong phiếu — đã tăng số lượng.`);
    } else {
      setLines((prev) => [...prev, { product_id: pid, sku: p.sku, name: p.name, quantity: "1" }]);
    }
    scrollToLineRef.current = pid;
    setProductSearch("");
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof LineForm, value: string) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  async function handleScanCode(code: string) {
    try {
      // Quét ở đây chỉ để KÉO DÒNG HÀNG của đơn vào phiếu kho thủ công (nhập/xuất/
      // điều chỉnh/chuyển kho, còn phải kế toán duyệt) — KHÔNG phải luồng xuất giao
      // theo đơn. Dùng mode="return" (không verify) để phiếu nhập/điều chỉnh của đơn
      // hủy vẫn tạo được và không dính 503 khi KiotViet lỗi.
      const res = await lookupByShippingCode(code, "return");
      const order = isMultiple(res) ? res.orders[0] : res;
      if (isMultiple(res)) {
        toast.message(`Mã ${code} khớp ${res.orders.length} đơn`, {
          description: res.orders.map((o) => o.order_code).join(", "),
        });
      }
      if (scannedOrderIds.includes(order.order_id)) {
        beepError();
        toast.warning(`Đơn ${order.order_code} đã quét rồi.`);
        return;
      }
      setLines((prev) => mergeOrderItemsIntoLines(prev, order.items));
      setScannedOrderIds((prev) => [...prev, order.order_id]);
      beepSuccess();
    } catch {
      beepError();
      toast.error(`Không tìm thấy đơn cho mã: ${code}`);
    }
  }

  function resetForm() {
    setDocType("receipt");
    setSourceWarehouseId("");
    setDestWarehouseId("");
    setNote("");
    setCreatedAt(nowLocalInput());
    setLines([]);
    setScannedOrderIds([]);
    setProductSearch("");
  }

  async function handleSubmit() {
    const validLines = lines
      .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }))
      .filter((l) => l.product_id > 0 && l.quantity > 0);

    if (validLines.length === 0) {
      toast.error("Phiếu phải có ít nhất 1 dòng hợp lệ.");
      return;
    }
    if (needsSource && !sourceWarehouseId) {
      toast.error("Vui lòng chọn kho xuất.");
      return;
    }
    if (needsDest && !destWarehouseId) {
      toast.error("Vui lòng chọn kho nhập.");
      return;
    }
    if (
      isTransfer &&
      sourceWarehouseId &&
      destWarehouseId &&
      sourceWarehouseId === destWarehouseId
    ) {
      toast.error("Kho xuất và kho nhập không được trùng nhau.");
      return;
    }

    const payload: CreateStockDocumentPayload = {
      doc_type: docType,
      note,
      lines: validLines,
    };
    if (createdAt) {
      payload.created_at = new Date(createdAt).toISOString();
    }
    if (needsSource && sourceWarehouseId) {
      payload.source_warehouse_id = Number(sourceWarehouseId);
    }
    if (needsDest && destWarehouseId) {
      payload.dest_warehouse_id = Number(destWarehouseId);
    }

    try {
      if (editDocument) {
        await updateMutation.mutateAsync({ id: editDocument.id, payload });
        toast.success("Cập nhật phiếu thành công.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Tạo phiếu thành công.");
      }
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : editDocument
            ? "Cập nhật phiếu thất bại."
            : "Tạo phiếu thất bại.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={isEdit ? `Sửa phiếu ${editDocument?.code ?? ""}` : "Tạo phiếu kho"}
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || lines.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo phiếu"}
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          {/* Loại phiếu */}
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Loại phiếu</label>
            <Select
              value={docType}
              onValueChange={(v) => {
                setDocType(v as DocType);
                setSourceWarehouseId("");
                setDestWarehouseId("");
                scanRef.current?.focus();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">Nhập kho</SelectItem>
                <SelectItem value="issue">Xuất kho</SelectItem>
                <SelectItem value="adjustment">Điều chỉnh</SelectItem>
                <SelectItem value="transfer">Chuyển kho</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ngày chứng từ — cũng là ngày nghiệp vụ của bút toán kho: phiếu ghi
              ngày nào thì lên trang Lịch sử nhập xuất đúng ngày đó, không phải
              ngày bấm duyệt. Vì vậy không cho chọn tương lai (backend từ chối). */}
          <div>
            <label
              className="mb-1 block text-sm text-muted-foreground"
              htmlFor="stock-doc-occurred-at"
            >
              Ngày chứng từ
            </label>
            <Input
              id="stock-doc-occurred-at"
              type="datetime-local"
              max={nowLocalInput()}
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ngày hàng thực rời/về kho — quyết định phiếu lên báo cáo ngày nào.
            </p>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Ghi chú</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú (tuỳ chọn)"
            />
          </div>

          {/* Kho xuất (issue / transfer) */}
          {needsSource && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Kho xuất</label>
              <Select
                value={sourceWarehouseId}
                onValueChange={(v) => {
                  setSourceWarehouseId(v);
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
          )}

          {/* Kho nhập (receipt / adjustment / transfer) */}
          {needsDest && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Kho nhập</label>
              <Select
                value={destWarehouseId}
                onValueChange={(v) => {
                  setDestWarehouseId(v);
                  scanRef.current?.focus();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn kho nhập" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isTransfer && destWarehouseId && destWarehouseId === sourceWarehouseId && (
                <p className="mt-1 text-xs text-destructive">Kho nhập phải khác kho xuất.</p>
              )}
            </div>
          )}

          {/* Quét mã */}
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-sm text-muted-foreground">Quét mã</label>
              <ScannerGunBadge active={gunActive} />
            </div>
            <ScanShipmentInput
              ref={scanRef}
              onScan={handleScanCode}
              placeholder="Quét mã vận đơn để thêm sản phẩm…"
            />
          </div>

          {/* Tìm sản phẩm */}
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Tìm sản phẩm (SKU / tên)
            </label>
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Nhập SKU hoặc tên..."
            />
            {productResults && productResults.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto rounded border border-border bg-white text-sm shadow-xs">
                {productResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full px-3 py-1.5 text-left hover:bg-accent"
                    onClick={() => addProductLine(p)}
                  >
                    <span className="font-medium">{p.sku}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dòng hàng — full width */}
          <div className="col-span-full">
            <span className="mb-1 block text-sm text-muted-foreground">
              Dòng hàng ({lines.length})
            </span>
            {lines.length === 0 ? (
              <p className="rounded border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                Tìm và chọn sản phẩm ở trên để thêm dòng.
              </p>
            ) : (
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div
                    key={line.product_id}
                    data-line-id={line.product_id}
                    className="flex items-center gap-2 rounded border border-border px-2 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.sku}</p>
                    </div>
                    <Input
                      className="w-20"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                      placeholder="SL"
                      type="number"
                      min={1}
                      aria-label={`Số lượng ${line.sku}`}
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeLine(idx)}
                      aria-label={`Xoá ${line.sku}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormGrid>
      </FormDialogShell>
    </Dialog>
  );
}
