import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Filter } from "lucide-react";
import { useIssues } from "../api/issues";
import { useCompanyContext } from "../context/CompanyContext";
import { StatusBadge } from "../components/StatusBadge";
import { NewIssueDialog } from "../components/NewIssueDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { SkeletonCard } from "../components/ui/skeleton";
import type { Issue, IssueStatus, IssuePriority } from "../lib/types";
import { cn, timeAgo } from "../lib/utils";

const COLUMNS: { status: IssueStatus; label: string; color: string }[] = [
  { status: "backlog", label: "Backlog", color: "#6b7280" },
  { status: "todo", label: "Todo", color: "#eab308" },
  { status: "in_progress", label: "In Progress", color: "#20808D" },
  { status: "in_review", label: "In Review", color: "#06b6d4" },
  { status: "done", label: "Done", color: "#22c55e" },
];

const PRIORITY_ICONS: Record<IssuePriority, string> = {
  urgent: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

function IssueCard({ issue, onClick }: { issue: Issue; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-[#111827] border border-[#374151] rounded-lg p-3 cursor-pointer hover:border-[#4b5563] hover:bg-[#1a2132] transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[12px] font-medium text-[#f9fafb] leading-snug group-hover:text-white line-clamp-2">
          {issue.title}
        </p>
        <span className="flex-shrink-0 text-[13px]">{PRIORITY_ICONS[issue.priority]}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#6b7280] font-mono">{issue.identifier}</span>
        {issue.projectName && (
          <>
            <span className="text-[#374151]">·</span>
            <span className="text-[10px] text-[#6b7280] truncate">{issue.projectName}</span>
          </>
        )}
        <span className="ml-auto text-[10px] text-[#6b7280]">{timeAgo(issue.updatedAt)}</span>
      </div>
      {issue.assigneeName && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-4 h-4 rounded-full bg-[#20808D]/20 flex items-center justify-center text-[7px] font-bold text-[#20808D]">
            {issue.assigneeName.charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px] text-[#9ca3af]">{issue.assigneeName}</span>
        </div>
      )}
    </div>
  );
}

export default function Issues() {
  const { companyId } = useCompanyContext();
  const navigate = useNavigate();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newIssueStatus, setNewIssueStatus] = useState<IssueStatus>("backlog");
  const [search, setSearch] = useState("");

  const { data: issues = [], isLoading } = useIssues(companyId);

  const filteredIssues = issues.filter((issue) =>
    !search ||
    issue.title.toLowerCase().includes(search.toLowerCase()) ||
    issue.identifier.toLowerCase().includes(search.toLowerCase())
  );

  const issuesByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.status] = filteredIssues.filter((i) => i.status === col.status);
    return acc;
  }, {} as Record<IssueStatus, Issue[]>);

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#f9fafb]">Issues</h2>
          <p className="text-[12px] text-[#6b7280] mt-0.5">
            {issues.length} issue{issues.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Filter size={12} />}>
            Filter
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={12} />}
            onClick={() => { setNewIssueStatus("backlog"); setShowNewDialog(true); }}
          >
            New Issue
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="w-72">
        <Input
          placeholder="Search issues..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex gap-4">
          {COLUMNS.map((col) => (
            <div key={col.status} className="flex-1 min-w-0">
              <SkeletonCard />
              <SkeletonCard className="mt-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map((col) => {
            const colIssues = issuesByStatus[col.status];
            return (
              <div
                key={col.status}
                className="flex flex-col flex-shrink-0 w-72"
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-0.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-[12px] font-semibold text-[#f9fafb]">
                    {col.label}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-[#6b7280] bg-[#1f2937] px-1.5 py-0.5 rounded">
                    {colIssues.length}
                  </span>
                  <button
                    onClick={() => { setNewIssueStatus(col.status); setShowNewDialog(true); }}
                    className="p-1 rounded text-[#6b7280] hover:text-[#f9fafb] hover:bg-[#1f2937] transition-colors"
                    title={`Add to ${col.label}`}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Issues */}
                <div className={cn(
                  "kanban-column",
                  colIssues.length === 0 &&
                    "items-center justify-center rounded-xl border-2 border-dashed border-[#374151] min-h-[120px]"
                )}>
                  {colIssues.length === 0 ? (
                    <p className="text-[11px] text-[#4b5563] text-center">No issues</p>
                  ) : (
                    colIssues.map((issue) => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        onClick={() => navigate(`/issues/${issue.id}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewIssueDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        defaultStatus={newIssueStatus}
      />
    </div>
  );
}
