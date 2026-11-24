import React, { useState } from "react";
import { CheckSquare, X, RotateCw } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";

interface IBulkApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProposals: ICERProposal[];
  onConfirmBulkApprove: (comments: string) => Promise<void>;
  isProcessing: boolean;
  progressText?: string;
}

export const BulkApprovalModal: React.FC<IBulkApprovalModalProps> = ({
  isOpen,
  onClose,
  selectedProposals,
  onConfirmBulkApprove,
  isProcessing,
  progressText,
}) => {
  const [comments, setComments] = useState("");

  if (!isOpen) return null;

  const totalAmount = selectedProposals.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    await onConfirmBulkApprove(comments.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Bulk Approve Proposals
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirm approval for {selectedProposals.length} selected capital expenditure request{selectedProposals.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close bulk approval dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            <div>
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Selected Proposals
              </span>
              <p className="text-xl font-extrabold text-emerald-950 mt-0.5">
                {selectedProposals.length} <span className="text-xs font-medium text-emerald-700">CERs</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Total Sanction Value
              </span>
              <p className="text-xl font-extrabold text-emerald-950 font-mono mt-0.5">
                USD {totalAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Selected Proposals Preview Table */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Proposals to be Approved
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Proposal ID</th>
                    <th className="py-2 px-3">Project Name</th>
                    <th className="py-2 px-3 text-center">Level</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {selectedProposals.map((prop) => (
                    <tr key={prop.id || prop.cerprno} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {prop.cer_proposal_id || prop.cerprno}
                      </td>
                      <td className="py-2 px-3 truncate max-w-[200px]" title={prop.pr_name}>
                        {prop.pr_name}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#012964]/10 text-[#012964]">
                          L{prop.current_level}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold whitespace-nowrap">
                        {prop.currency || "USD"} {Number(prop.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comment Field */}
          <div className="space-y-1.5">
            <label htmlFor="bulk-approval-comments" className="block text-xs font-semibold text-slate-700">
              Approval Remarks / Comments <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="bulk-approval-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isProcessing}
              rows={3}
              placeholder="Enter remarks applied to all selected proposals..."
              className="w-full p-3 bg-white border border-slate-300 hover:border-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all resize-none disabled:bg-slate-50 disabled:opacity-75"
            />
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2.5 text-xs font-semibold text-emerald-800 animate-pulse">
              <RotateCw className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
              <span>{progressText || "Processing bulk approval..."}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isProcessing || selectedProposals.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Approving...</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  <span>Approve {selectedProposals.length} Proposal{selectedProposals.length === 1 ? "" : "s"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
