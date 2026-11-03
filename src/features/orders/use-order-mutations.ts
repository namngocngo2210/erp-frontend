import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrder, updateOrder, deleteOrder } from "@/lib/api/orders";
import { orderKeys } from "@/features/orders/queries";
import type { CreateOrderPayload } from "@/features/orders/use-orders-data";
import type { OrderRow } from "@/features/orders/order-types";

/**
 * Create / update / delete order mutations backed by `lib/api/orders.ts`.
 *
 * Each mutation invalidates the orders list query on success so consumers
 * relying on TanStack Query refetch automatically. Use this in new
 * Query-driven screens; the legacy `useOrdersData` god hook still manages its
 * own in-memory cache and is intentionally not wired to these yet.
 */
export function useOrderMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: orderKeys.lists() });

  const create = useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: (args: { id: number; patch: Partial<OrderRow> }) =>
      updateOrder(args.id, args.patch),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteOrder(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
