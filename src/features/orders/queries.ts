import { useQuery } from "@tanstack/react-query";
import { getCrmCatalogs, getOrderJourneyEvents, listKshipSenderAddresses } from "@/lib/api/orders";

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => ["orders", "list"] as const,
  detail: (id: number) => ["orders", "detail", id] as const,
  crmCatalogs: ["orders", "crm-catalogs"] as const,
  journeyEvents: (id: number) => ["orders", "journey-events", id] as const,
  kshipSenderAddresses: (ids: number[]) => ["orders", "kship-sender-addresses", ...ids] as const,
  kshipNotePresets: ["orders", "kship-note-presets"] as const,
};

/**
 * GET /api/orders/crm-catalogs — CRM rating catalogs (static-ish reference data).
 * Failure is intentionally silent: consumers fall back to local constants.
 */
export function useCrmCatalogs<T>() {
  return useQuery({
    queryKey: orderKeys.crmCatalogs,
    queryFn: () => getCrmCatalogs<T>(),
    staleTime: 5 * 60_000,
  });
}

/**
 * GET /api/orders/:id/journey-events — lịch sử thao tác của 1 đơn.
 * Các list view cố tình không kèm journey events để query nhẹ, nên chỉ fetch khi
 * tab "Lịch sử thao tác" thực sự được mở (`enabled`).
 */
export function useOrderJourneyEvents(id: number | null | undefined, enabled: boolean) {
  const orderId = Number(id ?? 0);
  return useQuery({
    queryKey: orderKeys.journeyEvents(orderId),
    queryFn: () => getOrderJourneyEvents(orderId),
    enabled: enabled && Number.isFinite(orderId) && orderId > 0,
    staleTime: 30_000,
  });
}

/** Danh sách địa chỉ gửi KShip + default_id theo lô đơn. Chỉ fetch khi dialog mở. */
export function useKshipSenderAddresses(ids: number[], enabled: boolean) {
  return useQuery({
    queryKey: orderKeys.kshipSenderAddresses(ids),
    queryFn: () => listKshipSenderAddresses(ids),
    enabled: enabled && ids.length > 0,
    staleTime: 60_000,
  });
}
