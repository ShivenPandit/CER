import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  History,
  Eye,
  Calendar,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { ICERDataService } from "../../services/ICERDataService";
import { StatusBadge } from "../Shared/StatusBadge";
import { CategoryBadge } from "../Shared/CategoryBadge";

interface IProposalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cerProposalId: string;
  dataService: ICERDataService;
  onSelectProposal: (proposalNo: string) => void;
}

export const ProposalHistoryModal: React.FC<IProposalHistoryModalProps> = ({
  isOpen,
  onClose,
  cerProposalId,
  dataService,
  onSelectProposal,
}) => {
  const [activeProposal, setActiveProposal] = useState<ICERProposal | null>(null);
  const [historyProposals, setHistoryProposals] = useState<ICERProposal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !cerProposalId) return;

    let isMounted = true;
    const fetchSubmissions = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const { active, history } = await dataService.getAllSubmissionsForCER(cerProposalId);
        if (isMounted) {
          setActiveProposal(active);
          setHistoryProposals(history || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Failed to fetch submissions for CER Proposal ID:", err);
          setError("Failed to load submission history for this proposal.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSubmissions().catch((e) => console.error(e));
    return () => {
      isMounted = false;
    };
  }, [isOpen, cerProposalId, dataService]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const projectName =
    activeProposal?.pr_name || historyProposals[0]?.pr_name || "Capital Expenditure Request";

  const getInitials = (name?: string): string => {
    if (!name) return "U";
    const clean = name
      .replace(/\(.*?\)/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/[^a-zA-Z\s]/g, " ")
      .trim();
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

  const formatSnapshotDate = (dateVal?: string): string => {
    if (!dateVal) return "—";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateVal;
    }
  };

  return (
    <div className="cer-display-scope fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header matching enterprise dark banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#012964] text-white shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-white border border-white/20 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">
                  Permanent CER Proposal ID:
                </span>
                <span className="font-mono font-bold text-xs bg-white/20 text-white px-2 py-0.5 rounded border border-white/30">
                  {cerProposalId}
                </span>
                <span className="text-xs text-blue-200">•</span>
                <span className="text-xs text-blue-200 font-medium">
                  Historical Snapshots: <strong className="text-white">{historyProposals.length}</strong>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate max-w-xl">
                {projectName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subtitle / Tip Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#012964]" />
            <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
              Proposal Submission & Version History
            </span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Archived snapshots from SharePoint list <strong className="text-slate-700">CERProposalsHistory</strong>
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 bg-slate-50/40 space-y-4">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-xs space-y-2">
              <div className="w-7 h-7 border-2 border-[#012964] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-medium">Loading proposal history from CERProposalsHistory...</p>
            </div>
          ) : (
            <>
              {/* Zone 1: Current Active Proposal (from CERProposals) */}
              {activeProposal && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                        Current Active Proposal (CERProposals)
                      </span>
                      <span className="font-mono font-bold text-xs bg-[#012964]/10 text-[#012964] px-2 py-0.5 rounded border border-[#012964]/20">
                        {activeProposal.proposal_no || activeProposal.cerprno}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {historyProposals.length > 0 ? `Active Version (v${historyProposals.length + 1})` : "Active Submission (v1)"}
                      </span>
                    </div>
                    <StatusBadge status={activeProposal.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Project Name</span>
                      <span className="font-semibold text-slate-900 truncate block" title={activeProposal.pr_name}>
                        {activeProposal.pr_name}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">Project Owner & SBU</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-blue-50 text-[#012964] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {getInitials(activeProposal.owname)}
                        </div>
                        <span className="font-medium text-slate-800 truncate">{activeProposal.owname}</span>
                        <span className="text-[10px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {activeProposal.sbu}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">Current Amount</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {activeProposal.currency || "USD"} {Number(activeProposal.amount || 0).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">Approval Stage</span>
                      <span className="font-medium text-slate-700">
                        {activeProposal.status === "Approved"
                          ? "Fully Approved"
                          : activeProposal.status === "Revised"
                          ? "Initiator (Rework)"
                          : activeProposal.status === "Draft"
                          ? "Draft (Not Submitted)"
                          : `L${activeProposal.current_level} - ${activeProposal.pending_with_role || "Pending"}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Zone 2: Historical Snapshots Table (CERProposalsHistory) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#012964]" />
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Archived Approved Versions (CERProposalsHistory)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {historyProposals.length}
                    </span>
                  </div>
                </div>

                {historyProposals.length === 0 ? (
                  /* Informative Empty State for Initial Cycle Proposals */
                  <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center space-y-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-[#012964] border border-blue-200 flex items-center justify-center mx-auto">
                      <History className="w-6 h-6 text-[#012964]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        No Historical Versions in CERProposalsHistory
                      </h4>
                      <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1 leading-relaxed">
                        This proposal is currently in its initial cycle (v1). When an approved proposal is amended and resubmitted, the previous approved snapshot is automatically archived in the SharePoint list <strong>CERProposalsHistory</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Historical Snapshots Table */
                  <div className="bg-white rounded-xl border border-slate-200/80 shadow-subtle overflow-hidden">
                    {/* Mobile Cards */}
                    <div className="block sm:hidden divide-y divide-slate-100">
                      {historyProposals.map((prop, idx) => {
                        const revNum = historyProposals.length - idx;
                        const effectiveNo = prop.proposal_no || prop.cerprno;

                        return (
                          <div
                            key={prop.id || `${effectiveNo}-${idx}`}
                            onClick={() => onSelectProposal(effectiveNo)}
                            className="p-4 space-y-2.5 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-sm text-[#012964] group-hover:underline">
                                  {effectiveNo}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  Archived v{revNum}
                                </span>
                              </div>
                              <StatusBadge status="Approved" size="sm" />
                            </div>

                            <div>
                              <h4 className="font-semibold text-slate-900 text-xs leading-snug group-hover:text-[#012964] transition-colors">
                                {prop.pr_name}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                                <div className="w-5 h-5 rounded-full bg-blue-50 text-[#012964] font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {getInitials(prop.owname)}
                                </div>
                                <span className="truncate">{prop.owname}</span>
                                <span>•</span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                  {prop.sbu}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                  Approved Amount
                                </span>
                                <span className="font-bold text-slate-900">
                                  {prop.currency || "USD"} {Number(prop.amount || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[#012964] font-semibold text-xs">
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Snapshot</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop & Tablet Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: "160px" }} />
                          <col />
                          <col style={{ width: "180px" }} />
                          <col style={{ width: "130px" }} />
                          <col style={{ width: "120px" }} />
                          <col style={{ width: "90px" }} />
                          <col style={{ width: "130px" }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider select-none">
                            <th className="py-3 px-4 whitespace-nowrap">Archived Version</th>
                            <th className="py-3 px-4">Name of Project</th>
                            <th className="py-3 px-4 whitespace-nowrap">Project Owner</th>
                            <th className="py-3 px-4 text-right whitespace-nowrap">Approved Amount</th>
                            <th className="py-3 px-4 whitespace-nowrap">Archived Date</th>
                            <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                            <th className="py-3 px-3 text-center whitespace-nowrap">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {historyProposals.map((prop, idx) => {
                            const revNum = historyProposals.length - idx;
                            const effectiveNo = prop.proposal_no || prop.cerprno;

                            return (
                              <tr
                                key={prop.id || `${effectiveNo}-${idx}`}
                                onClick={() => onSelectProposal(effectiveNo)}
                                className="hover:bg-blue-50/40 cursor-pointer transition-colors group select-none"
                                title="Click to load historical snapshot into Display view"
                              >
                                {/* Version & Proposal No */}
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="flex flex-col items-start gap-0.5">
                                    <span className="font-mono font-bold text-sm text-[#012964] group-hover:underline">
                                      {effectiveNo}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-500">
                                      Archived Version (v{revNum})
                                    </span>
                                  </div>
                                </td>

                                {/* Project Name */}
                                <td className="py-3.5 px-4 font-semibold text-sm text-slate-900 overflow-hidden">
                                  <span className="block truncate group-hover:text-[#012964] transition-colors" title={prop.pr_name}>
                                    {prop.pr_name}
                                  </span>
                                </td>

                                {/* Project Owner & SBU */}
                                <td className="py-3.5 px-4 overflow-hidden">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-blue-50 text-[#012964] font-bold text-[10px] leading-none flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
                                      {getInitials(prop.owname)}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-medium text-xs text-slate-800 block truncate" title={prop.owname}>
                                        {prop.owname}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium block">
                                        {prop.sbu}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Approved Amount */}
                                <td className="py-3.5 px-4 text-right font-bold text-sm text-slate-900 whitespace-nowrap">
                                  {prop.currency || "USD"} {Number(prop.amount || 0).toLocaleString()}
                                </td>

                                {/* Archived Date */}
                                <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{formatSnapshotDate(prop.modified_date || prop.created_date)}</span>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                                  </span>
                                </td>

                                {/* Action */}
                                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectProposal(effectiveNo);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#012964] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200/80 cursor-pointer"
                                    title="View this historical snapshot"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white shrink-0 text-xs text-slate-500">
          <span>Clicking &ldquo;View&rdquo; or any snapshot row loads its historical snapshot into Display view.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-medium text-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
