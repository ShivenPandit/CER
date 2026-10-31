import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
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

  // Combine active and history items for the table
  const allSubmissions: Array<{ proposal: ICERProposal; isCurrent: boolean; versionLabel: string }> = [];

  if (activeProposal) {
    allSubmissions.push({
      proposal: activeProposal,
      isCurrent: true,
      versionLabel: historyProposals.length > 0 ? `Active Version (v${historyProposals.length + 1})` : "Active Submission",
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

  const projectName = activeProposal?.pr_name || historyProposals[0]?.pr_name || "Capital Expenditure Request";

  const getInitials = (name?: string): string => {
    if (!name) return "U";
    // Strip parenthesized or bracketed text like "(Microlink)" or "[Contractor]"
    const clean = name.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "").replace(/[^a-zA-Z\s]/g, " ").trim();
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
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Total Submissions: <strong className="text-slate-800">{allSubmissions.length}</strong>
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

      {/* Main Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#012964]" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              CER Submissions & Version History
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Click on any <strong className="text-slate-700">row</strong> to view full details
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <div className="w-6 h-6 border-2 border-[#012964] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading proposal submissions...</p>
          </div>
        ) : allSubmissions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No proposal records found for ID {cerProposalId}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider select-none">
                  <th className="py-3.5 px-4 w-[160px] whitespace-nowrap">Proposal No</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Name of Project</th>
                  <th className="py-3.5 px-4 min-w-[200px] whitespace-nowrap">Project Owner</th>
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
                      onClick={() => onNavigateToDisplay(effectiveNo)}
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
                      <td className="py-3.5 px-4 font-semibold text-sm text-slate-900">
                        <span className="group-hover:text-[#012964] transition-colors" title={prop.pr_name}>
                          {prop.pr_name}
                        </span>
                        {prop.request_date && (
                          <span className="text-xs text-slate-400 block mt-0.5 font-normal">
                            Req Date: {prop.request_date}
                          </span>
                        )}
                      </td>

                      {/* 3. Project Owner */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-[#012964] font-bold text-[11px] leading-none flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs group-hover:border-[#012964]/40">
                            {getInitials(prop.owname)}
                          </div>
                          <div>
                            <span className="font-medium text-sm text-slate-800 block" title={prop.owname}>
                              {prop.owname}
                            </span>
                            <span className="text-xs text-slate-400 font-medium block">
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

                      {/* 8. Chevron Indicator */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap w-12">
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#012964] group-hover:translate-x-0.5 transition-all inline-block" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
