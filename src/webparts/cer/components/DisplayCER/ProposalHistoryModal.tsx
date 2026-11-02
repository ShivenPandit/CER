import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  History,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { ICERDataService } from "../../services/ICERDataService";
import { StatusBadge } from "../Shared/StatusBadge";

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

  // Combine active and history items for the table
  const allSubmissions: Array<{ proposal: ICERProposal; isCurrent: boolean; versionLabel: string }> = [];

  if (activeProposal) {
    allSubmissions.push({
      proposal: activeProposal,
      isCurrent: true,
      versionLabel:
        historyProposals.length > 0
          ? `Active Version (v${historyProposals.length + 1})`
          : "Active Submission",
    });
  }

  // Historical items ordered from most recent archived to oldest
  historyProposals.forEach((item, idx) => {
    const revNum = historyProposals.length - idx;
    allSubmissions.push({
      proposal: item,
      isCurrent: false,
      versionLabel: `Archived Approved (v${revNum})`,
    });
  });

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
                  Total Submissions: <strong className="text-white">{allSubmissions.length}</strong>
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
              CER Submissions & Version History
            </span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Click on any <strong className="text-slate-700">row</strong> to view full details
          </span>
        </div>

        {/* Modal Body / Table View */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 bg-slate-50/40">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-xs space-y-2">
              <div className="w-7 h-7 border-2 border-[#012964] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-medium">Loading proposal submissions...</p>
            </div>
          ) : allSubmissions.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              No proposal records found for ID {cerProposalId}.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-subtle overflow-hidden">
              {/* Mobile Adaptive Cards View (< 640px) */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {allSubmissions.map(({ proposal: prop, isCurrent, versionLabel }) => {
                  const effectiveNo = prop.proposal_no || prop.cerprno;

                  return (
                    <div
                      key={prop.id || effectiveNo}
                      onClick={() => onSelectProposal(effectiveNo)}
                      className={`p-4 space-y-2.5 hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                        isCurrent ? "bg-[#012964]/[0.02]" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-sm text-[#012964] group-hover:underline">
                            {effectiveNo}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                              isCurrent
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {versionLabel}
                          </span>
                        </div>
                        <StatusBadge status={prop.status} size="sm" />
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
                          <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {prop.sbu}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Amount
                          </span>
                          <span className="font-bold text-sm text-slate-900">
                            {prop.currency || "USD"} {Number(prop.amount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                              Stage
                            </span>
                            <span className="text-slate-700 text-xs font-medium">
                              {prop.status === "Approved" ? "Completed" : `L${prop.current_level || 0}`}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#012964] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop & Tablet Table View (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: "180px" }} />
                    <col />
                    <col style={{ width: "220px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "90px" }} />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "40px" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider select-none">
                      <th className="py-3.5 px-4 whitespace-nowrap">Proposal No</th>
                      <th className="py-3.5 px-4">Name of Project</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Project Owner</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">Amount</th>
                      <th className="py-3.5 px-3 text-center whitespace-nowrap">Status</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Pending</th>
                      <th className="py-3.5 px-3 text-center whitespace-nowrap">Level</th>
                      <th className="py-3.5 px-3 text-right w-12 whitespace-nowrap" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allSubmissions.map(({ proposal: prop, isCurrent, versionLabel }) => {
                      const effectiveNo = prop.proposal_no || prop.cerprno;

                      return (
                        <tr
                          key={prop.id || effectiveNo}
                          onClick={() => onSelectProposal(effectiveNo)}
                          className={`hover:bg-blue-50/40 cursor-pointer transition-colors group select-none ${
                            isCurrent ? "bg-[#012964]/[0.02]" : ""
                          }`}
                          title="Click to view proposal details"
                        >
                          {/* 1. Proposal No */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-mono font-bold text-sm text-[#012964] group-hover:underline text-left">
                                {effectiveNo}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                  isCurrent
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {versionLabel}
                              </span>
                            </div>
                          </td>

                          {/* 2. Name of Project */}
                          <td className="py-3.5 px-4 font-semibold text-sm text-slate-900 overflow-hidden">
                            <span
                              className="block truncate group-hover:text-[#012964] transition-colors"
                              title={prop.pr_name}
                            >
                              {prop.pr_name}
                            </span>
                            {prop.request_date && (
                              <span className="text-xs text-slate-400 block mt-0.5 font-normal">
                                Req Date: {prop.request_date}
                              </span>
                            )}
                          </td>

                          {/* 3. Project Owner */}
                          <td className="py-3.5 px-4 overflow-hidden">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-blue-50 text-[#012964] font-bold text-[11px] leading-none flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs group-hover:border-[#012964]/40">
                                {getInitials(prop.owname)}
                              </div>
                              <div className="min-w-0">
                                <span
                                  className="font-medium text-sm text-slate-800 block truncate"
                                  title={prop.owname}
                                >
                                  {prop.owname}
                                </span>
                                <span className="text-xs text-slate-400 font-medium block truncate">
                                  {prop.sbu}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 4. AMOUNT */}
                          <td className="py-3.5 px-4 text-right font-bold text-sm text-slate-900 whitespace-nowrap">
                            {prop.currency || "USD"} {Number(prop.amount || 0).toLocaleString()}
                          </td>

                          {/* 5. STATUS */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <StatusBadge status={prop.status} size="sm" />
                          </td>

                          {/* 6. PENDING */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-sm font-medium">
                            <span
                              title={
                                prop.status === "Approved"
                                  ? "Completed"
                                  : prop.status === "Rejected"
                                  ? "Rejected"
                                  : prop.status === "Revised"
                                  ? "Initiator (Rework)"
                                  : prop.pending_with_role || "Pending"
                              }
                            >
                              {prop.status === "Approved" ? (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 inline" />
                                  Approved
                                </span>
                              ) : prop.status === "Rejected" ? (
                                <span className="text-rose-700 font-semibold">Rejected</span>
                              ) : prop.status === "Revised" ? (
                                <span className="text-purple-700 font-semibold">Initiator (Rework)</span>
                              ) : (
                                <span className="text-slate-700">
                                  {prop.pending_with_role || "Approver"}
                                </span>
                              )}
                            </span>
                          </td>

                          {/* 7. LEVEL */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span className="font-mono text-slate-700 font-semibold text-sm">
                              {prop.status === "Approved" ? "Completed" : `L${prop.current_level || 0}`}
                            </span>
                          </td>

                          {/* 8. Action Arrow */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap w-12">
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#012964] group-hover:translate-x-0.5 transition-all inline-block" />
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

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white shrink-0 text-xs text-slate-500">
          <span>Clicking any version loads its full data into the Display view.</span>
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

