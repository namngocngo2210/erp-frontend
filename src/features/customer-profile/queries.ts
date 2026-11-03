import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  SEARCH_MIN_LENGTH,
  getCustomerProfile,
  searchCustomers,
  type CustomerProfileResponse,
  type CustomerSearchHit,
} from "@/lib/api/customer-profile";

export const customerProfileKeys = {
  all: ["customer-profile"] as const,
  search: (q: string) => ["customer-profile", "search", q] as const,
  profile: (id: number) => ["customer-profile", "profile", id] as const,
};

/** Ô tìm khách. `enabled` chặn ngay ở client khi chuỗi quá ngắn: backend cũng
 * trả rỗng cho ca đó, nhưng bắn request mỗi lần gõ 1 ký tự là bắn vô ích. */
export function useCustomerSearch(q: string) {
  const term = q.trim();
  return useQuery<CustomerSearchHit[]>({
    queryKey: customerProfileKeys.search(term),
    queryFn: ({ signal }) => searchCustomers(term, signal),
    enabled: term.length >= SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  });
}

/** Hồ sơ của khách đang chọn. `customerId === null` = chưa chọn ai. */
export function useCustomerProfile(customerId: number | null) {
  return useQuery<CustomerProfileResponse>({
    queryKey: customerProfileKeys.profile(customerId ?? 0),
    queryFn: ({ signal }) => getCustomerProfile(customerId as number, signal),
    enabled: customerId !== null,
  });
}
