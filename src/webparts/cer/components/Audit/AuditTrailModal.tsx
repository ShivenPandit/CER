import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  X,
  History,
  Calendar,
  User,
  ArrowRight,
  Filter,
  Search,
  FileText,
  Clock,
  RotateCcw,
  Tag,
  ArrowUpDown,
  Lock,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { ICERAuditRecord } from "../../models/AuditModel";
import { ICERDataService } from "../../services/ICERDataService";
import { StatusBadge } from "../Shared/StatusBadge";
import { CategoryBadge } from "../Shared/CategoryBadge";
import { UserAvatar } from "../Common/UserAvatar";
import { RemarksDiffModal } from "./RemarksDiffModal";
import { formatLocalDate, formatLocalTime } from "../../utils/dateUtils";

interface IAuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ICERProposal;
  dataService: ICERDataService;
}

export const AuditTrailModal: React.FC<IAuditTrailModalProps> = ({
  isOpen,
  onClose,
  proposal,
  dataService,
}) => {
  const [auditRows, setAuditRows] = useState<ICERAuditRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"cards" | "table">("cards");
  const [isLoading, setIsLoading] = useState(false);
  const [filterField, setFilterField] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [activeDiffRow, setActiveDiffRow] = useState<ICERAuditRecord | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<keyof ICERAuditRecord>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);

  // Load audit trail records on open
  useEffect(() => {
    if (isOpen && proposal?.cerprno) {
      setIsLoading(true);
      const fetchAuditData = async () => {
        try {
          const records = await dataService.getAuditTrail(proposal.cerprno);
          setAuditRows(records);
        } catch (err) {
          console.error("Error loading audit trail:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAuditData().catch((e) => console.error(e));
    }
  }, [isOpen, proposal?.cerprno]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !activeDiffRow) onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeDiffRow, onClose]);

  const uniqueFields = useMemo(() => {
    const fields = new Set(auditRows.map((r) => r.field_desc).filter(Boolean));
    return Array.from(fields);
  }, [auditRows]);

  const uniqueUsers = useMemo(() => {
    const users = new Set(auditRows.map((r) => r.user_name).filter(Boolean));
    return Array.from(users);
  }, [auditRows]);

  const filteredRows = useMemo(() => {
    return auditRows.filter((r) => {
      if (filterField && r.field_desc !== filterField) return false;
      if (filterUser && !r.user_name.toLowerCase().includes(filterUser.toLowerCase())) return false;
      return true;
    });
  }, [auditRows, filterField, filterUser]);

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

  const handleSort = (field: keyof ICERAuditRecord): void => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const formatRecordDate = (timestampStr?: string, auditDateStr?: string): string => {
    const dStr = timestampStr || auditDateStr;
    if (!dStr) return "N/A";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen || !proposal) return null;

  return (
    <div className="cer-display-scope fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Unified Dark Aesthetic */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-900 text-white shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-white border border-white/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                  {proposal.cerprno}
                </span>
                <CategoryBadge category={proposal.cat} />
                <StatusBadge status={proposal.status} size="sm" />
                <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Immutable Audit Ledger
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1 leading-snug">
                Field-Level Audit Trail — {proposal.pr_name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors self-end sm:self-auto"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200/80 text-xs shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Changes Logged</span>
            <p className="font-bold text-slate-900 mt-0.5">
              {auditRows.length} change record{auditRows.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Fields Modified</span>
            <p className="font-bold cer-text-blue mt-0.5">
              {uniqueFields.length} distinct field{uniqueFields.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Contributors</span>
            <p className="font-bold text-slate-800 mt-0.5">
              {uniqueUsers.length} user{uniqueUsers.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Revisions</span>
            <p className="font-bold text-purple-700 mt-0.5">
              Rev #{proposal.revision_count || 1}
            </p>
          </div>
        </div>

        {/* Tab Selection & Search Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 pt-3 border-b border-slate-200 bg-white shrink-0 gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("cards")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "cards"
                  ? "border-b-2 bg-slate-50 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              style={activeTab === "cards" ? { borderColor: "var(--cer-brand-blue)", color: "var(--cer-brand-blue)" } : undefined}
            >
              <History className="w-4 h-4" />
              <span>Change Cards Timeline ({filteredRows.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("table")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "table"
                  ? "border-b-2 bg-slate-50 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              style={activeTab === "table" ? { borderColor: "var(--cer-brand-blue)", color: "var(--cer-brand-blue)" } : undefined}
            >
              <FileText className="w-4 h-4" />
              <span>Tabular Ledger ({filteredRows.length})</span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 pb-2">
            <div className="relative">
              <select
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 cer-input-focus"
              >
                <option value="">All Fields ({uniqueFields.length})</option>
                {uniqueFields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <input
                type="text"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                placeholder="Filter by user..."
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 placeholder:text-slate-400 cer-input-focus w-32 sm:w-36"
              />
            </div>

            {(filterField || filterUser) && (
              <button
                onClick={() => {
                  setFilterField("");
                  setFilterUser("");
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/40">
          {isLoading && auditRows.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto cer-text-blue animate-spin mb-2" />
              <p className="text-xs font-medium">Loading immutable audit ledger...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm text-slate-700">No Audit Records Found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filterField || filterUser
                  ? "No field modifications match your active filters."
                  : "No post-creation modifications have been recorded for this proposal yet."}
              </p>
            </div>
          ) : activeTab === "cards" ? (
            /* Visual Change Cards (Timeline) */
            <div className="space-y-3">
              {sortedRows.map((row) => {
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
                        <span className="font-bold text-xs cer-text-blue bg-white px-2.5 py-0.5 rounded-md border cer-border-blue flex items-center gap-1">
                          <Tag className="w-3 h-3 cer-text-blue" />
                          {row.field_desc}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          [{row.field_name}]
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatRecordDate(row.timestamp, row.audit_date)}</span>
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
                      <div className="p-3 bg-white rounded-xl border-2 cer-border-green space-y-1">
                        <span className="text-[10px] uppercase font-bold cer-text-blue tracking-wider block">
                          Updated Value
                        </span>
                        {isLongRemarks ? (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 italic text-[11px] truncate max-w-[200px]">
                              {row.new_value ? `"${row.new_value.slice(0, 40)}..."` : "Empty narrative"}
                            </span>
                            <button
                              onClick={() => setActiveDiffRow(row)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white border cer-border-blue rounded text-[11px] font-semibold cer-text-blue hover:bg-slate-50 shadow-2xs transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              <span>View Diff</span>
                            </button>
                          </div>
                        ) : (
                          <p className="text-slate-900 font-bold break-words">
                            {row.new_value || <span className="text-slate-400 italic">Cleared</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Tabular Ledger View */
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
                    <th
                      onClick={() => handleSort("field_desc")}
                      className="py-2.5 px-3 w-[180px] cursor-pointer hover:text-slate-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>Field Description</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 w-[130px]">Previous Value</th>
                    <th className="py-2.5 px-3 w-[130px]">New Value</th>
                    <th
                      onClick={() => handleSort("audit_date")}
                      className="py-2.5 px-3 w-[130px] cursor-pointer hover:text-slate-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date & Time</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("user_name")}
                      className="py-2.5 px-3 w-[150px] cursor-pointer hover:text-slate-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>Modified By</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRows.map((row, idx) => {
                    const isLongRemarks =
                      row.is_long_text ||
                      row.field_name === "remarks" ||
                      row.field_name === "remarks_jv";

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-800 truncate" title={row.field_desc}>
                          {row.field_desc}
                        </td>

                        <td className="py-2.5 px-3 truncate">
                          {isLongRemarks ? (
                            <button
                              onClick={() => setActiveDiffRow(row)}
                              className="text-rose-700 underline text-[11px] font-medium"
                            >
                              View Diff
                            </button>
                          ) : (
                            <span className="text-rose-700 font-medium" title={row.old_value}>
                              {row.old_value || "—"}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 truncate">
                          {isLongRemarks ? (
                            <button
                              onClick={() => setActiveDiffRow(row)}
                              className="cer-text-blue underline text-[11px] font-medium"
                            >
                              View Diff
                            </button>
                          ) : (
                            <span className="cer-text-blue font-bold" title={row.new_value}>
                              {row.new_value || "—"}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {formatRecordDate(row.timestamp, row.audit_date)}
                        </td>

                        <td className="py-2.5 px-3 font-medium text-slate-800 truncate">
                          {row.user_name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0">
          <p className="text-xs text-slate-400">
            Immutable delta records in SharePoint list{" "}
            <span className="font-mono text-slate-600">CERAuditTrail</span>
          </p>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Full Remarks Diff Modal if triggered */}
      {activeDiffRow && (
        <RemarksDiffModal
          isOpen={true}
          onClose={() => setActiveDiffRow(null)}
          cerprno={proposal.cerprno}
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
