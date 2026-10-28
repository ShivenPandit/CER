import React, { useState, useEffect } from "react";
import {
  History,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  User,
  ShieldCheck,
  Calendar,
  MessageSquare,
  ChevronRight,
  Filter,
  Info,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IWorkflowLevel, IApprovalDecision, isProjectOwnerStage } from "../../models/WorkflowModel";
import { ICERDataService } from "../../services/ICERDataService";
import { StatusBadge } from "../Shared/StatusBadge";
import { CategoryBadge } from "../Shared/CategoryBadge";
import { UserAvatar } from "../Common/UserAvatar";

interface IStatusHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ICERProposal;
  levels: IWorkflowLevel[];
  decisions: IApprovalDecision[];
  dataService: ICERDataService;
}

export const StatusHistoryModal: React.FC<IStatusHistoryModalProps> = ({
  isOpen,
  onClose,
  proposal,
  levels,
  decisions: initialDecisions,
  dataService,
}) => {
  const [decisions, setDecisions] = useState<IApprovalDecision[]>(initialDecisions || []);
  const [activeTab, setActiveTab] = useState<"stages" | "log">("stages");
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");

  // Load fresh decisions from dataService when opened
  useEffect(() => {
    if (isOpen && proposal?.cerprno) {
      setIsLoading(true);
      const fetchFreshDecisions = async () => {
        try {
          const latest = await dataService.getApprovalDecisions(proposal.cerprno, true);
          setDecisions(latest);
        } catch (err) {
          console.error("Error refreshing approval decisions:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchFreshDecisions().catch((e) => console.error(e));
    }
  }, [isOpen, proposal?.cerprno]);

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

  if (!isOpen || !proposal) return null;

  const sortedLevels = [...levels]
    .filter((l) => l.is_active)
    .sort((a, b) => a.level_id - b.level_id);

  const sortedDecisions = [...decisions].sort((a, b) => {
    const tA = new Date((a as any).decision_date || a.timestamp || 0).getTime();
    const tB = new Date((b as any).decision_date || b.timestamp || 0).getTime();
    return tB - tA;
  });

  const filteredDecisions = sortedDecisions.filter((d) => {
    if (filterType === "ALL") return true;
    return d.decision === filterType;
  });

  const approvedCount = decisions.filter((d) => d.decision === "APPROVED").length;
  const rejectedCount = decisions.filter((d) => d.decision === "REJECTED").length;
  const sentBackCount = decisions.filter((d) => d.decision === "SENT_BACK").length;

  const formatDecisionDate = (timestampStr?: string): string => {
    if (!timestampStr) return "N/A";
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="cer-display-scope fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-900 text-white shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-white border border-white/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                  {proposal.cerprno}
                </span>
                <CategoryBadge category={proposal.cat} />
                <StatusBadge status={proposal.status} size="sm" />
              </div>
              <h3 className="text-base font-bold text-white mt-1 leading-snug">
                Status & Approval History — {proposal.pr_name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200/80 text-xs shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">SBU Workflow Path</span>
            <p className="font-bold text-slate-800 mt-0.5 truncate">
              {proposal.sbu || "Standard"} ({sortedLevels.length} Levels)
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Stage</span>
            <p className="font-bold cer-text-blue mt-0.5 truncate">
              {proposal.status === "Approved"
                ? "Completed"
                : proposal.status === "Rejected"
                ? "Rejected"
                : proposal.status === "Revised"
                ? "Pending Initiator Rework"
                : `Level ${proposal.current_level}: ${proposal.pending_with_role || "Approver"}`}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Decisions Recorded</span>
            <p className="font-bold text-slate-800 mt-0.5">
              <span className="cer-text-blue font-bold">{approvedCount} Approved</span>
              {rejectedCount > 0 && <span className="text-rose-600 ml-1.5">• {rejectedCount} Rejected</span>}
              {sentBackCount > 0 && <span className="text-amber-600 ml-1.5">• {sentBackCount} Sent Back</span>}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sanction Amount</span>
            <p className="font-bold text-slate-900 mt-0.5">
              {proposal.currency} {proposal.amount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("stages")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "stages"
                  ? "border-b-2 bg-slate-50 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              style={activeTab === "stages" ? { borderColor: "var(--cer-brand-blue)", color: "var(--cer-brand-blue)" } : undefined}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Workflow Stages Matrix ({sortedLevels.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("log")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "log"
                  ? "border-b-2 bg-slate-50 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              style={activeTab === "log" ? { borderColor: "var(--cer-brand-blue)", color: "var(--cer-brand-blue)" } : undefined}
            >
              <History className="w-4 h-4" />
              <span>Chronological Decision Log ({decisions.length})</span>
            </button>
          </div>

          {activeTab === "log" && (
            <div className="flex items-center gap-1.5 pb-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cer-input-focus"
              >
                <option value="ALL">All Outcomes</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SENT_BACK">Sent Back</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/40">
          {isLoading && decisions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto cer-text-blue animate-spin mb-2" />
              <p className="text-xs font-medium">Loading status and decision history...</p>
            </div>
          ) : activeTab === "stages" ? (
            /* Workflow Stages Matrix */
            <div className="space-y-3">
              {sortedLevels.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No workflow levels configured for SBU: {proposal.sbu}
                </div>
              ) : (
                sortedLevels.map((lvl, index) => {
                  const levelDecisions = decisions.filter((d) => d.level_id === lvl.level_id);
                  const latestDecision = levelDecisions.length > 0
                    ? [...levelDecisions].sort((a, b) => {
                        const tA = new Date((a as any).decision_date || a.timestamp || 0).getTime();
                        const tB = new Date((b as any).decision_date || b.timestamp || 0).getTime();
                        return tB - tA;
                      })[0]
                    : null;

                  const isCurrentPending =
                    proposal.status === "In Approval" && proposal.current_level === lvl.level_id;

                  const isPassed =
                    (latestDecision && latestDecision.decision === "APPROVED") ||
                    (proposal.status === "Approved") ||
                    (proposal.status === "In Approval" && proposal.current_level > lvl.level_id);

                  const isRejected = latestDecision && latestDecision.decision === "REJECTED";
                  const isSentBack = latestDecision && latestDecision.decision === "SENT_BACK";
                  const isUpcoming =
                    proposal.status === "In Approval" && proposal.current_level < lvl.level_id;

                  // Determine display state
                  let stageBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Upcoming Stage</span>
                    </span>
                  );

                  let cardBorder = "border-slate-200 bg-white";

                  if (isPassed && !isRejected && !isSentBack) {
                    cardBorder = "border-2 cer-border-green bg-white";
                    stageBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white border cer-border-green" style={{ color: "var(--cer-brand-blue)" }}>
                        <CheckCircle2 className="w-3.5 h-3.5 cer-text-green" />
                        <span>Level Approved</span>
                      </span>
                    );
                  } else if (isRejected) {
                    cardBorder = "border-rose-300 bg-rose-50/30 ring-1 ring-rose-400/20";
                    stageBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Proposal Rejected</span>
                      </span>
                    );
                  } else if (isSentBack) {
                    cardBorder = "border-amber-300 bg-amber-50/30";
                    stageBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        <span>Sent Back for Revision</span>
                      </span>
                    );
                  } else if (isCurrentPending) {
                    cardBorder = "border-2 cer-border-blue bg-white shadow-sm ring-1 ring-[#012964]/15";
                    stageBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cer-bg-blue">
                        <Clock className="w-3.5 h-3.5 text-white" />
                        <span>Currently Pending Review</span>
                      </span>
                    );
                  }

                  const isPOStage = isProjectOwnerStage(lvl);
                  const configuredApproverName = isPOStage
                    ? `${proposal.owname || "Project Owner"} (Project Owner)`
                    : lvl.approver_name || lvl.role_title || "Assigned Level Approver";
                  const configuredApproverEmail = isPOStage
                    ? proposal.owner_email || ""
                    : lvl.approver_email || "";

                  return (
                    <div
                      key={lvl.level_id}
                      className={`p-4 rounded-xl border transition-all ${cardBorder}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {lvl.level_id}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900">
                                {lvl.level_name}
                              </h4>
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                Role: {lvl.role_title}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Assigned: <strong className="text-slate-700">{configuredApproverName}</strong>
                              {configuredApproverEmail && (
                                <span className="text-slate-400"> ({configuredApproverEmail})</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="self-start sm:self-center shrink-0">
                          {stageBadge}
                        </div>
                      </div>

                      {/* Decision Details if recorded */}
                      {latestDecision ? (
                        <div className="mt-3 pt-1 flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 text-slate-600">
                              <UserAvatar name={latestDecision.approver_name} size="xs" />
                              <span>
                                Action by:{" "}
                                <strong className="text-slate-900">{latestDecision.approver_name}</strong>
                                {latestDecision.approver_email && (
                                  <span className="text-slate-400 ml-1">
                                    &lt;{latestDecision.approver_email}&gt;
                                  </span>
                                )}
                              </span>
                            </div>

                            {latestDecision.comments ? (
                              <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 text-xs mt-1.5 shadow-2xs">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-500 mb-1">
                                  <MessageSquare className="w-3 h-3 text-slate-400" />
                                  <span>Approver Comments / Remarks:</span>
                                </div>
                                <p className="italic text-slate-800 whitespace-pre-wrap">
                                  "{latestDecision.comments}"
                                </p>
                              </div>
                            ) : (
                              <p className="text-slate-400 italic text-[11px]">
                                No additional comments provided by approver.
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-500 shrink-0 self-end md:self-start bg-slate-100 px-2.5 py-1 rounded-md text-[11px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatDecisionDate(latestDecision.timestamp)}</span>
                          </div>
                        </div>
                      ) : isCurrentPending ? (
                        <div className="mt-3 bg-white p-3 rounded-lg border cer-border-blue cer-text-blue text-xs flex items-center gap-2.5">
                          <Clock className="w-4 h-4 cer-text-blue shrink-0" />
                          <span>
                            Proposal is currently in review at this level. Pending decision from{" "}
                            <strong>{configuredApproverName}</strong>.
                          </span>
                        </div>
                      ) : isUpcoming ? (
                        <div className="mt-2 text-slate-400 text-xs flex items-center gap-1.5">
                          <Info className="w-3 h-3" />
                          <span>Will be routed to this stage once prior levels are approved.</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Chronological Decision Log */
            <div className="space-y-3">
              {filteredDecisions.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                  <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-sm text-slate-700">No Decision Records Found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {filterType !== "ALL"
                      ? `No decisions match the filter '${filterType}'.`
                      : "This proposal has not yet had any formal decisions recorded by approvers."}
                  </p>
                </div>
              ) : (
                filteredDecisions.map((dec, idx) => {
                  const isApproved = dec.decision === "APPROVED";
                  const isRejected = dec.decision === "REJECTED";
                  const isSentBack = dec.decision === "SENT_BACK";

                  return (
                    <div
                      key={dec.id || idx}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              isApproved
                                ? "bg-white cer-border-green"
                                : isRejected
                                ? "bg-rose-50 text-rose-800 border-rose-300"
                                : isSentBack
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-white cer-border-blue cer-text-blue"
                            }`}
                            style={isApproved ? { color: "var(--cer-brand-blue)" } : undefined}
                          >
                            {isApproved && <CheckCircle2 className="w-3.5 h-3.5 cer-text-green" />}
                            {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            {isSentBack && <RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
                            <span>{dec.decision}</span>
                          </span>

                          <span className="font-bold text-slate-800">
                            Level {dec.level_id}: {dec.level_name || "Workflow Stage"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDecisionDate(dec.timestamp)}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <UserAvatar name={dec.approver_name} size="sm" />
                        <div className="space-y-1.5 flex-1 min-w-0 text-xs">
                          <p className="font-semibold text-slate-800">
                            {dec.approver_name}
                            {dec.approver_email && (
                              <span className="text-slate-400 font-normal ml-1">
                                ({dec.approver_email})
                              </span>
                            )}
                          </p>

                          {dec.comments ? (
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-slate-700 italic">
                              "{dec.comments}"
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-[11px]">
                              No comments provided.
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0">
          <p className="text-xs text-slate-400">
            Records stored permanently in SharePoint list{" "}
            <span className="font-mono text-slate-600">CERApprovalDecisions</span>
          </p>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
