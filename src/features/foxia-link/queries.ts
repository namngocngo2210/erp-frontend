import { useQuery } from "@tanstack/react-query";

import { getLinkConfig } from "@/lib/api/foxia-link";

export const foxiaLinkKeys = {
  all: ["foxia-link"] as const,
  grid: ["foxia-link", "grid"] as const,
};

/** GET /api/foxia/link-config — toàn bộ bảng trong một request. */
export function useFoxiaLinkGrid() {
  return useQuery({ queryKey: foxiaLinkKeys.grid, queryFn: getLinkConfig });
}
