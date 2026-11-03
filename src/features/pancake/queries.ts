import { useQuery } from "@tanstack/react-query";

import {
  getConnection,
  listLeads,
  listPages,
  listStaffMaps,
  type PancakeLeadsParams,
} from "@/lib/api/pancake";

export const pancakeKeys = {
  all: ["pancake"] as const,
  connection: ["pancake", "connection"] as const,
  pages: ["pancake", "pages"] as const,
  leads: (params: PancakeLeadsParams) => ["pancake", "leads", params] as const,
  staffMaps: ["pancake", "staff-maps"] as const,
};

export function usePancakeConnection() {
  return useQuery({ queryKey: pancakeKeys.connection, queryFn: getConnection });
}

export function usePancakePages() {
  return useQuery({ queryKey: pancakeKeys.pages, queryFn: listPages });
}

export function usePancakeLeads(params: PancakeLeadsParams) {
  return useQuery({ queryKey: pancakeKeys.leads(params), queryFn: () => listLeads(params) });
}

export function usePancakeStaffMaps() {
  return useQuery({ queryKey: pancakeKeys.staffMaps, queryFn: listStaffMaps });
}
