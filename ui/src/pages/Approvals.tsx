import React, { useState } from "react";
import { useCompanyContext } from "../context/CompanyContext";
import { useApprovals, useResolveApproval } from "../api/approvals";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { SkeletonCard } from "../components/ui/skeleton";
import { timeAgo, truncate } from "../lib/utils";
import { cn } from "../lib/utils";
import type { Approval } from "../lib/types";
import { CheckSquare, Clock, Check, X, AlertTriangle } from "lucide-react";

interface ApprovalCardProps {
  approval: Approval;
  onApprove?: () => void;
  onReject?: () => void;
  isResolving?: boolean;
}

function ApprovalCard({ approval, onApprove, onReject, isResolving }: ApprovalCardProps) {
  const isPending = approval.status === "pending";

  return (
    <div
      className={cn(
        "bg-[#1f2937] border rounded-xl p-4 flex flex-col gap-3",
        isPending ? "border-[#374151]" : "border-[#374151]/50 opacity-70"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              isPending
                ? "bg-[#eab308]/15 border border-[#eab308]/25"
                : approval.status === "approved"
                ? "bg-[#22c55e]/15 border border-[#22c55e]/25"
                : "bg-[#ef4444]/15 border border-[#ef4444]/25"
            )}
          >
            {isPending ? (
              <Clock size={13} className="text-[#eab308]" />
            ) : approval.status === "approved" ? (
              <Check size={13} className="text-[#22c55e]" />
            ) : (
              <X size={13} className="text-[#ef4444]" />
            )}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#f9fafb]">{approval.type}</p>
            <p className="text-[10px] text-[#6b7280]">
              by <span className="text-[#9ca3af]">{approval.requesterName}</span>
              {" · "}
              {timeAgo(approval.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge type="approval" value={approval.status} />
      </div>

      {/* Payload preview */}
      <div className="bg-[#111827] border border-[#374151] rounded-lg p-3">
        <p className="text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
          Payload
        </p>
        <pre className="text-[11px] text-[#9ca3af] overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {truncate(JSON.stringify(approval.payload, null, 2), 400)}
        </pre>
      </div>

      {/* Resolved info */}
      {!isPending && approval.resolvedBy && (
        <div className="text-[11px] text-[#6b7280]">
          {approval.status === "approved" ? "Approved" : "Rejected"} by{" "}
          <span className="text-[#9ca3af]">{approval.resolvedBy}</span>
          {approval.resolvedAt && ` · ${timeAgo(approval.resolvedAt)}`}
          {approval.reason && (
            <span className="block mt-0.5 text-[#9ca3af]">Reason: {approval.reason}</span>
          )}
        </div>
      )}

      {/* Actions */}
      {isPending && onApprove && onReject && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 border border-[#ef4444]/25 text-[#f87171] hover:bg-[#ef4444]/10"
            icon={<X size={11} />}
            onClick={onReject}
            loading={isResolving}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            icon={<Check size={11} />}
            onClick={onApprove}
            loading={isResolving}
          >
            Approve
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Approvals() {
  const { companyId } = useCompanyContext();
  const { data: approvals = [], isLoading } = useApprovals(companyId);
  const resolveApproval = useResolveApproval();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  const handleResolve = async (id: string, decision: "approved" | "rejected") => {
    if (!companyId) return;
    setResolvingId(id);
    try {
      await resolveApproval.mutateAsync({ companyId, id, decision });
    } finally {
      setResolvingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#f9fafb]">Approvals</h2>
          <p className="text-[12px] text-[#6b7280] mt-0.5">
            {pending.length} pending · {resolved.length} resolved
          </p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-1.5 bg-[#eab308]/10 border border-[#eab308]/25 rounded-lg px-3 py-1.5">
            <AlertTriangle size={12} className="text-[#eab308]" />
            <span className="text-[11px] font-semibold text-[#fbbf24]">
              {pending.length} need{pending.length === 1 ? "s" : ""} review
            </span>
          </div>
        )}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pending.length > 0 && (
              <span className="ml-1.5 bg-[#eab308]/20 text-[#fbbf24] text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25 flex items-center justify-center">
                <CheckSquare size={22} className="text-[#22c55e]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#9ca3af]">All caught up!</p>
                <p className="text-[11px] text-[#6b7280] mt-0.5">
                  No pending approvals right now.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-1">
              {pending.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  isResolving={resolvingId === approval.id}
                  onApprove={() => handleResolve(approval.id, "approved")}
                  onReject={() => handleResolve(approval.id, "rejected")}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {resolved.length === 0 ? (
            <div className="text-center py-12 text-[12px] text-[#6b7280]">
              No resolved approvals yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-1">
              {resolved.map((approval) => (
                <ApprovalCard key={approval.id} approval={approval} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
