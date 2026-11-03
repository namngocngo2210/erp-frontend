import { createContext, useContext } from "react";

import { type ChannelRow, type StaffUser } from "@/features/channels/components/ChannelManagement";
import { type KiotVietChannelRow } from "@/features/kiotviet/components/KiotVietManagement";
import { type Department } from "@/features/users/types";
import { type OrderRow } from "@/features/orders/order-types";
import { type useOrdersData } from "@/features/orders/use-orders-data";
import { type AppSection, type OrdersView } from "@/lib/routes";
import { type LandingTabKey } from "@/pages/OrdersPage";

/**
 * Shape của user mà App giữ. Chỉ khai báo các field shell/pages thực sự dùng.
 * `App.tsx` định nghĩa kiểu `User` đầy đủ; AppShellUser là alias rộng tương thích.
 */
export type AppShellUser = {
  id: number;
  username: string;
  display_name: string;
  avatar_data_url: string;
  allowed_sections: string[];
  permissions?: string[];
  scopes?: Record<string, string>;
  field_policy?: Record<string, Record<string, string>>;
  /** Field đơn user được cấp quyền sửa (RoleFieldGrant section "orders"); `undefined` = payload chưa nạp xong. */
  editable_order_fields?: string[];
  is_superuser?: boolean;
  department?: { id: number; name?: string } | null;
  assigned_channels?: Array<{
    id: number;
    code: string;
    name: string;
    is_active: boolean;
  }>;
};

export type OrderNotification = {
  id: string;
  orderId: number | null;
  content: string;
  timeLabel: string;
  unread: boolean;
};

export type DashboardSummaryLike = unknown;

export type SummaryFilters = {
  dateFrom: string;
  dateTo: string;
};

type OrdersData = ReturnType<typeof useOrdersData>;

/**
 * Mọi state + handler mà App.tsx vốn truyền xuống shell/pages, giờ đi qua context
 * thay vì props. Giữ nguyên ngữ nghĩa: RootLayout dựng shell + điều hướng,
 * App vẫn là nơi giữ state, bootstrap auth và chạy effect loadSectionData.
 */
export type AppShellContextValue = {
  // ── Auth / identity ──────────────────────────────────────────────────────
  user: AppShellUser;
  allowedSections: string[];

  // ── Section / view state (App giữ; RootLayout đồng bộ từ router) ──────────
  section: AppSection;
  setSection: (section: AppSection) => void;
  ordersView: OrdersView;
  setOrdersView: (view: OrdersView) => void;
  landingTab: LandingTabKey;
  setLandingTab: (tab: LandingTabKey) => void;

  // ── Shared data ──────────────────────────────────────────────────────────
  orders: OrdersData;
  channels: ChannelRow[];
  allChannels: Array<{ id: number; code: string; name: string }>;
  kiotVietChannels: KiotVietChannelRow[];
  staffUsers: StaffUser[];
  departments: Department[];
  summary: DashboardSummaryLike;
  summaryLoading: boolean;
  summaryFilters: SummaryFilters;
  standaloneOrder: OrderRow | null;
  standaloneOrderLoading: boolean;

  // ── Auth actions ──────────────────────────────────────────────────────────
  logout: () => Promise<void>;

  // ── Orders actions ────────────────────────────────────────────────────────
  patchOrder: (id: number, payload: Partial<OrderRow>, silent?: boolean) => Promise<void>;
  handleCreateOrder: (payload: Parameters<OrdersData["createOrder"]>[0]) => Promise<void>;
  bulkDeleteOrders: (ids: number[]) => Promise<void>;
  runKiotVietOrderAction: (
    action: Parameters<OrdersData["runKiotVietOrderAction"]>[0],
    ids: number[],
  ) => Promise<void>;
  runKiotVietOrderPrecheck: (
    action: Parameters<OrdersData["runKiotVietOrderPrecheck"]>[0],
    ids: number[],
  ) => ReturnType<OrdersData["runKiotVietOrderPrecheck"]>;
  loadSummary: (options?: { force?: boolean; dateFrom?: string; dateTo?: string }) => Promise<void>;

  // ── Channels actions ──────────────────────────────────────────────────────
  createChannel: (payload: {
    code: string;
    name: string;
    owner: string;
    landingpage_source: string[];
    fb_ads_accounts: number[];
    google_ads_accounts: number[];
    is_active: boolean;
    department_ids?: number[];
    kiotviet_mappings?: Array<{ kiotviet_channel_id: number; external_sale_channel_id: string }>;
    channel_type_id?: number | null;
  }) => Promise<void>;
  updateChannel: (
    id: number,
    payload: {
      name?: string;
      owner?: string;
      landingpage_source?: string[];
      fb_ads_accounts?: number[];
      google_ads_accounts?: number[];
      is_active?: boolean;
      department_ids?: number[];
      kiotviet_mappings?: Array<{ kiotviet_channel_id: number; external_sale_channel_id: string }>;
      channel_type_id?: number | null;
    },
    silent?: boolean,
  ) => Promise<void>;
  bulkDeleteChannels: (ids: number[]) => Promise<void>;
  loadAssignments: (channelId: number) => Promise<StaffUser[]>;
  addAssignment: (channelId: number, userId: number, silent?: boolean) => Promise<StaffUser[]>;
  removeAssignment: (channelId: number, userId: number) => Promise<StaffUser[]>;

  // ── KiotViet channel actions ──────────────────────────────────────────────
  createKiotVietChannel: (payload: {
    name: string;
    branch_id: string;
    branch_ids: string[];
    old_sync_branch_id?: string;
    old_sync_branch_map?: Array<{ source_branch_id: string; target_branch_id: string }>;
    client_id: string;
    client_secret: string;
    retailer: string;
    username?: string;
    password?: string;
    old: boolean;
    paired_old_channel_id?: number | null;
  }) => Promise<void>;
  updateKiotVietChannel: (
    id: number,
    payload: {
      name?: string;
      branch_id?: string;
      branch_ids?: string[];
      old_sync_branch_id?: string;
      old_sync_branch_map?: Array<{ source_branch_id: string; target_branch_id: string }>;
      client_id?: string;
      client_secret?: string;
      retailer?: string;
      username?: string;
      password?: string;
      old?: boolean;
      paired_old_channel_id?: number | null;
    },
  ) => Promise<void>;
  deleteKiotVietChannel: (id: number) => Promise<void>;
  bulkDeleteKiotVietChannels: (ids: number[]) => Promise<void>;

  // ── Admin user / department actions ───────────────────────────────────────
  createAdminUser: (payload: {
    username: string;
    display_name: string;
    role?: string;
    is_active: boolean;
    kiotviet_mappings?: Array<{ kiotviet_channel_id: number; external_kiot_user_id: string }>;
    password: string;
    zenify_email?: string;
    foxia_id?: string;
    department_id?: number | null;
  }) => Promise<boolean>;
  updateAdminUser: (
    id: number,
    payload: {
      display_name?: string;
      role?: string;
      is_active?: boolean;
      kiotviet_mappings?: Array<{ kiotviet_channel_id: number; external_kiot_user_id: string }>;
      password?: string;
      zenify_email?: string;
      foxia_id?: string;
      department_id?: number | null;
    },
    silent?: boolean,
  ) => Promise<boolean>;
  deleteAdminUser: (id: number, silent?: boolean) => Promise<void>;
  createDepartment: (payload: {
    name: string;
    is_active: boolean;
    channel_ids?: number[];
  }) => Promise<void>;
  updateDepartment: (
    id: number,
    payload: {
      name?: string;
      is_active?: boolean;
      channel_ids?: number[];
    },
  ) => Promise<void>;
  deleteDepartment: (id: number) => Promise<void>;
};

export const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell(): AppShellContextValue {
  const value = useContext(AppShellContext);
  if (!value) {
    throw new Error("useAppShell must be used within AppShellContext.Provider");
  }
  return value;
}

/**
 * UI state biến động cao (notifications, sidebar, mobile nav, profile dialog).
 * Tách khỏi {@link AppShellContextValue} để chỉ shell chrome (Sidebar / TopNav /
 * ProfileDialog) re-render khi các state này đổi — pages/grid consume
 * {@link useAppShell} không bị kéo theo.
 */
export type AppUIContextValue = {
  // ── Notifications / shell UI state ────────────────────────────────────────
  notifications: OrderNotification[];
  unreadCount: number;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (updater: (v: boolean) => boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  // ── Profile dialog ────────────────────────────────────────────────────────
  openProfile: boolean;
  setOpenProfile: (open: boolean) => void;
  openProfileModal: () => void;
  profileDisplayName: string;
  profileAvatarDataUrl: string;
  profileSaving: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordSaving: boolean;
  setProfileDisplayName: (v: string) => void;
  setCurrentPassword: (v: string) => void;
  setNewPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  onAvatarPicked: (file: File | null) => void;
  removeAvatar: () => void;
  saveProfile: () => Promise<void>;
  savePassword: () => Promise<void>;
};

export const AppUIContext = createContext<AppUIContextValue | null>(null);

export function useAppUI(): AppUIContextValue {
  const value = useContext(AppUIContext);
  if (!value) {
    throw new Error("useAppUI must be used within AppUIContext.Provider");
  }
  return value;
}
