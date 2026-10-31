import React from "react";
import { Landmark, Users, AlertCircle } from "lucide-react";
import { ICERProposal, IFieldChoices } from "../../models/CERModel";
import { FormErrors } from "../../utils/cerValidation";

interface IBudgetJVSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  onBlur?: (field: keyof ICERProposal) => void;
  errors?: FormErrors;
  touched?: Record<string, boolean>;
  isReadOnly?: boolean;
  fieldChoices?: IFieldChoices;
}

export const BudgetJVSection: React.FC<IBudgetJVSectionProps> = ({
  formData,
  onChange,
  onBlur,
  errors = {},
  touched = {},
  isReadOnly = false,
  fieldChoices,
}) => {
  const isJvBudgeted = formData.jv_budget === "Yes";

  const getFieldError = (field: keyof ICERProposal): string | undefined => {
    return touched[field] || errors[field] ? errors[field] : undefined;
  };



  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
      {/* ========================================================================================= */}
      {/* Section E — Corporate budget */}
      {/* ========================================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#012964]/10 text-[#012964]">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Section E — Corporate budget
              </h3>
              <p className="text-xs text-slate-500">
                Corporate budget provisions and variance justification
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {/* Corporate Budget (Yes/No) */}
            <div id="field-cbudget">
              <label htmlFor="cbudget" className="block font-semibold text-slate-700 mb-1">
                Corporate Budget (Yes/No) <span className="text-rose-500">*</span>
              </label>
              <select
                id="cbudget"
                disabled={isReadOnly}
                value={formData.cbudget}
                onChange={(e) => onChange("cbudget", e.target.value)}
                onBlur={() => onBlur && onBlur("cbudget")}
                className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012964]/15 focus:border-[#012964] transition-colors font-medium text-slate-900"
              >
                {(fieldChoices?.cbudget && fieldChoices.cbudget.length > 0 ? fieldChoices.cbudget : ["Yes", "No"]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {getFieldError("cbudget") && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{getFieldError("cbudget")}</span>
                </p>
              )}
            </div>

            {/* Corporate Budget Amount ($mm) (Optional) */}
            <div id="field-cb_amnt">
              <label htmlFor="cb_amnt" className="block font-semibold text-slate-700 mb-1">
                Corporate Budget Amount ($mm) <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                id="cb_amnt"
                type="number"
                disabled={isReadOnly || formData.cbudget === "No"}
                min="0"
                step="any"
                value={formData.cb_amnt === 0 ? "" : formData.cb_amnt}
                onChange={(e) => onChange("cb_amnt", e.target.value === "" ? 0 : Number(e.target.value))}
                onBlur={() => onBlur && onBlur("cb_amnt")}
                className={`w-full px-3 py-2 rounded-lg transition-colors font-medium text-slate-900 focus:outline-none ${
                  formData.cbudget === "No"
                    ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : getFieldError("cb_amnt")
                    ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    : "bg-white border border-slate-300 hover:border-slate-400 focus:border-[#012964] focus:ring-2 focus:ring-[#012964]/15"
                }`}
              />
              {getFieldError("cb_amnt") && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{getFieldError("cb_amnt")}</span>
                </p>
              )}
            </div>
          </div>

          {/* Reason if not/partially budgeted (Optional) */}
          <div id="field-reason">
            <label htmlFor="reason" className="block font-semibold text-slate-700 mb-1">
              Reason if not/partially budgeted <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              id="reason"
              rows={2}
              disabled={isReadOnly}
              value={formData.reason}
              onChange={(e) => onChange("reason", e.target.value)}
              onBlur={() => onBlur && onBlur("reason")}
              className={`w-full px-3 py-2 rounded-lg transition-colors text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none ${
                getFieldError("reason")
                  ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  : "bg-white border border-slate-300 hover:border-slate-400 focus:border-[#012964] focus:ring-2 focus:ring-[#012964]/15"
              }`}
            />
            {getFieldError("reason") && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{getFieldError("reason")}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* Section F — Joint venture details */}
      {/* ========================================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#012964]/10 text-[#012964]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Section F — Joint venture details
              </h3>
              <p className="text-xs text-slate-500">
                JV alignment, cost recoverability, partner budget, and risk remarks
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {/* Aligned with JV (Yes/No/Under Discussion) */}
            <div id="field-jv">
              <label htmlFor="jv" className="block font-semibold text-slate-700 mb-1">
                Aligned with JV (Yes/No/Under Discussion) <span className="text-rose-500">*</span>
              </label>
              <select
                id="jv"
                disabled={isReadOnly}
                value={formData.jv}
                onChange={(e) => onChange("jv", e.target.value)}
                onBlur={() => onBlur && onBlur("jv")}
                className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012964]/15 focus:border-[#012964] transition-colors font-medium text-slate-900"
              >
                {(fieldChoices?.jv && fieldChoices.jv.length > 0 ? fieldChoices.jv : ["Yes", "No", "Under Discussion"]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {getFieldError("jv") && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{getFieldError("jv")}</span>
                </p>
              )}
            </div>

            {/* JV Cost Recoverable (Yes/No) */}
            <div id="field-jv_recoverable">
              <label htmlFor="jv_recoverable" className="block font-semibold text-slate-700 mb-1">
                JV Cost Recoverable (Yes/No) <span className="text-rose-500">*</span>
              </label>
              <select
                id="jv_recoverable"
                disabled={isReadOnly}
                value={formData.jv_recoverable || "No"}
                onChange={(e) => onChange("jv_recoverable", e.target.value)}
                onBlur={() => onBlur && onBlur("jv_recoverable")}
                className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012964]/15 focus:border-[#012964] transition-colors font-medium text-slate-900"
              >
                {(fieldChoices?.jv_recoverable && fieldChoices.jv_recoverable.length > 0 ? fieldChoices.jv_recoverable : ["Yes", "No"]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {getFieldError("jv_recoverable") && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{getFieldError("jv_recoverable")}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {/* JV Budget (Yes/No) */}
            <div id="field-jv_budget">
              <label htmlFor="jv_budget" className="block font-semibold text-slate-700 mb-1">
                JV Budget (Yes/No) <span className="text-rose-500">*</span>
              </label>
              <select
                id="jv_budget"
                disabled={isReadOnly}
                value={formData.jv_budget}
                onChange={(e) => onChange("jv_budget", e.target.value)}
                onBlur={() => onBlur && onBlur("jv_budget")}
                className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012964]/15 focus:border-[#012964] transition-colors font-medium text-slate-900"
              >
                {(fieldChoices?.jv_budget && fieldChoices.jv_budget.length > 0 ? fieldChoices.jv_budget : ["Yes", "No"]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {getFieldError("jv_budget") && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{getFieldError("jv_budget")}</span>
                </p>
              )}
            </div>

            {/* JV Budget Amount ($mm) (Optional) */}
            <div id="field-jv_amnt">
              <label htmlFor="jv_amnt" className="block font-semibold text-slate-700 mb-1">
                JV Budget Amount ($mm) <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                id="jv_amnt"
                type="number"
                disabled={isReadOnly || !isJvBudgeted}
                min="0"
                step="any"
                value={formData.jv_amnt === 0 ? "" : formData.jv_amnt}
                onChange={(e) => onChange("jv_amnt", e.target.value === "" ? 0 : Number(e.target.value))}
                onBlur={() => onBlur && onBlur("jv_amnt")}
                className={`w-full px-3 py-2 rounded-lg transition-colors font-medium text-slate-900 focus:outline-none ${
                  !isJvBudgeted
                    ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : getFieldError("jv_amnt")
                    ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    : "bg-white border border-slate-300 hover:border-slate-400 focus:border-[#012964] focus:ring-2 focus:ring-[#012964]/15"
                }`}
              />
              {getFieldError("jv_amnt") && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{getFieldError("jv_amnt")}</span>
                </p>
              )}
            </div>
          </div>

          {/* Reason if not/partially budgeted (Optional) */}
          <div id="field-jv_reason">
            <label htmlFor="jv_reason" className="block font-semibold text-slate-700 mb-1">
              Reason if not/partially budgeted <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              id="jv_reason"
              type="text"
              disabled={isReadOnly}
              value={formData.jv_reason}
              onChange={(e) => onChange("jv_reason", e.target.value)}
              onBlur={() => onBlur && onBlur("jv_reason")}
              className={`w-full px-3 py-2 rounded-lg transition-colors text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                getFieldError("jv_reason")
                  ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  : "bg-white border border-slate-300 hover:border-slate-400 focus:border-[#012964] focus:ring-2 focus:ring-[#012964]/15"
              }`}
            />
            {getFieldError("jv_reason") && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{getFieldError("jv_reason")}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
