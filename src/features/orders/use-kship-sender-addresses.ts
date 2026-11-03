import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createKshipSenderAddress,
  deleteKshipSenderAddress,
  updateKshipSenderAddress,
  type KshipSenderAddressInput,
} from "@/lib/api/orders";

/** Mutations CRUD địa chỉ gửi KShip; invalidate mọi query kship-sender-addresses. */
export function useKshipSenderAddressMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["orders", "kship-sender-addresses"] });

  const create = useMutation({
    mutationFn: (body: KshipSenderAddressInput) => createKshipSenderAddress(body),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<KshipSenderAddressInput> }) =>
      updateKshipSenderAddress(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteKshipSenderAddress(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
