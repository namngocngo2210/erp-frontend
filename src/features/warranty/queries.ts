import { useMutation } from "@tanstack/react-query";
import { submitWarranty, type WarrantyPayload } from "@/lib/api/warranty";

export function useSubmitWarranty() {
  return useMutation({
    mutationFn: (payload: WarrantyPayload) => submitWarranty(payload),
  });
}
