import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { DashboardData } from "../lib/types";

export function useDashboard(companyId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", companyId],
    queryFn: () => api.get<DashboardData>(`/companies/${companyId}/dashboard`),
    enabled: !!companyId,
    refetchInterval: 10_000,
  });
}
