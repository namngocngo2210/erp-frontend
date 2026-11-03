import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateOrder } from "@/lib/api/orders";
import type { OrderRow } from "@/features/orders/order-types";
import {
  createContactActivity,
  getContactActivities,
  getContacts,
  type ContactActivityCreatePayload,
  type ContactListParams,
} from "@/lib/api/contacts";
import {
  applyOperationResult,
  editOperationDue,
  getStages,
  setOperationStage,
} from "@/lib/api/contact-flow";

const DEFAULT_ACTIVITIES_PAGE = { limit: 20, offset: 0 };

export const contactKeys = {
  all: ["contacts"] as const,
  list: (params: ContactListParams) => ["contacts", "list", params] as const,
  activities: (customerId: number) => ["contacts", "activities", customerId] as const,
};

/** GET /api/sale/contacts — keepPreviousData giữ trang cũ hiển thị khi tải bộ lọc mới. */
export function useContacts(params: ContactListParams) {
  return useQuery({
    queryKey: contactKeys.list(params),
    queryFn: ({ signal }) => getContacts(params, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** GET /api/sale/contacts/:customerId/activities — chỉ fetch khi đã chọn 1 customer (drawer/panel). */
export function useContactActivities(customerId: number | null) {
  return useQuery({
    queryKey: contactKeys.activities(customerId ?? 0),
    queryFn: () => getContactActivities(customerId!, DEFAULT_ACTIVITIES_PAGE),
    enabled: customerId !== null,
  });
}

/** POST /api/sale/contacts/:customerId/activities — invalidate timeline vừa ghi + list contact. */
export function useCreateContactActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      payload,
    }: {
      customerId: number;
      payload: ContactActivityCreatePayload;
    }) => createContactActivity(customerId, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: contactKeys.activities(variables.customerId) });
      qc.invalidateQueries({ queryKey: ["contacts", "list"] });
    },
  });
}

/**
 * PATCH /api/orders/:id { crm: { sales_status_code } } — ghi "Kết quả" inline
 * từ cột Kết quả của bảng contact (Task 10). Mirror `buildPatchPayload`/
 * `patchOrder` của trang Orders nhưng chỉ gửi đúng field cần đổi. List contact
 * nhỏ nên chấp nhận refetch toàn bộ thay vì cập nhật lạc quan trong cache.
 */
export function useUpdateContactResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, code }: { orderId: number; code: string }) =>
      updateOrder(orderId, { crm: { sales_status_code: code } } as Partial<OrderRow>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}

/**
 * POST /api/contact-flow/customers/:customerId/result — ghi kết quả tác nghiệp
 * (Task S2-3). Đổi bước hiện tại + due_at theo transition cấu hình ở BE, nên
 * invalidate cả list contact (badge cột Tác nghiệp) lẫn timeline (activity mới
 * type=operation). onError để call-site tự toast (mirror useUpdateContactResult).
 */
export function useApplyOperationResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      result_id,
      scheduled_at,
    }: {
      customerId: number;
      result_id: number;
      scheduled_at?: string | null;
    }) => applyOperationResult(customerId, { result_id, scheduled_at }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
      qc.invalidateQueries({ queryKey: contactKeys.activities(variables.customerId) });
    },
  });
}

/**
 * POST /api/contact-flow/customers/:customerId/due — sửa giờ hẹn của bước hiện
 * tại (chỉ khi `operation.allow_edit_due`). Cùng lý do invalidate như trên.
 */
export function useEditOperationDue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, due_at }: { customerId: number; due_at: string }) =>
      editOperationDue(customerId, { due_at }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
      qc.invalidateQueries({ queryKey: contactKeys.activities(variables.customerId) });
    },
  });
}

/**
 * POST /api/contact-flow/customers/:customerId/stage — đặt bước tác nghiệp tay từ
 * dropdown cột Tác nghiệp. Đổi bước có thể kéo khách VÀO flow lần đầu (BE lazy-create
 * state) nên invalidate cả list (badge cột Tác nghiệp + bộ đếm chip) lẫn timeline
 * (activity mới kind=operation, event=set_stage).
 */
export function useSetOperationStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      stage_id,
      due_at,
    }: {
      customerId: number;
      stage_id: number;
      due_at: string;
    }) => setOperationStage(customerId, { stage_id, due_at }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
      qc.invalidateQueries({ queryKey: contactKeys.activities(variables.customerId) });
    },
  });
}

/**
 * GET /api/contact-flow/stages — options cho ô chọn ở cột Tác nghiệp. Danh mục nhỏ,
 * đổi rất ít nên staleTime dài; endpoint đã mở cho section `contacts` (sale không có
 * section contact_flow).
 */
export function useOperationStages() {
  return useQuery({
    queryKey: ["contact-flow", "stages", "contacts-column"],
    queryFn: getStages,
    staleTime: 5 * 60_000,
  });
}
