import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RotateCcw,
  Eye,
  Edit,
} from "lucide-react";
import { ICERProposal, CERCategory, CERStatus, SBUOption, SBU_OPTIONS } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { ExcelExportService } from "../../services/ExcelExportService";

interface IReportsViewProps {
  proposals: ICERProposal[];
  currentUser: IAppUser;
  onNavigateToDisplay: (cerprno: string) => void;
  onNavigateToChange: (cerprno: string) => void;
}

export const ReportsView: React.FC<IReportsViewProps> = ({
  proposals,
  currentUser,
  onNavigateToDisplay,
  onNavigateToChange,
}) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sbuFilter, setSbuFilter] = useState<string>("ALL");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
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

  // Pagination calculation
  const totalPages = Math.ceil(sortedProposals.length / pageSize) || 1;
  const paginatedProposals = sortedProposals.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    ExcelExportService.exportProposalList(sortedProposals, "CER_Executive_Report");
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            CER Proposal Reports & Strategic Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Form FR-04: Multi-parameter query, audit-grade tabular views, and Excel spreadsheet export
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={sortedProposals.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export to Excel ({sortedProposals.length})</span>
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle space-y-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Search Term */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Proposal No / Project Name
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search keywords..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs text-slate-800"
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="In Approval">In Approval</option>
              <option value="Approved">Approved</option>
              <option value="Draft">Draft</option>
              <option value="Rejected">Rejected</option>
              <option value="Revised">Revised</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="Vital">Vital</option>
              <option value="Essential">Essential</option>
              <option value="Desirable">Desirable</option>
            </select>
          </div>

          {/* SBU Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Strategic Business Unit (SBU)
            </label>
            <select
              value={sbuFilter}
              onChange={(e) => setSbuFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All SBUs</option>
              {SBU_OPTIONS.map((opt) => (
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
              onChange={(e) => setOwnerFilter(e.target.value)}
              placeholder="e.g. Shiven..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs text-slate-800"
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
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs text-slate-800"
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
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs text-slate-800"
            />
          </div>

          {/* Active Summary */}
          <div className="flex items-end pb-1 text-slate-500 text-xs">
            Found <strong>&nbsp;{filteredProposals.length}&nbsp;</strong> matching proposals
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
                <th
                  onClick={() => handleSort("cerprno")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Proposal No</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("pr_name")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Project Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-3">SBU</th>
                <th className="py-3 px-3">Category</th>
                <th
                  onClick={() => handleSort("amount")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Stage / Approver</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No proposals found matching the specified filters.
                  </td>
                </tr>
              ) : (
                paginatedProposals.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {prop.cerprno}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 max-w-[220px] truncate" title={prop.pr_name}>
                      {prop.pr_name}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{prop.owname}</td>
                    <td className="py-3 px-3 text-slate-600">{prop.sbu}</td>
                    <td className="py-3 px-3">
                      <CategoryBadge category={prop.cat} />
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={prop.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {prop.status === "Approved" ? (
                        <span className="text-emerald-700 font-semibold">Fully Approved</span>
                      ) : (
                        `L${prop.current_level} - ${prop.pending_with_role}`
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
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

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing{" "}
            <strong>
              {sortedProposals.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(currentPage * pageSize, sortedProposals.length)}
            </strong>{" "}
            of <strong>{sortedProposals.length}</strong> proposals
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
