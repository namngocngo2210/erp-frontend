import { keepPreviousData, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getCustomerProfiles,
  getSegmentCategories,
  getChannels,
  getCrmCatalogs,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkDeleteCustomers,
  updateCustomerResaleNote,
  getResaleTracking,
  updateResaleContact,
  updateResaleAppointment,
  createResaleOrderNote,
  getLoyalCustomers,
  getStaffUsers,
  updateLoyalCustomerNote,
  type CustomerProfileListParams,
  type CustomerUpsertPayload,
  type CustomerResaleNotePayload,
  type LoyalCustomerListParams,
  type LoyalCustomerNotePayload,
} from "@/lib/api/customers";

/** Bộ lọc trang Theo dõi resale — trùng tham số của getResaleTracking. */
export type ResaleTrackingParams = Parameters<typeof getResaleTracking>[0];
export type ResaleContactPayload = Parameters<typeof updateResaleContact>[1];
export type ResaleAppointmentPayload = Parameters<typeof updateResaleAppointment>[1];
export type ResaleOrderNotePayload = Parameters<typeof createResaleOrderNote>[1];

export const customerKeys = {
  all: ["customers"] as const,
  profiles: (params: CustomerProfileListParams) => ["customers", "profiles", params] as const,
  segmentCategories: ["customers", "segment-categories"] as const,
  channels: ["customers", "channels"] as const,
  crmCatalogs: ["customers", "crm-catalogs"] as const,
  orders: (customerId: number) => ["customers", "orders", customerId] as const,
  resaleTracking: (params: ResaleTrackingParams) => ["customers", "resale", params] as const,
  loyal: (params: LoyalCustomerListParams) => ["customers", "loyal", params] as const,
  staffUsers: ["customers", "staff-users"] as const,
};

export function useCustomerProfiles(params: CustomerProfileListParams) {
  return useQuery({
    queryKey: customerKeys.profiles(params),
    queryFn: () => getCustomerProfiles(params),
  });
}

export function useSegmentCategories() {
  return useQuery({
    queryKey: customerKeys.segmentCategories,
    queryFn: getSegmentCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes — rarely changes
  });
}

export function useChannels() {
  return useQuery({
    queryKey: customerKeys.channels,
    queryFn: getChannels,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCrmCatalogs() {
  return useQuery({
    queryKey: customerKeys.crmCatalogs,
    queryFn: getCrmCatalogs,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CustomerUpsertPayload) => createCustomer(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CustomerUpsertPayload }) =>
      updateCustomer(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useBulkDeleteCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => bulkDeleteCustomers(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

/**
 * GET /api/customers/resale — bảng theo dõi resale (phân trang/lọc).
 * keepPreviousData: giữ trang cũ hiển thị trong khi tải trang/bộ lọc mới.
 */
export function useResaleTracking(params: ResaleTrackingParams) {
  return useQuery({
    queryKey: customerKeys.resaleTracking(params),
    queryFn: ({ signal }) => getResaleTracking(params, { signal }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Các mutation resale KHÔNG invalidate list: hành vi cũ là vá row tại chỗ từ
 * response (tránh refetch bảng nặng + mất vị trí cuộn). Trang tự setQueryData
 * lên key list hiện tại trong onSuccess của lời gọi mutate.
 */
export function useUpdateResaleContact() {
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: number; payload: ResaleContactPayload }) =>
      updateResaleContact(orderId, payload),
  });
}

export function useUpdateResaleAppointment() {
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: number; payload: ResaleAppointmentPayload }) =>
      updateResaleAppointment(orderId, payload),
  });
}

export function useCreateResaleOrderNote() {
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: number; payload: ResaleOrderNotePayload }) =>
      createResaleOrderNote(orderId, payload),
  });
}

/**
 * GET /api/customers/loyal — bảng khách hàng thân thiết (phân trang/lọc).
 * keepPreviousData: giữ trang cũ hiển thị trong khi tải trang/bộ lọc mới.
 * `enabled`: trang chỉ chạy sau khi đã áp danh mục mặc định (tránh fetch thừa).
 */
export function useLoyalCustomers(
  params: LoyalCustomerListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: customerKeys.loyal(params),
    queryFn: ({ signal }) => getLoyalCustomers(params, { signal }),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/** GET /api/channels/staff — danh sách NV cho dropdown sale phụ trách (ít thay đổi). */
export function useStaffUsers() {
  return useQuery({
    queryKey: customerKeys.staffUsers,
    queryFn: getStaffUsers,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * PATCH /api/customers/loyal/:id/note — KHÔNG invalidate list: hành vi cũ là
 * vá row tại chỗ từ response (trang tự setQueryData lên key list hiện tại).
 */
export function useUpdateLoyalCustomerNote() {
  return useMutation({
    mutationFn: ({
      customerId,
      payload,
    }: {
      customerId: number;
      payload: LoyalCustomerNotePayload;
    }) => updateLoyalCustomerNote(customerId, payload),
  });
}

export function useUpdateCustomerResaleNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CustomerResaleNotePayload }) =>
      updateCustomerResaleNote(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
