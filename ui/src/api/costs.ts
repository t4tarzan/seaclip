import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { CostData } from "../lib/types";

export function useCosts(companyId: string | undefined) {
  return useQuery({
    queryKey: ["costs", companyId],
    queryFn: () => api.get<CostData>(`/companies/${companyId}/costs`),
    enabled: !!companyId,
    staleTime: 60_000,
  });
}

export function useCostsByAgent(companyId: string | undefined) {
  return useQuery({
    queryKey: ["costs-by-agent", companyId],
    queryFn: () => api.get<CostData>(`/companies/${companyId}/costs?groupBy=agent`),
    enabled: !!companyId,
    staleTime: 60_000,
  });
}

export function useCostsHistory(companyId: string | undefined, months: number = 3) {
  return useQuery({
    queryKey: ["costs-history", companyId, months],
    queryFn: () =>
      api.get<CostData[]>(`/companies/${companyId}/costs/history?months=${months}`),
    enabled: !!companyId,
    staleTime: 300_000,
  });
}
