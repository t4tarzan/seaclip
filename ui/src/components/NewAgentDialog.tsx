import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { AgentConfigForm } from "./AgentConfigForm";
import { useCreateAgent } from "../api/agents";
import { useCompanyContext } from "../context/CompanyContext";
import type { Agent } from "../lib/types";

interface NewAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAgentDialog({ open, onOpenChange }: NewAgentDialogProps) {
  const { companyId } = useCompanyContext();
  const createAgent = useCreateAgent();

  const handleSubmit = async (data: Partial<Agent>) => {
    if (!companyId) return;
    await createAgent.mutateAsync({ companyId, data });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Configure a new AI agent to join your edge mesh orchestration network.
          </DialogDescription>
        </DialogHeader>

        <AgentConfigForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          loading={createAgent.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
