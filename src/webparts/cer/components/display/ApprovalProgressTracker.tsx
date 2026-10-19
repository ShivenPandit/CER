import React from "react";
import { CheckCircle2, Clock, XCircle, AlertCircle, User } from "lucide-react";
import { IWorkflowLevel, IApprovalDecision } from "../../models/WorkflowModel";
import { CERStatus } from "../../models/CERModel";

interface IApprovalProgressTrackerProps {
  levels: IWorkflowLevel[];
  decisions: IApprovalDecision[];
  currentLevel: number;
  status: CERStatus;
}

export const ApprovalProgressTracker: React.FC<IApprovalProgressTrackerProps> = ({
  levels,
  decisions,
  currentLevel,
  status,
}) => {
  const activeLevels = levels.filter((l) => l.is_active).sort((a, b) => a.level_id - b.level_id);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            Multilevel Approval Workflow Pipeline
          </h3>
          <p className="text-xs text-slate-500">
            Current Stage & Sequential Delegation Matrix (Doc §8 #15)
          </p>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {status === "Approved"
            ? "Workflow Completed"
            : status === "Rejected"
            ? "Workflow Rejected"
            : `Pending Level ${currentLevel}`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {activeLevels.map((lvl) => {
          const decision = decisions.find((d) => d.level_id === lvl.level_id);
          const isCurrent = status === "In Approval" && currentLevel === lvl.level_id;
          const isPassed = decision && decision.decision === "APPROVED";
          const isRejected = decision && decision.decision === "REJECTED";
          const isUpcoming = currentLevel < lvl.level_id && !decision;

          let cardBorder = "border-slate-200 bg-slate-50/50";
          let badgeColor = "bg-slate-200 text-slate-600";
          let statusText = "Pending Prior Levels";
          let StatusIcon = Clock;

          if (isPassed) {
            cardBorder = "border-emerald-200 bg-emerald-50/30";
            badgeColor = "bg-emerald-100 text-emerald-800";
            statusText = "Approved";
            StatusIcon = CheckCircle2;
          } else if (isRejected) {
            cardBorder = "border-rose-200 bg-rose-50/30";
            badgeColor = "bg-rose-100 text-rose-800";
            statusText = "Rejected";
            StatusIcon = XCircle;
          } else if (isCurrent) {
            cardBorder = "border-blue-300 bg-blue-50/40 ring-2 ring-blue-500/20";
            badgeColor = "bg-blue-600 text-white animate-pulse";
            statusText = "Action Required Now";
            StatusIcon = Clock;
          }

          return (
            <div
              key={lvl.level_id}
              className={`p-4 rounded-xl border transition-all ${cardBorder} flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Level {lvl.level_id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusText}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-xs">{lvl.level_name}</h4>
                <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                  {lvl.role_title}
                </p>

                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{lvl.approver_name}</span>
                </div>
              </div>

              {decision && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] space-y-1">
                  <p className="text-slate-600 italic">
                    "{decision.comments || "No comments provided"}"
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Decision on: {new Date(decision.timestamp).toLocaleString("en-GB")}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
