export type StockRow = {
  id: number;
  warehouse: number;
  warehouse_code: string;
  warehouse_name: string;
  product: number;
  product_sku: string;
  product_name: string;
  quantity: number;
  state: "sellable" | "warranty" | "defect";
  updated_at: string;
  /** Run-rate bán (chiếc/ngày) 3 ngày gần nhất, theo (kho, mã). */
  rr3: number;
  /** Run-rate bán (chiếc/ngày) 7 ngày gần nhất, theo (kho, mã). */
  rr7: number;
};

export type StockListResponse = {
  items: StockRow[];
  total: number;
  limit: number;
  offset: number;
};

export type ReclassifyFromState = "warranty" | "defect";
export type ReclassifyAction = "to_sellable" | "send_back" | "scrap";

export type ReclassifyPayload = {
  warehouse_id: number;
  product_id: number;
  quantity: number;
  from_state: ReclassifyFromState;
  action: ReclassifyAction;
  note?: string;
};

export type StockMovementRow = {
  id: number;
  warehouse: number;
  warehouse_name: string;
  product: number;
  product_sku: string;
  qty_delta: number;
  movement_type: string;
  state: "sellable" | "warranty" | "defect";
  balance_after: number;
  reference_type: string | null;
  reference_id: number | null;
  reference_label: string | null;
  note: string;
  created_at: string;
};

export type StockMovementListResponse = {
  items: StockMovementRow[];
  total: number;
  limit: number;
  offset: number;
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  receipt: "Nhập kho",
  issue: "Xuất kho",
  adjustment: "Điều chỉnh",
  transfer_in: "Nhập chuyển kho",
  transfer_out: "Xuất chuyển kho",
  sale: "Bán hàng",
  sale_reversal: "Hoàn bán",
  return_in: "Nhập trả hàng",
  reclass_in: "Xử lý (vào)",
  reclass_out: "Xử lý (ra)",
  disposal: "Xuất huỷ",
};

export const STATE_LABELS: Record<StockMovementRow["state"], string> = {
  sellable: "Bán được",
  warranty: "Bảo hành",
  defect: "Lỗi",
};
