import React, { useState, useMemo, useRef, useCallback, useLayoutEffect, useEffect } from "react";
import {
  ArrowLeft,
  LayoutDashboard,
  ListFilter,
  Filter,
  ChevronDown,
  X,
  RotateCcw,
  Search,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { ICERProposal, IFieldChoices, SBU_OPTIONS } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";
import { ExcelExportService } from "../../services/ExcelExportService";
import { ReportDashboard } from "./ReportDashboard";
import { ReportProposalList } from "./ReportProposalList";

export interface IReportsViewProps {
  proposals: ICERProposal[];
  currentUser: IAppUser;
  onNavigateToDisplay: (cerprno: string) => void;
  onNavigateToChange?: (cerprno: string) => void;
  onNavigateToSubmissions?: (cerProposalId: string) => void;
  dataService?: ICERDataService;
  fieldChoices?: IFieldChoices;
  onCancel?: () => void;
}

export type ReportTabType = "dashboard" | "proposal-list";

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
  // Tab Navigation: Default to Report Dashboard
  const [activeTab, setActiveTab] = useState<ReportTabType>("dashboard");

  // Dashboard Filters State (preserved across tab switches)
  const [isDashboardFiltersOpen, setIsDashboardFiltersOpen] = useState(false);
  const [dashDateFrom, setDashDateFrom] = useState("");
  const [dashDateTo, setDashDateTo] = useState("");
  const [dashSbuFilter, setDashSbuFilter] = useState("ALL");
  const [dashStatusFilter, setDashStatusFilter] = useState("ALL");

  const handleResetDashboardFilters = () => {
    setDashDateFrom("");
    setDashDateTo("");
    setDashSbuFilter("ALL");
    setDashStatusFilter("ALL");
  };

  const dashboardFilterCount = useMemo(() => {
    let count = 0;
    if (dashDateFrom) count++;
    if (dashDateTo) count++;
    if (dashSbuFilter !== "ALL") count++;
    if (dashStatusFilter !== "ALL") count++;
    return count;
  }, [dashDateFrom, dashDateTo, dashSbuFilter, dashStatusFilter]);

  // Proposal List Filters State
  const [isListFiltersOpen, setIsListFiltersOpen] = useState(false);
  const [listSearchTerm, setListSearchTerm] = useState("");
  const [listStatusFilter, setListStatusFilter] = useState<string>("ALL");
  const [listCategoryFilter, setListCategoryFilter] = useState<string>("ALL");
  const [listSbuFilter, setListSbuFilter] = useState<string>("ALL");
  const [listOwnerFilter, setListOwnerFilter] = useState("");
  const [listDateFrom, setListDateFrom] = useState("");
  const [listDateTo, setListDateTo] = useState("");

  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusText, setExportStatusText] = useState("");

  const handleResetListFilters = () => {
    setListSearchTerm("");
    setListStatusFilter("ALL");
    setListCategoryFilter("ALL");
    setListSbuFilter("ALL");
    setListOwnerFilter("");
    setListDateFrom("");
    setListDateTo("");
  };

  const listActiveFilterCount = useMemo(() => {
    let count = 0;
    if (listCategoryFilter !== "ALL") count++;
    if (listSbuFilter !== "ALL") count++;
    if (listOwnerFilter.trim()) count++;
    if (listDateFrom) count++;
    if (listDateTo) count++;
    return count;
  }, [listCategoryFilter, listSbuFilter, listOwnerFilter, listDateFrom, listDateTo]);

  // Dynamic non-cropping dropdown positioning refs and styles
  const dashFilterButtonRef = useRef<HTMLDivElement>(null);
  const listFilterButtonRef = useRef<HTMLDivElement>(null);
  const [dashDropdownStyle, setDashDropdownStyle] = useState<React.CSSProperties>({
    top: "100%",
    marginTop: "8px",
    maxHeight: "340px",
  });
  const [listDropdownStyle, setListDropdownStyle] = useState<React.CSSProperties>({
    top: "100%",
    marginTop: "8px",
    maxHeight: "340px",
  });

  const updateDropdownPositions = useCallback(() => {
    const viewportHeight = window.innerHeight;
    if (isDashboardFiltersOpen && dashFilterButtonRef.current) {
      const rect = dashFilterButtonRef.current.getBoundingClientRect();
      const spaceBelow = viewportHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      if (spaceBelow < 220 && spaceAbove > spaceBelow) {
        setDashDropdownStyle({
          bottom: "100%",
          marginBottom: "8px",
          maxHeight: `${Math.max(160, Math.floor(spaceAbove))}px`,
        });
      } else {
        setDashDropdownStyle({
          top: "100%",
          marginTop: "8px",
          maxHeight: `${Math.max(160, Math.floor(spaceBelow))}px`,
        });
      }
    }
    if (isListFiltersOpen && listFilterButtonRef.current) {
      const rect = listFilterButtonRef.current.getBoundingClientRect();
      const spaceBelow = viewportHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      if (spaceBelow < 220 && spaceAbove > spaceBelow) {
        setListDropdownStyle({
          bottom: "100%",
          marginBottom: "8px",
          maxHeight: `${Math.max(160, Math.floor(spaceAbove))}px`,
        });
      } else {
        setListDropdownStyle({
          top: "100%",
          marginTop: "8px",
          maxHeight: `${Math.max(160, Math.floor(spaceBelow))}px`,
        });
      }
    }
  }, [isDashboardFiltersOpen, isListFiltersOpen]);

  useLayoutEffect(() => {
    updateDropdownPositions();
  }, [updateDropdownPositions, isDashboardFiltersOpen, isListFiltersOpen]);

  useEffect(() => {
    if (!isDashboardFiltersOpen && !isListFiltersOpen) return;
    window.addEventListener("resize", updateDropdownPositions);
    window.addEventListener("scroll", updateDropdownPositions, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPositions);
      window.removeEventListener("scroll", updateDropdownPositions, true);
    };
  }, [isDashboardFiltersOpen, isListFiltersOpen, updateDropdownPositions]);

  // In Reports & Analytics, strictly exclude unsubmitted Draft proposals
  const nonDraftProposals = useMemo(() => {
    return proposals.filter((p) => p.status !== "Draft");
  }, [proposals]);

  // Dataset matching list search & advanced filters (for export & status counting)
  const matchingCriteriaListProposals = useMemo(() => {
    return nonDraftProposals.filter((p) => {
      if (listSearchTerm.trim()) {
        const query = listSearchTerm.toLowerCase();
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

      if (listCategoryFilter !== "ALL" && p.cat !== listCategoryFilter) return false;
      if (listSbuFilter !== "ALL" && p.sbu !== listSbuFilter) return false;
      if (listOwnerFilter.trim() && !p.owname.toLowerCase().includes(listOwnerFilter.toLowerCase())) {
        return false;
      }
      if (listDateFrom && p.st_date < listDateFrom) return false;
      if (listDateTo && p.com_date > listDateTo) return false;

      return true;
    });
  }, [nonDraftProposals, listSearchTerm, listCategoryFilter, listSbuFilter, listOwnerFilter, listDateFrom, listDateTo]);

  const filteredListProposals = useMemo(() => {
    if (listStatusFilter === "ALL") return matchingCriteriaListProposals;
    return matchingCriteriaListProposals.filter((p) => {
      if (listStatusFilter === "IN_APPROVAL") {
        return ["Pending Approval", "In Approval", "Submitted"].indexOf(p.status) !== -1;
      }
      if (listStatusFilter === "APPROVED") {
        return p.status === "Approved";
      }
      if (listStatusFilter === "REVISED" || listStatusFilter === "SEND_BACK") {
        return p.status === "Send Back" || p.status === "Revised" || p.status === "Sent Back";
      }
      if (listStatusFilter === "REJECTED") {
        return p.status === "Rejected";
      }
      return true;
    });
  }, [matchingCriteriaListProposals, listStatusFilter]);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      setExportStatusText("Initializing export...");
      if (dataService) {
        await ExcelExportService.exportAllMatchingProposalsAsync(
          dataService,
          {
            searchTerm: listSearchTerm,
            status: listStatusFilter,
            category: listCategoryFilter,
            sbu: listSbuFilter,
            owner: listOwnerFilter,
            dateFrom: listDateFrom,
            dateTo: listDateTo,
          },
          "CERProposals_Report",
          (statusMsg) => setExportStatusText(statusMsg)
        );
      } else {
        await ExcelExportService.exportProposalListAsync(filteredListProposals, "CERProposals_Report");
      }
    } catch (err: any) {
      alert("Error exporting Excel: " + (err?.message || String(err)));
    } finally {
      setIsExporting(false);
      setExportStatusText("");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Unified Page Header: Title on Left, Standardized Action Controls + Divider + Tabs on Right */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Back button & Title */}
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
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Reports &amp; Analytics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Capital expenditure intelligence, performance analytics, and proposal register
            </p>
          </div>
        </div>

        {/* Right: Actions aligned with Tabs on same horizontal line */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 self-start xl:self-auto">
          {/* Action Slot 1: Dashboard Filters Button & Uncroppable Popover */}
          {activeTab === "dashboard" && (
            <div ref={dashFilterButtonRef} className="relative">
              <button
                onClick={() => setIsDashboardFiltersOpen((prev) => !prev)}
                className={`h-9 flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                  isDashboardFiltersOpen || dashboardFilterCount > 0
                    ? "bg-[#012964]/10 border-[#012964]/40 text-[#012964] font-bold"
                    : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700 hover:border-slate-400"
                }`}
                title="Toggle dashboard filters"
              >
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span>Dashboard Filters</span>
                {dashboardFilterCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#012964] text-white">
                    {dashboardFilterCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    isDashboardFiltersOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Backdrop */}
              {isDashboardFiltersOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDashboardFiltersOpen(false)}
                />
              )}

              {/* Floating Anchored Popover: Compact Non-Cropping Layout */}
              {isDashboardFiltersOpen && (
                <div
                  style={{
                    width: "370px",
                    maxWidth: "calc(100vw - 32px)",
                    ...dashDropdownStyle,
                  }}
                  className="absolute right-0 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Popover Header: Fixed at top */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#012964] shrink-0" />
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                        Filter Dashboard Analytics
                      </h4>
                      {dashboardFilterCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 whitespace-nowrap">
                          {dashboardFilterCount} Active
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setIsDashboardFiltersOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                      title="Close filters"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Popover Form Body: Compact 2-column flow */}
                  <div className="p-3.5 space-y-2.5 text-xs overflow-y-auto flex-1 min-h-0">
                    {/* Row 1: Date Range: From / To */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Date Range
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">From</span>
                          <input
                            type="date"
                            value={dashDateFrom}
                            onChange={(e) => setDashDateFrom(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">To</span>
                          <input
                            type="date"
                            value={dashDateTo}
                            onChange={(e) => setDashDateTo(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: SBU / Block and Proposal Status side-by-side */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          SBU / Block
                        </label>
                        <select
                          value={dashSbuFilter}
                          onChange={(e) => setDashSbuFilter(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
                        >
                          <option value="ALL">All SBUs</option>
                          {SBU_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Proposal Status
                        </label>
                        <select
                          value={dashStatusFilter}
                          onChange={(e) => setDashStatusFilter(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="IN_APPROVAL">In Approval</option>
                          <option value="APPROVED">Approved</option>
                          <option value="SEND_BACK">Send Back</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Popover Footer: Fixed at bottom */}
                  <div className="shrink-0 flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50/90 border-t border-slate-100">
                    <button
                      onClick={handleResetDashboardFilters}
                      disabled={dashboardFilterCount === 0}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Filters</span>
                    </button>
                    <button
                      onClick={() => setIsDashboardFiltersOpen(false)}
                      className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#012964] hover:bg-[#012964]/90 transition whitespace-nowrap cursor-pointer shadow-xs"
                    >
                      Apply &amp; Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Slot 2: Proposal List Search, Filters, and Export Excel */}
          {activeTab === "proposal-list" && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Quick Search: h-9, w-44 sm:w-56 lg:w-64, pl-9 pr-4 */}
              <div className="relative w-40 sm:w-52 lg:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={listSearchTerm}
                  onChange={(e) => setListSearchTerm(e.target.value)}
                  placeholder="Search proposals..."
                  className="w-full h-9 pl-9 pr-4 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
                />
              </div>

              {/* Filters Toggle Button & Non-Cropping Popover: h-9, px-3.5 py-2 */}
              <div ref={listFilterButtonRef} className="relative">
                <button
                  onClick={() => setIsListFiltersOpen((prev) => !prev)}
                  className={`h-9 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                    isListFiltersOpen || listActiveFilterCount > 0
                      ? "bg-[#012964]/10 border-[#012964]/40 text-[#012964] font-bold"
                      : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700 hover:border-slate-400"
                  }`}
                  title="Toggle advanced filter criteria"
                >
                  <Filter className="w-3.5 h-3.5 shrink-0" />
                  <span>Filters</span>
                  {listActiveFilterCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#012964] text-white">
                      {listActiveFilterCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      isListFiltersOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Backdrop */}
                {isListFiltersOpen && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsListFiltersOpen(false)}
                  />
                )}

                {/* Popover with Non-Cropping Flexbox Layout */}
                {isListFiltersOpen && (
                  <div
                    style={{
                      width: "370px",
                      maxWidth: "calc(100vw - 32px)",
                      ...listDropdownStyle,
                    }}
                    className="absolute right-0 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* Popover Header: Fixed at top */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-[#012964] shrink-0" />
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                          Advanced Search Criteria
                        </h3>
                        {listActiveFilterCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 whitespace-nowrap">
                            {listActiveFilterCount} Active
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setIsListFiltersOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                        title="Close filter panel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Popover Form Body: Compact 2-column layout */}
                    <div className="p-3.5 space-y-2.5 text-xs overflow-y-auto flex-1 min-h-0">
                      {/* Row 1: Category & SBU side-by-side */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Category
                          </label>
                          <select
                            value={listCategoryFilter}
                            onChange={(e) => setListCategoryFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
                          >
                            <option value="ALL">All Categories</option>
                            <option value="Vital">Vital</option>
                            <option value="Essential">Essential</option>
                            <option value="Desirable">Desirable</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            SBU / Block
                          </label>
                          <select
                            value={listSbuFilter}
                            onChange={(e) => setListSbuFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
                          >
                            <option value="ALL">All SBUs</option>
                            {SBU_OPTIONS.map((sbu) => (
                              <option key={sbu} value={sbu}>
                                {sbu}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: CER Owner */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          CER Owner
                        </label>
                        <input
                          type="text"
                          value={listOwnerFilter}
                          onChange={(e) => setListOwnerFilter(e.target.value)}
                          placeholder="Filter by owner name..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
                        />
                      </div>

                      {/* Row 3: Start Date (From / To) */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Start Date (From / To)
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                          <input
                            type="date"
                            value={listDateFrom}
                            onChange={(e) => setListDateFrom(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
                          />
                          <input
                            type="date"
                            value={listDateTo}
                            onChange={(e) => setListDateTo(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Popover Footer: Fixed at bottom */}
                    <div className="shrink-0 flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50/90 border-t border-slate-100">
                      <button
                        onClick={handleResetListFilters}
                        disabled={listActiveFilterCount === 0}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset All</span>
                      </button>
                      <button
                        onClick={() => setIsListFiltersOpen(false)}
                        className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#012964] hover:bg-[#012964]/90 transition whitespace-nowrap cursor-pointer shadow-xs"
                      >
                        Apply &amp; Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Export to Excel Button: Stable size, never stretches toolbar */}
              <button
                onClick={handleExportExcel}
                disabled={(filteredListProposals.length === 0 && !dataService) || isExporting}
                title={
                  isExporting
                    ? exportStatusText || "Exporting proposals to Excel..."
                    : "Export filtered proposals to Excel"
                }
                className="h-9 min-w-[136px] flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs shadow-emerald-600/20 transition-all disabled:opacity-60 whitespace-nowrap cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    <span>Export Excel ({filteredListProposals.length})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Vertical Divider */}
          <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

          {/* Right: View Navigation Tabs */}
          <div className="flex items-center gap-6 sm:gap-8 border-b border-slate-200">
            {/* Tab 1: Report Dashboard */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-1 pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "dashboard"
                  ? "border-[#012964] text-[#012964]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Report Dashboard</span>
            </button>

            {/* Tab 2: Report CER Proposal List */}
            <button
              onClick={() => setActiveTab("proposal-list")}
              className={`px-1 pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "proposal-list"
                  ? "border-[#012964] text-[#012964]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <ListFilter className="w-4 h-4 shrink-0" />
              <span>Report CER Proposal List</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tab Contents */}
      <div className="transition-all duration-150">
        {activeTab === "dashboard" && (
          <ReportDashboard
            proposals={nonDraftProposals}
            dateFrom={dashDateFrom}
            dateTo={dashDateTo}
            sbuFilter={dashSbuFilter}
            statusFilter={dashStatusFilter}
            onResetFilters={handleResetDashboardFilters}
          />
        )}

        {activeTab === "proposal-list" && (
          <ReportProposalList
            proposals={nonDraftProposals}
            searchTerm={listSearchTerm}
            statusFilter={listStatusFilter}
            setStatusFilter={setListStatusFilter}
            categoryFilter={listCategoryFilter}
            sbuFilter={listSbuFilter}
            ownerFilter={listOwnerFilter}
            dateFrom={listDateFrom}
            dateTo={listDateTo}
            onResetFilters={handleResetListFilters}
            currentUser={currentUser}
            onNavigateToDisplay={onNavigateToDisplay}
            onNavigateToChange={onNavigateToChange}
            onNavigateToSubmissions={onNavigateToSubmissions}
            dataService={dataService}
            fieldChoices={fieldChoices}
          />
        )}
      </div>

      {/* Non-intrusive floating progress toast during background Excel export */}
      {isExporting && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-xs">
          <Loader2 className="w-4 h-4 text-emerald-400 shrink-0 animate-spin" />
          <span>{exportStatusText || "Exporting proposals to Excel..."}</span>
        </div>
      )}
    </div>
  );
};
