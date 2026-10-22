import React from "react";
import { DollarSign, AlertCircle } from "lucide-react";
import { ICERProposal, CERPayable } from "../../models/CERModel";
import { FormErrors } from "../../utils/cerValidation";

interface IFinancialBenefitsSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  onBlur?: (field: keyof ICERProposal) => void;
  errors?: FormErrors;
  touched?: Record<string, boolean>;
  isReadOnly?: boolean;
}

export const FinancialBenefitsSection: React.FC<IFinancialBenefitsSectionProps> = ({
  formData,
  onChange,
  onBlur,
  errors = {},
  touched = {},
  isReadOnly = false,
}) => {
  const isPayback = formData.payable === "Payback";

  const getFieldError = (field: keyof ICERProposal): string | undefined => {
    return touched[field] || errors[field] ? errors[field] : undefined;
  };



  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section B — Financial benefits and payback
            </h3>
            <p className="text-xs text-slate-500">
              Sanction amount, payback period, NPV, IRR, and financial assumptions
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
        {/* Amount of CER */}
        <div className="md:col-span-2 lg:col-span-1" id="field-amount">
          <label htmlFor="amount" className="block font-semibold text-slate-700 mb-1.5">
            Amount of CER <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              disabled={isReadOnly}
              value={formData.currency}
              onChange={(e) => onChange("currency", e.target.value)}
              className="w-24 px-3 py-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
            </select>
            <input
              id="amount"
              type="number"
              disabled={isReadOnly}
              min="0"
              step="any"
              value={formData.amount === 0 ? "" : formData.amount}
              onChange={(e) => onChange("amount", e.target.value === "" ? 0 : Number(e.target.value))}
              onBlur={() => onBlur && onBlur("amount")}
              className={`flex-1 px-3.5 py-2.5 rounded-xl font-bold text-slate-900 text-sm transition-colors focus:outline-none ${
                getFieldError("amount")
                  ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  : "bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
              }`}
              required
            />
          </div>
          {getFieldError("amount") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("amount")}</span>
            </p>
          )}
        </div>

        {/* Payback/Non Payback */}
        <div id="field-payable">
          <label htmlFor="payable" className="block font-semibold text-slate-700 mb-1.5">
            Payback/Non Payback <span className="text-rose-500">*</span>
          </label>
          <select
            id="payable"
            disabled={isReadOnly}
            value={formData.payable === "Non-Payback" ? "Non Payback" : formData.payable}
            onChange={(e) => onChange("payable", e.target.value as CERPayable)}
            onBlur={() => onBlur && onBlur("payable")}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors font-medium text-slate-900"
          >
            <option value="Payback">Payback</option>
            <option value="Non Payback">Non Payback</option>
          </select>
          {getFieldError("payable") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("payable")}</span>
            </p>
          )}
        </div>

        {/* Payback Period (in no. of Quarters) */}
        <div id="field-payback_quarters">
          <label htmlFor="payback_quarters" className="block font-semibold text-slate-700 mb-1.5">
            Payback Period (in no. of Quarters) {isPayback && <span className="text-rose-500">*</span>}
          </label>
          <input
            id="payback_quarters"
            type="number"
            disabled={isReadOnly || !isPayback}
            min="1"
            step="1"
            value={formData.payback_quarters || ""}
            onChange={(e) => onChange("payback_quarters", e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
            onBlur={() => onBlur && onBlur("payback_quarters")}
            className={`w-full px-3.5 py-2.5 rounded-xl transition-colors font-medium text-slate-900 focus:outline-none ${
              !isPayback
                ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : getFieldError("payback_quarters")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
            }`}
          />
          {getFieldError("payback_quarters") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("payback_quarters")}</span>
            </p>
          )}
        </div>

        {/* Financial Benefits – NPV ($mm) */}
        <div id="field-ben_npv">
          <label htmlFor="ben_npv" className="block font-semibold text-slate-700 mb-1.5">
            Financial Benefits – NPV ($mm)
          </label>
          <input
            id="ben_npv"
            type="number"
            disabled={isReadOnly}
            step="any"
            value={formData.ben_npv === 0 ? "" : formData.ben_npv}
            onChange={(e) => onChange("ben_npv", e.target.value === "" ? 0 : Number(e.target.value))}
            onBlur={() => onBlur && onBlur("ben_npv")}
            className={`w-full px-3.5 py-2.5 rounded-xl transition-colors font-medium text-slate-900 focus:outline-none ${
              getFieldError("ben_npv")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
            }`}
          />
          {getFieldError("ben_npv") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("ben_npv")}</span>
            </p>
          )}
        </div>

        {/* Financial Benefit – IRR (%) */}
        <div id="field-ben_irr">
          <label htmlFor="ben_irr" className="block font-semibold text-slate-700 mb-1.5">
            Financial Benefit – IRR (%)
          </label>
          <input
            id="ben_irr"
            type="number"
            disabled={isReadOnly}
            min="0"
            max="100"
            step="0.1"
            value={formData.ben_irr === 0 ? "" : formData.ben_irr}
            onChange={(e) => onChange("ben_irr", e.target.value === "" ? 0 : Number(e.target.value))}
            onBlur={() => onBlur && onBlur("ben_irr")}
            className={`w-full px-3.5 py-2.5 rounded-xl transition-colors font-medium text-slate-900 focus:outline-none ${
              getFieldError("ben_irr")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
            }`}
          />
          {getFieldError("ben_irr") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("ben_irr")}</span>
            </p>
          )}
        </div>

        {/* Key Assumptions to Financial Benefit/Costs */}
        <div className="md:col-span-2 lg:col-span-3" id="field-cost_assumptions">
          <label htmlFor="cost_assumptions" className="block font-semibold text-slate-700 mb-1.5">
            Key Assumptions to Financial Benefit/Costs <span className="text-rose-500">*</span>
          </label>
          <input
            id="cost_assumptions"
            type="text"
            disabled={isReadOnly}
            value={formData.cost_assumptions}
            onChange={(e) => onChange("cost_assumptions", e.target.value)}
            onBlur={() => onBlur && onBlur("cost_assumptions")}
            className={`w-full px-3.5 py-2.5 rounded-xl transition-colors text-slate-900 placeholder:text-slate-400 focus:outline-none ${
              getFieldError("cost_assumptions")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
            }`}
            required
          />
          {getFieldError("cost_assumptions") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("cost_assumptions")}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
