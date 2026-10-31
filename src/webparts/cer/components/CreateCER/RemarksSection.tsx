import React from "react";
import { MessageSquare, History, AlertCircle } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { WordCounter } from '../Shared/WordCounter';
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
  const getFieldError = (field: keyof ICERProposal): string | undefined => {
    return touched[field] || errors[field] ? errors[field] : undefined;
  };



  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3" id="section-remarks">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#012964]" />
          <h3 className="font-bold text-slate-800 text-sm sm:text-[15px] tracking-tight">
            Section G — Remarks & Justification
          </h3>
        </div>

        {onViewRemarksHistory && (
          <button
            type="button"
            onClick={onViewRemarksHistory}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Remarks History</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Remarks / Justification */}
        <div id="field-remarks" className="flex flex-col justify-between">
          <div>
            <label htmlFor="remarks" className="block font-semibold text-slate-700 text-[13px] sm:text-sm mb-1">
              Remarks / Justification <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              id="remarks"
              rows={3}
              disabled={isReadOnly}
              value={formData.remarks}
              onChange={(e) => onChange("remarks", e.target.value)}
              onBlur={() => onBlur && onBlur("remarks")}
              placeholder="Detailed justification, non-payback rationale, operational impact..."
              className={`w-full px-3 py-2 rounded-lg text-sm transition-colors text-slate-900 leading-relaxed resize-y focus:outline-none min-h-[72px] sm:min-h-[80px] disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                getFieldError("remarks")
                  ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                  : "bg-white border border-slate-200 hover:border-slate-300 focus:ring-1 focus:ring-[#012964]/20 focus:border-[#012964]"
              }`}
              aria-invalid={!!getFieldError("remarks")}
            />
            {getFieldError("remarks") && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{getFieldError("remarks")}</span>
              </p>
            )}
          </div>
          <div className="mt-1 flex justify-end">
            <WordCounter text={formData.remarks} minLimit={0} maxLimit={400} />
          </div>
        </div>

        {/* Rationale for JV / Risk */}
        <div id="field-remarks_jv" className="flex flex-col justify-between">
          <div>
            <label htmlFor="remarks_jv" className="block font-semibold text-slate-700 text-[13px] sm:text-sm mb-1">
              Rationale for JV / Risk <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              id="remarks_jv"
              rows={3}
              disabled={isReadOnly}
              value={formData.remarks_jv}
              onChange={(e) => onChange("remarks_jv", e.target.value)}
              onBlur={() => onBlur && onBlur("remarks_jv")}
              placeholder="JV risk comments, partner carrying period, risk mitigation..."
              className={`w-full px-3 py-2 rounded-lg text-sm transition-colors text-slate-900 leading-relaxed resize-y focus:outline-none min-h-[72px] sm:min-h-[80px] disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                getFieldError("remarks_jv")
                  ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                  : "bg-white border border-slate-200 hover:border-slate-300 focus:ring-1 focus:ring-[#012964]/20 focus:border-[#012964]"
              }`}
            />
            {getFieldError("remarks_jv") && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{getFieldError("remarks_jv")}</span>
              </p>
            )}
          </div>
          <div className="mt-1 flex justify-end text-xs text-slate-400">
            <span>{formData.remarks_jv ? formData.remarks_jv.trim().split(/\s+/).filter(Boolean).length : 0} words</span>
          </div>
        </div>
      </div>
    </div>
  );
};
