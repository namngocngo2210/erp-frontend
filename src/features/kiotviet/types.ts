export type OldSyncBranchPair = {
  source_branch_id: string;
  target_branch_id: string;
};

export type KiotVietChannelRow = {
  id: number;
  name: string;
  branch_id: string;
  branch_ids?: string[];
  old_sync_branch_id?: string;
  old_sync_branch_map?: OldSyncBranchPair[];
  client_id: string;
  client_secret: string;
  retailer: string;
  username?: string;
  password?: string;
  old: boolean;
  /** Mã thuế KiotViet gắn dòng hàng khi đẩy đơn (3 = VAT 8%); null = kênh không áp VAT (HKD). */
  vat_tax_id?: number | null;
  paired_old_channel_id?: number | null;
  paired_old_channel_name?: string | null;
  created_at: string;
};

export type KiotVietPayload = {
  name: string;
  branch_id: string;
  branch_ids: string[];
  old_sync_branch_id?: string;
  old_sync_branch_map?: OldSyncBranchPair[];
  client_id: string;
  client_secret: string;
  retailer: string;
  username?: string;
  password?: string;
  old: boolean;
  vat_tax_id?: number | null;
  paired_old_channel_id?: number | null;
};
