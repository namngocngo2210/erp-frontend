export type ChannelKiotvietMapping = {
  kiotviet_channel_id: number;
  kiotviet_channel_name?: string;
  external_sale_channel_id: string;
};

export type ChannelRow = {
  id: number;
  code: string;
  name: string;
  owner: string;
  landingpage_source: string[];
  fb_ads_accounts: number[];
  google_ads_accounts: number[];
  is_active: boolean;
  created_at: string;
  department_ids?: number[] | null;
  department_names?: string[] | null;
  assigned_user_count: number;
  assigned_users: string[];
  kiotviet_mappings: ChannelKiotvietMapping[];
  // Loại kênh bán (Shopee/TikTok/Facebook/Web); null = chưa phân loại.
  channel_type?: { id: number; code: string; name: string } | null;
  // Bảng giá gán cho kênh này; null = chưa gán, đơn tạo từ kênh này dùng bảng mặc định.
  price_book?: { id: number; code: string; name: string } | null;
};

export type FbAdAccountOption = {
  id: number;
  name: string;
  account_id: string;
};

export type GoogleAdAccountOption = {
  id: number;
  name: string;
  customer_id: string;
};

export type StaffUser = {
  id: number;
  username: string;
  display_name?: string;
  department_id?: number | null;
};
