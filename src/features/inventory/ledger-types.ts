/**
 * 1 dòng sổ phiếu kho (`/api/inventory/ledger-documents`).
 *
 * Phiếu trả hàng đã rời khỏi sổ này (gỡ UI 2026-07-14) — đơn hoàn theo dõi ở tab
 * Nhập hoàn của Lịch sử nhập xuất.
 */
export type LedgerRow = {
  id: number;
  code: string;
  type: string; // receipt|issue|adjustment|transfer
  type_label: string;
  status: string;
  status_label: string;
  warehouse_label: string;
  has_attachments: boolean;
  created_at: string;
};

export type LedgerResponse = {
  items: LedgerRow[];
  total: number;
  limit: number;
  offset: number;
};

export const STOCK_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "Nháp" },
  { value: "pending_approval", label: "Chờ duyệt" },
  { value: "posted", label: "Đã ghi sổ" },
  { value: "cancelled", label: "Đã huỷ" },
];
