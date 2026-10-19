import React from "react";
import { MessageSquare, ShieldAlert, History } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { WordCounter } from "../common/WordCounter";

interface IRemarksSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  isReadOnly?: boolean;
  onViewRemarksHistory?: () => void;
}

export const RemarksSection: React.FC<IRemarksSectionProps> = ({
  formData,
  onChange,
  isReadOnly = false,
  onViewRemarksHistory,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section G: Business Justification & Remarks
            </h3>
            <p className="text-xs text-slate-500">
              Detailed narrative justification, non-payback rationale, and JV risk comments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewRemarksHistory && (
            <button
              type="button"
              onClick={onViewRemarksHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Remarks History</span>
            </button>
          )}
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            FR-08
          </span>
        </div>
      </div>

      <div className="space-y-4 text-xs">
        {/* Main Justification Remarks */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Business Justification Remarks (including Justification for Non Payback expenditure, etc.) <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={5}
            disabled={isReadOnly}
            value={formData.remarks}
            onChange={(e) => onChange("remarks", e.target.value)}
            placeholder="Enter thorough business background, technical necessity, operational urgency, and risk mitigation details (target: 350–400 words)..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 leading-relaxed resize-y"
            required
          />
          {/* Real-time Word Counter adhering to 350–400 word rule */}
          <WordCounter text={formData.remarks} minLimit={350} maxLimit={400} />
        </div>

        {/* Remarks related to JV Risk */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Remarks Related to Joint Venture (JV) Risk
          </label>
          <textarea
            rows={2}
            disabled={isReadOnly}
            value={formData.remarks_jv}
            onChange={(e) => onChange("remarks_jv", e.target.value)}
            placeholder="Describe any partner alignment risks, cash call considerations, or regulatory consents..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 leading-relaxed resize-none"
          />
        </div>
      </div>
    </div>
  );
};
