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

  const getFieldError = (field: keyof ICERProposal): string | undefined => {
    return touched[field] || errors[field] ? errors[field] : undefined;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5" id="section-capex-estimates">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section F — CAPEX cost estimates basis
            </h3>
            <p className="text-xs text-slate-500">
              Activity components in USD millions ($mm). Total is auto-calculated and compared with Amount of CER
            </p>
          </div>
        </div>
      </div>

      {/* Reconciliation status banner */}
      {hasMismatch && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Cost Estimates Advisory:</strong> Calculated Total (${computedTotal.toLocaleString()} mm) differs from CER Amount (${cerAmount.toLocaleString()} mm).
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
            Variance: ${Math.abs(computedTotal - cerAmount).toLocaleString()} mm
          </span>
        </div>
      )}

      {isBalanced && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Estimates Balanced:</strong> Total CAPEX Cost Estimates reconciles with Amount of CER (${computedTotal.toLocaleString()} mm).
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
        {/* Engineering */}
        <div id="field-engineer">
          <label htmlFor="engineer" className="block font-semibold text-slate-700 mb-1.5">
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
            className={`w-full px-3.5 py-2.5 rounded-xl transition-all font-medium text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("engineer")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
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
          <label htmlFor="s_fac" className="block font-semibold text-slate-700 mb-1.5">
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
            className={`w-full px-3.5 py-2.5 rounded-xl transition-all font-medium text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("s_fac")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
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
          <label htmlFor="comis" className="block font-semibold text-slate-700 mb-1.5">
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
            className={`w-full px-3.5 py-2.5 rounded-xl transition-all font-medium text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("comis")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
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
          <label htmlFor="preop" className="block font-semibold text-slate-700 mb-1.5">
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
            className={`w-full px-3.5 py-2.5 rounded-xl transition-all font-medium text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("preop")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
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
          <label htmlFor="others" className="block font-semibold text-slate-700 mb-1.5">
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
            className={`w-full px-3.5 py-2.5 rounded-xl transition-all font-medium text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              getFieldError("others")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            }`}
          />
          {getFieldError("others") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("others")}</span>
            </p>
          )}
        </div>

        {/* Total — Read-Only Auto-Calculated */}
        <div id="field-total" className="flex flex-col justify-start">
          <div className="flex items-center justify-between mb-1.5 min-h-[18px]">
            <label className="block font-semibold text-slate-700">
              Total (auto-calculated)
            </label>
            {cerAmount > 0 && (
              isBalanced ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Reconciled
                </span>
              ) : hasMismatch ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Variance
                </span>
              ) : null
            )}
          </div>
          <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/90 border border-slate-300/80 flex items-center justify-between min-h-[42px] transition-all">
            <span className="font-mono font-bold text-slate-900 text-sm">
              ${computedTotal.toLocaleString()} mm
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Sum of components
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Read-only summary synced with CAPEX breakdown
          </p>
        </div>
      </div>
    </div>
  );
};
