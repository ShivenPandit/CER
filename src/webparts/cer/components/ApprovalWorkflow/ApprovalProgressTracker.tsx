import React from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Hourglass,
  Calendar,
  MessageSquare,
  Info,
  Mail,
  ChevronRight,
} from "lucide-react";
import { IWorkflowLevel, IApprovalDecision } from "../../models/WorkflowModel";
import { CERStatus, ICERProposal } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { UserAvatar } from "../Common/UserAvatar";

export interface IApprovalProgressTrackerProps {
  levels: IWorkflowLevel[];
  decisions: IApprovalDecision[];
  currentLevel: number;
  status: CERStatus;
  proposal?: ICERProposal | null;
  currentUser?: IAppUser | null;
}

/**
 * Formats timestamps into a clean, professional date-time string:
 * e.g., "28 Oct 2026, 15:02"
 */
function formatWorkflowDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = d.getDate();
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = (d.getHours() < 10 ? "0" : "") + d.getHours();
    const minutes = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return String(dateInput);
  }
}

export const ApprovalProgressTracker: React.FC<IApprovalProgressTrackerProps> = ({
  levels,
  decisions,
  currentLevel,
  status,
  proposal,
  currentUser,
}) => {
  const activeLevels = levels
    .filter((l) => l.is_active)
    .sort((a, b) => a.level_id - b.level_id);

  // Group active stages into rows of up to 3 stages for responsive multi-row layout
  const rows: IWorkflowLevel[][] = [];
  for (let i = 0; i < activeLevels.length; i += 3) {
    rows.push(activeLevels.slice(i, i + 3));
  }

  const getPendingSinceDate = (lvl: IWorkflowLevel): string | Date | null => {
    if (lvl.level_id === 1) {
      return proposal?.created_date || null;
    }
    const prevDecision = (decisions || []).find(
      (d) => d.level_id === lvl.level_id - 1 && d.decision === "APPROVED"
    );
    if (prevDecision) {
      return prevDecision.timestamp || (prevDecision as any).decision_date || null;
    }
    return proposal?.modified_date || proposal?.created_date || null;
  };

  const isCurrentUserApprover = (lvl: IWorkflowLevel): boolean => {
    if (!currentUser) return false;
    if (
      currentUser.role === "Admin" ||
      (currentUser.roles && currentUser.roles.indexOf("Admin") !== -1)
    ) {
      return true;
    }
    if (
      lvl.approver_email &&
      currentUser.email &&
      lvl.approver_email.toLowerCase() === currentUser.email.toLowerCase()
    ) {
      return true;
    }
    if (
      currentUser.role &&
      lvl.role_title &&
      currentUser.role.toLowerCase() === lvl.role_title.toLowerCase()
    ) {
      return true;
    }
    return false;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
      {/* Workflow Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base tracking-tight">
            Approval workflow
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sequential approval stages
          </p>
        </div>

        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full border ${
            status === "Approved"
              ? "bg-white cer-border-green text-slate-900"
              : status === "Rejected"
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : status === "Draft"
              ? "bg-slate-100 text-slate-700 border-slate-200"
              : status === "Revised"
              ? "bg-purple-50 text-purple-700 border-purple-200"
              : "bg-white cer-border-blue cer-text-blue"
          }`}
        >
          {status === "Approved"
            ? "Workflow Completed"
            : status === "Rejected"
            ? "Workflow Rejected"
            : status === "Draft"
            ? "Draft — Not Submitted"
            : status === "Revised"
            ? "Revised — Pending Resubmission"
            : `Pending at Level ${currentLevel}`}
        </span>
      </div>

      {/* Sequential Stages Rows */}
      <div className="space-y-3 pt-0.5">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex flex-col lg:flex-row items-stretch gap-2.5"
          >
            {row.map((lvl, idx) => {
              const levelDecisions = (decisions || []).filter(
                (d) => d.level_id === lvl.level_id
              );
              const decision =
                levelDecisions.length > 0
                  ? [...levelDecisions].sort((a, b) => {
                      const tA = new Date(
                        (a as any).decision_date || a.timestamp || 0
                      ).getTime();
                      const tB = new Date(
                        (b as any).decision_date || b.timestamp || 0
                      ).getTime();
                      return tB - tA;
                    })[0]
                  : null;

              const effectiveApproverName =
                (decision && decision.approver_name ? decision.approver_name.trim() : "") ||
                (lvl.approver_name ? lvl.approver_name.trim() : "") ||
                (lvl.approver_email ? lvl.approver_email.trim() : "") ||
                lvl.role_title ||
                "Assigned Approver";

              const effectiveApproverEmail =
                (decision && decision.approver_email ? decision.approver_email.trim() : "") ||
                (lvl.approver_email ? lvl.approver_email.trim() : "");

              // State determination
              const isApproved =
                status === "Approved" ||
                (decision && decision.decision === "APPROVED") ||
                (status === "In Approval" && lvl.level_id < currentLevel);

              const isRejected =
                decision && decision.decision === "REJECTED";

              const isSentBack =
                decision && decision.decision === "SENT_BACK";

              const isCurrent =
                !isApproved &&
                !isRejected &&
                !isSentBack &&
                status === "In Approval" &&
                lvl.level_id === currentLevel;

              const isUpcoming =
                !isApproved &&
                !isRejected &&
                !isSentBack &&
                !isCurrent;

              return (
                <React.Fragment key={lvl.level_id}>
                  {/* Stage Card */}
                  <div
                    className={`flex-1 min-w-0 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between transition-all ${
                      isCurrent
                        ? "bg-white border-2 cer-border-blue shadow-sm ring-1 ring-[#012964]/15"
                        : isApproved
                        ? "bg-white border-2 cer-border-green shadow-2xs"
                        : isRejected
                        ? "bg-rose-50/20 border border-rose-300 shadow-2xs"
                        : isSentBack
                        ? "bg-amber-50/20 border border-amber-300 shadow-2xs"
                        : "bg-white border border-slate-200 shadow-2xs"
                    }`}
                  >
                    <div>
                      {/* Top Row: Level Indicator & Status Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 ${
                              isCurrent
                                ? "cer-bg-blue"
                                : isApproved
                                ? "cer-bg-green"
                                : isRejected
                                ? "bg-rose-600 text-white"
                                : isSentBack
                                ? "bg-amber-500 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {lvl.level_id}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              isUpcoming ? "text-slate-500" : "text-slate-800"
                            }`}
                          >
                            Level {lvl.level_id}
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold cer-bg-blue px-2.5 py-0.5 rounded-full shadow-2xs shrink-0">
                            <Clock className="w-3 h-3 text-white" />
                            <span>Action required</span>
                          </span>
                        ) : isApproved ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold cer-border-green border px-2.5 py-0.5 rounded-full shrink-0 bg-white"
                            style={{ color: "var(--cer-brand-blue)" }}
                          >
                            <CheckCircle2 className="w-3 h-3 cer-text-green" />
                            <span>Approved</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full shrink-0">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Rejected</span>
                          </span>
                        ) : isSentBack ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full shrink-0">
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            <span>Sent Back</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full shrink-0">
                            <Hourglass className="w-3 h-3 text-slate-500" />
                            <span>Upcoming</span>
                          </span>
                        )}
                      </div>

                      {/* Role & Level Name */}
                      <div className="mt-2">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                          {lvl.role_title || lvl.level_name}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                          {lvl.level_name}
                        </p>
                      </div>

                      {/* Approver Person Row */}
                      <div className="flex items-center gap-2 mt-2">
                        <UserAvatar
                          name={effectiveApproverName}
                          email={effectiveApproverEmail}
                          size="xs"
                        />
                        <span
                          className={`text-xs font-medium truncate ${
                            isUpcoming ? "text-slate-600" : "text-slate-800"
                          }`}
                          title={effectiveApproverName}
                        >
                          {effectiveApproverName}
                        </span>
                      </div>
                    </div>

                    {/* Footer Details */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                      {isApproved ? (
                        <>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-medium">Approved on</p>
                            <p className="text-[11px] text-slate-700 font-medium flex items-center gap-1 mt-0.5 truncate">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {formatWorkflowDate(
                                  decision?.timestamp ||
                                    (decision as any)?.decision_date ||
                                    proposal?.modified_date
                                )}
                              </span>
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-medium">Comments</p>
                            <p
                              className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 truncate"
                              title={decision?.comments || "No comments provided"}
                            >
                              <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate italic">
                                "{decision?.comments || "No comments provided"}"
                              </span>
                            </p>
                          </div>
                        </>
                      ) : isCurrent ? (
                        <>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-medium">Pending since</p>
                            <p className="text-[11px] text-slate-700 font-medium flex items-center gap-1 mt-0.5 truncate">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {formatWorkflowDate(getPendingSinceDate(lvl))}
                              </span>
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-medium">
                              {isCurrentUserApprover(lvl) ? "Awaiting your action" : "Awaiting decision"}
                            </p>
                            <p className="text-[11px] cer-text-blue font-medium flex items-center gap-1 mt-0.5 truncate">
                              <Info className="w-3 h-3 cer-text-blue shrink-0" />
                              <span className="truncate">
                                {isCurrentUserApprover(lvl)
                                  ? "Please review and approve"
                                  : "Under review"}
                              </span>
                            </p>
                          </div>
                        </>
                      ) : isRejected ? (
                        <>
                          <div className="min-w-0">
                            <p className="text-[10px] text-rose-500 font-medium">Rejected on</p>
                            <p className="text-[11px] text-slate-700 font-medium flex items-center gap-1 mt-0.5 truncate">
                              <Calendar className="w-3 h-3 text-rose-400 shrink-0" />
                              <span className="truncate">
                                {formatWorkflowDate(
                                  decision?.timestamp || (decision as any)?.decision_date
                                )}
                              </span>
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-rose-500 font-medium">Reason</p>
                            <p
                              className="text-[11px] text-rose-700 flex items-center gap-1 mt-0.5 truncate"
                              title={decision?.comments || "Proposal rejected"}
                            >
                              <MessageSquare className="w-3 h-3 text-rose-400 shrink-0" />
                              <span className="truncate italic">
                                "{decision?.comments || "Rejected without comment"}"
                              </span>
                            </p>
                          </div>
                        </>
                      ) : isSentBack ? (
                        <>
                          <div className="min-w-0">
                            <p className="text-[10px] text-amber-600 font-medium">Sent back on</p>
                            <p className="text-[11px] text-slate-700 font-medium flex items-center gap-1 mt-0.5 truncate">
                              <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate">
                                {formatWorkflowDate(
                                  decision?.timestamp || (decision as any)?.decision_date
                                )}
                              </span>
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-amber-600 font-medium">Remarks</p>
                            <p
                              className="text-[11px] text-amber-800 flex items-center gap-1 mt-0.5 truncate"
                              title={decision?.comments || "Sent back for revision"}
                            >
                              <MessageSquare className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate italic">
                                "{decision?.comments || "Sent back for revision"}"
                              </span>
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-medium">Status</p>
                            <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1 mt-0.5 truncate">
                              <Hourglass className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">Pending prior level</span>
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-medium invisible sm:visible">Timeline</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">
                                After Level {lvl.level_id - 1} approval
                              </span>
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Directional Connector Chevron between stages */}
                  {idx < row.length - 1 && (
                    <div className="hidden lg:flex items-center justify-center shrink-0 self-center px-0.5">
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* If row has fewer than 3 items, fill remaining slots to maintain identical widths */}
            {row.length < 3 &&
              Array.from({ length: 3 - row.length }).map((_, i) => (
                <React.Fragment key={`filler-${i}`}>
                  <div className="hidden lg:flex items-center justify-center shrink-0 self-center px-0.5 opacity-0 pointer-events-none">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <div className="hidden lg:block flex-1 min-w-0 pointer-events-none" />
                </React.Fragment>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};
