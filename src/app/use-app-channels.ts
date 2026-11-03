import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type StaffUser } from "@/features/channels/components/ChannelManagement";
import { useI18n } from "@/i18n";
import { type AppSection } from "@/lib/routes";
import { type AuthUser } from "@/hooks/use-auth-bootstrap";
import * as channelsApi from "@/lib/api/channels";
import * as kiotvietApi from "@/lib/api/kiotviet";
import { channelKeys, useAllChannelsQuery, useChannelsQuery } from "@/features/channels/queries";
import { kiotvietKeys, useKiotVietChannelsQuery } from "@/features/kiotviet/queries";
import { useConfirm } from "@/hooks/use-confirm";

/**
 * Mảng rỗng dùng chung làm fallback khi react-query chưa có data (query disabled
 * hoặc đang fetch lần đầu). Phải là reference ổn định ở module-scope — nếu dùng
 * `?? []` inline sẽ tạo mảng mới mỗi render, phá memo identity của `shellValue`.
 */
const EMPTY_LIST: never[] = [];

type UseAppChannelsParams = {
  user: AuthUser | null;
  section: AppSection;
};

/**
 * Data-layer domain "kênh" của App shell: queries kênh nội bộ / kênh KiotViet
 * (gating `enabled` theo section như loadSectionData cũ) + CRUD kênh, gán nhân
 * viên và CRUD kênh KiotViet. Chỉ DI CHUYỂN từ App.tsx — logic giữ nguyên.
 */
export function useAppChannels({ user, section }: UseAppChannelsParams) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // `enabled` reproduces the previous per-section fetch-on-demand gating from
  // loadSectionData: data is fetched only when the active section needs it (not
  // on mount, not later). queryKeys are stable; staleTime = 30s mirrors the old
  // ref-cache TTL. Force-reload after mutations is done via invalidateQueries.
  const isSuperuser = Boolean(user?.is_superuser);
  const isOrderSection =
    section === "orders" || section === "landing-orders" || section === "koc-orders";
  const channelsEnabled =
    Boolean(user) &&
    (isOrderSection ||
      section === "channels" ||
      section === "ads-report" ||
      section === "departments" ||
      section === "kiotviet");
  const allChannelsEnabled = Boolean(user) && isOrderSection;
  const kiotVietChannelsEnabled =
    isSuperuser && (section === "channels" || section === "users" || section === "kiotviet");

  const channelsQuery = useChannelsQuery(channelsEnabled);
  const allChannelsQuery = useAllChannelsQuery(allChannelsEnabled);
  const kiotVietChannelsQuery = useKiotVietChannelsQuery(kiotVietChannelsEnabled);

  const channels = channelsQuery.data ?? EMPTY_LIST;
  const allChannels = allChannelsQuery.data ?? EMPTY_LIST;
  const kiotVietChannels = kiotVietChannelsQuery.data ?? EMPTY_LIST;

  const createChannel = async (payload: channelsApi.CreateChannelPayload) => {
    try {
      await channelsApi.createChannel(payload);
      await queryClient.invalidateQueries({ queryKey: channelKeys.list });
      toast.success(t("app.toast.channelCreateSuccess"));
    } catch {
      toast.error(t("app.toast.channelCreateFailed"));
    }
  };

  const updateChannel = async (
    id: number,
    payload: channelsApi.UpdateChannelPayload,
    silent = false,
  ) => {
    try {
      await channelsApi.updateChannel(id, payload);
      await queryClient.invalidateQueries({ queryKey: channelKeys.list });
      if (!silent) toast.success(t("app.toast.channelUpdateSuccess"));
    } catch {
      if (!silent) toast.error(t("app.toast.channelUpdateFailed"));
    }
  };

  const bulkDeleteChannels = async (ids: number[]) => {
    try {
      const payload = await channelsApi.bulkDeleteChannels(ids);
      await queryClient.invalidateQueries({ queryKey: channelKeys.list });
      const deletedCount =
        typeof payload?.deleted_count === "number" ? payload.deleted_count : ids.length;
      toast.success(
        t("app.toast.channelBulkDeleted", "Deleted {count} channels.").replace(
          "{count}",
          String(deletedCount),
        ),
      );
    } catch {
      toast.error(t("app.toast.channelBulkDeleteFailed"));
      throw new Error("BULK_DELETE_CHANNELS_FAILED");
    }
  };

  const loadAssignments = async (channelId: number): Promise<StaffUser[]> =>
    channelsApi.listAssignments(channelId);

  const addAssignment = async (
    channelId: number,
    userId: number,
    silent = false,
  ): Promise<StaffUser[]> => {
    try {
      const data = await channelsApi.addAssignment(channelId, userId);
      await queryClient.invalidateQueries({ queryKey: channelKeys.list });
      if (!silent) toast.success(t("app.toast.assignmentAdded"));
      return data;
    } catch {
      if (!silent) toast.error(t("app.toast.assignmentAddFailed"));
      return [];
    }
  };

  const removeAssignment = async (channelId: number, userId: number): Promise<StaffUser[]> => {
    try {
      await channelsApi.removeAssignment(channelId, userId);
      const data = await channelsApi.listAssignments(channelId);
      await queryClient.invalidateQueries({ queryKey: channelKeys.list });
      toast.success(t("app.toast.assignmentRemoved"));
      return data;
    } catch {
      toast.error(t("app.toast.assignmentRemoveFailed"));
      return [];
    }
  };

  const createKiotVietChannel = async (payload: kiotvietApi.CreateKiotVietChannelPayload) => {
    try {
      await kiotvietApi.createKiotVietChannel(payload);
      await queryClient.invalidateQueries({ queryKey: kiotvietKeys.channels });
      toast.success(t("app.toast.kiotvietCreateSuccess"));
    } catch {
      toast.error(t("app.toast.kiotvietCreateFailed"));
    }
  };

  const updateKiotVietChannel = async (
    id: number,
    payload: kiotvietApi.UpdateKiotVietChannelPayload,
  ) => {
    try {
      await kiotvietApi.updateKiotVietChannel(id, payload);
      await queryClient.invalidateQueries({ queryKey: kiotvietKeys.channels });
      toast.success(t("app.toast.kiotvietUpdateSuccess"));
    } catch {
      toast.error(t("app.toast.kiotvietUpdateFailed"));
    }
  };

  const deleteKiotVietChannel = async (id: number) => {
    if (!(await confirm({ title: t("app.confirm.deleteKiotviet"), destructive: true }))) return;
    try {
      await kiotvietApi.deleteKiotVietChannel(id);
      await queryClient.invalidateQueries({ queryKey: kiotvietKeys.channels });
      toast.success(t("app.toast.kiotvietDeleteSuccess"));
    } catch {
      toast.error(t("app.toast.kiotvietDeleteFailed"));
    }
  };

  const bulkDeleteKiotVietChannels = async (ids: number[]) => {
    try {
      const payload = await kiotvietApi.bulkDeleteKiotVietChannels(ids);
      await queryClient.invalidateQueries({ queryKey: kiotvietKeys.channels });
      const deletedCount =
        typeof payload?.deleted_count === "number" ? payload.deleted_count : ids.length;
      toast.success(
        t("app.toast.kiotvietBulkDeleted", "Deleted {count} KiotViet channels.").replace(
          "{count}",
          String(deletedCount),
        ),
      );
    } catch {
      toast.error(t("app.toast.kiotvietBulkDeleteFailed"));
      throw new Error("BULK_DELETE_KIOTVIET_FAILED");
    }
  };

  return {
    channels,
    allChannels,
    kiotVietChannels,
    createChannel,
    updateChannel,
    bulkDeleteChannels,
    loadAssignments,
    addAssignment,
    removeAssignment,
    createKiotVietChannel,
    updateKiotVietChannel,
    deleteKiotVietChannel,
    bulkDeleteKiotVietChannels,
  };
}
