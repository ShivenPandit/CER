import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  FileText,
  RotateCcw,
  Calendar,
  Clock,
  User,
  ArrowUpDown,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { ICERAuditRecord } from "../../models/AuditModel";
import { ICERDataService } from "../../services/ICERDataService";
import { RemarksDiffModal } from "./RemarksDiffModal";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from "../common/DataTablePagination";

interface IAuditTrailViewProps {
  dataService: ICERDataService;
  initialProposalId?: string;
  onNavigateToDisplay?: (cerprno: string) => void;
  onCancel?: () => void;
}

export const AuditTrailView: React.FC<IAuditTrailViewProps> = ({
  dataService,
  initialProposalId,
  onNavigateToDisplay,
  onCancel,
}) => {
  const [auditRows, setAuditRows] = useState<ICERAuditRecord[]>([]);
  const [filterProposal, setFilterProposal] = useState(initialProposalId || "");
  const [filterUser, setFilterUser] = useState("");
  const [filterField, setFilterField] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<keyof ICERAuditRecord>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);

  // Modal state
  const [activeDiffRow, setActiveDiffRow] = useState<ICERAuditRecord | null>(null);

  const loadAuditTrail = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const records = await dataService.getAuditTrail(initialProposalId);
      setAuditRows(records);
    } catch (e) {
      console.error("Error loading audit trail:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditTrail().catch((e) => console.error(e));
  }, [initialProposalId]);

  const handleSearchByProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const records = await dataService.getAuditTrail(filterProposal.trim() || undefined);
      setAuditRows(records);
      pagination.setCurrentPage(1);
    } catch (e) {
      console.error("Error filtering audit trail:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setFilterProposal("");
    setFilterUser("");
    setFilterField("");
    setIsLoading(true);
    const records = await dataService.getAuditTrail();
    setAuditRows(records);
    pagination.setCurrentPage(1);
    setIsLoading(false);
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return auditRows.filter((r) => {
      if (filterUser.trim() && !r.user_name.toLowerCase().includes(filterUser.toLowerCase())) {
        return false;
      }
      if (filterField.trim() && !r.field_desc.toLowerCase().includes(filterField.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [auditRows, filterUser, filterField]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((a, b) => {
      const valA = a[sortField] || "";
      const valB = b[sortField] || "";
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return list;
  }, [filteredRows, sortField, sortAsc]);

  // Fully Automatic Dynamic Table Pagination
  const pagination = useDynamicPagination({
    totalItems: sortedRows.length,
    defaultRowHeight: 46,
    bufferBottom: 32,
  });

  const visibleRows = pagination.paginateItems(sortedRows);

  const handleSort = (field: keyof ICERAuditRecord): void => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600" /> Immutable Audit Ledger
              </span>
              <span className="text-xs text-slate-400">FR-06 & FR-07 Compliant</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Field-Level Audit Trail & Change History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Granular ledger tracking every field modification with old value, new value, user, and timestamp
            </p>
          </div>
        </div>

        {/* Proposal Filter Form */}
        <form onSubmit={handleSearchByProposal} className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={filterProposal}
            onChange={(e) => setFilterProposal(e.target.value)}
            placeholder="Filter by CER Proposal No..."
            className="w-full sm:w-52 px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
          {filterProposal && (
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 sm:p-2 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Grid Table Container */}
      <div
        ref={pagination.tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
      >
        {/* Secondary Filter Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-slate-600 font-semibold">
            {sortedRows.length} change record{sortedRows.length === 1 ? "" : "s"} logged
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={filterField}
              onChange={(e) => {
                setFilterField(e.target.value);
                pagination.setCurrentPage(1);
              }}
              placeholder="Filter by field..."
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
                pagination.setCurrentPage(1);
              }}
              placeholder="Filter by user..."
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Desktop / Tablet Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
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
                  onClick={() => handleSort("field_desc")}
                  className="py-2.5 px-3 w-[160px] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Field Description</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Old Value</th>
                <th className="py-2.5 px-3">New Value</th>
                <th
                  onClick={() => handleSort("audit_date")}
                  className="py-2.5 px-2.5 w-[110px] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-2 w-[75px]">Time</th>
                <th
                  onClick={() => handleSort("user_name")}
                  className="py-2.5 px-3 w-[140px] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>User Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    {isLoading ? "Loading audit records..." : "No Data found"}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, index) => {
                  const isLongRemarks =
                    row.is_long_text ||
                    row.field_name === "remarks" ||
                    row.field_name === "remarks_jv";

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        index % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {onNavigateToDisplay ? (
                          <button
                            onClick={() => onNavigateToDisplay(row.cerprno)}
                            className="text-blue-600 hover:underline"
                          >
                            {row.cerprno}
                          </button>
                        ) : (
                          row.cerprno
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {row.field_desc}
                      </td>

                      {/* Old Value Column */}
                      <td className="py-2.5 px-3 max-w-[200px]">
                        {isLongRemarks ? (
                          <button
                            onClick={() => setActiveDiffRow(row)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Display Text</span>
                          </button>
                        ) : (
                          <span
                            className="text-rose-700 font-medium truncate block"
                            title={row.old_value}
                          >
                            {row.old_value || "—"}
                          </span>
                        )}
                      </td>

                      {/* New Value Column */}
                      <td className="py-2.5 px-3 max-w-[200px]">
                        {isLongRemarks ? (
                          <button
                            onClick={() => setActiveDiffRow(row)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Display Text</span>
                          </button>
                        ) : (
                          <span
                            className="text-emerald-700 font-semibold truncate block"
                            title={row.new_value}
                          >
                            {row.new_value || "—"}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 text-slate-600 whitespace-nowrap">
                        {row.audit_date}
                      </td>
                      <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {row.audit_time}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium whitespace-nowrap">
                        {row.user_name}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (< 640px) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {visibleRows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs px-4">
              {isLoading ? "Loading audit records..." : "No Data found"}
            </div>
          ) : (
            visibleRows.map((row) => {
              const isLongRemarks =
                row.is_long_text ||
                row.field_name === "remarks" ||
                row.field_name === "remarks_jv";

              return (
                <div key={row.id} className="p-4 space-y-2 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {row.cerprno}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {row.audit_date} {row.audit_time}
                    </span>
                  </div>

                  <p className="font-bold text-xs text-slate-900">
                    {row.field_desc}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-100">
                      <span className="text-[10px] text-rose-600 uppercase font-bold block mb-0.5">
                        Old Value
                      </span>
                      {isLongRemarks ? (
                        <button
                          onClick={() => setActiveDiffRow(row)}
                          className="text-[11px] font-semibold text-rose-700 underline"
                        >
                          View Text
                        </button>
                      ) : (
                        <span className="font-medium text-rose-800 truncate block">
                          {row.old_value || "—"}
                        </span>
                      )}
                    </div>

                    <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 uppercase font-bold block mb-0.5">
                        New Value
                      </span>
                      {isLongRemarks ? (
                        <button
                          onClick={() => setActiveDiffRow(row)}
                          className="text-[11px] font-semibold text-emerald-700 underline"
                        >
                          View Text
                        </button>
                      ) : (
                        <span className="font-bold text-emerald-800 truncate block">
                          {row.new_value || "—"}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-1 text-right">
                    Modified by: <strong className="text-slate-700">{row.user_name}</strong>
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Dynamic Pagination Bar */}
        <DataTablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={sortedRows.length}
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
          itemName="audit records"
        />
      </div>

      {/* Screen 0400 Remarks Diff Modal */}
      {activeDiffRow && (
        <RemarksDiffModal
          isOpen={!!activeDiffRow}
          onClose={() => setActiveDiffRow(null)}
          cerprno={activeDiffRow.cerprno}
          fieldDesc={activeDiffRow.field_desc}
          oldValue={activeDiffRow.old_value}
          newValue={activeDiffRow.new_value}
          userName={activeDiffRow.user_name}
          auditDate={activeDiffRow.audit_date}
          auditTime={activeDiffRow.audit_time}
        />
      )}
    </div>
  );
};
