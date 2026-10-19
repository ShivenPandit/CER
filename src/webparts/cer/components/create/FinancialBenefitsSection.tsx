import React from "react";
import { DollarSign, TrendingUp, Percent, FileText } from "lucide-react";
import { ICERProposal, CERPayable } from "../../models/CERModel";

interface IFinancialBenefitsSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  isReadOnly?: boolean;
}

export const FinancialBenefitsSection: React.FC<IFinancialBenefitsSectionProps> = ({
  formData,
  onChange,
  isReadOnly = false,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section B: Financial Benefits & Economic Evaluation
            </h3>
            <p className="text-xs text-slate-500">
              Sanction amount, payback classification, NPV, IRR, and valuation assumptions
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
          FR-01
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
        {/* Amount of CER */}
        <div className="lg:col-span-2">
          <label className="block font-semibold text-slate-700 mb-1.5">
            Amount of CER <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              disabled={isReadOnly}
              value={formData.currency}
              onChange={(e) => onChange("currency", e.target.value)}
              className="w-24 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white"
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
            </select>
            <input
              type="number"
              disabled={isReadOnly}
              min="0"
              step="any"
              value={formData.amount || ""}
              onChange={(e) => onChange("amount", Number(e.target.value))}
              placeholder="e.g. 14500000"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-slate-900 text-sm"
              required
            />
          </div>
        </div>

        {/* Payback / Non-Payback */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Payback Classification <span className="text-rose-500">*</span>
          </label>
          <select
            disabled={isReadOnly}
            value={formData.payable}
            onChange={(e) => onChange("payable", e.target.value as CERPayable)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
          >
            <option value="Payback">Payback (Commercial Return)</option>
            <option value="Non-Payback">Non-Payback (Regulatory / Safety)</option>
          </select>
        </div>

        {/* Financial Benefits — NPV */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Financial Benefits — NPV ($mm)
          </label>
          <div className="relative">
            <input
              type="number"
              disabled={isReadOnly}
              step="0.01"
              value={formData.ben_npv || ""}
              onChange={(e) => onChange("ben_npv", Number(e.target.value))}
              placeholder="e.g. 28.4"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
            />
          </div>
        </div>

        {/* Financial Benefits — IRR */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Financial Benefits — IRR (%)
          </label>
          <div className="relative">
            <input
              type="number"
              disabled={isReadOnly}
              step="0.1"
              value={formData.ben_irr || ""}
              onChange={(e) => onChange("ben_irr", Number(e.target.value))}
              placeholder="e.g. 32.5"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
            />
          </div>
        </div>

        {/* Key Assumptions */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block font-semibold text-slate-700 mb-1.5">
            Key Assumptions for Financial Benefits and Costs
          </label>
          <input
            type="text"
            disabled={isReadOnly}
            value={formData.cost_assumptions}
            onChange={(e) => onChange("cost_assumptions", e.target.value)}
            placeholder="e.g. Crude realization benchmarked at Brent $75/bbl, discount rate 10%..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
          />
        </div>
      </div>
    </div>
  );
};
