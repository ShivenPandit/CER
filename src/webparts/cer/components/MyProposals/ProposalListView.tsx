import React, { useState } from "react";
import {
  Search,
  PlusCircle,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { StatusBadge } from '../Shared/StatusBadge';
import { CategoryBadge } from '../Shared/CategoryBadge';
import { PermissionService } from "../../services/PermissionService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from '../Shared/DataTablePagination';

interface IProposalListViewProps {
  proposals: ICERProposal[];
  currentUser: IAppUser;
  mode: "my" | "all";
  onNavigateToCreate: () => void;
  onNavigateToDisplay?: (cerprno: string) => void;
  onNavigateToChange?: (cerprno: string) => void;
  onNavigateToSubmissions?: (cerProposalId: string) => void;
  onCancel?: () => void;
}

export const ProposalListView: React.FC<IProposalListViewProps> = ({
  proposals,
  currentUser,
  mode,
  onNavigateToCreate,
  onNavigateToDisplay,
  onNavigateToChange,
  onNavigateToSubmissions,
  onCancel,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Filter based on ownership mode first
  const baseProposals = proposals.filter((p) => {
    if (mode === "my") {
      return PermissionService.isProposalOwner(p, currentUser);
    }
    return true;
  });

  // Calculate status KPI counts for quick filters
  const counts = {
    all: baseProposals.length,
    inApproval: baseProposals.filter((p) =>
      ["Pending Approval", "In Approval", "Submitted"].indexOf(p.status) !== -1
    ).length,
    approved: baseProposals.filter((p) => p.status === "Approved").length,
    draft: baseProposals.filter((p) => p.status === "Draft").length,
    revised: baseProposals.filter((p) => p.status === "Revised").length,
  };

  // Filter by status filter and search query
  const filteredProposals = baseProposals.filter((p) => {
    // Status Filter
    if (statusFilter === "IN_APPROVAL") {
      if (["Pending Approval", "In Approval", "Submitted"].indexOf(p.status) === -1) return false;
    } else if (statusFilter === "APPROVED") {
      if (p.status !== "Approved") return false;
    } else if (statusFilter === "DRAFT") {
      if (p.status !== "Draft") return false;
    } else if (statusFilter === "REVISED") {
      if (p.status !== "Revised") return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const idMatch = (p.cer_proposal_id || "").toLowerCase().includes(q);
      const noMatch = (p.proposal_no || "").toLowerCase().includes(q);
      const cerMatch = (p.cerprno || "").toLowerCase().includes(q);
      const nameMatch = (p.pr_name || "").toLowerCase().includes(q);
      const ownerMatch = (p.owname || "").toLowerCase().includes(q);
      const sbuMatch = (p.sbu || "").toLowerCase().includes(q);
      return idMatch || noMatch || cerMatch || nameMatch || ownerMatch || sbuMatch;
    }
    return true;
  });

  // Dynamic Table Pagination
  const pagination = useDynamicPagination({
    totalItems: filteredProposals.length,
    defaultRowHeight: 52,
    bufferBottom: 52,
  });

  const visibleProposals = pagination.paginateItems(filteredProposals);

  const handleRowClick = (prop: ICERProposal) => {
    const targetId = prop.cer_proposal_id || prop.cerprno;
    if (onNavigateToSubmissions) {
      onNavigateToSubmissions(targetId);
    } else if (onNavigateToDisplay) {
      onNavigateToDisplay(prop.cerprno);
    }
  };

  const getInitials = (name?: string): string => {
    if (!name) return "U";
    // Strip parenthesized or bracketed text like "(Microlink)" or "[Contractor]"
    const clean = name.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "").replace(/[^a-zA-Z\s]/g, " ").trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      const alphaOnly = name.replace(/[^a-zA-Z]/g, "");
      return (alphaOnly.substring(0, 2) || "U").toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {mode === "my" ? "My CER Proposals" : "All Capital Expenditure Requests"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {mode === "my"
                ? "Proposals initiated by you or where you are designated as the Project Owner"
                : "Enterprise-wide capital expenditure proposals across all Strategic Business Units"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                pagination.setCurrentPage(1);
              }}
              placeholder="Filter proposals..."
              className="w-full sm:w-64 pl-9 pr-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
            />
          </div>

          {PermissionService.canCreateCER(currentUser) && (
            <button
              onClick={onNavigateToCreate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#012964] hover:bg-[#001f4d] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#012964]/20 transition-all hover:scale-[1.02] shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create CER</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Status Filter Strip - Horizontally scrollable on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        <button
          onClick={() => {
            setStatusFilter("ALL");
            pagination.setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            statusFilter === "ALL"
              ? "bg-[#012964] text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>All</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              statusFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusFilter("IN_APPROVAL");
            pagination.setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            statusFilter === "IN_APPROVAL"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-700 border border-slate-200"
          }`}
        >
          <span>In Approval</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              statusFilter === "IN_APPROVAL" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
            }`}
          >
            {counts.inApproval}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusFilter("APPROVED");
            pagination.setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            statusFilter === "APPROVED"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200"
          }`}
        >
          <span>Approved</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              statusFilter === "APPROVED" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {counts.approved}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusFilter("DRAFT");
            pagination.setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            statusFilter === "DRAFT"
              ? "bg-slate-800 text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>Draft</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              statusFilter === "DRAFT" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {counts.draft}
          </span>
        </button>

        {counts.revised > 0 && (
          <button
            onClick={() => {
              setStatusFilter("REVISED");
              pagination.setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              statusFilter === "REVISED"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-slate-200"
            }`}
          >
            <span>Revised (Rework)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                statusFilter === "REVISED" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
              }`}
            >
              {counts.revised}
            </span>
          </button>
        )}
      </div>

      {/* Main Table Container */}
      <div
        ref={pagination.tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
      >
        {/* Desktop & Tablet Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider select-none">
                <th className="py-3.5 px-4 w-[160px] whitespace-nowrap">Proposal ID</th>
                <th className="py-3.5 px-4 min-w-[220px]">Project Name</th>
                <th className="py-3.5 px-4 min-w-[200px] whitespace-nowrap">Owner</th>
                <th className="py-3.5 px-3 whitespace-nowrap">SBU</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Category</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Amount</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Pending Level</th>
                <th className="py-3.5 px-3 text-right w-12 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                    No proposals found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                visibleProposals.map((prop) => (
                  <tr
                    key={prop.id}
                    onClick={() => handleRowClick(prop)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors group select-none"
                    title="Click to view CER submissions and history"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#012964] group-hover:underline whitespace-nowrap">
                      {prop.cer_proposal_id || prop.cerprno}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-sm text-slate-900">
                      <span
                        className="group-hover:text-[#012964] transition-colors"
                        title={prop.pr_name}
                      >
                        {prop.pr_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-[#012964] font-bold text-[11px] leading-none flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs group-hover:border-[#012964]/40">
                          {getInitials(prop.owname)}
                        </div>
                        <span className="font-medium text-sm text-slate-800" title={prop.owname}>
                          {prop.owname}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        {prop.sbu}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <CategoryBadge category={prop.cat} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-sm text-slate-900 whitespace-nowrap">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <StatusBadge status={prop.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-sm font-medium">
                      {prop.status === "Approved" ? (
                        <span className="text-emerald-700 font-semibold">Approved</span>
                      ) : prop.status === "Rejected" ? (
                        <span className="text-rose-700 font-semibold">Rejected</span>
                      ) : prop.status === "Revised" ? (
                        <span className="text-purple-700 font-semibold">Initiator (Rework)</span>
                      ) : (
                        <span className="text-slate-700">
                          L{prop.current_level} - {prop.pending_with_role}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap w-12">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#012964] group-hover:translate-x-0.5 transition-all inline-block" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Adaptive Cards View (active on < 640px) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {visibleProposals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm px-4">
              No proposals found matching your filter criteria.
            </div>
          ) : (
            visibleProposals.map((prop) => (
              <div
                key={prop.id}
                onClick={() => handleRowClick(prop)}
                className="p-4 space-y-3 hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sm text-[#012964] bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/60 group-hover:underline">
                    {prop.cer_proposal_id || prop.cerprno}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <CategoryBadge category={prop.cat} />
                    <StatusBadge status={prop.status} size="sm" />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-[#012964] transition-colors">
                    {prop.pr_name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-1.5">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-[#012964] font-bold text-[10px] leading-none flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs">
                      {getInitials(prop.owname)}
                    </div>
                    <span>{prop.owname}</span>
                    <span>•</span>
                    <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded">{prop.sbu}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                      Amount
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                      Pending
                    </span>
                    <span className="text-slate-700 text-xs font-medium">
                      {prop.status === "Approved"
                        ? "Approved"
                        : prop.status === "Rejected"
                        ? "Rejected"
                        : prop.status === "Revised"
                        ? "Initiator Rework"
                        : `L${prop.current_level} Review`}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-end text-xs font-semibold text-[#012964] group-hover:underline gap-1">
                  <span>View Submissions</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reusable Dynamic Table Pagination Footer */}
        <DataTablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={filteredProposals.length}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          pageSizeSetting={pagination.pageSizeSetting}
          effectivePageSize={pagination.effectivePageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSizeSetting}
          onPrevPage={pagination.goToPrevPage}
          onNextPage={pagination.goToNextPage}
          onFirstPage={pagination.goToFirstPage}
          onLastPage={pagination.goToLastPage}
          itemName="proposals"
        />
      </div>
    </div>
  );
};
