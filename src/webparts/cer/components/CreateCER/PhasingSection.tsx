import React, { useEffect } from "react";
import { BarChart2, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { FormErrors } from "../../utils/cerValidation";
import { getCurrentFiscalYearPhasingLabels } from "../../utils/dateUtils";

interface IPhasingSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  onBlur?: (field: keyof ICERProposal) => void;
  errors?: FormErrors;
  touched?: Record<string, boolean>;
  isReadOnly?: boolean;
}

export const PhasingSection: React.FC<IPhasingSectionProps> = ({
  formData,
  onChange,
  onBlur,
  errors = {},
  touched = {},
  isReadOnly = false,
}) => {
  // Dynamic period labels auto-aligned with Indian Fiscal Year (Apr 1 - Mar 31)
  const defaultPhasing = getCurrentFiscalYearPhasingLabels();
  const period1Label = formData.ph_till_label || defaultPhasing.ph_till_label;
  const period2Label = formData.ph_fy_label || defaultPhasing.ph_fy_label;
  const period3Label = formData.ph_beyond_label || defaultPhasing.ph_beyond_label;

  const prodTill = Number(formData.prod_till || 0);
  const prodFy = Number(formData.prod_fy || 0);
  const prodBeyond = Number(formData.prod_beyond || 0);
  const prodTotal = prodTill + prodFy + prodBeyond;

  const capexTill = Number(formData.capex_till || 0);
  const capexFy = Number(formData.capex_fy || 0);
  const capexBeyond = Number(formData.capex_beyond || 0);
  const capexTotal = Math.round((capexTill + capexFy + capexBeyond) * 10000) / 10000;

  // Auto-fetch total Capex ($mm) into Amount of CER
  useEffect(() => {
    if (!isReadOnly && Math.abs(capexTotal - Number(formData.amount || 0)) > 0.0001) {
      onChange("amount", capexTotal);
    }
  }, [capexTotal, formData.amount, isReadOnly, onChange]);

  const opexTill = Number(formData.opex_till || 0);
  const opexFy = Number(formData.opex_fy || 0);
  const opexBeyond = Number(formData.opex_beyond || 0);
  const opexTotal = opexTill + opexFy + opexBeyond;

  const tillTotal = prodTill + capexTill + opexTill;
  const fyTotal = prodFy + capexFy + opexFy;
  const beyondTotal = prodBeyond + capexBeyond + opexBeyond;
  const grandTotal = tillTotal + fyTotal + beyondTotal;

  // Comparison with overall CER amount
  const cerAmount = Number(formData.amount || 0);
  const hasCapexMismatch = cerAmount > 0 && Math.abs(capexTotal - cerAmount) > 0.01 && capexTotal > 0;
  const isCapexBalanced = cerAmount > 0 && Math.abs(capexTotal - cerAmount) <= 0.01;
  const currSymbol = formData.currency === "INR" ? "₹" : "$";

  const getCellError = (field: keyof ICERProposal): boolean => {
    return !!errors[field] || (field.startsWith("capex_") && !!errors.amount && capexTotal <= 0);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3" id="section-phasing">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#012964]" />
          <h3 className="font-bold text-slate-800 text-sm sm:text-[15px] tracking-tight">
            Section C — Expenditure Phasing
          </h3>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          Indian FY (Apr 1 – Mar 31)
        </span>
      </div>

      {/* Compact Inline Validation Message (Displayed only when relevant) */}
      {errors.amount && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-[13px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>{errors.amount}</span>
        </div>
      )}

      {/* Phasing Matrix Table */}
      <div className="overflow-x-auto -mx-1 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead>
            <tr className="border-b border-slate-200 text-slate-700 text-[12px] sm:text-[13px] font-semibold bg-slate-50/80">
              <th className="py-2 px-2.5 w-48">Expenditure Stream</th>
              <th className="py-2 px-2.5 text-right">{period1Label}</th>
              <th className="py-2 px-2.5 text-right">{period2Label}</th>
              <th className="py-2 px-2.5 text-right">{period3Label}</th>
              <th className="py-2 px-2.5 text-right font-bold text-slate-800 w-32 bg-slate-50/90">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Production (in mmbbls) */}
            <tr className="hover:bg-slate-50/40">
              <td className="py-1.5 px-2.5 text-[13px] font-medium text-slate-800">
                Production (in mmbbls)
              </td>
              <td className="py-1.5 px-2.5 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.prod_till === 0 ? "" : formData.prod_till}
                  onChange={(e) => onChange("prod_till", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("prod_till")}
                  className={`w-28 sm:w-32 h-8 px-2.5 py-1 rounded-md text-right font-mono text-[13px] font-medium text-slate-900 focus:outline-none transition-colors disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    getCellError("prod_till")
                      ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
                  }`}
                />
              </td>
              <td className="py-1.5 px-2.5 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.prod_fy === 0 ? "" : formData.prod_fy}
                  onChange={(e) => onChange("prod_fy", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("prod_fy")}
                  className={`w-28 sm:w-32 h-8 px-2.5 py-1 rounded-md text-right font-mono text-[13px] font-medium text-slate-900 focus:outline-none transition-colors disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    getCellError("prod_fy")
                      ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
                  }`}
                />
              </td>
              <td className="py-1.5 px-2.5 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.prod_beyond === 0 ? "" : formData.prod_beyond}
                  onChange={(e) => onChange("prod_beyond", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("prod_beyond")}
                  className={`w-28 sm:w-32 h-8 px-2.5 py-1 rounded-md text-right font-mono text-[13px] font-medium text-slate-900 focus:outline-none transition-colors disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    getCellError("prod_beyond")
                      ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
                  }`}
                />
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono text-[13px] font-bold text-slate-800 bg-slate-50/50">
                {prodTotal.toLocaleString()}
              </td>
            </tr>

            {/* Capex ($mm) - Mandatory */}
            <tr className="hover:bg-slate-50/40">
              <td className="py-1.5 px-2.5 text-[13px] font-semibold text-slate-800">
                <span>Capex ($mm)</span> <span className="text-rose-500 font-bold">*</span>
              </td>
              <td className="py-1.5 px-2.5 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.capex_till === 0 ? "" : formData.capex_till}
                  onChange={(e) => onChange("capex_till", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("capex_till")}
                  className={`w-28 sm:w-32 h-8 px-2.5 py-1 rounded-md text-right font-mono text-[13px] font-medium text-slate-900 focus:outline-none transition-colors disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    getCellError("capex_till")
                      ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
                  }`}
                />
              </td>
              <td className="py-1.5 px-2.5 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.capex_fy === 0 ? "" : formData.capex_fy}
                  onChange={(e) => onChange("capex_fy", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("capex_fy")}
                  className={`w-28 sm:w-32 h-8 px-2.5 py-1 rounded-md text-right font-mono text-[13px] font-medium text-slate-900 focus:outline-none transition-colors disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    getCellError("capex_fy")
                      ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
                  }`}
                />
              </td>
              <td className="py-1.5 px-2.5 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.capex_beyond === 0 ? "" : formData.capex_beyond}
                  onChange={(e) => onChange("capex_beyond", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("capex_beyond")}
                  className={`w-28 sm:w-32 h-8 px-2.5 py-1 rounded-md text-right font-mono text-[13px] font-medium text-slate-900 focus:outline-none transition-colors disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    getCellError("capex_beyond")
                      ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
                  }`}
                />
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono text-[13px] font-bold text-slate-900 bg-slate-50/70">
                {capexTotal.toLocaleString()}
              </td>
            </tr>

            {/* Opex ($mm) */}
            <tr className="hover:bg-slate-50/40">
              <td className="py-1.5 px-2.5 text-[13px] font-medium text-slate-800">
                Opex ($mm)
              </td>
              <td className="py-1.5 px-2.5 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.opex_till === 0 ? "" : formData.opex_till}
                  onChange={(e) => onChange("opex_till", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("opex_till")}
                  className={`w-28 sm:w-32 h-8 px-2.5 py-1 rounded-md text-right font-mono text-[13px] font-medium text-slate-900 focus:outline-none transition-colors disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    getCellError("opex_till")
                      ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
                  }`}
                />
              </td>
              <td className="py-1.5 px-2.5 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.opex_fy === 0 ? "" : formData.opex_fy}
                  onChange={(e) => onChange("opex_fy", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("opex_fy")}
                  className={`w-28 sm:w-32 h-8 px-2.5 py-1 rounded-md text-right font-mono text-[13px] font-medium text-slate-900 focus:outline-none transition-colors disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    getCellError("opex_fy")
                      ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
                  }`}
                />
              </td>
              <td className="py-1.5 px-2.5 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.opex_beyond === 0 ? "" : formData.opex_beyond}
                  onChange={(e) => onChange("opex_beyond", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("opex_beyond")}
                  className={`w-28 sm:w-32 h-8 px-2.5 py-1 rounded-md text-right font-mono text-[13px] font-medium text-slate-900 focus:outline-none transition-colors disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    getCellError("opex_beyond")
                      ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                      : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
                  }`}
                />
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono text-[13px] font-bold text-slate-800 bg-slate-50/50">
                {opexTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/90 font-semibold text-slate-900 text-[13px]">
              <td className="py-2 px-2.5">Total Outflow</td>
              <td className="py-2 px-2.5 text-right font-mono">{tillTotal.toLocaleString()}</td>
              <td className="py-2 px-2.5 text-right font-mono">{fyTotal.toLocaleString()}</td>
              <td className="py-2 px-2.5 text-right font-mono">{beyondTotal.toLocaleString()}</td>
              <td className="py-2 px-2.5 text-right text-[#012964] font-mono font-bold text-[13px] bg-slate-100/70">
                {grandTotal.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
