import React from "react";
import { Landmark, Users } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";

interface IBudgetJVSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  isReadOnly?: boolean;
}

export const BudgetJVSection: React.FC<IBudgetJVSectionProps> = ({
  formData,
  onChange,
  isReadOnly = false,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Corporate Budget Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Section C: Corporate Budget
              </h3>
              <p className="text-xs text-slate-500">
                Budgeted provisions and variance explanations
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            FR-01
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Corporate Budget Status <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isReadOnly}
                value={formData.cbudget}
                onChange={(e) => onChange("cbudget", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-slate-900"
              >
                <option value="Yes">Yes (Fully Budgeted)</option>
                <option value="Partially">Partially Budgeted</option>
                <option value="No">No (Unbudgeted)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Corporate Budget Amount
              </label>
              <input
                type="number"
                disabled={isReadOnly}
                min="0"
                step="any"
                value={formData.cb_amnt || ""}
                onChange={(e) => onChange("cb_amnt", Number(e.target.value))}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Reason if Not / Partially Budgeted
            </label>
            <textarea
              rows={2}
              disabled={isReadOnly}
              value={formData.reason}
              onChange={(e) => onChange("reason", e.target.value)}
              placeholder="Provide strategic or operational justification for variance from annual budget..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-900 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Joint Venture Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Section D: Joint Venture Details
              </h3>
              <p className="text-xs text-slate-500">
                Partner alignment, JV cost sharing, and OCM approvals
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            FR-01
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                JV Alignment <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isReadOnly}
                value={formData.jv}
                onChange={(e) => onChange("jv", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-900"
              >
                <option value="Yes">Yes (Joint Venture Block)</option>
                <option value="No">No (100% Vedanta)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                JV Cost Share
              </label>
              <input
                type="number"
                disabled={isReadOnly}
                min="0"
                step="any"
                value={formData.jv_cost || ""}
                onChange={(e) => onChange("jv_cost", Number(e.target.value))}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                JV Budget Approved?
              </label>
              <select
                disabled={isReadOnly}
                value={formData.jv_budget}
                onChange={(e) => onChange("jv_budget", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-900"
              >
                <option value="Yes">Yes (Approved by OCM/TCM)</option>
                <option value="No">No (Pending Partner Consent)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                JV Budget Amount
              </label>
              <input
                type="number"
                disabled={isReadOnly}
                min="0"
                step="any"
                value={formData.jv_amnt || ""}
                onChange={(e) => onChange("jv_amnt", Number(e.target.value))}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              JV Justification & Partner Status
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={formData.jv_reason}
              onChange={(e) => onChange("jv_reason", e.target.value)}
              placeholder="e.g. Approved in OCM-48 with ONGC 30% participation..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
