import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { Company } from "../lib/types";

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: () => api.get<Company[]>("/companies"),
    staleTime: 60_000,
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: () => api.get<Company>(`/companies/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}
