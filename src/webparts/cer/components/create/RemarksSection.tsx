import React from "react";
import { MessageSquare, History, AlertCircle } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { WordCounter } from "../common/WordCounter";
import { FormErrors } from "../../utils/cerValidation";

interface IRemarksSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  onBlur?: (field: keyof ICERProposal) => void;
  errors?: FormErrors;
  touched?: Record<string, boolean>;
  isReadOnly?: boolean;
  onViewRemarksHistory?: () => void;
}

export const RemarksSection: React.FC<IRemarksSectionProps> = ({
  formData,
  onChange,
  onBlur,
  errors = {},
  touched = {},
  isReadOnly = false,
  onViewRemarksHistory,
}) => {
  const isNonPayback = formData.payable === "Non Payback" || formData.payable === "Non-Payback";
  const needsJvRisk = formData.jv === "Under Discussion" || formData.jv_budget === "No";

  const getFieldError = (field: keyof ICERProposal): string | undefined => {
    return touched[field] || errors[field] ? errors[field] : undefined;
  };



  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5" id="section-remarks">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section G — Remarks and justification
            </h3>
            <p className="text-xs text-slate-500">
              Detailed narrative justification, non-payback rationale, and JV risk comments
            </p>
          </div>
        </div>

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
      </div>

      <div className="space-y-5 text-xs">
        {/* Remarks (including Justification for Non Payback expenditure, etc.) (Optional) */}
        <div id="field-remarks">
          <label htmlFor="remarks" className="block font-semibold text-slate-700 mb-1.5">
            Remarks (including Justification for Non Payback expenditure, etc.) <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
          </label>
          <textarea
            id="remarks"
            rows={5}
            disabled={isReadOnly}
            value={formData.remarks}
            onChange={(e) => onChange("remarks", e.target.value)}
            onBlur={() => onBlur && onBlur("remarks")}
            className={`w-full px-3.5 py-2.5 rounded-xl transition-all text-slate-900 leading-relaxed resize-y focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("remarks")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            }`}
            aria-invalid={!!getFieldError("remarks")}
          />
          {getFieldError("remarks") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("remarks")}</span>
            </p>
          )}
          <div className="mt-2">
            <WordCounter text={formData.remarks} minLimit={0} maxLimit={400} />
          </div>
        </div>

        {/* Remarks on JV Risk (including risk carrying period) (Optional) */}
        <div id="field-remarks_jv">
          <label htmlFor="remarks_jv" className="block font-semibold text-slate-700 mb-1.5">
            Remarks on JV Risk (including risk carrying period) <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
          </label>
          <textarea
            id="remarks_jv"
            rows={3}
            disabled={isReadOnly}
            value={formData.remarks_jv}
            onChange={(e) => onChange("remarks_jv", e.target.value)}
            onBlur={() => onBlur && onBlur("remarks_jv")}
            className={`w-full px-3.5 py-2.5 rounded-xl transition-all text-slate-900 leading-relaxed resize-none focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("remarks_jv")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            }`}
          />
          {getFieldError("remarks_jv") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("remarks_jv")}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
