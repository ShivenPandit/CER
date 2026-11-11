import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  FileSpreadsheet,
  ArrowUpDown,
  RotateCcw,
  Eye,
  ChevronDown,
  X,
} from "lucide-react";
import { ICERProposal, SBU_OPTIONS, IFieldChoices } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { StatusBadge } from "../Shared/StatusBadge";
import { ExcelExportService } from "../../services/ExcelExportService";
import { ICERDataService } from "../../services/ICERDataService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from "../Shared/DataTablePagination";
import { resolveProposalStageLevel } from "./ReportCharts";

export interface IReportProposalListProps {
  proposals: ICERProposal[];
  currentUser: IAppUser;
  onNavigateToDisplay: (cerprno: string) => void;
  onNavigateToChange?: (cerprno: string) => void;
  onNavigateToSubmissions?: (cerProposalId: string) => void;
  dataService?: ICERDataService;
  fieldChoices?: IFieldChoices;
  searchTerm?: string;
  statusFilter?: string;
  setStatusFilter?: (val: string) => void;
  categoryFilter?: string;
  sbuFilter?: string;
  ownerFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  onResetFilters?: () => void;
}

export const ReportProposalList: React.FC<IReportProposalListProps> = ({
  proposals,
  currentUser,
  onNavigateToDisplay,
  onNavigateToChange,
  onNavigateToSubmissions,
  dataService,
  fieldChoices,
  searchTerm = "",
  statusFilter = "ALL",
  setStatusFilter = () => {},
  categoryFilter = "ALL",
  sbuFilter = "ALL",
  ownerFilter = "",
  dateFrom = "",
  dateTo = "",
  onResetFilters,
}) => {
  // Sorting
  const [sortField, setSortField] = useState<keyof ICERProposal>("created_date");
  const [sortAsc, setSortAsc] = useState(false);

  // Active advanced filter count badge
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== "ALL") count++;
    if (sbuFilter !== "ALL") count++;
    if (ownerFilter.trim()) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [categoryFilter, sbuFilter, ownerFilter, dateFrom, dateTo]);

  // Dataset matching search query and all advanced filters (Category, SBU, Owner, Date Range), BEFORE status pill filtering
  const matchingCriteriaProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Search term (Proposal #, Project Name, Owner, SBU, Initiator)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = (p.cer_proposal_id || "").toLowerCase().includes(query);
        const matchesPropNo = (p.proposal_no || "").toLowerCase().includes(query);
        const matchesCerNo = (p.cerprno || "").toLowerCase().includes(query);
        const matchesName = (p.pr_name || "").toLowerCase().includes(query);
        const matchesOwner = (p.owname || "").toLowerCase().includes(query);
        const matchesSbu = (p.sbu || "").toLowerCase().includes(query);
        const matchesInitiator = (p.created_by || "").toLowerCase().includes(query);
        if (
          !matchesId &&
          !matchesPropNo &&
          !matchesCerNo &&
          !matchesName &&
          !matchesOwner &&
          !matchesSbu &&
          !matchesInitiator
        ) {
          return false;
        }
      }

      // Advanced Filters
      if (categoryFilter !== "ALL" && p.cat !== categoryFilter) return false;
      if (sbuFilter !== "ALL" && p.sbu !== sbuFilter) return false;
      if (ownerFilter.trim() && !p.owname.toLowerCase().includes(ownerFilter.toLowerCase())) {
        return false;
      }
      if (dateFrom && p.st_date < dateFrom) return false;
      if (dateTo && p.com_date > dateTo) return false;

      return true;
    });
  }, [proposals, searchTerm, categoryFilter, sbuFilter, ownerFilter, dateFrom, dateTo]);

  // Status KPI counts dynamically synchronized with active search and advanced filter criteria
  const counts = useMemo(() => {
    return {
      all: matchingCriteriaProposals.length,
      inApproval: matchingCriteriaProposals.filter((p) =>
        ["Pending Approval", "In Approval", "Submitted"].indexOf(p.status) !== -1
      ).length,
      approved: matchingCriteriaProposals.filter((p) => p.status === "Approved").length,
      revised: matchingCriteriaProposals.filter(
        (p) => p.status === "Send Back" || p.status === "Revised" || p.status === "Sent Back"
      ).length,
      rejected: matchingCriteriaProposals.filter((p) => p.status === "Rejected").length,
    };
  }, [matchingCriteriaProposals]);

  // Final filtered dataset applying the selected Status pill
  const filteredProposals = useMemo(() => {
    if (statusFilter === "ALL") return matchingCriteriaProposals;
    return matchingCriteriaProposals.filter((p) => {
      if (statusFilter === "IN_APPROVAL") {
        return ["Pending Approval", "In Approval", "Submitted"].indexOf(p.status) !== -1;
      }
      if (statusFilter === "APPROVED") {
        return p.status === "Approved";
      }
      if (statusFilter === "REVISED" || statusFilter === "SEND_BACK") {
        return p.status === "Send Back" || p.status === "Revised" || p.status === "Sent Back";
      }
      if (statusFilter === "REJECTED") {
        return p.status === "Rejected";
      }
      return true;
    });
  }, [matchingCriteriaProposals, statusFilter]);

  // Sorting logic
  const sortedProposals = useMemo(() => {
    const list = [...filteredProposals];
    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return list;
  }, [filteredProposals, sortField, sortAsc]);

  // Dynamic Table Pagination
  const pagination = useDynamicPagination({
    totalItems: sortedProposals.length,
    defaultRowHeight: 52,
    bufferBottom: 24,
  });

  const visibleProposals = pagination.paginateItems(sortedProposals);

  const handleSort = (field: keyof ICERProposal) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleResetFilters = () => {
    if (onResetFilters) {
      onResetFilters();
    }
    pagination.setCurrentPage(1);
  };

  const handleRowClick = (prop: ICERProposal) => {
    const targetId = prop.cer_proposal_id || prop.cerprno || prop.proposal_no;
    if (onNavigateToDisplay && targetId) {
      onNavigateToDisplay(targetId);
    }
  };

  const getInitials = (name?: string): string => {
    if (!name) return "U";
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

  const truncateProjectName = (name?: string, maxChars: number = 24): string => {
    if (!name) return "";
    const trimmed = name.trim();
    return trimmed.length > maxChars ? `${trimmed.substring(0, maxChars)}...` : trimmed;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 1. KPI Status Filter Strip */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pb-1">
        <button
          onClick={() => {
            setStatusFilter("ALL");
            pagination.setCurrentPage(1);
          }}
          className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
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
          className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
            statusFilter === "IN_APPROVAL"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
          }`}
        >
          <span>In Approval</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              statusFilter === "IN_APPROVAL" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
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
          className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
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

        {counts.revised > 0 && (
          <button
            onClick={() => {
              setStatusFilter("REVISED");
              pagination.setCurrentPage(1);
            }}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
              statusFilter === "REVISED" || statusFilter === "SEND_BACK"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-700 border border-slate-200"
            }`}
          >
            <span>Send Back</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                statusFilter === "REVISED" || statusFilter === "SEND_BACK"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {counts.revised}
            </span>
          </button>
        )}

        {counts.rejected > 0 && (
          <button
            onClick={() => {
              setStatusFilter("REJECTED");
              pagination.setCurrentPage(1);
            }}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
              statusFilter === "REJECTED"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200"
            }`}
          >
            <span>Rejected</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                statusFilter === "REJECTED" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"
              }`}
            >
              {counts.rejected}
            </span>
          </button>
        )}
      </div>

      {/* 3. Proposal Data Table */}
      <div
        ref={pagination.tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
      >
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-slate-500 text-[11px] font-bold uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort("cer_proposal_id")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Proposal ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("pr_name")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Project Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("owname")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>CER Owner</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("sbu")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>SBU</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("created_by")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Initiated By</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-left">
                  <span>Pending Level</span>
                </th>
                <th className="py-3 px-4 text-right">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium text-slate-700">
              {visibleProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">No proposals found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No proposals matched your active search criteria. Try modifying your filters or search term.
                      </p>
                      {(searchTerm ||
                        statusFilter !== "ALL" ||
                        activeAdvancedFilterCount > 0) && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 text-xs font-bold text-[#012964] hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleProposals.map((prop) => {
                  const displayId =
                    prop.cer_proposal_id || prop.cerprno || prop.proposal_no || "—";
                  const isApproved = prop.status === "Approved";
                  const isSendBack =
                    prop.status === "Send Back" ||
                    prop.status === "Revised" ||
                    prop.status === "Sent Back";

                  let pendingLevelDisplay = "—";
                  if (isApproved) {
                    pendingLevelDisplay = "Approved";
                  } else if (isSendBack) {
                    pendingLevelDisplay = "Initiator (Rework)";
                  } else if (prop.status === "Rejected") {
                    pendingLevelDisplay = "Rejected";
                  } else {
                    const lvl = resolveProposalStageLevel(prop);
                    const stageNames: Record<number, string> = {
                      1: "L1 - Finance",
                      2: "L2 - CER Owner",
                      3: "L3 - BU CFO",
                      4: "L4 - BU Director",
                      5: "L5 - VOGL CFO",
                      6: "L6 - VOGL CEO",
                    };
                    const sanitizedRole = prop.pending_with_role
                      ? prop.pending_with_role.replace(/Project Owner/g, "CER Owner")
                      : undefined;
                    pendingLevelDisplay =
                      sanitizedRole ||
                      stageNames[lvl] ||
                      `Level ${lvl}`;
                  }

                  return (
                    <tr
                      key={prop.id || displayId}
                      onClick={() => handleRowClick(prop)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* 1. Proposal ID */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {displayId}
                      </td>

                      {/* 2. Project Name */}
                      <td className="py-3 px-4 text-slate-800" title={prop.pr_name}>
                        {truncateProjectName(prop.pr_name, 28)}
                      </td>

                      {/* 3. CER Owner */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {getInitials(prop.owname)}
                          </span>
                          <span className="truncate max-w-[130px]" title={prop.owname}>
                            {prop.owname || "—"}
                          </span>
                        </div>
                      </td>

                      {/* 4. SBU */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {prop.sbu || "—"}
                        </span>
                      </td>

                      {/* 5. Initiated By */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {getInitials(prop.created_by)}
                          </span>
                          <span className="truncate max-w-[130px]" title={prop.created_by}>
                            {prop.created_by || "—"}
                          </span>
                        </div>
                      </td>

                      {/* 6. Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900">
                        {prop.currency || "USD"} {Number(prop.amount || 0).toLocaleString()}
                      </td>

                      {/* 7. Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={prop.status} size="sm" />
                      </td>

                      {/* 8. Pending Level */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <span
                          className={`font-semibold ${
                            isApproved
                              ? "text-emerald-700"
                              : isSendBack
                              ? "text-amber-700"
                              : prop.status === "Rejected"
                              ? "text-rose-700"
                              : "text-blue-700"
                          }`}
                        >
                          {pendingLevelDisplay}
                        </span>
                      </td>

                      {/* 9. Actions */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleRowClick(prop)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#012964] hover:bg-[#012964]/10 transition cursor-pointer"
                          title="View proposal details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar */}
        <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/50">
          <DataTablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={sortedProposals.length}
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
    </div>
  );
};

