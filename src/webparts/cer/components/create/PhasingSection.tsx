import React from "react";
import { BarChart2 } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";

interface IPhasingSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  isReadOnly?: boolean;
}

export const PhasingSection: React.FC<IPhasingSectionProps> = ({
  formData,
  onChange,
  isReadOnly = false,
}) => {
  const prodTotal = (formData.prod_till || 0) + (formData.prod_fy || 0) + (formData.prod_beyond || 0);
  const capexTotal = (formData.capex_till || 0) + (formData.capex_fy || 0) + (formData.capex_beyond || 0);
  const opexTotal = (formData.opex_till || 0) + (formData.opex_fy || 0) + (formData.opex_beyond || 0);

  const tillTotal = (formData.prod_till || 0) + (formData.capex_till || 0) + (formData.opex_till || 0);
  const fyTotal = (formData.prod_fy || 0) + (formData.capex_fy || 0) + (formData.opex_fy || 0);
  const beyondTotal = (formData.prod_beyond || 0) + (formData.capex_beyond || 0) + (formData.opex_beyond || 0);
  const grandTotal = tillTotal + fyTotal + beyondTotal;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section E: Expenditure Phasing Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Distribution of Production, CAPEX, and OPEX across time periods
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          FR-01
        </span>
      </div>

      {/* Customizable Phasing Column Headers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Period 1 Label (Till Period)
          </label>
          <input
            type="text"
            disabled={isReadOnly}
            value={formData.ph_till_label}
            onChange={(e) => onChange("ph_till_label", e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Period 2 Label (Financial Year)
          </label>
          <input
            type="text"
            disabled={isReadOnly}
            value={formData.ph_fy_label}
            onChange={(e) => onChange("ph_fy_label", e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Period 3 Label (Beyond Period)
          </label>
          <input
            type="text"
            disabled={isReadOnly}
            value={formData.ph_beyond_label}
            onChange={(e) => onChange("ph_beyond_label", e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium text-xs"
          />
        </div>
      </div>

      {/* Phasing Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
              <th className="py-2.5 px-3">Expenditure Stream</th>
              <th className="py-2.5 px-3 text-right">{formData.ph_till_label}</th>
              <th className="py-2.5 px-3 text-right">{formData.ph_fy_label}</th>
              <th className="py-2.5 px-3 text-right">{formData.ph_beyond_label}</th>
              <th className="py-2.5 px-3 text-right font-bold text-slate-700">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Production Expenditure */}
            <tr className="hover:bg-slate-50/50">
              <td className="py-2.5 px-3 font-semibold text-slate-800">
                Production Expenditure
              </td>
              <td className="py-2 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.prod_till || ""}
                  onChange={(e) => onChange("prod_till", Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-medium text-slate-900 focus:bg-white"
                />
              </td>
              <td className="py-2 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.prod_fy || ""}
                  onChange={(e) => onChange("prod_fy", Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-medium text-slate-900 focus:bg-white"
                />
              </td>
              <td className="py-2 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.prod_beyond || ""}
                  onChange={(e) => onChange("prod_beyond", Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-medium text-slate-900 focus:bg-white"
                />
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                {prodTotal.toLocaleString()}
              </td>
            </tr>

            {/* CAPEX Expenditure */}
            <tr className="hover:bg-slate-50/50">
              <td className="py-2.5 px-3 font-semibold text-slate-800">
                CAPEX Expenditure
              </td>
              <td className="py-2 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.capex_till || ""}
                  onChange={(e) => onChange("capex_till", Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-medium text-slate-900 focus:bg-white"
                />
              </td>
              <td className="py-2 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.capex_fy || ""}
                  onChange={(e) => onChange("capex_fy", Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-medium text-slate-900 focus:bg-white"
                />
              </td>
              <td className="py-2 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.capex_beyond || ""}
                  onChange={(e) => onChange("capex_beyond", Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-medium text-slate-900 focus:bg-white"
                />
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                {capexTotal.toLocaleString()}
              </td>
            </tr>

            {/* OPEX Expenditure */}
            <tr className="hover:bg-slate-50/50">
              <td className="py-2.5 px-3 font-semibold text-slate-800">
                OPEX Expenditure
              </td>
              <td className="py-2 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.opex_till || ""}
                  onChange={(e) => onChange("opex_till", Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-medium text-slate-900 focus:bg-white"
                />
              </td>
              <td className="py-2 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.opex_fy || ""}
                  onChange={(e) => onChange("opex_fy", Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-medium text-slate-900 focus:bg-white"
                />
              </td>
              <td className="py-2 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.opex_beyond || ""}
                  onChange={(e) => onChange("opex_beyond", Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-medium text-slate-900 focus:bg-white"
                />
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                {opexTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
              <td className="py-2.5 px-3">Total Phased Outflow</td>
              <td className="py-2.5 px-3 text-right">{tillTotal.toLocaleString()}</td>
              <td className="py-2.5 px-3 text-right">{fyTotal.toLocaleString()}</td>
              <td className="py-2.5 px-3 text-right">{beyondTotal.toLocaleString()}</td>
              <td className="py-2.5 px-3 text-right text-blue-700 font-extrabold">
                {grandTotal.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
