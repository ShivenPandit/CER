import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, RotateCcw, X, AlertTriangle, Paperclip, FileText, User, ShieldAlert } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { IAppUser } from "../../models/UserModel";
import { PermissionService } from "../../services/PermissionService";
import { UserAvatar } from "../Common/UserAvatar";
import { sanitizeMultiLineText, stripAttachmentsManifest } from "../../utils/sanitizationUtils";
import { useModalScrollLock } from "../../hooks/useModalScrollLock";

interface IApprovalDecisionModalProps {
  proposal: ICERProposal;
  currentLevelConfig?: IWorkflowLevel;
  attachments: ICERAttachment[];
  currentUser: IAppUser;
  isOpen: boolean;
  onClose: () => void;
  onSubmitDecision: (decision: "APPROVED" | "REJECTED" | "SENT_BACK", comments: string) => Promise<void>;
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
  // Lock background scroll when modal is open
  useModalScrollLock(isOpen);

  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "SENT_BACK">("APPROVED");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Cleanly reset comments, decision, and validation errors whenever modal opens or switches proposals
  useEffect(() => {
    if (isOpen) {
      setDecision("APPROVED");
      setComments("");
      setError(null);
      setCommentError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, proposal?.cerprno, proposal?.id, proposal?.current_level]);

  const handleClose = () => {
    setComments("");
    setDecision("APPROVED");
    setError(null);
    setCommentError(null);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  const authCheck = PermissionService.canApproveCER(proposal, currentUser, currentLevelConfig);

  const handleSubmit = async () => {
    setError(null);
    setCommentError(null);

    if (!authCheck.allowed) {
      setError(authCheck.reason || "Unauthorized to act on this proposal.");
      return;
    }
    if (decision === "REJECTED" && !comments.trim()) {
      setCommentError("Please provide a mandatory justification comment for rejecting this proposal.");
      return;
    }
    if (decision === "SENT_BACK" && !comments.trim()) {
      setCommentError("Please provide mandatory comments explaining what needs to be changed or corrected by the initiator.");
      return;
    }

    const sanitizedComments = sanitizeMultiLineText(comments);

    setIsSubmitting(true);
    try {
      await onSubmitDecision(decision, sanitizedComments);
      setComments("");
      setDecision("APPROVED");
      setError(null);
      setCommentError(null);
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to record decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overscroll-contain animate-fade-in"
      style={{ overscrollBehavior: "contain" }}
      onWheel={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] overscroll-contain"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <span className="text-xs sm:text-[13px] font-bold text-blue-600 uppercase tracking-wider">
              {currentLevelConfig ? currentLevelConfig.level_name : `Approval Level ${proposal.current_level}`}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              Review Proposal: {proposal.cerprno}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          className="p-6 overflow-y-auto space-y-5 text-sm overscroll-contain cer-modal-scrollable"
          style={{ overscrollBehavior: "contain" }}
        >
          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-base sm:text-[17px] text-slate-900 leading-snug">{proposal.pr_name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <UserAvatar
                    name={proposal.owname}
                    email={proposal.owner_email}
                    size="xs"
                  />
                  <p className="text-slate-600 text-xs sm:text-[13px]">
                    Initiated by <strong className="text-slate-900 font-semibold">{proposal.owname}</strong>
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Amount</span>
                <p className="text-xl sm:text-2xl font-extrabold text-blue-700 tracking-tight mt-0.5">
                  {proposal.currency} {proposal.amount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-200 text-slate-700 text-xs sm:text-[13px]">
              <div>
                <span className="text-slate-500 font-medium">Category:</span>{" "}
                <strong className="text-slate-900 font-semibold">{proposal.cat}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Payback:</span>{" "}
                <strong className="text-slate-900 font-semibold">{proposal.payable}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">NPV / IRR:</span>{" "}
                <strong className="text-slate-900 font-semibold">
                  ${proposal.ben_npv}M / {proposal.ben_irr}%
                </strong>
              </div>
            </div>
          </div>

          {/* Authorization Warning Banner */}
          {!authCheck.allowed && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Authorization Restriction</p>
                <p className="text-rose-700 mt-0.5 leading-relaxed">{authCheck.reason}</p>
              </div>
            </div>
          )}

          {/* Narrative Remarks Preview */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <p className="font-semibold text-slate-900 text-sm mb-1.5">Justification:</p>
            <p className="text-slate-700 text-sm leading-relaxed max-h-32 overflow-y-auto pr-2">
              {stripAttachmentsManifest(proposal.remarks) || "No narrative remarks provided."}
            </p>
          </div>

          {/* Attachments Visibility During Approval (Doc §8 #14) */}
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm mb-2">
              <Paperclip className="w-4 h-4 text-slate-500" />
              <span>Attachments ({attachments.length})</span>
            </div>
            {attachments.length === 0 ? (
              <p className="text-slate-500 italic text-xs">No attachments.</p>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="font-medium text-slate-900 truncate">{att.name}</span>
                      <span className="text-slate-500 text-xs">
                        ({(att.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    {att.data_url && (
                      <a
                        href={att.data_url}
                        download={att.name}
                        className="text-blue-700 hover:underline font-semibold shrink-0 ml-2 text-sm"
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
            <label className="block font-semibold text-slate-900 text-sm mb-2">
              Approval Decision <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDecision("APPROVED");
                  setCommentError(null);
                  setError(null);
                }}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition-all text-center cursor-pointer ${
                  decision === "APPROVED"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold">Approve</span>
                </div>
                <span className="text-xs font-normal text-emerald-800">Advance to next level</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDecision("SENT_BACK");
                  setCommentError(null);
                  setError(null);
                }}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition-all text-center cursor-pointer ${
                  decision === "SENT_BACK"
                    ? "bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-500/20 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-bold">Send Back</span>
                </div>
                <span className="text-xs font-normal text-amber-800">Return for revision</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDecision("REJECTED");
                  setCommentError(null);
                  setError(null);
                }}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition-all text-center cursor-pointer ${
                  decision === "REJECTED"
                    ? "bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-500/20 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-sm font-bold">Reject</span>
                </div>
                <span className="text-xs font-normal text-rose-800">Permanent rejection</span>
              </button>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block font-semibold text-slate-900 text-sm mb-1.5">
              Comments{" "}
              {decision === "REJECTED" && (
                <span className="text-rose-600 font-semibold ml-1">
                  (Required) <span className="text-rose-500 font-bold">*</span>
                </span>
              )}
              {decision === "SENT_BACK" && (
                <span className="text-amber-700 font-semibold ml-1">
                  (Required) <span className="text-rose-500 font-bold">*</span>
                </span>
              )}
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
                if (commentError && e.target.value.trim()) {
                  setCommentError(null);
                }
              }}
              placeholder={
                decision === "APPROVED"
                  ? "Enter optional comments..."
                  : decision === "SENT_BACK"
                  ? "State required revisions..."
                  : "State reason for rejection..."
              }
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 resize-none text-sm ${
                commentError
                  ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20"
                  : "border-slate-300 hover:border-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              }`}
              required={decision === "REJECTED" || decision === "SENT_BACK"}
              aria-invalid={Boolean(commentError)}
            />
            {commentError && (
              <p className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1.5 animate-shake">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{commentError}</span>
              </p>
            )}
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs sm:text-[13px] text-slate-600 flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-500" />
            <span>Signing as: <strong className="text-slate-900 font-semibold">{currentUser.name}</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !authCheck.allowed}
              className={`h-10 px-5 text-sm font-semibold rounded-xl shadow-sm transition-all ${
                !authCheck.allowed
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                  : decision === "APPROVED"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  : decision === "SENT_BACK"
                  ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  : "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              }`}
            >
              {isSubmitting
                ? "Submitting..."
                : decision === "APPROVED"
                ? "Approve"
                : decision === "SENT_BACK"
                ? "Send Back"
                : "Reject"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
