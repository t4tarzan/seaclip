import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useCompanies } from "../api/companies";
import type { Company } from "../lib/types";

interface CompanyContextValue {
  companyId: string | undefined;
  company: Company | undefined;
  companies: Company[];
  setCompanyId: (id: string) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextValue>({
  companyId: undefined,
  company: undefined,
  companies: [],
  setCompanyId: () => {},
  isLoading: true,
});

const STORAGE_KEY = "seaclip:companyId";

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { data: companies = [], isLoading } = useCompanies();
  const [companyId, setCompanyIdState] = useState<string | undefined>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  });

  // Auto-select first company if none selected
  useEffect(() => {
    if (!companyId && companies.length > 0) {
      setCompanyIdState(companies[0].id);
    }
  }, [companies, companyId]);

  const setCompanyId = (id: string) => {
    setCompanyIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const company = useMemo(
    () => companies.find((c) => c.id === companyId),
    [companies, companyId]
  );

  return (
    <CompanyContext.Provider
      value={{ companyId, company, companies, setCompanyId, isLoading }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  return useContext(CompanyContext);
}
