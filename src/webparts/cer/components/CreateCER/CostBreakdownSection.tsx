import React, { useEffect } from "react";
import { Calculator, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { FormErrors } from "../../utils/cerValidation";

interface ICostBreakdownSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  onBlur?: (field: keyof ICERProposal) => void;
  errors?: FormErrors;
  touched?: Record<string, boolean>;
  isReadOnly?: boolean;
}

export const CostBreakdownSection: React.FC<ICostBreakdownSectionProps> = ({
  formData,
  onChange,
  onBlur,
  errors = {},
  touched = {},
  isReadOnly = false,
}) => {
  const engineer = Number(formData.engineer || 0);
  const s_fac = Number(formData.s_fac || 0);
  const comis = Number(formData.comis || 0);
  const preop = Number(formData.preop || 0);
  const others = Number(formData.others || 0);
  const computedTotal = engineer + s_fac + comis + preop + others;

  useEffect(() => {
    if (computedTotal !== formData.total) {
      onChange("total", computedTotal);
    }
  }, [computedTotal]);

  const cerAmount = Number(formData.amount || 0);
  const isBalanced = cerAmount > 0 && Math.abs(cerAmount - computedTotal) <= 0.01;
  const hasMismatch = cerAmount > 0 && Math.abs(cerAmount - computedTotal) > 0.01 && computedTotal > 0;

  const isINR = formData.currency === "INR";
  const currSymbol = isINR ? "₹" : "$";
  const currUnit = isINR ? "" : " mm";

  const getFieldError = (field: keyof ICERProposal): string | undefined => {
    return touched[field] || errors[field] ? errors[field] : undefined;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3" id="section-capex-estimates">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#012964]" />
          <h3 className="font-bold text-slate-800 text-sm sm:text-[15px] tracking-tight">
            Section D — CAPEX Breakdown
          </h3>
        </div>
        <span className="text-xs font-medium text-slate-500">
          Values in {isINR ? "INR (₹)" : "USD ($mm)"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Engineering */}
        <div id="field-engineer">
          <label htmlFor="engineer" className="block font-semibold text-slate-700 text-[13px] sm:text-sm mb-1">
            Engineering
          </label>
          <input
            id="engineer"
            type="number"
            disabled={isReadOnly}
            min="0"
            step="any"
            value={formData.engineer === 0 ? "" : formData.engineer}
            onChange={(e) => onChange("engineer", e.target.value === "" ? 0 : Number(e.target.value))}
            onBlur={() => onBlur && onBlur("engineer")}
            className={`w-full h-9 px-3 py-1.5 rounded-lg transition-colors font-mono text-sm font-medium text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("engineer")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:ring-1 focus:ring-[#012964]/20 focus:border-[#012964]"
            }`}
          />
          {getFieldError("engineer") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("engineer")}</span>
            </p>
          )}
        </div>

        {/* Surface Facilities */}
        <div id="field-s_fac">
          <label htmlFor="s_fac" className="block font-semibold text-slate-700 text-[13px] sm:text-sm mb-1">
            Surface Facilities
          </label>
          <input
            id="s_fac"
            type="number"
            disabled={isReadOnly}
            min="0"
            step="any"
            value={formData.s_fac === 0 ? "" : formData.s_fac}
            onChange={(e) => onChange("s_fac", e.target.value === "" ? 0 : Number(e.target.value))}
            onBlur={() => onBlur && onBlur("s_fac")}
            className={`w-full h-9 px-3 py-1.5 rounded-lg transition-colors font-mono text-sm font-medium text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("s_fac")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:ring-1 focus:ring-[#012964]/20 focus:border-[#012964]"
            }`}
          />
          {getFieldError("s_fac") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("s_fac")}</span>
            </p>
          )}
        </div>

        {/* Commissioning */}
        <div id="field-comis">
          <label htmlFor="comis" className="block font-semibold text-slate-700 text-[13px] sm:text-sm mb-1">
            Commissioning
          </label>
          <input
            id="comis"
            type="number"
            disabled={isReadOnly}
            min="0"
            step="any"
            value={formData.comis === 0 ? "" : formData.comis}
            onChange={(e) => onChange("comis", e.target.value === "" ? 0 : Number(e.target.value))}
            onBlur={() => onBlur && onBlur("comis")}
            className={`w-full h-9 px-3 py-1.5 rounded-lg transition-colors font-mono text-sm font-medium text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("comis")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:ring-1 focus:ring-[#012964]/20 focus:border-[#012964]"
            }`}
          />
          {getFieldError("comis") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("comis")}</span>
            </p>
          )}
        </div>

        {/* Pre Operations */}
        <div id="field-preop">
          <label htmlFor="preop" className="block font-semibold text-slate-700 text-[13px] sm:text-sm mb-1">
            Pre Operations
          </label>
          <input
            id="preop"
            type="number"
            disabled={isReadOnly}
            min="0"
            step="any"
            value={formData.preop === 0 ? "" : formData.preop}
            onChange={(e) => onChange("preop", e.target.value === "" ? 0 : Number(e.target.value))}
            onBlur={() => onBlur && onBlur("preop")}
            className={`w-full h-9 px-3 py-1.5 rounded-lg transition-colors font-mono text-sm font-medium text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("preop")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:ring-1 focus:ring-[#012964]/20 focus:border-[#012964]"
            }`}
          />
          {getFieldError("preop") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("preop")}</span>
            </p>
          )}
        </div>

        {/* Others */}
        <div id="field-others">
          <label htmlFor="others" className="block font-semibold text-slate-700 text-[13px] sm:text-sm mb-1">
            Others
          </label>
          <input
            id="others"
            type="number"
            disabled={isReadOnly}
            min="0"
            step="any"
            value={formData.others === 0 ? "" : formData.others}
            onChange={(e) => onChange("others", e.target.value === "" ? 0 : Number(e.target.value))}
            onBlur={() => onBlur && onBlur("others")}
            className={`w-full h-9 px-3 py-1.5 rounded-lg transition-colors font-mono text-sm font-medium text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("others")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:ring-1 focus:ring-[#012964]/20 focus:border-[#012964]"
            }`}
          />
          {getFieldError("others") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("others")}</span>
            </p>
          )}
        </div>

        {/* Total Capex — Read-Only Calculated Summary Value */}
        <div id="field-total">
          <div className="flex items-center justify-between mb-1">
            <label className="block font-semibold text-slate-700 text-[13px] sm:text-sm">
              Total Capex
            </label>
            {cerAmount > 0 && isBalanced ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#012964] bg-[#66CC33]/15 px-2 py-0.5 rounded border border-[#66CC33]/30">
                <CheckCircle2 className="w-3 h-3 text-[#387a15]" /> Reconciled
              </span>
            ) : cerAmount > 0 && hasMismatch ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertCircle className="w-3 h-3 text-amber-600" /> Diff: {currSymbol}{Math.abs(computedTotal - cerAmount).toLocaleString()}{currUnit}
              </span>
            ) : null}
          </div>
          <div className="w-full h-9 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="font-mono font-bold text-slate-900 text-sm">
              {currSymbol}{computedTotal.toLocaleString()}{currUnit}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Calculated sum
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
