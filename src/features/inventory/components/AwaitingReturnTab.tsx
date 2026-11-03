import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { usePermission } from "@/hooks/usePermission";
import { STATUS_LABEL, type AwaitingReturnRow } from "@/lib/api/awaiting-return";

import { useAwaitingReturn, useCloseAwaitingReturn } from "../awaiting-return-queries";
import { CloseAwaitingReturnDialog } from "./CloseAwaitingReturnDialog";
import { FlowNoteCell, Pager } from "./flow-shared";
import { CardActions, CardField, CardFields, MobileCard } from "./mobile-cards";
import { formatDateVi } from "@/lib/format";

/**
 * Đơn đã huỷ nhưng hàng còn ngoài kho.
 *
 * Từ 2026-07-29 huỷ đơn không tự cộng lại tồn nữa — hàng chỉ được cộng khi kho quét
 * nhập hoàn. Tab này là danh sách "hàng đang nợ kho": dòng tự biến mất khi hàng về,
 * hoặc được đóng tay khi xác định hàng không bao giờ về.
 */
export function AwaitingReturnTab({
  warehouseIds,
  pageSize,
}: {
  warehouseIds: string[];
  pageSize: number;
}) {
  const [offset, setOffset] = useState(0);
  const [target, setTarget] = useState<AwaitingReturnRow | null>(null);

  const perm = usePermission();
  const canClose = perm("returns:approve");
  const close = useCloseAwaitingReturn();
  const { data, isLoading } = useAwaitingReturn({
    warehouseIds,
    limit: pageSize,
    offset,
  });

  // Đổi kho / số dòng mỗi trang thì trang hiện tại có thể vượt tổng mới. Dep là
  // CHUỖI id chứ không phải mảng: mảng đổi identity mỗi lần render sẽ reset
  // offset liên tục, người dùng không sang được trang 2.
  const warehouseKey = warehouseIds.join(",");
  useEffect(() => {
    setOffset(0);
  }, [warehouseKey, pageSize]);

  const rows = data?.results ?? [];

  /** Danh sách SKU đang nợ kho — dùng chung cho ô bảng và thẻ. */
  function skuList(row: AwaitingReturnRow) {
    return (
      <ul className="space-y-0.5 text-xs text-muted-foreground">
        {row.lines.map((line) => (
          <li key={line.product_id}>
            {line.sku} × {line.qty}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <ResponsiveList
        items={rows}
        getKey={(row) => row.order_id}
        loading={isLoading}
        emptyText="Không có đơn huỷ nào đang chờ hàng về."
        renderCard={(row) => (
          <MobileCard>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">{row.shipping_code || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {row.invoice_code || row.order_code || "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">{row.days_waiting} ngày</p>
                <p className="text-xs text-muted-foreground">Số ngày chờ</p>
              </div>
            </div>

            <CardFields className="mt-2">
              <CardField label="Khách" value={row.customer_name || "—"} />
              <CardField label="Kho" value={row.warehouse_name} />
              <CardField label="SKU đang nợ" value={skuList(row)} />
              <CardField label="Ngày huỷ" value={formatDateVi(row.cancelled_at)} />
              <CardField label="Trạng thái" value={STATUS_LABEL[row.status]} />
              <CardField
                label="Ghi chú"
                value={
                  <FlowNoteCell
                    targetType="awaiting_return"
                    targetId={row.order_id}
                    note={row.note ?? ""}
                  />
                }
              />
            </CardFields>

            {row.status === "waiting" && canClose && (
              <CardActions>
                <Button size="sm" variant="outline" onClick={() => setTarget(row)}>
                  Đóng
                </Button>
              </CardActions>
            )}
          </MobileCard>
        )}
        table={
          <div className="rounded-lg border border-border overflow-x-auto">
            <table data-slot="table" className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2">Mã vận đơn</th>
                  <th className="whitespace-nowrap px-3 py-2">Mã hoá đơn</th>
                  <th className="whitespace-nowrap px-3 py-2">Khách</th>
                  <th className="whitespace-nowrap px-3 py-2">Kho</th>
                  <th className="whitespace-nowrap px-3 py-2">SKU đang nợ</th>
                  <th className="whitespace-nowrap px-3 py-2">Ngày huỷ</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">Số ngày chờ</th>
                  <th className="whitespace-nowrap px-3 py-2">Trạng thái</th>
                  <th className="whitespace-nowrap px-3 py-2">Ghi chú</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={10}>
                      {isLoading ? (
                        <LogoSpinner label="Đang tải..." className="mx-auto" />
                      ) : (
                        "Không có đơn huỷ nào đang chờ hàng về."
                      )}
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.order_id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{row.shipping_code || "—"}</td>
                    <td className="px-3 py-2">{row.invoice_code || row.order_code || "—"}</td>
                    <td className="px-3 py-2">{row.customer_name || "—"}</td>
                    <td className="px-3 py-2">{row.warehouse_name}</td>
                    <td className="px-3 py-2">{skuList(row)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDateVi(row.cancelled_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {row.days_waiting} ngày
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{STATUS_LABEL[row.status]}</td>
                    <td className="px-3 py-2">
                      <FlowNoteCell
                        targetType="awaiting_return"
                        targetId={row.order_id}
                        note={row.note ?? ""}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {row.status === "waiting" && canClose && (
                        <Button size="sm" variant="outline" onClick={() => setTarget(row)}>
                          Đóng
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      />
      <Pager offset={offset} total={data?.count ?? 0} pageSize={pageSize} onChange={setOffset} />

      <CloseAwaitingReturnDialog
        target={target}
        pending={close.isPending}
        onOpenChange={(open) => !open && setTarget(null)}
        onConfirm={(input) => {
          if (!target) return;
          close.mutate(
            { orderId: target.order_id, ...input },
            { onSuccess: () => setTarget(null) },
          );
        }}
      />
    </>
  );
}
