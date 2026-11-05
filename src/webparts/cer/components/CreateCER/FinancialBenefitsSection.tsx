import React from "react";
import { DollarSign, AlertCircle } from "lucide-react";
import { ICERProposal, CERPayable, IFieldChoices } from "../../models/CERModel";
import { FormErrors } from "../../utils/cerValidation";

interface IFinancialBenefitsSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  onBlur?: (field: keyof ICERProposal) => void;
  errors?: FormErrors;
  touched?: Record<string, boolean>;
  isReadOnly?: boolean;
  fieldChoices?: IFieldChoices;
}

export const FinancialBenefitsSection: React.FC<IFinancialBenefitsSectionProps> = ({
  formData,
  onChange,
  onBlur,
  errors = {},
  touched = {},
  isReadOnly = false,
  fieldChoices,
}) => {
  const getFieldError = (field: keyof ICERProposal): string | undefined => {
    return touched[field] || errors[field] ? errors[field] : undefined;
  };

  // Fixed Currency Requirement: Always force USD
  React.useEffect(() => {
    if (!isReadOnly && formData.currency !== "USD") {
      onChange("currency", "USD");
    }
  }, [formData.currency, isReadOnly, onChange]);

  // Ensure Payback / Non Payback has a consistent default value in state
  React.useEffect(() => {
    if (!isReadOnly && !formData.payable) {
      onChange("payable", "Payback");
    }
  }, [formData.payable, isReadOnly, onChange]);



  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <DollarSign className="w-4 h-4 text-[#012964]" />
        <h3 className="font-bold text-slate-900 text-base sm:text-[17px] tracking-tight">
          Financial Metrics
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Amount of CER (Auto-fetched from Section C Capex Phasing & Grayed out) */}
        <div id="field-amount">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="amount" className="font-semibold text-slate-800 text-sm font-semibold flex items-center gap-1">
              <span>Amount of CER</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Auto-fetched from Capex phasing in Section C">
              Auto-calculated
            </span>
          </div>
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden bg-slate-50 focus-within:ring-1 focus-within:ring-[#012964]/20 focus-within:border-[#012964]">
            <span className="h-10 px-3 flex items-center bg-slate-100 border-r border-slate-200 font-bold text-slate-700 text-sm select-none shrink-0" title="Fixed currency: USD">
              USD ($)
            </span>
            <input
              id="amount"
              type="text"
              readOnly
              disabled
              tabIndex={-1}
              value={Number(formData.amount || 0).toLocaleString()}
              className={`flex-1 h-10 px-3 font-mono font-bold text-sm bg-slate-50 text-slate-800 cursor-not-allowed focus:outline-none ${
                getFieldError("amount") ? "text-rose-900 bg-rose-50/20" : ""
              }`}
              title="Auto-fetched total from Section C Capex ($mm). Read-only."
              aria-readonly="true"
            />
          </div>
          {getFieldError("amount") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("amount")}</span>
            </p>
          )}
        </div>

        {/* Payback / Non Payback */}
        <div id="field-payable">
          <label htmlFor="payable" className="block font-semibold text-slate-800 text-sm font-semibold mb-1">
            Payback / Non Payback <span className="text-rose-500">*</span>
          </label>
          <select
            id="payable"
            disabled={isReadOnly}
            value={formData.payable ? String(formData.payable).trim().replace(/-/g, " ") : "Payback"}
            onChange={(e) => {
              const clean = e.target.value.trim().replace(/-/g, " ") as CERPayable;
              onChange("payable", clean);
            }}
            onBlur={() => onBlur && onBlur("payable")}
            className="w-full h-10 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#012964]/20 focus:border-[#012964] transition-colors text-sm font-medium text-slate-900"
          >
            {(fieldChoices?.payable && fieldChoices.payable.length > 0
              ? fieldChoices.payable.map((p) => p.trim().replace(/-/g, " "))
              : ["Payback", "Non Payback"]
            )
              .filter((val, idx, arr) => arr.indexOf(val) === idx)
              .map((pay) => (
                <option key={pay} value={pay}>
                  {pay}
                </option>
              ))}
          </select>
          {getFieldError("payable") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("payable")}</span>
            </p>
          )}
        </div>

        {/* Payback Period (Quarters) */}
        <div id="field-payback_quarters">
          <label htmlFor="payback_quarters" className="block font-semibold text-slate-800 text-sm font-semibold mb-1">
            Payback Period (Quarters) <span className="text-rose-500">*</span>
          </label>
          <input
            id="payback_quarters"
            type="number"
            disabled={isReadOnly}
            min="1"
            step="1"
            value={formData.payback_quarters === undefined || formData.payback_quarters === null ? "" : formData.payback_quarters}
            onChange={(e) => {
              const q = e.target.value === "" ? "" : parseInt(e.target.value, 10);
              onChange("payback_quarters", q);
              if (typeof q === "number" && q > 0) {
                onChange("period", `${q} ${q === 1 ? "Quarter" : "Quarters"}`);
              }
            }}
            onBlur={() => onBlur && onBlur("payback_quarters")}
            className={`w-full h-10 px-3 py-1.5 rounded-lg text-sm transition-colors font-medium text-slate-900 focus:outline-none ${
              getFieldError("payback_quarters")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
            }`}
            required
          />
          {getFieldError("payback_quarters") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("payback_quarters")}</span>
            </p>
          )}
        </div>

        {/* Financial Benefits — NPV */}
        <div id="field-ben_npv">
          <label htmlFor="ben_npv" className="block font-semibold text-slate-800 text-sm font-semibold mb-1">
            Financial Benefits — NPV ($mm)
          </label>
          <input
            id="ben_npv"
            type="number"
            disabled={isReadOnly}
            step="any"
            value={formData.ben_npv === undefined || formData.ben_npv === null ? "" : formData.ben_npv}
            onChange={(e) => onChange("ben_npv", e.target.value === "" ? "" : Number(e.target.value))}
            onBlur={() => onBlur && onBlur("ben_npv")}
            className={`w-full h-10 px-3 py-1.5 rounded-lg text-sm transition-colors font-medium text-slate-900 focus:outline-none ${
              getFieldError("ben_npv")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
            }`}
          />
          {getFieldError("ben_npv") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("ben_npv")}</span>
            </p>
          )}
        </div>

        {/* Financial Benefit — IRR */}
        <div id="field-ben_irr">
          <label htmlFor="ben_irr" className="block font-semibold text-slate-800 text-sm font-semibold mb-1">
            Financial Benefit — IRR (%)
          </label>
          <input
            id="ben_irr"
            type="number"
            disabled={isReadOnly}
            min="0"
            max="100"
            step="0.1"
            value={formData.ben_irr === undefined || formData.ben_irr === null ? "" : formData.ben_irr}
            onChange={(e) => onChange("ben_irr", e.target.value === "" ? "" : Number(e.target.value))}
            onBlur={() => onBlur && onBlur("ben_irr")}
            className={`w-full h-10 px-3 py-1.5 rounded-lg text-sm transition-colors font-medium text-slate-900 focus:outline-none ${
              getFieldError("ben_irr")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
            }`}
          />
          {getFieldError("ben_irr") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("ben_irr")}</span>
            </p>
          )}
        </div>

        {/* Key Assumptions */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1" id="field-cost_assumptions">
          <label htmlFor="cost_assumptions" className="block font-semibold text-slate-800 text-sm font-semibold mb-1">
            Key Assumptions <span className="text-xs font-normal text-slate-400">(Optional)</span>
          </label>
          <input
            id="cost_assumptions"
            type="text"
            disabled={isReadOnly}
            value={formData.cost_assumptions}
            onChange={(e) => onChange("cost_assumptions", e.target.value)}
            onBlur={() => onBlur && onBlur("cost_assumptions")}
            className={`w-full h-10 px-3 py-1.5 rounded-lg text-sm transition-colors text-slate-900 focus:outline-none ${
              getFieldError("cost_assumptions")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
            }`}
          />
          {getFieldError("cost_assumptions") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("cost_assumptions")}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
