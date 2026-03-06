import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  issuePrefix: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9]+$/, "Issue prefix must be uppercase letters and numbers only")
    .optional()
    .default("SC"),
  budgetMonthlyCents: z.number().int().min(0).optional().default(0),
  requireBoardApprovalForNewAgents: z.boolean().optional().default(true),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Brand color must be a valid hex color")
    .optional(),
  hubId: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
