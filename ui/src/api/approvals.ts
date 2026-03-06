import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Approval } from "../lib/types";

export function useApprovals(companyId: string | undefined) {
  return useQuery({
    queryKey: ["approvals", companyId],
    queryFn: () => api.get<Approval[]>(`/companies/${companyId}/approvals`),
    enabled: !!companyId,
    refetchInterval: 15_000,
  });
}

export function usePendingApprovals(companyId: string | undefined) {
  return useQuery({
    queryKey: ["approvals", companyId, "pending"],
    queryFn: () => api.get<Approval[]>(`/companies/${companyId}/approvals?status=pending`),
    enabled: !!companyId,
    refetchInterval: 10_000,
  });
}

export function useResolveApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      id,
      decision,
      reason,
    }: {
      companyId: string;
      id: string;
      decision: "approved" | "rejected";
      reason?: string;
    }) =>
      api.patch<Approval>(`/companies/${companyId}/approvals/${id}`, {
        status: decision,
        reason,
      }),
    onSuccess: (_data, { companyId }) => {
      void qc.invalidateQueries({ queryKey: ["approvals", companyId] });
    },
  });
}
