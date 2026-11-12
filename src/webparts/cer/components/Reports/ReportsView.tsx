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
  Calendar,
  Check,
} from "lucide-react";
import { ICERProposal, IFieldChoices, SBU_OPTIONS } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";
import { ExcelExportService } from "../../services/ExcelExportService";
import { getCurrentFiscalYearString, getProposalFiscalYear } from "../../utils/dateUtils";
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

  // In Reports & Analytics, strictly exclude unsubmitted Draft proposals
  const nonDraftProposals = useMemo(() => {
    return proposals.filter((p) => p.status !== "Draft");
  }, [proposals]);

  // Financial Year Filter State for Dashboard
  const currentFY = useMemo(() => getCurrentFiscalYearString(), []);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>(currentFY);
  const [isFyDropdownOpen, setIsFyDropdownOpen] = useState(false);
  const fyDropdownRef = useRef<HTMLDivElement>(null);

  // Pre-generate a list of standard fiscal years surrounding current FY (e.g. 3 years past to 3 years future)
  // plus any other FY extracted from proposals, sorted chronologically for calendar-style picking
  const displayFiscalYears = useMemo(() => {
    const set = new Set<string>();
    const match = currentFY.match(/(\d{4})/);
    const baseYear = match ? parseInt(match[1], 10) : new Date().getFullYear();

    for (let y = baseYear - 3; y <= baseYear + 3; y++) {
      const nextY = (y + 1) % 100;
      const nextYStr = nextY < 10 ? "0" + nextY : String(nextY);
      set.add(`FY ${y}-${nextYStr}`);
    }

    nonDraftProposals.forEach((p) => {
      const fy = getProposalFiscalYear(p);
      if (fy) set.add(fy);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [currentFY, nonDraftProposals]);

  // Count proposals per FY for visual activity indicators in the year picker
  const proposalCountByFY = useMemo(() => {
    const counts: Record<string, number> = {};
    nonDraftProposals.forEach((p) => {
      const fy = getProposalFiscalYear(p);
      if (fy) {
        counts[fy] = (counts[fy] || 0) + 1;
      }
    });
    return counts;
  }, [nonDraftProposals]);

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
  const listFilterButtonRef = useRef<HTMLDivElement>(null);
  const [listDropdownStyle, setListDropdownStyle] = useState<React.CSSProperties>({
    top: "100%",
    marginTop: "8px",
    maxHeight: "340px",
  });

  const updateDropdownPositions = useCallback(() => {
    const viewportHeight = window.innerHeight;
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
  }, [isListFiltersOpen]);

  useLayoutEffect(() => {
    updateDropdownPositions();
  }, [updateDropdownPositions, isListFiltersOpen]);

  useEffect(() => {
    if (!isListFiltersOpen) return;
    window.addEventListener("resize", updateDropdownPositions);
    window.addEventListener("scroll", updateDropdownPositions, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPositions);
      window.removeEventListener("scroll", updateDropdownPositions, true);
    };
  }, [isListFiltersOpen, updateDropdownPositions]);

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
          {/* Action Slot 1: Financial Year Filter Button with Current FY Label on its Left */}
          {activeTab === "dashboard" && (
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Left of button: shows which Financial Year is currently showing */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Financial Year:
                </span>
                <span className="text-xs font-bold text-[#012964]">
                  {selectedFinancialYear === "ALL" ? "All Financial Years" : selectedFinancialYear}
                </span>
              </div>

              {/* Financial Year Filter Button */}
              <div ref={fyDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsFyDropdownOpen((prev) => !prev)}
                  className={`h-9 flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                    isFyDropdownOpen || selectedFinancialYear !== "ALL"
                      ? "bg-[#012964]/10 border-[#012964]/40 text-[#012964] font-bold"
                      : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700 hover:border-slate-400"
                  }`}
                  title="Filter by Financial Year"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-[#012964]" />
                  <span>Financial Year</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      isFyDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Financial Year Picker Card */}
                {isFyDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsFyDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
                      {/* Picker Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#012964]/10 flex items-center justify-center text-[#012964] shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">
                              Financial Year Picker
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              Indian FY: Apr 1 – Mar 31
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {displayFiscalYears.length} Years
                        </span>
                      </div>

                      {/* 3-Column Year Grid */}
                      <div className="grid grid-cols-3 gap-2 my-3 max-h-56 overflow-y-auto p-0.5">
                        {displayFiscalYears.map((fy) => {
                          const isSelected = selectedFinancialYear === fy;
                          const isCurrent = fy === currentFY;
                          const count = proposalCountByFY[fy] || 0;
                          return (
                            <button
                              key={fy}
                              type="button"
                              onClick={() => {
                                setSelectedFinancialYear(fy);
                                setIsFyDropdownOpen(false);
                              }}
                              className={`relative p-2.5 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                                isSelected
                                  ? "bg-[#012964] text-white border-[#012964] shadow-md ring-2 ring-[#012964]/20 font-bold"
                                  : "bg-slate-50/80 hover:bg-blue-50/60 border-slate-200/90 text-slate-800 hover:border-[#012964]/30"
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                <span>{fy}</span>
                                {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                              </div>
                              <div className="flex items-center gap-1">
                                {isCurrent && (
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                      isSelected
                                        ? "bg-emerald-400/30 text-emerald-100 border border-emerald-300/40"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    Current
                                  </span>
                                )}
                                {count > 0 && !isSelected && (
                                  <span className="text-[9px] font-medium text-slate-400">
                                    {count} {count === 1 ? "CER" : "CERs"}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Picker Quick Action Footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFinancialYear("ALL");
                            setIsFyDropdownOpen(false);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            selectedFinancialYear === "ALL"
                              ? "bg-[#012964] text-white font-bold shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          All Financial Years
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFinancialYear(currentFY);
                            setIsFyDropdownOpen(false);
                          }}
                          className="text-[11px] font-semibold text-[#012964] hover:underline cursor-pointer"
                        >
                          Reset to Current ({currentFY})
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
            financialYearFilter={selectedFinancialYear}
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
