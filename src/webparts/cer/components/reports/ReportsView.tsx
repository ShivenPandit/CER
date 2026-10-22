import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  FileSpreadsheet,
  ArrowUpDown,
  RotateCcw,
  Eye,
  Edit,
} from "lucide-react";
import { ICERProposal, CERCategory, CERStatus, SBUOption, SBU_OPTIONS, IFieldChoices } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { ExcelExportService } from "../../services/ExcelExportService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from "../common/DataTablePagination";

interface IReportsViewProps {
  proposals: ICERProposal[];
  currentUser: IAppUser;
  onNavigateToDisplay: (cerprno: string) => void;
  onNavigateToChange: (cerprno: string) => void;
  fieldChoices?: IFieldChoices;
}

export const ReportsView: React.FC<IReportsViewProps> = ({
  proposals,
  currentUser,
  onNavigateToDisplay,
  onNavigateToChange,
  fieldChoices,
}) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sbuFilter, setSbuFilter] = useState<string>("ALL");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<keyof ICERProposal>("created_date");
  const [sortAsc, setSortAsc] = useState(false);

  // Filter logic
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Search term (Proposal # or Project Name)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNo = p.cerprno.toLowerCase().includes(query);
        const matchesName = p.pr_name.toLowerCase().includes(query);
        if (!matchesNo && !matchesName) return false;
      }

      // Status
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;

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

  const handleExportExcel = () => {
    ExcelExportService.exportProposalList(sortedProposals, "CER_Executive_Report");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* View Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            CER Proposal Reports & Strategic Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Form FR-04: Multi-parameter query, audit-grade tabular views, and Excel spreadsheet export
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={sortedProposals.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export to Excel ({sortedProposals.length})</span>
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
              {(fieldChoices?.status && fieldChoices.status.length > 0
                ? fieldChoices.status
                : ["In Approval", "Approved", "Draft", "Rejected", "Revised"]
              ).map((st) => (
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
              placeholder="e.g. Shiven..."
              className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
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
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
                <th
                  onClick={() => handleSort("cerprno")}
                  className="py-2.5 px-3 w-[125px] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Proposal No</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("pr_name")}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Project Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-2.5 w-[120px]">Owner</th>
                <th className="py-2.5 px-2 w-[75px]">SBU</th>
                <th className="py-2.5 px-2 w-[85px]">Category</th>
                <th
                  onClick={() => handleSort("amount")}
                  className="py-2.5 px-3 text-right w-[125px] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-2 text-center w-[95px]">Status</th>
                <th className="py-2.5 px-2.5 w-[165px]">Stage / Approver</th>
                <th className="py-2.5 px-3 text-right w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No proposals found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                visibleProposals.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <button
                        onClick={() => onNavigateToDisplay(prop.cerprno)}
                        className="hover:text-blue-600 transition-colors text-left"
                      >
                        {prop.cerprno}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <span className="truncate block" title={prop.pr_name}>
                        {prop.pr_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600">
                      <span className="truncate block" title={prop.owname}>
                        {prop.owname}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">{prop.sbu}</td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <CategoryBadge category={prop.cat} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <StatusBadge status={prop.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-500">
                      <span
                        className="truncate block"
                        title={
                          prop.status === "Approved"
                            ? "Fully Approved"
                            : `L${prop.current_level} - ${prop.pending_with_role}`
                        }
                      >
                        {prop.status === "Approved" ? (
                          <span className="text-emerald-700 font-semibold">Fully Approved</span>
                        ) : (
                          `L${prop.current_level} - ${prop.pending_with_role}`
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onNavigateToDisplay(prop.cerprno)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Display Proposal (FR-03)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
                          <button
                            onClick={() => onNavigateToChange(prop.cerprno)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Change Proposal (FR-02)"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
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
            <div className="py-12 text-center text-slate-400 text-xs px-4">
              No proposals found matching the selected criteria.
            </div>
          ) : (
            visibleProposals.map((prop) => (
              <div key={prop.id} className="p-4 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {prop.cerprno}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <CategoryBadge category={prop.cat} />
                    <StatusBadge status={prop.status} size="sm" />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 text-xs leading-snug">
                    {prop.pr_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {prop.owname} • SBU: {prop.sbu}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Amount
                    </span>
                    <span className="font-bold text-slate-900">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Pending
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      {prop.status === "Approved" ? "Approved" : `L${prop.current_level} Review`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    onClick={() => onNavigateToDisplay(prop.cerprno)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-center flex items-center justify-center gap-1 text-[11px] transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Display CER</span>
                  </button>
                  {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
                    <button
                      onClick={() => onNavigateToChange(prop.cerprno)}
                      className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-center flex items-center justify-center gap-1 text-[11px] transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Change CER</span>
                    </button>
                  )}
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
