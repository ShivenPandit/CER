import React from "react";
import { Landmark, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { FormErrors } from "../../utils/cerValidation";

interface IBudgetJVSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  onBlur?: (field: keyof ICERProposal) => void;
  errors?: FormErrors;
  touched?: Record<string, boolean>;
  isReadOnly?: boolean;
}

export const BudgetJVSection: React.FC<IBudgetJVSectionProps> = ({
  formData,
  onChange,
  onBlur,
  errors = {},
  touched = {},
  isReadOnly = false,
}) => {
  const isCorporateBudgeted = formData.cbudget === "Yes";
  const needsCorporateReason = formData.cbudget === "No" || formData.cbudget === "Partially";

  const isJvAligned = formData.jv === "Yes" || formData.jv === "Under Discussion";
  const isJvBudgeted = formData.jv_budget === "Yes";
  const needsJvReason = formData.jv_budget === "No";
  const needsJvRisk = formData.jv === "Under Discussion" || formData.jv_budget === "No";

  const getFieldError = (field: keyof ICERProposal): string | undefined => {
    return touched[field] || errors[field] ? errors[field] : undefined;
  };

  const isFieldValid = (field: keyof ICERProposal): boolean => {
    return !!touched[field] && !errors[field] && formData[field] !== undefined && formData[field] !== null && formData[field] !== "";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ========================================================================================= */}
      {/* Section C — Corporate budget */}
      {/* ========================================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Section C — Corporate budget
              </h3>
              <p className="text-xs text-slate-500">
                Corporate budget provisions and variance justification
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Corporate Budget (Yes/No) */}
            <div id="field-cbudget">
              <label htmlFor="cbudget" className="block font-semibold text-slate-700 mb-1.5">
                Corporate Budget (Yes/No) <span className="text-rose-500">*</span>
              </label>
              <select
                id="cbudget"
                disabled={isReadOnly}
                value={formData.cbudget}
                onChange={(e) => onChange("cbudget", e.target.value)}
                onBlur={() => onBlur && onBlur("cbudget")}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Partially">Partially</option>
              </select>
              {getFieldError("cbudget") && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{getFieldError("cbudget")}</span>
                </p>
              )}
            </div>

            {/* Corporate Budget Amount ($mm) */}
            <div id="field-cb_amnt">
              <label htmlFor="cb_amnt" className="block font-semibold text-slate-700 mb-1.5">
                Corporate Budget Amount ($mm) {isCorporateBudgeted && <span className="text-rose-500">*</span>}
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
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all font-medium text-slate-900 focus:outline-none ${
                  formData.cbudget === "No"
                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    : getFieldError("cb_amnt")
                    ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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

          {/* Reason if not/partially budgeted */}
          <div id="field-reason">
            <label htmlFor="reason" className="block font-semibold text-slate-700 mb-1.5">
              Reason if not/partially budgeted {needsCorporateReason && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              id="reason"
              rows={2}
              disabled={isReadOnly}
              value={formData.reason}
              onChange={(e) => onChange("reason", e.target.value)}
              onBlur={() => onBlur && onBlur("reason")}
              className={`w-full px-3.5 py-2.5 rounded-xl transition-all text-slate-900 focus:outline-none resize-none ${
                getFieldError("reason")
                  ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              }`}
            />
            {getFieldError("reason") ? (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{getFieldError("reason")}</span>
              </p>
            ) : needsCorporateReason && isFieldValid("reason") ? (
              <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Valid explanation</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* Section D — Joint venture details */}
      {/* ========================================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Section D — Joint venture details
              </h3>
              <p className="text-xs text-slate-500">
                JV alignment, cost recoverability, partner budget, and risk remarks
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Aligned with JV (Yes/No/Under Discussion) */}
            <div id="field-jv">
              <label htmlFor="jv" className="block font-semibold text-slate-700 mb-1.5">
                Aligned with JV (Yes/No/Under Discussion) <span className="text-rose-500">*</span>
              </label>
              <select
                id="jv"
                disabled={isReadOnly}
                value={formData.jv}
                onChange={(e) => onChange("jv", e.target.value)}
                onBlur={() => onBlur && onBlur("jv")}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Under Discussion">Under Discussion</option>
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
              <label htmlFor="jv_recoverable" className="block font-semibold text-slate-700 mb-1.5">
                JV Cost Recoverable (Yes/No) <span className="text-rose-500">*</span>
              </label>
              <select
                id="jv_recoverable"
                disabled={isReadOnly}
                value={formData.jv_recoverable || "No"}
                onChange={(e) => onChange("jv_recoverable", e.target.value)}
                onBlur={() => onBlur && onBlur("jv_recoverable")}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              {getFieldError("jv_recoverable") && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{getFieldError("jv_recoverable")}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* JV Budget (Yes/No) */}
            <div id="field-jv_budget">
              <label htmlFor="jv_budget" className="block font-semibold text-slate-700 mb-1.5">
                JV Budget (Yes/No) <span className="text-rose-500">*</span>
              </label>
              <select
                id="jv_budget"
                disabled={isReadOnly}
                value={formData.jv_budget}
                onChange={(e) => onChange("jv_budget", e.target.value)}
                onBlur={() => onBlur && onBlur("jv_budget")}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              {getFieldError("jv_budget") && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{getFieldError("jv_budget")}</span>
                </p>
              )}
            </div>

            {/* JV Budget Amount ($mm) */}
            <div id="field-jv_amnt">
              <label htmlFor="jv_amnt" className="block font-semibold text-slate-700 mb-1.5">
                JV Budget Amount ($mm) {isJvBudgeted && <span className="text-rose-500">*</span>}
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
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all font-medium text-slate-900 focus:outline-none ${
                  !isJvBudgeted
                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    : getFieldError("jv_amnt")
                    ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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

          {/* Reason if not/partially budgeted */}
          <div id="field-jv_reason">
            <label htmlFor="jv_reason" className="block font-semibold text-slate-700 mb-1.5">
              Reason if not/partially budgeted {needsJvReason && <span className="text-rose-500">*</span>}
            </label>
            <input
              id="jv_reason"
              type="text"
              disabled={isReadOnly}
              value={formData.jv_reason}
              onChange={(e) => onChange("jv_reason", e.target.value)}
              onBlur={() => onBlur && onBlur("jv_reason")}
              className={`w-full px-3.5 py-2.5 rounded-xl transition-all text-slate-900 focus:outline-none ${
                getFieldError("jv_reason")
                  ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
