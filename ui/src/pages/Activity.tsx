import React, { useState } from "react";
import { useCompanyContext } from "../context/CompanyContext";
import { useActivity } from "../api/activity";
import { ActivityRow } from "../components/ActivityRow";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { SkeletonTable } from "../components/ui/skeleton";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { cn } from "../lib/utils";

const ACTION_TYPES = [
  "all", "created", "updated", "deleted", "started", "completed", "failed",
  "approved", "rejected", "invoked", "heartbeat",
] as const;

type ActionFilter = typeof ACTION_TYPES[number];

export default function Activity() {
  const { companyId } = useCompanyContext();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");

  const { data, isLoading, isFetching } = useActivity(companyId, page);

  const events = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const pageSize = data?.pageSize ?? 50;
  const totalPages = Math.ceil(total / pageSize);

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      !search ||
      e.actorName.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.entityName.toLowerCase().includes(search.toLowerCase()) ||
      (e.detail ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesAction =
      actionFilter === "all" || e.action.toLowerCase().includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#f9fafb]">Activity Log</h2>
          <p className="text-[12px] text-[#6b7280] mt-0.5">
            {total.toLocaleString()} total events
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-64">
          <Input
            icon={<Search size={12} />}
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={11} className="text-[#6b7280]" />
          {ACTION_TYPES.map((action) => (
            <button
              key={action}
              onClick={() => { setActionFilter(action); setPage(1); }}
              className={cn(
                "px-2 py-1 text-[10px] rounded font-medium transition-colors",
                actionFilter === action
                  ? "bg-[#374151] text-[#f9fafb]"
                  : "text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#1f2937]"
              )}
            >
              {action === "all" ? "All" : action}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1f2937] border border-[#374151] rounded-xl overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={10} cols={5} />
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13px] font-medium text-[#9ca3af]">No activity found</p>
            {(search || actionFilter !== "all") && (
              <p className="text-[11px] text-[#6b7280] mt-1">
                Try adjusting your filters
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#6b7280]">
            Page {page} of {totalPages} · {total.toLocaleString()} events
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<ChevronLeft size={12} />}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page <= 3 ? i + 1 : page - 2 + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "w-7 h-7 rounded text-[11px] font-medium transition-colors",
                      page === pageNum
                        ? "bg-[#20808D] text-white"
                        : "text-[#9ca3af] hover:bg-[#374151]"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
            >
              Next
              <ChevronRight size={12} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
