export type StockDocumentLineRow = {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  quantity: number;
};

export type StockDocumentAttachment = {
  id: number;
  content_type: string;
  original_name: string;
  size_bytes: number;
  uploaded_by_name?: string | null;
  uploaded_at: string;
  file_url: string;
};

export type StockDocumentRow = {
  id: number;
  code: string;
  doc_type: "receipt" | "issue" | "adjustment" | "transfer";
  status: "draft" | "posted" | "cancelled" | "pending_approval";
  source_warehouse: number | null;
  source_warehouse_name: string | null;
  dest_warehouse: number | null;
  dest_warehouse_name: string | null;
  note: string;
  created_at: string;
  posted_at: string | null;
  submitted_by_name?: string | null;
  approved_by_name?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_reason?: string;
  lines: StockDocumentLineRow[];
  attachments: StockDocumentAttachment[];
};

export type StockDocumentListResponse = {
  items: StockDocumentRow[];
  total: number;
  limit: number;
  offset: number;
};

export type CreateStockDocumentPayload = {
  doc_type: "receipt" | "issue" | "adjustment" | "transfer";
  source_warehouse_id?: number | null;
  dest_warehouse_id?: number | null;
  note?: string;
  created_at?: string;
  lines: { product_id: number; quantity: number }[];
};
