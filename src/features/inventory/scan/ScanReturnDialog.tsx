import { Fragment, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson } from "@/services/http";
import type { WarehouseListResponse } from "@/lib/api/warehouses";
import { useCreateReturn } from "@/features/inventory/returns-queries";
import { useCreatePendingScans } from "@/features/inventory/pending-scans-queries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_VIEWPORT_QUERY } from "@/lib/constants/layout";

import { ScanResultLabel } from "./ScanResultLabel";
import { ScanShipmentInput } from "./ScanShipmentInput";
import type { ScanShipmentInputHandle } from "./ScanShipmentInput";
import { beepError, beepSuccess } from "./scan-sound";
import { isMultiple, lookupByShippingCode } from "./scan-queries";
import {
  addScanRow,
  buildReturnPayloads,
  setReturnLineQuantity,
  unmatchedCodes,
} from "./scan-return-rows";
import { returnScanLookupErrorMessage } from "./scan-lookup-error";
import { validateShippingCode } from "./shipping-code-validation";
import type { ScanReturnRow } from "./scan-return-rows";
import {
  scanRowResultLabel,
  scanConfirmSummary,
  scanConfirmToastLevel,
  PENDING_NOTE_CODE,
} from "./scan-return-result";
import type { ScanRowResult } from "./scan-return-result";
import { CameraScanButton } from "./CameraScanButton";
import { ScanRowCard } from "./scan-mobile-cards";
import { useScannerGun } from "./useScannerGun";
import { ScannerGunBadge } from "./ScannerGunBadge";

type RowResult = ScanRowResult;

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
};

export function ScanReturnDialog({ open, onOpenChange, onDone }: Props) {
  // Dưới 768px bảng đã quét đổi sang thẻ — bảng trong dialog không có vùng cuộn
  // riêng nên cột cuối và nút xoá tràn khỏi thân dialog trên điện thoại.
  const isMobile = useMediaQuery(MOBILE_VIEWPORT_QUERY);
  const [warehouseId, setWarehouseId] = useState("");
  const [rows, setRows] = useState<ScanReturnRow[]>([]);
  const [results, setResults] = useState<Record<string, RowResult>>({});
  const [saving, setSaving] = useState(false);

  const scanRef = useRef<ScanShipmentInputHandle>(null);
  const inFlight = useRef<Set<string>>(new Set());
  // Đợt quét: mọi phiếu/mã chờ khớp tạo trong 1 phiên dialog mang cùng batch id
  // (kể cả xác nhận lại sau lỗi từng phần) — trang Phiếu kho gộp nhóm theo id này.
  const scanBatchIdRef = useRef<string | null>(null);
  const { active: gunActive } = useScannerGun({ enabled: open, onScan: handleScan });

  const { data: whData } = useQuery({
    queryKey: ["warehouses", "list"],
    queryFn: () =>
      fetchJson("/api/warehouses?limit=200&offset=0") as Promise<WarehouseListResponse>,
    staleTime: 60_000,
  });
  const warehouses = whData?.items ?? [];
  const createReturn = useCreateReturn();
  const createPendingScans = useCreatePendingScans();

  // Check trùng chạy BÊN TRONG functional updater của setRows (luôn thấy `prev`
  // mới nhất) thay vì dựa vào biến `rows` đóng gói ở lần render tạo ra pushRow —
  // hai lookup chồng nhau (quét A rồi B trước khi A resolve, cùng resolve trong
  // 1 tick) mà đọc `rows` cũ có thể báo "thêm được" sai cho 1 mã/đơn thực ra đã
  // trùng. flushSync BẮT BUỘC updater chạy đồng bộ để đọc được kết quả ngay bên
  // dưới (cùng pattern với ScanDispatchDialog.pushRow); gộp luôn setResults vào
  // cùng block để 2 update render 1 lần.
  function pushRow(code: string, order: Parameters<typeof addScanRow>[2]) {
    const outcomeBox = { duplicate: false };
    flushSync(() => {
      setRows((prev) => {
        const { rows: nextRows, duplicate } = addScanRow(prev, code, order);
        outcomeBox.duplicate = duplicate;
        return nextRows;
      });
      // Chỉ gỡ kết quả (nếu có) của chính mã đang thêm — GIỮ các dấu ✓ đã tạo
      // trước đó để lần xác nhận sau bỏ qua những dòng đã thành công; mã TRÙNG
      // phải giữ nguyên results (xoá ✓ của dòng đã tạo sẽ khiến lần xác nhận sau
      // POST lặp). Guard đọc được outcomeBox vì updater của `rows` chạy trước
      // (useState khai báo trước → queue xử lý trước trong cùng lượt render).
      setResults((prevRes) => {
        if (outcomeBox.duplicate || !(code in prevRes)) return prevRes;
        const nextRes = { ...prevRes };
        delete nextRes[code];
        return nextRes;
      });
    });
    if (outcomeBox.duplicate) {
      beepError();
      toast.warning(`Mã ${code} (hoặc đơn tương ứng) đã quét rồi.`);
      return;
    }
    if (order === null) {
      beepError();
      toast.warning(`Không tìm thấy đơn cho mã ${code} — đã ghi nhận, khớp đơn sau.`);
    } else {
      beepSuccess();
    }
  }

  async function handleScan(raw: string) {
    const valid = validateShippingCode(raw);
    if (!valid.ok) {
      beepError();
      toast.error(valid.message);
      scanRef.current?.focus();
      return;
    }
    const code = valid.code;
    if (inFlight.current.has(code)) return;
    inFlight.current.add(code);
    try {
      // mode="return_scan": KHÔNG xác minh hủy (đơn hủy thì hàng quay về kho, vẫn
      // phải nhập hoàn được) NHƯNG chặn mã đã có lần nhập hoàn còn sống — 1 mã chỉ
      // bắn được 1 lần, muốn bắn lại phải huỷ lần trước.
      const res = await lookupByShippingCode(code, "return_scan");
      const order = isMultiple(res) ? res.orders[0] : res;
      if (isMultiple(res)) {
        toast.message(`Mã ${code} khớp ${res.orders.length} đơn — lấy đơn đầu:`, {
          description: res.orders.map((o) => o.order_code).join(", "),
        });
        pushRow(code, order);
        return;
      }
      pushRow(code, res);
    } catch (err) {
      // fetchJson gắn `.status` + `.body` (JSON lỗi) vào Error (services/http.ts).
      const status = err instanceof Error ? (err as Error & { status?: number }).status : undefined;
      const errBody = (
        err as Error & {
          body?: { detail?: unknown; note_code?: unknown; pending_scan?: { kind?: string } };
        }
      ).body;
      // Mã đã có lần nhập hoàn còn sống → chặn CỨNG, không thêm dòng. Phải kiểm
      // trước nhánh 404: đây là 409 nên nếu để rơi xuống nhánh chung thì người quét
      // chỉ thấy câu lỗi kỹ thuật, không biết phải huỷ lần bắn trước.
      const duplicateMessage = returnScanLookupErrorMessage(status, errBody, code);
      if (duplicateMessage) {
        beepError();
        toast.error(duplicateMessage);
        return;
      }
      if (status === 404) {
        const body = errBody;
        // Mã có thể đang pending ở kind KHÁC (vd dispatch) — không tính là trùng của
        // dòng trả hàng này, vẫn ghi nhận mã (dòng đỏ) bình thường.
        if (body?.pending_scan?.kind === "return") {
          // Mã đã bắn nhập hoàn từ lượt trước (chờ khớp hoặc đã khớp) — không thêm
          // dòng nữa. Đơn nay không tra được nên không có phiếu để trỏ tới.
          beepError();
          toast.error(
            `Mã ${code} đã được bắn nhập hoàn trước đó — huỷ lần bắn trước nếu muốn bắn lại.`,
          );
        } else {
          // Đơn chưa có trong hệ thống: vẫn ghi nhận mã (dòng đỏ), khớp đơn sau.
          pushRow(code, null);
        }
      } else {
        // 403/500/mạng… — KHÔNG coi là "chưa khớp đơn": báo lỗi, không thêm dòng.
        beepError();
        toast.error(err instanceof Error && err.message ? err.message : "Tra mã thất bại.");
      }
    } finally {
      inFlight.current.delete(code);
      scanRef.current?.focus();
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
      toast.error("Vui lòng chọn kho nhận.");
      return;
    }
    if (rows.length === 0) {
      toast.error("Chưa quét mã nào.");
      return;
    }
    setSaving(true);
    scanBatchIdRef.current ??= crypto.randomUUID();
    const scanBatchId = scanBatchIdRef.current;

    const matched = rows.filter(
      (r): r is Extract<ScanReturnRow, { kind: "matched" }> => r.kind === "matched",
    );
    const unmatched = rows.filter(
      (r): r is Extract<ScanReturnRow, { kind: "unmatched" }> => r.kind === "unmatched",
    );
    // buildReturnPayloads giờ chỉ trả payload cho dòng matched — key theo `code`
    // để vòng lặp bên dưới không lệch index với `matched`.
    const payloadByCode = new Map(
      buildReturnPayloads(matched, Number(warehouseId), scanBatchId).map((p) => [
        p.shipping_code,
        p,
      ]),
    );

    const next: Record<string, RowResult> = { ...results };

    for (const row of matched) {
      // Dòng đã tạo thành công ở lần xác nhận trước → giữ kết quả, không POST lại
      // (tránh tạo phiếu nháp trùng cho đơn đã khớp).
      const prevRes = results[row.code];
      if (prevRes?.ok) {
        next[row.code] = prevRes;
        continue;
      }
      const payload = payloadByCode.get(row.code);
      if (!payload) {
        // Mọi dòng hàng của mã này đã bị hạ về 0 → không có gì để ghi sổ. Báo lỗi
        // rõ ràng thay vì âm thầm bỏ qua (thủ kho tưởng đã nhập hoàn xong).
        next[row.code] = { ok: false, error: "Chưa nhập số lượng hoàn." };
        continue;
      }
      try {
        // Nhóm đơn không có mã riêng — hiển thị mã PHIẾU NGÀY mà nó được thêm vào.
        const entry = await createReturn.mutateAsync(payload);
        next[row.code] = {
          ok: true,
          noteCode: entry.return_note.code,
          posted: entry.status === "posted",
        };
      } catch (err) {
        next[row.code] = {
          ok: false,
          error: err instanceof Error ? err.message : "lỗi",
        };
      }
    }

    // Dòng chưa khớp: gộp 1 batch call sang pending-scans thay vì tạo phiếu trả
    // 0 dòng. Bỏ qua dòng đã ghi nhận thành công ở lần xác nhận trước.
    const unmatchedToSend = unmatched.filter((r) => !results[r.code]?.ok);
    if (unmatchedToSend.length > 0) {
      try {
        const resp = await createPendingScans.mutateAsync({
          kind: "return",
          warehouse_id: Number(warehouseId),
          return_type: "delivery_returned",
          codes: unmatchedCodes(unmatchedToSend),
          scan_batch_id: scanBatchId,
        });
        for (const result of resp.results) {
          next[result.code] = result.ok
            ? { ok: true, noteCode: PENDING_NOTE_CODE }
            : {
                ok: false,
                error:
                  result.reason === "duplicate" ? "đã ghi nhận trước đó" : (result.reason ?? "lỗi"),
              };
        }
      } catch (err) {
        for (const row of unmatchedToSend) {
          next[row.code] = {
            ok: false,
            error: err instanceof Error ? err.message : "lỗi",
          };
        }
      }
    }

    setSaving(false);
    setResults(next);
    const createdCount = matched.filter((r) => next[r.code]?.ok).length;
    const failedCount =
      matched.filter((r) => next[r.code] && !next[r.code].ok).length +
      unmatched.filter((r) => next[r.code] && !next[r.code].ok).length;
    const pendingCount = unmatched.filter((r) => next[r.code]?.ok).length;
    // Mọi đơn hoàn của đợt quét rơi vào cùng 1 phiếu ngày (theo ngày + kho) → lấy mã đầu tiên.
    const noteCode = matched
      .map((r) => next[r.code])
      .find((res) => res?.ok && res.noteCode !== PENDING_NOTE_CODE)?.noteCode;
    const summary = scanConfirmSummary(createdCount, pendingCount, failedCount, noteCode);
    const level = scanConfirmToastLevel(createdCount, pendingCount, failedCount);
    if (level === "error") toast.error(summary);
    else if (level === "warning") toast.warning(summary);
    else toast.success(summary);
    onDone?.();
  }

  function reset() {
    setWarehouseId("");
    setRows([]);
    setResults({});
    scanBatchIdRef.current = null;
  }

  /**
   * Danh sách dòng hàng hoàn của 1 đơn (sửa được số lượng khi hàng về thiếu).
   * Dùng chung cho hàng bung của bảng (desktop) và phần thân thẻ (mobile).
   */
  function returnLines(r: ScanReturnRow, locked: boolean) {
    if (r.kind !== "matched" || r.lines.length === 0) return null;
    return (
      <div className="flex flex-col gap-1">
        {r.lines.map((l) => (
          <div key={l.product_id} className="flex items-center gap-2 text-xs">
            <span className="font-medium text-muted-foreground">{l.sku}</span>
            <span className="min-w-0 flex-1 truncate">{l.name}</span>
            <Input
              type="number"
              min={0}
              max={l.max}
              value={l.quantity}
              disabled={locked}
              aria-label={`Số lượng hoàn ${l.sku}`}
              className="h-7 w-16 text-right text-xs"
              onChange={(e) =>
                setRows((prev) => setReturnLineQuantity(prev, r.code, l.product_id, e.target.value))
              }
            />
            <span className="whitespace-nowrap text-muted-foreground">/ {l.max}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && saving) return; // đang tạo phiếu — chặn đóng để loop khỏi ghi kết quả cũ
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <FormDialogShell
        title="Quét trả hàng (hàng loạt)"
        footer={
          <>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Đóng
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? "Đang tạo..." : `Xác nhận (${rows.length})`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Kho nhận</label>
              <Select
                value={warehouseId}
                onValueChange={(v) => {
                  setWarehouseId(v);
                  scanRef.current?.focus();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn kho nhận" />
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
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-sm text-muted-foreground">Quét mã vận đơn</label>
              <ScannerGunBadge active={gunActive} />
            </div>
            <ScanShipmentInput ref={scanRef} onScan={handleScan} />
            <div className="mt-2">
              <CameraScanButton onScan={handleScan} />
            </div>
          </div>

          {isMobile ? (
            <div className="flex flex-col gap-2">
              {rows.length === 0 ? (
                <p className="rounded-lg border border-border px-3 py-3 text-sm text-muted-foreground">
                  Chưa quét mã nào.
                </p>
              ) : (
                rows.map((r) => {
                  const res = results[r.code];
                  const lines = returnLines(r, Boolean(res?.ok));
                  return (
                    <ScanRowCard
                      key={r.code}
                      code={r.code}
                      unmatched={r.kind === "unmatched"}
                      onRemove={() => removeRow(r.code)}
                      removeLabel={`Xoá ${r.code}`}
                      fields={[
                        { label: "Mã đơn", value: r.kind === "matched" ? r.order.order_code : "—" },
                        {
                          label: "Khách",
                          value: r.kind === "matched" ? r.order.customer_name : "—",
                        },
                        {
                          label: "Kết quả",
                          value: res ? (
                            <ScanResultLabel tone={res.ok ? "ok" : "error"}>
                              {scanRowResultLabel(res)}
                            </ScanResultLabel>
                          ) : (
                            "—"
                          ),
                        },
                      ]}
                    >
                      {lines && (
                        <div className="mt-2 border-t border-dashed border-border/60 pt-2">
                          {lines}
                        </div>
                      )}
                    </ScanRowCard>
                  );
                })
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table data-slot="table" className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Mã vận đơn</th>
                    <th className="px-3 py-2">Mã đơn</th>
                    <th className="px-3 py-2">Khách</th>
                    <th className="px-3 py-2">Kết quả</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground" colSpan={5}>
                        Chưa quét mã nào.
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => {
                    const res = results[r.code];
                    return (
                      <Fragment key={r.code}>
                        <tr
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
                          <td className="px-3 py-2">
                            {r.kind === "matched" ? r.order.order_code : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {r.kind === "matched" ? r.order.customer_name : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {res && (
                              <ScanResultLabel tone={res.ok ? "ok" : "error"}>
                                {scanRowResultLabel(res)}
                              </ScanResultLabel>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => removeRow(r.code)}
                              aria-label={`Xoá ${r.code}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                        {/* Dòng hàng hoàn của đơn — mặc định full, hạ số lượng khi hàng
                          về thiếu (hoàn một phần). SP không về → để 0. */}
                        {r.kind === "matched" && r.lines.length > 0 && (
                          <tr className="border-t border-dashed border-border/60 bg-muted/30">
                            <td colSpan={5} className="px-3 py-1.5">
                              {returnLines(r, Boolean(res?.ok))}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
