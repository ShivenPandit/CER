import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  FileText,
  RotateCcw,
  ArrowUpDown,
  Lock,
  ArrowLeft,
  ShieldCheck,
  History,
  Calendar,
  Tag,
  Clock,
} from "lucide-react";
import { ICERAuditRecord } from "../../models/AuditModel";
import { ICERDataService } from "../../services/ICERDataService";
import { RemarksDiffModal } from "./RemarksDiffModal";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from '../Shared/DataTablePagination';
import { UserAvatar } from "../Common/UserAvatar";
import { formatLocalDate, formatLocalTime } from "../../utils/dateUtils";

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

  const [activeTab, setActiveTab] = useState<"cards" | "table">("cards");

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

  const uniqueFields = useMemo(() => {
    const fields = new Set(auditRows.map((r) => r.field_desc).filter(Boolean));
    return Array.from(fields);
  }, [auditRows]);

  const uniqueUsers = useMemo(() => {
    const users = new Set(auditRows.map((r) => r.user_name).filter(Boolean));
    return Array.from(users);
  }, [auditRows]);

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
    defaultRowHeight: 44,
    bufferBottom: 52,
  });

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
      {/* Modern Dark Hero Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/60 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" /> Immutable Audit Ledger
              </span>
              <span className="text-[11px] font-medium text-slate-400">FR-06 & FR-07 Compliant</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
              <span>Field-Level Audit Trail & Change History</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable ledger capturing every proposal field delta, old value, new value, modifier, and timestamp
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
            className="w-full sm:w-56 px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 hover:border-slate-500 rounded-xl text-xs font-mono font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 sm:py-2 bg-[#012964] hover:bg-[#001f4d] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
          {filterProposal && (
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Changes Logged</span>
          <p className="font-extrabold text-slate-900 text-base mt-0.5">
            {auditRows.length} record{auditRows.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Fields Modified</span>
          <p className="font-extrabold text-blue-700 text-base mt-0.5">
            {uniqueFields.length} distinct field{uniqueFields.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Contributors</span>
          <p className="font-extrabold text-slate-800 text-base mt-0.5">
            {uniqueUsers.length} user{uniqueUsers.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Scope Filter</span>
          <p className="font-bold text-purple-700 truncate mt-0.5">
            {filterProposal ? filterProposal : "All Proposals Ledger"}
          </p>
        </div>
      </div>

      {/* Container with Tabs & Filters */}
      <div
        ref={pagination.tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
      >
        {/* View Tabs & Search Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 pt-3 border-b border-slate-200 bg-white gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("cards")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "cards"
                  ? "border-blue-600 text-blue-700 bg-blue-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Change Cards Timeline ({filteredRows.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("table")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "table"
                  ? "border-blue-600 text-blue-700 bg-blue-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Tabular Ledger ({filteredRows.length})</span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <input
              type="text"
              value={filterField}
              onChange={(e) => {
                setFilterField(e.target.value);
                pagination.setCurrentPage(1);
              }}
              placeholder="Filter by field..."
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all w-36"
            />
            <input
              type="text"
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
                pagination.setCurrentPage(1);
              }}
              placeholder="Filter by user..."
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all w-36"
            />
            {(filterField || filterUser) && (
              <button
                onClick={() => {
                  setFilterField("");
                  setFilterUser("");
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Change Cards View */}
        {activeTab === "cards" && (
          <div className="p-4 sm:p-5 space-y-3 bg-slate-50/40">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto text-blue-500 animate-spin mb-2" />
                <p className="text-xs font-medium">Loading audit trail records...</p>
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-sm text-slate-700">No Change Records Found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {filterProposal || filterField || filterUser
                    ? "No audit records match your active search and filter criteria."
                    : "No audit records logged yet."}
                </p>
              </div>
            ) : (
              visibleRows.map((row) => {
                const isLongRemarks =
                  row.is_long_text ||
                  row.field_name === "remarks" ||
                  row.field_name === "remarks_jv";

                return (
                  <div
                    key={row.id}
                    className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-subtle transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {onNavigateToDisplay ? (
                          <button
                            onClick={() => onNavigateToDisplay(row.cerprno)}
                            className="font-mono font-bold text-xs bg-slate-100 hover:bg-slate-200 text-blue-700 px-2 py-0.5 rounded border border-slate-300 transition-colors"
                          >
                            {row.cerprno}
                          </button>
                        ) : (
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-300">
                            {row.cerprno}
                          </span>
                        )}

                        <span className="font-bold text-xs text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-blue-600" />
                          {row.field_desc}
                        </span>

                        <span className="text-[11px] font-mono text-slate-400">
                          [{row.field_name}]
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatLocalDate(row.timestamp || row.audit_date)} {formatLocalTime(row.timestamp || row.audit_time)}
                        </span>
                      </div>
                    </div>

                    {/* Modifier User Info */}
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <UserAvatar name={row.user_name} size="xs" />
                      <span>
                        Modified by: <strong className="text-slate-900">{row.user_name}</strong>
                      </span>
                    </div>

                    {/* Delta Comparison Container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                      {/* Previous Value */}
                      <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider block">
                          Previous Value
                        </span>
                        {isLongRemarks ? (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 italic text-[11px] truncate max-w-[200px]">
                              {row.old_value ? `"${row.old_value.slice(0, 40)}..."` : "Empty narrative"}
                            </span>
                            <button
                              onClick={() => setActiveDiffRow(row)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-rose-200 rounded text-[11px] font-semibold text-rose-700 hover:bg-rose-50 shadow-2xs transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              <span>View Diff</span>
                            </button>
                          </div>
                        ) : (
                          <p className="text-rose-900 font-medium break-words">
                            {row.old_value || <span className="text-rose-400 italic">Empty / None</span>}
                          </p>
                        )}
                      </div>

                      {/* Updated Value */}
                      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                          Updated Value
                        </span>
                        {isLongRemarks ? (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 italic text-[11px] truncate max-w-[200px]">
                              {row.new_value ? `"${row.new_value.slice(0, 40)}..."` : "Empty narrative"}
                            </span>
                            <button
                              onClick={() => setActiveDiffRow(row)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-emerald-200 rounded text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 shadow-2xs transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              <span>View Diff</span>
                            </button>
                          </div>
                        ) : (
                          <p className="text-emerald-950 font-bold break-words">
                            {row.new_value || <span className="text-emerald-500 italic">Cleared</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tabular Ledger View (Desktop & Mobile) */}
        {activeTab === "table" && (
          <div>
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
                  className="py-2.5 px-3 w-[180px] xl:w-[220px] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Field Description</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 w-[110px] xl:w-[130px]">Old Value</th>
                <th className="py-2.5 px-3 w-[110px] xl:w-[130px]">New Value</th>
                <th
                  onClick={() => handleSort("audit_date")}
                  className="py-2.5 px-2.5 w-[100px] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-2 w-[70px]">Time</th>
                <th
                  onClick={() => handleSort("user_name")}
                  className="py-2.5 px-3 w-[160px] xl:w-[200px] cursor-pointer hover:text-slate-900"
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
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 truncate">
                        {onNavigateToDisplay ? (
                          <button
                            onClick={() => onNavigateToDisplay(row.cerprno)}
                            className="text-blue-600 hover:underline truncate block"
                          >
                            {row.cerprno}
                          </button>
                        ) : (
                          row.cerprno
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        <span className="truncate block" title={row.field_desc}>
                          {row.field_desc}
                        </span>
                      </td>

                      {/* Old Value Column */}
                      <td className="py-2.5 px-3">
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
                      <td className="py-2.5 px-3">
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

                      <td className="py-2.5 px-2.5 text-slate-600 truncate">
                        {formatLocalDate(row.timestamp || row.audit_date)}
                      </td>
                      <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px] truncate">
                        {formatLocalTime(row.timestamp || row.audit_time)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">
                        <span className="truncate block" title={row.user_name}>
                          {row.user_name}
                        </span>
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
                      {formatLocalDate(row.timestamp || row.audit_date)} {formatLocalTime(row.timestamp || row.audit_time)}
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
      </div>
    )}

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
          auditDate={formatLocalDate(activeDiffRow.timestamp || activeDiffRow.audit_date)}
          auditTime={formatLocalTime(activeDiffRow.timestamp || activeDiffRow.audit_time)}
        />
      )}
    </div>
  );
};
