import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { ActivityEvent, PaginatedResponse } from "../lib/types";

export function useActivity(companyId: string | undefined, page: number = 1) {
  return useQuery({
    queryKey: ["activity", companyId, page],
    queryFn: () =>
      api.get<PaginatedResponse<ActivityEvent>>(
        `/companies/${companyId}/activity?page=${page}&pageSize=50`
      ),
    enabled: !!companyId,
    staleTime: 15_000,
  });
}

export function useRecentActivity(companyId: string | undefined, limit: number = 10) {
  return useQuery({
    queryKey: ["activity-recent", companyId, limit],
    queryFn: () =>
      api.get<ActivityEvent[]>(
        `/companies/${companyId}/activity/recent?limit=${limit}`
      ),
    enabled: !!companyId,
    refetchInterval: 10_000,
  });
}
