export interface Company {
  id: string;
  name: string;
  description: string | null;
  status: string;
  issuePrefix: string;
  issueCounter: number;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  requireBoardApprovalForNewAgents: boolean;
  brandColor: string | null;
  hubId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyCreate {
  name: string;
  description?: string;
  issuePrefix?: string;
  budgetMonthlyCents?: number;
  requireBoardApprovalForNewAgents?: boolean;
  brandColor?: string;
  hubId?: string;
}
