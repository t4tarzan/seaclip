import React, { useState } from "react";
import { useCompanyContext } from "../context/CompanyContext";
import { useCompany } from "../api/companies";
import { api } from "../api/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Input, Textarea } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { SkeletonCard } from "../components/ui/skeleton";
import { formatCents } from "../lib/utils";
import { cn } from "../lib/utils";
import {
  Settings as SettingsIcon,
  Building2,
  DollarSign,
  Key,
  Server,
  Save,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1f2937] border border-[#374151] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#374151] flex items-center gap-3">
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-[#20808D]/15 border border-[#20808D]/25 flex items-center justify-center">
            <Icon size={14} className="text-[#20808D]" />
          </div>
        )}
        <div>
          <h3 className="text-[13px] font-semibold text-[#f9fafb]">{title}</h3>
          {description && (
            <p className="text-[11px] text-[#6b7280] mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ApiKeyField({ apiKey }: { apiKey: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 font-mono text-[12px] text-[#9ca3af] overflow-hidden text-ellipsis whitespace-nowrap">
        {visible ? apiKey : apiKey.slice(0, 8) + "•".repeat(24) + apiKey.slice(-4)}
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon={visible ? <EyeOff size={12} /> : <Eye size={12} />}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide API key" : "Show API key"}
      />
      <Button
        variant="ghost"
        size="sm"
        icon={copied ? <Check size={12} className="text-[#22c55e]" /> : <Copy size={12} />}
        onClick={handleCopy}
        aria-label="Copy API key"
      />
    </div>
  );
}

export default function Settings() {
  const { companyId } = useCompanyContext();
  const { data: company, isLoading } = useCompany(companyId);
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (company) {
      setName(company.name);
      setDescription(company.description);
      setBudget(String(company.monthlyBudgetCents / 100));
    }
  }, [company]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSaving(true);
    try {
      await api.patch(`/companies/${companyId}`, {
        name,
        description,
        monthlyBudgetCents: Math.round(parseFloat(budget) * 100),
      });
      await qc.invalidateQueries({ queryKey: ["companies"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-[#6b7280]">Company not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon size={18} className="text-[#20808D]" />
        <div>
          <h2 className="text-[18px] font-bold text-[#f9fafb]">Settings</h2>
          <p className="text-[12px] text-[#6b7280] mt-0.5">Manage your workspace configuration</p>
        </div>
      </div>

      {/* Company Info */}
      <Section
        title="Company Information"
        description="Update your workspace name and description"
        icon={Building2}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Company Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Company"
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of your organization..."
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
              icon={saved ? <Check size={12} /> : <Save size={12} />}
            >
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Section>

      {/* Budget */}
      <Section
        title="Budget Settings"
        description="Configure monthly spend limits for your workspace"
        icon={DollarSign}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Monthly Budget (USD)"
            type="number"
            min="0"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="100.00"
            hint="Agents will be paused when this limit is reached"
          />
          <div className="bg-[#111827] rounded-lg p-3 flex items-center justify-between">
            <span className="text-[11px] text-[#6b7280]">Current monthly limit</span>
            <span className="text-[13px] font-semibold text-[#f9fafb]">
              {formatCents(company.monthlyBudgetCents)}
            </span>
          </div>
        </div>
      </Section>

      {/* API Key */}
      <Section
        title="API Key"
        description="Use this key to authenticate with the SeaClip API"
        icon={Key}
      >
        <div className="flex flex-col gap-3">
          <ApiKeyField apiKey={company.apiKey} />
          <div className="flex items-center gap-2">
            <Badge variant="warning" dot>
              Keep this key secret
            </Badge>
            <span className="text-[11px] text-[#6b7280]">
              Never expose it in client-side code or version control.
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            icon={<RefreshCw size={11} />}
            className="w-fit"
          >
            Rotate API Key
          </Button>
        </div>
      </Section>

      {/* Deployment */}
      <Section
        title="Deployment Mode"
        description="How your SeaClip instance is deployed"
        icon={Server}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {(["cloud", "hybrid", "edge"] as const).map((mode) => (
              <div
                key={mode}
                className={cn(
                  "flex-1 border rounded-lg p-3 text-center cursor-pointer transition-all",
                  company.deploymentMode === mode
                    ? "border-[#20808D] bg-[#20808D]/10"
                    : "border-[#374151] bg-[#111827] opacity-60"
                )}
              >
                <p className="text-[12px] font-semibold text-[#f9fafb] capitalize">{mode}</p>
                <p className="text-[10px] text-[#6b7280] mt-0.5">
                  {mode === "cloud"
                    ? "Fully managed"
                    : mode === "hybrid"
                    ? "Cloud + edge"
                    : "Edge-only"}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#6b7280]">
            Current mode:{" "}
            <span className="text-[#f9fafb] font-semibold capitalize">
              {company.deploymentMode}
            </span>
            . Contact support to change deployment mode.
          </p>
        </div>
      </Section>

      {/* Danger zone */}
      <Section
        title="Danger Zone"
        description="Irreversible actions — proceed with caution"
      >
        <div className="flex flex-col gap-3">
          <div className="border border-[#ef4444]/25 rounded-lg p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold text-[#f9fafb]">Delete Workspace</p>
              <p className="text-[11px] text-[#6b7280] mt-0.5">
                Permanently delete this workspace and all its data.
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
