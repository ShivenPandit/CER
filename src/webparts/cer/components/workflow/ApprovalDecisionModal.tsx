import React, { useState } from "react";
import { CheckCircle2, XCircle, X, AlertTriangle, Paperclip, FileText, User } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { IAppUser } from "../../models/UserModel";

interface IApprovalDecisionModalProps {
  proposal: ICERProposal;
  currentLevelConfig?: IWorkflowLevel;
  attachments: ICERAttachment[];
  currentUser: IAppUser;
  isOpen: boolean;
  onClose: () => void;
  onSubmitDecision: (decision: "APPROVED" | "REJECTED", comments: string) => Promise<void>;
}

export const ApprovalDecisionModal: React.FC<IApprovalDecisionModalProps> = ({
  proposal,
  currentLevelConfig,
  attachments,
  currentUser,
  isOpen,
  onClose,
  onSubmitDecision,
}) => {
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError(null);
    if (decision === "REJECTED" && !comments.trim()) {
      setError("Please provide a mandatory justification comment for rejecting this proposal.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitDecision(decision, comments.trim());
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to record decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              {currentLevelConfig ? currentLevelConfig.level_name : `Approval Level ${proposal.current_level}`}
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Review CER Proposal: {proposal.cerprno}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-sm text-slate-900">{proposal.pr_name}</p>
                <p className="text-slate-500 mt-0.5">
                  Initiated by {proposal.owname} ({proposal.owner_email}) • SBU: {proposal.sbu}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Amount</span>
                <p className="text-base font-extrabold text-blue-700">
                  {proposal.currency} {proposal.amount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-slate-600">
              <div>
                <span className="text-slate-400 font-medium">Category:</span>{" "}
                <strong className="text-slate-800">{proposal.cat}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Payback:</span>{" "}
                <strong className="text-slate-800">{proposal.payable}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">NPV / IRR:</span>{" "}
                <strong className="text-slate-800">
                  ${proposal.ben_npv}M / {proposal.ben_irr}%
                </strong>
              </div>
            </div>
          </div>

          {/* Narrative Remarks Preview */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <p className="font-semibold text-slate-800 mb-1">Business Justification Remarks:</p>
            <p className="text-slate-600 leading-relaxed max-h-32 overflow-y-auto pr-2">
              {proposal.remarks || "No narrative remarks provided."}
            </p>
          </div>

          {/* Attachments Visibility During Approval (Doc §8 #14) */}
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-2">
              <Paperclip className="w-4 h-4 text-slate-500" />
              <span>Supporting Documents & Attachments ({attachments.length})</span>
            </div>
            {attachments.length === 0 ? (
              <p className="text-slate-400 italic text-[11px]">No supporting files attached.</p>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{att.name}</span>
                      <span className="text-slate-400 text-[10px]">
                        ({(att.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    {att.data_url && (
                      <a
                        href={att.data_url}
                        download={att.name}
                        className="text-blue-600 hover:underline font-semibold shrink-0 ml-2"
                      >
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decision Selector */}
          <div>
            <label className="block font-semibold text-slate-800 mb-2">
              Approval Decision <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision("APPROVED")}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                  decision === "APPROVED"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Approve & Advance Level</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("REJECTED")}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                  decision === "REJECTED"
                    ? "bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-500/20 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Reject & Return to Initiator</span>
              </button>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              Reviewer Comments & Justification{" "}
              {decision === "REJECTED" && <span className="text-rose-500">(Mandatory for rejection)</span>}
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                decision === "APPROVED"
                  ? "Enter optional endorsement notes or approval conditions..."
                  : "State specific reason for rejection, missing documentation, or necessary adjustments..."
              }
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder:text-slate-400 resize-none text-xs"
              required={decision === "REJECTED"}
            />
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Signing as: <strong>{currentUser.name}</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-all ${
                decision === "APPROVED"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isSubmitting ? "Submitting Decision..." : `Confirm ${decision === "APPROVED" ? "Approval" : "Rejection"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
