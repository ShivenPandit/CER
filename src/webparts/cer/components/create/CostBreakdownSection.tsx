import React, { useEffect } from "react";
import { Calculator, CheckCircle2, AlertCircle } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";

interface ICostBreakdownSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  isReadOnly?: boolean;
}

export const CostBreakdownSection: React.FC<ICostBreakdownSectionProps> = ({
  formData,
  onChange,
  isReadOnly = false,
}) => {
  // Auto-calculate total sum of cost breakdown
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

  const matchesCERAmount = Math.abs((formData.amount || 0) - computedTotal) < 0.01;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-900 text-white">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section F: Cost Breakdown by Activity
            </h3>
            <p className="text-xs text-slate-500">
              Detailed breakdown of capital expenditure components
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          FR-01
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
        {/* Engineering */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Engineering & Design
          </label>
          <input
            type="number"
            disabled={isReadOnly}
            min="0"
            step="any"
            value={formData.engineer || ""}
            onChange={(e) => onChange("engineer", Number(e.target.value))}
            placeholder="0"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
          />
        </div>

        {/* Site Facilities */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Site Facilities & Civil Work
          </label>
          <input
            type="number"
            disabled={isReadOnly}
            min="0"
            step="any"
            value={formData.s_fac || ""}
            onChange={(e) => onChange("s_fac", Number(e.target.value))}
            placeholder="0"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
          />
        </div>

        {/* Commissioning */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Commissioning & Testing
          </label>
          <input
            type="number"
            disabled={isReadOnly}
            min="0"
            step="any"
            value={formData.comis || ""}
            onChange={(e) => onChange("comis", Number(e.target.value))}
            placeholder="0"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
          />
        </div>

        {/* Pre-operating costs */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Pre-Operating Costs
          </label>
          <input
            type="number"
            disabled={isReadOnly}
            min="0"
            step="any"
            value={formData.preop || ""}
            onChange={(e) => onChange("preop", Number(e.target.value))}
            placeholder="0"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
          />
        </div>

        {/* Others */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Others / Contingency
          </label>
          <input
            type="number"
            disabled={isReadOnly}
            min="0"
            step="any"
            value={formData.others || ""}
            onChange={(e) => onChange("others", Number(e.target.value))}
            placeholder="0"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
          />
        </div>

        {/* Total Cost Display */}
        <div className="p-3.5 bg-slate-900 text-white rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Total Estimated Cost
            </span>
            {matchesCERAmount ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Differs from CER Amount
              </span>
            )}
          </div>
          <div className="text-xl font-bold tracking-tight text-white mt-1">
            {formData.currency} {computedTotal.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
