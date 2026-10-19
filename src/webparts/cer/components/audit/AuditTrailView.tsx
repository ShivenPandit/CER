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
} from "lucide-react";
import { ICERAuditRecord } from "../../models/AuditModel";
import { ICERDataService } from "../../services/ICERDataService";
import { RemarksDiffModal } from "./RemarksDiffModal";

interface IAuditTrailViewProps {
  dataService: ICERDataService;
  initialProposalId?: string;
  onNavigateToDisplay?: (cerprno: string) => void;
}

export const AuditTrailView: React.FC<IAuditTrailViewProps> = ({
  dataService,
  initialProposalId,
  onNavigateToDisplay,
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

  const handleSort = (field: keyof ICERAuditRecord): void => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" /> Immutable Audit Ledger
            </span>
            <span className="text-xs text-slate-400">FR-06 & FR-07 Compliant</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Field-Level Audit Trail & Change History
          </h2>
          <p className="text-xs text-slate-500">
            Granular ledger tracking every field modification with old value, new value, user, and timestamp
          </p>
        </div>

        {/* Proposal Filter Form */}
        <form onSubmit={handleSearchByProposal} className="flex items-center gap-2">
          <input
            type="text"
            value={filterProposal}
            onChange={(e) => setFilterProposal(e.target.value)}
            placeholder="Filter by CER Proposal No..."
            className="w-56 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
          {filterProposal && (
            <button
              type="button"
              onClick={handleReset}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-600 font-semibold">
            Showing {sortedRows.length} audit change records
          </span>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              placeholder="Filter by field description..."
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
            />
            <input
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="Filter by user..."
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
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
                  onClick={() => handleSort("field_desc")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Field Description</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Old Value</th>
                <th className="py-3 px-4">New Value</th>
                <th
                  onClick={() => handleSort("audit_date")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Time</th>
                <th
                  onClick={() => handleSort("user_name")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>User Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No Data found
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, index) => {
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
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
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
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {row.field_desc}
                      </td>

                      {/* Old Value Column */}
                      <td className="py-3 px-4 max-w-[200px]">
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
                      <td className="py-3 px-4 max-w-[200px]">
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

                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {row.audit_date}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {row.audit_time}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                        {row.user_name}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
