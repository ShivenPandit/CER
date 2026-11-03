import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
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
import { IAppUser } from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";
import { StatusBadge } from "../Shared/StatusBadge";

interface ICERSubmissionsViewProps {
  cerProposalId: string;
  dataService: ICERDataService;
  currentUser: IAppUser;
  onNavigateToDisplay: (cerprno: string) => void;
  onNavigateToChange: (cerprno: string) => void;
  onBack: () => void;
}

export const CERSubmissionsView: React.FC<ICERSubmissionsViewProps> = ({
  cerProposalId,
  dataService,
  currentUser,
  onNavigateToDisplay,
  onNavigateToChange,
  onBack,
}) => {
  const [activeProposal, setActiveProposal] = useState<ICERProposal | null>(null);
  const [historyProposals, setHistoryProposals] = useState<ICERProposal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [cerProposalId, dataService]);

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
    <div className="w-full space-y-4">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Back to My Proposals"
            aria-label="Back to My Proposals"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Permanent CER Proposal ID
              </span>
              <span className="px-2 py-0.5 bg-[#012964]/10 text-[#012964] font-mono font-bold text-xs rounded-md">
                {cerProposalId}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 truncate max-w-xl">
              {projectName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <History className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Historical Snapshots: <strong className="text-slate-800">{historyProposals.length}</strong>
          </span>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400 text-xs space-y-2">
          <div className="w-7 h-7 border-2 border-[#012964] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-medium">Loading proposal history...</p>
        </div>
      ) : (
        <>
          {/* Historical Snapshots Archive */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#012964]" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Prior Approved Proposals
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {historyProposals.length}
                </span>
              </div>
            </div>

            {historyProposals.length === 0 ? (
              /* Informative Empty State */
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#012964] border border-blue-200 flex items-center justify-center mx-auto">
                  <History className="w-6 h-6 text-[#012964]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    No Previous Versions
                  </h3>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1 leading-relaxed">
                    Prior approved versions will appear here when amended.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Cards View (< 640px) */}
                <div className="block sm:hidden divide-y divide-slate-100">
                  {historyProposals.map((prop, idx) => {
                    const revNum = historyProposals.length - idx;
                    const effectiveNo = prop.proposal_no || prop.cerprno;

                    return (
                      <div
                        key={prop.id || `${effectiveNo}-${idx}`}
                        onClick={() => onNavigateToDisplay(effectiveNo)}
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

                {/* Desktop & Tablet Table View (>= 640px) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <colgroup>
                      <col style={{ width: "160px" }} />
                      <col />
                      <col style={{ width: "190px" }} />
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
                            onClick={() => onNavigateToDisplay(effectiveNo)}
                            className="hover:bg-blue-50/40 cursor-pointer transition-colors group select-none"
                            title="Click to load historical snapshot into Display view"
                          >
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

                            <td className="py-3.5 px-4 font-semibold text-sm text-slate-900 overflow-hidden">
                              <span className="block truncate group-hover:text-[#012964] transition-colors" title={prop.pr_name}>
                                {prop.pr_name}
                              </span>
                            </td>

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

                            <td className="py-3.5 px-4 text-right font-bold text-sm text-slate-900 whitespace-nowrap">
                              {prop.currency || "USD"} {Number(prop.amount || 0).toLocaleString()}
                            </td>

                            <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatSnapshotDate(prop.modified_date || prop.created_date)}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                              </span>
                            </td>

                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToDisplay(effectiveNo);
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
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
