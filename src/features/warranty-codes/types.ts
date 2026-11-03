export type BatchStatus = "reserved" | "assigned";

export type WarrantyCodeBatch = {
  id: number;
  batch_code: string;
  start_seq: number;
  end_seq: number;
  start_serial: string;
  end_serial: string;
  quantity: number;
  status: BatchStatus;
  /** Lô lớn sinh mã nền theo chunk — true = còn thiếu mã, khoá gán/tách/xuất. */
  is_generating: boolean;
  generated_count: number;
  product_id: number | null;
  product_name: string | null;
  product_sku: string | null;
  parent_id: number | null;
  created_by_name: string | null;
  assigned_by_name: string | null;
  assigned_at: string | null;
  exported_at: string | null;
  created_at: string;
};

export type WarrantyCodeRow = {
  id: number;
  seq: number;
  serial: string;
  code: string;
  batch_id: number;
  batch_code: string;
  product_id: number | null;
  product_name: string | null;
  product_sku: string | null;
  status: BatchStatus;
  created_at: string;
};

export type BatchListParams = {
  q?: string;
  product_id?: number;
  status?: BatchStatus;
  date_from?: string;
  date_to?: string;
  limit: number;
  offset: number;
};

export type CodeListParams = {
  search?: string;
  product_id?: number;
  batch_id?: number;
  date_from?: string;
  date_to?: string;
  limit: number;
  offset: number;
};

export type ScanLogResult = "activated" | "already_activated" | "not_found" | "viewed";

export type ScanLogChannel = "web" | "zalo_oa";

export type ScanLogRow = {
  id: number;
  keyword: string;
  code_value: string | null;
  serial: string | null;
  product_sku: string | null;
  phone_masked: string | null;
  result: ScanLogResult;
  result_label: string;
  channel: ScanLogChannel;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type ScanLogListParams = {
  keyword?: string;
  ip_address?: string;
  result?: ScanLogResult;
  channel?: ScanLogChannel;
  date_from?: string;
  date_to?: string;
  limit: number;
  offset: number;
};
