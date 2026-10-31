import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  FileSpreadsheet,
  ArrowUpDown,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { ICERProposal, SBU_OPTIONS, IFieldChoices } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { StatusBadge } from '../Shared/StatusBadge';
import { CategoryBadge } from '../Shared/CategoryBadge';
import { ExcelExportService } from "../../services/ExcelExportService";
import { ICERDataService } from "../../services/ICERDataService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from '../Shared/DataTablePagination';

interface IReportsViewProps {
  proposals: ICERProposal[];
  currentUser: IAppUser;
  onNavigateToDisplay: (cerprno: string) => void;
  onNavigateToChange: (cerprno: string) => void;
  onNavigateToSubmissions?: (cerProposalId: string) => void;
  dataService?: ICERDataService;
  fieldChoices?: IFieldChoices;
  onCancel?: () => void;
}

export const ReportsView: React.FC<IReportsViewProps> = ({
  proposals,
  currentUser,
  onNavigateToDisplay,
  onNavigateToChange,
  onNavigateToSubmissions,
  dataService,
  fieldChoices,
  onCancel,
}) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sbuFilter, setSbuFilter] = useState<string>("ALL");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusText, setExportStatusText] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<keyof ICERProposal>("created_date");
  const [sortAsc, setSortAsc] = useState(false);

  // Filter logic
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Search term (Proposal # or Project Name)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = (p.cer_proposal_id || "").toLowerCase().includes(query);
        const matchesPropNo = (p.proposal_no || "").toLowerCase().includes(query);
        const matchesCerNo = p.cerprno.toLowerCase().includes(query);
        const matchesName = p.pr_name.toLowerCase().includes(query);
        if (!matchesId && !matchesPropNo && !matchesCerNo && !matchesName) return false;
      }

      // Status
      if (statusFilter !== "ALL") {
        const filterVal = statusFilter.toLowerCase().trim();
        const propStatus = (p.status || "").toLowerCase().trim();
        if (filterVal === "in approval" || filterVal === "approval") {
          if (propStatus !== "in approval" && propStatus !== "approval") return false;
        } else if (propStatus !== filterVal) {
          return false;
        }
      }

      // Category
      if (categoryFilter !== "ALL" && p.cat !== categoryFilter) return false;

      // SBU
      if (sbuFilter !== "ALL" && p.sbu !== sbuFilter) return false;

      // Owner
      if (ownerFilter.trim() && !p.owname.toLowerCase().includes(ownerFilter.toLowerCase())) {
        return false;
      }

      // Date Range
      if (dateFrom && p.st_date < dateFrom) return false;
      if (dateTo && p.com_date > dateTo) return false;

      return true;
    });
  }, [proposals, searchTerm, statusFilter, categoryFilter, sbuFilter, ownerFilter, dateFrom, dateTo]);

  // Canonical Workflow Status Options: In Approval, Approved, Draft, Rejected, Revised
  const statusOptions = useMemo(() => {
    const standard = ["In Approval", "Approved", "Draft", "Rejected", "Revised"];
    const set = new Set<string>(standard);
    if (fieldChoices?.status && Array.isArray(fieldChoices.status)) {
      fieldChoices.status.forEach((st) => {
        const normalized = st === "Approval" ? "In Approval" : st.trim();
        if (normalized) {
          set.add(normalized);
        }
      });
    }
    return Array.from(set);
  }, [fieldChoices?.status]);

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

  // Fully Automatic Dynamic Table Pagination
  const pagination = useDynamicPagination({
    totalItems: sortedProposals.length,
    defaultRowHeight: 46,
    bufferBottom: 52,
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
    setSearchTerm("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setSbuFilter("ALL");
    setOwnerFilter("");
    setDateFrom("");
    setDateTo("");
    pagination.setCurrentPage(1);
  };

  const handleRowClick = (prop: ICERProposal) => {
    const targetId = prop.cer_proposal_id || prop.cerprno;
    if (onNavigateToSubmissions) {
      onNavigateToSubmissions(targetId);
    } else {
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

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      setExportStatusText("Initializing export...");
      if (dataService) {
        await ExcelExportService.exportAllMatchingProposalsAsync(
          dataService,
          {
            searchTerm,
            status: statusFilter,
            category: categoryFilter,
            sbu: sbuFilter,
            owner: ownerFilter,
            dateFrom,
            dateTo,
          },
          "CERProposals_Report",
          (statusMsg) => setExportStatusText(statusMsg),
        );
      } else {
        await ExcelExportService.exportProposalListAsync(sortedProposals, "CERProposals_Report");
      }
    } catch (err: any) {
      alert("Error exporting Excel: " + (err?.message || String(err)));
    } finally {
      setIsExporting(false);
      setExportStatusText("");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* View Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              CER Proposal Reports & Strategic Analytics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Form FR-04: Multi-parameter query, audit-grade tabular views, and Excel spreadsheet export
            </p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={(sortedProposals.length === 0 && !dataService) || isExporting}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{isExporting ? (exportStatusText || "Exporting...") : `Export to Excel (${sortedProposals.length})`}</span>
        </button>
      </div>

      {/* Responsive Filter Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Search & Filter Criteria</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3 text-xs">
          {/* Search Term */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Proposal / Project
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  pagination.setCurrentPage(1);
                }}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Workflow Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                pagination.setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            >
              <option value="ALL">All Statuses</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                pagination.setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            >
              <option value="ALL">All Categories</option>
              {(fieldChoices?.cat && fieldChoices.cat.length > 0
                ? fieldChoices.cat
                : ["Vital", "Essential", "Desirable"]
              ).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* SBU Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              SBU
            </label>
            <select
              value={sbuFilter}
              onChange={(e) => {
                setSbuFilter(e.target.value);
                pagination.setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            >
              <option value="ALL">All SBUs</option>
              {(fieldChoices?.sbu && fieldChoices.sbu.length > 0
                ? fieldChoices.sbu
                : SBU_OPTIONS
              ).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Owner Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              CER Owner
            </label>
            <input
              type="text"
              value={ownerFilter}
              onChange={(e) => {
                setOwnerFilter(e.target.value);
                pagination.setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Start Date From */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Start Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                pagination.setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Completion Date To */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Completion Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                pagination.setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Results Container */}
      <div
        ref={pagination.tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
      >
        {/* Desktop / Tablet Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider select-none">
                <th
                  onClick={() => handleSort("cerprno")}
                  className="py-3.5 px-4 w-[160px] cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Proposal ID</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("pr_name")}
                  className="py-3.5 px-4 min-w-[220px] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Project Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 min-w-[200px] whitespace-nowrap">Owner</th>
                <th className="py-3.5 px-3 whitespace-nowrap">SBU</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Category</th>
                <th
                  onClick={() => handleSort("amount")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Stage / Approver</th>
                <th className="py-3.5 px-3 text-right w-12 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                    No proposals found matching the selected criteria.
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
                      <span className="group-hover:text-[#012964] transition-colors" title={prop.pr_name}>
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
                        <span className="text-emerald-700 font-semibold">Fully Approved</span>
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

        {/* Mobile View (< 640px) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {visibleProposals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm px-4">
              No proposals found matching the selected criteria.
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
                      {prop.status === "Approved" ? "Approved" : `L${prop.current_level} Review`}
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

        {/* Dynamic Pagination Bar */}
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
  );
};
