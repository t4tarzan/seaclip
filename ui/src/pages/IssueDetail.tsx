import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit2, ChevronRight } from "lucide-react";
import { useIssue, useUpdateIssue } from "../api/issues";
import { useCompanyContext } from "../context/CompanyContext";
import { StatusBadge } from "../components/StatusBadge";
import { CommentThread } from "../components/CommentThread";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { SkeletonCard } from "../components/ui/skeleton";
import { timeAgo } from "../lib/utils";
import type { IssueStatus, IssuePriority } from "../lib/types";

const STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  backlog: ["todo", "in_progress"],
  todo: ["in_progress", "backlog"],
  in_progress: ["in_review", "todo", "done"],
  in_review: ["done", "in_progress"],
  done: ["in_progress"],
};

const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const PRIORITY_ICONS: Record<IssuePriority, string> = {
  urgent: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const { companyId } = useCompanyContext();
  const navigate = useNavigate();
  const { data: issue, isLoading } = useIssue(companyId, id);
  const updateIssue = useUpdateIssue();

  const handleStatusChange = async (newStatus: IssueStatus) => {
    if (!companyId || !id) return;
    await updateIssue.mutateAsync({ companyId, id, data: { status: newStatus } });
  };

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonCard className="lg:col-span-2" />
        <SkeletonCard />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-[#6b7280]">Issue not found</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate("/issues")}>
          Back to Issues
        </Button>
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[issue.status] ?? [];

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        icon={<ArrowLeft size={12} />}
        onClick={() => navigate("/issues")}
        className="w-fit"
      >
        Issues
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Issue header */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-[#6b7280] font-mono">{issue.identifier}</span>
                  <StatusBadge type="issue" value={issue.status} />
                  <span className="text-[13px]">{PRIORITY_ICONS[issue.priority]}</span>
                  <StatusBadge type="priority" value={issue.priority} />
                </div>
                <h1 className="text-[20px] font-bold text-[#f9fafb] leading-tight">{issue.title}</h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Edit2 size={12} />}
              >
                Edit
              </Button>
            </div>

            {issue.description ? (
              <div className="prose prose-invert max-w-none">
                <p className="text-[13px] text-[#d1d5db] leading-relaxed whitespace-pre-wrap">
                  {issue.description}
                </p>
              </div>
            ) : (
              <p className="text-[12px] text-[#4b5563] italic">No description provided.</p>
            )}
          </div>

          {/* Status transitions */}
          {transitions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#6b7280]">Move to:</span>
              {transitions.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  icon={<ChevronRight size={10} />}
                  onClick={() => handleStatusChange(s)}
                  loading={updateIssue.isPending}
                >
                  {STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
          )}

          {/* Tabs: Comments / Activity */}
          <Tabs defaultValue="comments">
            <TabsList>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="comments">
              <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
                <CommentThread issueId={issue.id} />
              </div>
            </TabsContent>
            <TabsContent value="activity">
              <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#374151] flex items-center justify-center">
                      <span className="text-[9px] text-[#9ca3af]">•</span>
                    </div>
                    <p className="text-[11px] text-[#9ca3af]">
                      Created {timeAgo(issue.createdAt)}
                    </p>
                  </div>
                  {issue.updatedAt !== issue.createdAt && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#374151] flex items-center justify-center">
                        <span className="text-[9px] text-[#9ca3af]">✎</span>
                      </div>
                      <p className="text-[11px] text-[#9ca3af]">
                        Updated {timeAgo(issue.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-3">
          <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4 flex flex-col gap-4">
            <h3 className="text-[12px] font-semibold text-[#f9fafb]">Details</h3>

            <div className="flex flex-col gap-3">
              {[
                { label: "Status", value: <StatusBadge type="issue" value={issue.status} /> },
                { label: "Priority", value: <StatusBadge type="priority" value={issue.priority} /> },
                {
                  label: "Assignee",
                  value: issue.assigneeName ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#20808D]/20 border border-[#20808D]/30 flex items-center justify-center text-[8px] font-bold text-[#20808D]">
                        {issue.assigneeName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[11px] text-[#f9fafb]">{issue.assigneeName}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#6b7280]">Unassigned</span>
                  ),
                },
                {
                  label: "Project",
                  value: <span className="text-[11px] text-[#f9fafb]">{issue.projectName ?? "—"}</span>,
                },
                {
                  label: "Goal",
                  value: <span className="text-[11px] text-[#f9fafb]">{issue.goalName ?? "—"}</span>,
                },
                {
                  label: "Created",
                  value: <span className="text-[11px] text-[#9ca3af]">{timeAgo(issue.createdAt)}</span>,
                },
                {
                  label: "Updated",
                  value: <span className="text-[11px] text-[#9ca3af]">{timeAgo(issue.updatedAt)}</span>,
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#6b7280] flex-shrink-0">{label}</span>
                  <div>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
