import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { OrdersTable } from "@/features/orders/OrdersTable";
import { ScanDispatchDialog } from "@/features/inventory/scan/ScanDispatchDialog";
import { OrdersPagination } from "@/features/orders/OrdersPagination";
import { ShipmentsFilterBar } from "@/features/inventory/shipments/ShipmentsFilterBar";
import { SHIPMENT_COLUMNS } from "@/features/inventory/shipments/shipment-columns";
import { useShipments } from "@/features/inventory/shipments/use-shipments";
import type { OrderRow } from "@/features/orders/order-types";
import type { AddressCatalog } from "@/features/orders/use-orders-data";
import { getApiErrorMessage } from "@/lib/errors";
import { useI18n } from "@/i18n";

const NO_OP_ASYNC = async () => {};

// Bộ cột rút gọn không có cột địa chỉ nên catalog rỗng là đủ; tránh plumbing nặng.
const EMPTY_ADDRESS_CATALOG: AddressCatalog = {
  provinces: [],
  districts_by_province: {},
  wards_by_district_key: {},
};

/**
 * Trang Vận đơn (Kho) — ráp lại từ các mảnh đã dựng ở task trước:
 * hook dữ liệu {@link useShipments}, thanh lọc {@link ShipmentsFilterBar},
 * bảng dùng chung {@link OrdersTable} (bộ cột rút gọn {@link SHIPMENT_COLUMNS})
 * và phân trang {@link OrdersPagination}. Chỉ hỗ trợ inline edit cột
 * "Trạng thái vận chuyển thực" — KHÔNG tái dùng các tính năng của trang Đơn hàng
 * (tabs, tạo/nhập đơn, thao tác KiotViet).
 */
export default function ShipmentsPage() {
  const { t } = useI18n();
  const ship = useShipments();
  const [scanOpen, setScanOpen] = useState(false);

  // OrdersTable gọi onPatch dạng fire-and-forget; bọc lại để bắt lỗi và toast
  // thay vì để promise rejection treo. Hook patchOrder không nhận `silent`.
  // Cột inline duy nhất ở đây là "Trạng thái vận chuyển thực" → backend có thể trả
  // 409 (đơn đã hủy) / 503 (chưa xác minh được với KiotViet) kèm `detail` tiếng Việt.
  // Phải hiện NGUYÊN VĂN detail đó, đừng nuốt bằng câu chung chung.
  const handlePatch = useCallback(
    async (id: number, payload: Partial<OrderRow>) => {
      try {
        await ship.patchOrder(id, payload);
      } catch (err) {
        toast.error(
          getApiErrorMessage(err, t("orders.toast.updateFailed", "Cập nhật đơn thất bại")),
        );
      }
    },
    [ship, t],
  );

  const hasNextPage = (ship.page + 1) * ship.pageSize < ship.count;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <ShipmentsFilterBar
          dateFilter={ship.dateFilter}
          onDateFilterChange={ship.setDateFilter}
          status={ship.status}
          onStatusChange={ship.setStatus}
          invoiceStatus={ship.invoiceStatus}
          onInvoiceStatusChange={ship.setInvoiceStatus}
          deliveryBusinessStatus={ship.deliveryBusinessStatus}
          onDeliveryBusinessStatusChange={ship.setDeliveryBusinessStatus}
        />
        <Button size="sm" onClick={() => setScanOpen(true)}>
          Quét xuất kho
        </Button>
      </div>

      <ScanDispatchDialog open={scanOpen} onOpenChange={setScanOpen} onDone={ship.load} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <OrdersTable
          rows={ship.rows}
          visibleColumns={SHIPMENT_COLUMNS}
          lockedColumns={[]}
          onPatch={handlePatch}
          isLoading={ship.loading}
          hideBulkOrderActions
          products={[]}
          kiotvietOptions={[]}
          addressCatalog={EMPTY_ADDRESS_CATALOG}
          channelStaffByCode={{}}
          onDuplicateOrder={NO_OP_ASYNC}
          onBulkDelete={NO_OP_ASYNC}
          onKiotVietAction={NO_OP_ASYNC}
          warehouseOptions={ship.warehouses}
        />

        <OrdersPagination
          rowsCount={ship.rows.length}
          ordersPage={ship.page}
          ordersPageSize={ship.pageSize}
          ordersHasNextPage={hasNextPage}
          ordersTotalCount={ship.count}
          isLoading={ship.loading}
          onPageSizeChange={(value) => ship.setPageSize(Number(value))}
          onPageChange={(page) => ship.setPage(page)}
        />
      </div>
    </div>
  );
}
