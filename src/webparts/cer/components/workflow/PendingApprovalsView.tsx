import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  CheckSquare,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { IAppUser } from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { ApprovalDecisionModal } from "./ApprovalDecisionModal";

interface IPendingApprovalsViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  onNavigateToDisplay: (cerprno: string) => void;
  onRefreshProposals: () => Promise<void>;
}

export const PendingApprovalsView: React.FC<IPendingApprovalsViewProps> = ({
  dataService,
  currentUser,
  onNavigateToDisplay,
  onRefreshProposals,
}) => {
  const [proposals, setProposals] = useState<ICERProposal[]>([]);
  const [levels, setLevels] = useState<IWorkflowLevel[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ICERProposal | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<ICERAttachment[]>([]);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [allProps, allLevels] = await Promise.all([
        dataService.getAllProposals(),
        dataService.getWorkflowLevels(),
      ]);
      setProposals(allProps);
      setLevels(allLevels);
    } catch (e) {
      console.error("Error loading pending approvals:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData().catch((e) => console.error(e));
  }, [currentUser]);

  // Filter proposals awaiting action by current user or all in approval if Admin
  const pendingList = proposals.filter((p) => {
    if (p.status !== "In Approval") return false;
    if (currentUser.role === "Admin" || currentUser.role === "Finance_Audit") return true;
    if (currentUser.role === "Approver") {
      return p.current_level === (currentUser.approval_level || 1);
    }
    return false;
  });

  const handleOpenDecision = async (prop: ICERProposal) => {
    setSelectedProposal(prop);
    const atts = await dataService.getAttachments(prop.cerprno);
    setSelectedAttachments(atts);
    setIsDecisionModalOpen(true);
  };

  const handleSubmitDecision = async (decision: "APPROVED" | "REJECTED", comments: string) => {
    if (!selectedProposal) return;

    const result = await dataService.recordDecision({
      cerprno: selectedProposal.cerprno,
      level_id: selectedProposal.current_level,
      approver_name: currentUser.name,
      approver_email: currentUser.email,
      decision,
      comments,
    });

    setFeedbackNotice(
      decision === "APPROVED"
        ? `Proposal ${selectedProposal.cerprno} successfully APPROVED. Advanced to ${result.newStatus}.`
        : `Proposal ${selectedProposal.cerprno} REJECTED and returned to Initiator.`
    );

    await loadData();
    await onRefreshProposals();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pending Approval Tasks & Decision Queue
          </h2>
          <p className="text-xs text-slate-500">
            Form FR-05: Review proposal details, examine supporting attachments, and record formal decisions
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          {pendingList.length} Tasks Pending Your Review
        </span>
      </div>

      {feedbackNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{feedbackNotice}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending Items Cards Grid */}
      <div className="space-y-4">
        {pendingList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
            <h3 className="font-bold text-slate-800 text-sm">No Pending Approvals</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no CER proposals currently awaiting your approval level. New workflow items will appear here when submitted.
            </p>
          </div>
        ) : (
          pendingList.map((prop) => {
            const currentLevelCfg = levels.find((l) => l.level_id === prop.current_level);

            return (
              <div
                key={prop.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {prop.cerprno}
                    </span>
                    <CategoryBadge category={prop.cat} />
                    <StatusBadge status={prop.status} size="sm" />
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Level {prop.current_level}: {currentLevelCfg ? currentLevelCfg.level_name : prop.pending_with_role}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">
                    {prop.pr_name}
                  </h3>

                  <p className="text-xs text-slate-500">
                    Owner: <strong>{prop.owname}</strong> ({prop.owner_email}) • SBU:{" "}
                    <strong>{prop.sbu}</strong> • Duration: {prop.period}
                  </p>

                  <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                    {prop.remarks || "No narrative remarks provided."}
                  </p>
                </div>

                <div className="flex flex-col md:items-end justify-between shrink-0 gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Expenditure Amount
                    </span>
                    <p className="text-xl font-extrabold text-slate-900">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigateToDisplay(prop.cerprno)}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

                    <button
                      onClick={() => handleOpenDecision(prop)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] flex items-center gap-1.5"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Review & Decide</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Decision Modal */}
      {selectedProposal && (
        <ApprovalDecisionModal
          proposal={selectedProposal}
          currentLevelConfig={levels.find((l) => l.level_id === selectedProposal.current_level)}
          attachments={selectedAttachments}
          currentUser={currentUser}
          isOpen={isDecisionModalOpen}
          onClose={() => setIsDecisionModalOpen(false)}
          onSubmitDecision={handleSubmitDecision}
        />
      )}
    </div>
  );
};
