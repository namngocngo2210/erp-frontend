import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import { handleApiError } from "@/lib/errors";
import { type AppSection } from "@/lib/routes";
import { DEPARTMENT_ID } from "@/lib/constants/departments";
import { type AuthUser } from "@/hooks/use-auth-bootstrap";
import * as usersApi from "@/lib/api/users";
import { channelKeys, useChannelStaffQuery } from "@/features/channels/queries";
import { userKeys, useDepartmentsQuery } from "@/features/users/queries";

/**
 * Mảng rỗng dùng chung làm fallback khi react-query chưa có data (query disabled
 * hoặc đang fetch lần đầu). Phải là reference ổn định ở module-scope — nếu dùng
 * `?? []` inline sẽ tạo mảng mới mỗi render, phá memo identity của `shellValue`.
 */
const EMPTY_LIST: never[] = [];

type UseAppUsersParams = {
  user: AuthUser | null;
  section: AppSection;
};

/**
 * Data-layer domain "người dùng / phòng ban" của App shell: query nhân viên theo
 * kênh + phòng ban (gating `enabled` theo section) và CRUD admin user / phòng
 * ban. Chỉ DI CHUYỂN từ App.tsx — logic giữ nguyên.
 */
export function useAppUsers({ user, section }: UseAppUsersParams) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const isSuperuser = Boolean(user?.is_superuser);
  const isOrderSection =
    section === "orders" || section === "landing-orders" || section === "koc-orders";
  const staffUsersEnabled =
    Boolean(user) && (isOrderSection || (section === "channels" && isSuperuser));
  // Phòng ban nhân viên hiển thị theo trang (BE scope thay vì FE lọc): trang đơn KOC ->
  // Booking, trang quản lý kênh -> Ads, còn lại (đơn thường/landing) -> Sales.
  const staffDepartmentId =
    section === "koc-orders"
      ? DEPARTMENT_ID.BOOKING
      : section === "channels"
        ? DEPARTMENT_ID.ADS
        : DEPARTMENT_ID.SALES;
  const departmentsEnabled = Boolean(user) && (section === "users" || section === "departments");

  const staffUsersQuery = useChannelStaffQuery(staffUsersEnabled, staffDepartmentId);
  const departmentsQuery = useDepartmentsQuery(departmentsEnabled);

  const staffUsers = staffUsersQuery.data ?? EMPTY_LIST;
  const departments = departmentsQuery.data ?? EMPTY_LIST;

  // Trả về true/false thay vì nuốt lỗi im lặng: form gọi tới cần biết request có
  // thành công không để quyết định đóng dialog hay giữ lại cho admin sửa tiếp.
  const createAdminUser = async (payload: usersApi.CreateAdminUserPayload): Promise<boolean> => {
    try {
      await usersApi.createAdminUser(payload);
      await queryClient.invalidateQueries({ queryKey: userKeys.adminUsers });
      toast.success(t("app.toast.userCreateSuccess"));
      return true;
    } catch (err: unknown) {
      handleApiError(err, { toast: t("app.toast.userCreateFailed"), context: "users.create" });
      return false;
    }
  };

  const updateAdminUser = async (
    id: number,
    payload: usersApi.UpdateAdminUserPayload,
    silent = false,
  ): Promise<boolean> => {
    try {
      await usersApi.updateAdminUser(id, payload);
      await queryClient.invalidateQueries({ queryKey: userKeys.adminUsers });
      if (!silent) toast.success(t("app.toast.userUpdateSuccess"));
      return true;
    } catch (err: unknown) {
      handleApiError(err, {
        toast: silent ? false : t("app.toast.userUpdateFailed"),
        context: "users.update",
      });
      return false;
    }
  };

  const deleteAdminUser = async (id: number, silent = false) => {
    try {
      await usersApi.deleteAdminUser(id);
      await queryClient.invalidateQueries({ queryKey: userKeys.adminUsers });
      if (!silent) toast.success(t("app.toast.userDeleteSuccess"));
    } catch (err: unknown) {
      handleApiError(err, {
        toast: silent ? false : t("app.toast.userDeleteFailed"),
        context: "users.delete",
      });
    }
  };

  const createDepartment = async (payload: usersApi.CreateDepartmentPayload) => {
    await usersApi.createDepartment(payload);
    await queryClient.invalidateQueries({ queryKey: userKeys.departments });
    // Gán kênh làm đổi Channel.department → refresh để form đơn lọc đúng theo phòng ban.
    if (payload.channel_ids !== undefined) {
      await queryClient.invalidateQueries({ queryKey: channelKeys.list });
    }
  };

  const updateDepartment = async (id: number, payload: usersApi.UpdateDepartmentPayload) => {
    await usersApi.updateDepartment(id, payload);
    await queryClient.invalidateQueries({ queryKey: userKeys.departments });
    if (payload.channel_ids !== undefined) {
      await queryClient.invalidateQueries({ queryKey: channelKeys.list });
    }
  };

  const deleteDepartment = async (id: number) => {
    await usersApi.deleteDepartment(id);
    await queryClient.invalidateQueries({ queryKey: userKeys.departments });
  };

  return {
    staffUsers,
    departments,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
