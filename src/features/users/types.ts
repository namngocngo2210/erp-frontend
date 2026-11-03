export type Department = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  /** Các kênh bán hàng được gán cho phòng ban này. */
  channel_ids?: number[];
  /** Số đội nhóm còn hoạt động của phòng ban (BE tính, đã trừ nhóm xoá mềm). */
  team_count?: number;
};

export type UserKiotvietMapping = {
  kiotviet_channel_id: number;
  kiotviet_channel_name?: string;
  external_kiot_user_id: string;
};

export type AdminUserRow = {
  id: number;
  username: string;
  display_name: string;
  avatar_data_url: string;
  role?: string;
  is_active: boolean;
  department: Department | null;
  allowed_sections: string[];
  kiotviet_mappings: UserKiotvietMapping[];
  /** Email agent Zenify (tổng đài) — rỗng = chưa liên kết. */
  zenify_email?: string;
  /** ID tài khoản Foxia ứng với user — rỗng = chưa liên kết. */
  foxia_id?: string;
  /** Danh sách phòng ban (multi-department) gán cho user; primary đứng đầu. */
  department_ids?: number[];
  /** Danh sách role (RBAC) gán cho user. */
  role_ids?: number[];
  /** Vai trò Media (ads-crm) gán sẵn cho user; rỗng = không có. */
  media_role?: "" | "viewer" | "marketing" | "uploader" | "admin";
  /** Đã có API key Media riêng hay chưa (write-only, không trả giá trị thật). */
  media_api_key_set?: boolean;
  /** Vài ký tự đầu của API key Media riêng, hiển thị thay cho giá trị thật. */
  media_api_key_prefix?: string;
};
