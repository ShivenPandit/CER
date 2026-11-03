import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  FileSpreadsheet,
  ArrowUpDown,
  RotateCcw,
  ArrowLeft,
  Eye,
  ChevronDown,
  Edit2,
  X,
} from "lucide-react";
import { ICERProposal, SBU_OPTIONS, IFieldChoices } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { StatusBadge } from "../Shared/StatusBadge";
import { CategoryBadge } from "../Shared/CategoryBadge";
import { ExcelExportService } from "../../services/ExcelExportService";
import { ICERDataService } from "../../services/ICERDataService";
import { PermissionService } from "../../services/PermissionService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from "../Shared/DataTablePagination";

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
  // Quick Search & Status Pills
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Advanced Filters (in collapsible drawer)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
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

  // Status KPI counts
  const counts = useMemo(() => {
    return {
      all: proposals.length,
      inApproval: proposals.filter((p) =>
        ["Pending Approval", "In Approval", "Submitted"].indexOf(p.status) !== -1
      ).length,
      approved: proposals.filter((p) => p.status === "Approved").length,
      draft: proposals.filter((p) => p.status === "Draft").length,
      revised: proposals.filter((p) => p.status === "Revised").length,
    };
  }, [proposals]);

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

  // Filter logic
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Search term (Proposal #, Project Name, Owner, SBU)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = (p.cer_proposal_id || "").toLowerCase().includes(query);
        const matchesPropNo = (p.proposal_no || "").toLowerCase().includes(query);
        const matchesCerNo = (p.cerprno || "").toLowerCase().includes(query);
        const matchesName = (p.pr_name || "").toLowerCase().includes(query);
        const matchesOwner = (p.owname || "").toLowerCase().includes(query);
        const matchesSbu = (p.sbu || "").toLowerCase().includes(query);
        if (!matchesId && !matchesPropNo && !matchesCerNo && !matchesName && !matchesOwner && !matchesSbu) {
          return false;
        }
      }

      // Status Pill Filter
      if (statusFilter === "IN_APPROVAL") {
        if (["Pending Approval", "In Approval", "Submitted"].indexOf(p.status) === -1) return false;
      } else if (statusFilter === "APPROVED") {
        if (p.status !== "Approved") return false;
      } else if (statusFilter === "DRAFT") {
        if (p.status !== "Draft") return false;
      } else if (statusFilter === "REVISED") {
        if (p.status !== "Revised") return false;
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
  }, [proposals, searchTerm, statusFilter, categoryFilter, sbuFilter, ownerFilter, dateFrom, dateTo]);

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
          (statusMsg) => setExportStatusText(statusMsg)
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
    <div className="space-y-4">
      {/* Header & Controls Bar matching My CER Proposals */}
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
              Reports &amp; Analytics
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                pagination.setCurrentPage(1);
              }}
              placeholder="Search proposals..."
              className="w-full sm:w-60 pl-9 pr-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
            />
          </div>

          {/* Filters Toggle Button */}
          <button
            onClick={() => setIsFilterDrawerOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer shrink-0 ${
              isFilterDrawerOpen || activeAdvancedFilterCount > 0
                ? "bg-[#012964]/10 border-[#012964]/30 text-[#012964]"
                : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700"
            }`}
            title="Toggle advanced filter criteria"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[#012964] text-white">
                {activeAdvancedFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterDrawerOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Export to Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={(sortedProposals.length === 0 && !dataService) || isExporting}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              {isExporting ? (exportStatusText || "Exporting...") : `Export Excel (${sortedProposals.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Status Filter Strip matching My CER Proposals */}
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

      {/* Collapsible Advanced Filters Drawer */}
      {isFilterDrawerOpen && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-4 animate-fade-in">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#012964]" />
              <span>Filters</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#012964] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset All
              </button>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close filters drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  pagination.setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
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
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">SBU</label>
              <select
                value={sbuFilter}
                onChange={(e) => {
                  setSbuFilter(e.target.value);
                  pagination.setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
              >
                <option value="ALL">All SBUs</option>
                {(fieldChoices?.sbu && fieldChoices.sbu.length > 0 ? fieldChoices.sbu : SBU_OPTIONS).map(
                  (opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Owner Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">CER Owner</label>
              <input
                type="text"
                value={ownerFilter}
                onChange={(e) => {
                  setOwnerFilter(e.target.value);
                  pagination.setCurrentPage(1);
                }}
                placeholder="Search owner..."
                className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
              />
            </div>

            {/* Start Date From */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  pagination.setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
              />
            </div>

            {/* Completion Date To */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Completion Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  pagination.setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Results Table Container */}
      <div
        ref={pagination.tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
      >
        {/* Desktop / Tablet Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style={{ width: "140px" }} />
              <col style={{ width: "190px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "85px" }} />
              <col style={{ width: "85px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "95px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "175px" }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider select-none">
                <th
                  onClick={() => handleSort("cerprno")}
                  className="py-3.5 px-4 text-left cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Proposal ID</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("pr_name")}
                  className="py-3.5 px-4 text-left cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Project Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">Owner</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">SBU</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Category</th>
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
                <th className="py-3.5 px-4 text-left whitespace-nowrap">Pending Level</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                    No proposals found.
                  </td>
                </tr>
              ) : (
                visibleProposals.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-slate-50/70 transition-colors select-none"
                  >
                    <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleRowClick(prop)}
                        className="font-mono font-bold text-sm text-[#012964] hover:underline cursor-pointer text-left focus:outline-none"
                        title={`View ${prop.cer_proposal_id || prop.cerprno}`}
                      >
                        {prop.cer_proposal_id || prop.cerprno}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-left align-middle overflow-hidden whitespace-nowrap">
                      <span
                        className="block truncate font-semibold text-sm text-slate-900 group-hover:text-[#012964] transition-colors"
                        title={prop.pr_name}
                      >
                        {truncateProjectName(prop.pr_name, 22)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-left align-middle overflow-hidden whitespace-nowrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-[#012964] font-bold text-[11px] leading-none flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs group-hover:border-[#012964]/40">
                          {getInitials(prop.owname)}
                        </div>
                        <span className="font-medium text-sm text-slate-800 truncate" title={prop.owname}>
                          {prop.owname}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                      <span className="inline-block text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        {prop.sbu}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                      <CategoryBadge category={prop.cat} />
                    </td>
                    <td className="py-3.5 px-4 text-right align-middle font-bold text-sm text-slate-900 whitespace-nowrap">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                      <StatusBadge status={prop.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap text-sm font-medium">
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
                    <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Always show View button across all statuses */}
                        <button
                          type="button"
                          onClick={() => {
                            const targetId = prop.cerprno || prop.proposal_no || prop.cer_proposal_id;
                            if (onNavigateToDisplay && targetId) onNavigateToDisplay(targetId);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#012964] bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200/60"
                          title="View proposal details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {/* Status-specific action button */}
                        {(() => {
                          const targetId = prop.cerprno || prop.proposal_no || prop.cer_proposal_id;
                          const editAuth = PermissionService.canEditCER(prop, currentUser);
                          const canEdit = editAuth.allowed && Boolean(onNavigateToChange);
                          if (!canEdit) return null;

                          if (prop.status === "Draft") {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onNavigateToChange && targetId) onNavigateToChange(targetId);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer border border-amber-200"
                                title="Edit draft proposal"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            );
                          }

                          if (prop.status === "Approved") {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onNavigateToChange && targetId) onNavigateToChange(targetId);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-200/60 shadow-2xs"
                                title="Amend and resubmit approved proposal"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Resubmit</span>
                              </button>
                            );
                          }

                          if (prop.status === "Revised") {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onNavigateToChange && targetId) onNavigateToChange(targetId);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer border border-amber-200"
                                title="Edit and resubmit reworked proposal"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit & Resubmit</span>
                              </button>
                            );
                          }

                          return null;
                        })()}
                      </div>
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
                className="p-4 space-y-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleRowClick(prop)}
                    className="font-mono font-bold text-sm text-[#012964] bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/60 hover:underline cursor-pointer"
                    title={`View ${prop.cer_proposal_id || prop.cerprno}`}
                  >
                    {prop.cer_proposal_id || prop.cerprno}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <CategoryBadge category={prop.cat} />
                    <StatusBadge status={prop.status} size="sm" />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-[#012964] transition-colors">
                    {prop.pr_name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-[#012964] font-bold text-[10px] leading-none flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs">
                      {getInitials(prop.owname)}
                    </div>
                    <span className="truncate max-w-[150px]">{prop.owname}</span>
                    <span>•</span>
                    <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600">
                      {prop.sbu}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Amount</span>
                    <span className="font-bold text-sm text-slate-900">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Stage</span>
                    <span className="text-slate-700 text-xs font-medium">
                      {prop.status === "Approved" ? "Approved" : `L${prop.current_level} - ${prop.pending_with_role}`}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Dynamic Pagination Footer */}
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
