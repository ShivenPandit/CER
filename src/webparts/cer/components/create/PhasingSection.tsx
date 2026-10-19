import React from "react";
import { BarChart2, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { FormErrors } from "../../utils/cerValidation";

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
  // Client original period names default
  const period1Label = formData.ph_till_label || "Till Mar'26";
  const period2Label = formData.ph_fy_label || "FY 26-27";
  const period3Label = formData.ph_beyond_label || "Beyond FY'27";

  const prodTill = Number(formData.prod_till || 0);
  const prodFy = Number(formData.prod_fy || 0);
  const prodBeyond = Number(formData.prod_beyond || 0);
  const prodTotal = prodTill + prodFy + prodBeyond;

  const capexTill = Number(formData.capex_till || 0);
  const capexFy = Number(formData.capex_fy || 0);
  const capexBeyond = Number(formData.capex_beyond || 0);
  const capexTotal = capexTill + capexFy + capexBeyond;

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

  const getCellError = (field: keyof ICERProposal): boolean => {
    return !!errors[field];
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5" id="section-phasing">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section E — Expenditure phasing
            </h3>
            <p className="text-xs text-slate-500">
              Distribution of Production (in mmbbls), Capex ($mm), and Opex ($mm) across project timeline
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 self-start sm:self-auto">
          Section E
        </span>
      </div>

      {/* Capex Balance Banner */}
      {hasCapexMismatch && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Phasing Advisory:</strong> Total phased Capex (${capexTotal.toLocaleString()}) differs from overall CER Amount (${cerAmount.toLocaleString()}).
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
            Variance: ${Math.abs(capexTotal - cerAmount).toLocaleString()}
          </span>
        </div>
      )}

      {isCapexBalanced && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Phasing Balanced:</strong> Total phased Capex (${capexTotal.toLocaleString()}) reconciles with Amount of CER.
          </span>
        </div>
      )}

      {/* Phasing Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50/70">
              <th className="py-3 px-3 w-56">Expenditure stream</th>
              <th className="py-3 px-3 text-right">{period1Label}</th>
              <th className="py-3 px-3 text-right">{period2Label}</th>
              <th className="py-3 px-3 text-right">{period3Label}</th>
              <th className="py-3 px-3 text-right font-bold text-slate-800 w-36">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Production (in mmbbls) */}
            <tr className="hover:bg-slate-50/50">
              <td className="py-3 px-3 font-semibold text-slate-800">
                Production (in mmbbls)
              </td>
              <td className="py-2.5 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.prod_till === 0 ? "" : formData.prod_till}
                  onChange={(e) => onChange("prod_till", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("prod_till")}
                  className={`w-32 px-3 py-1.5 rounded-lg text-right font-medium text-slate-900 focus:outline-none transition-all ${
                    getCellError("prod_till")
                      ? "bg-rose-50 border border-rose-300"
                      : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </td>
              <td className="py-2.5 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.prod_fy === 0 ? "" : formData.prod_fy}
                  onChange={(e) => onChange("prod_fy", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("prod_fy")}
                  className={`w-32 px-3 py-1.5 rounded-lg text-right font-medium text-slate-900 focus:outline-none transition-all ${
                    getCellError("prod_fy")
                      ? "bg-rose-50 border border-rose-300"
                      : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </td>
              <td className="py-2.5 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.prod_beyond === 0 ? "" : formData.prod_beyond}
                  onChange={(e) => onChange("prod_beyond", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("prod_beyond")}
                  className={`w-32 px-3 py-1.5 rounded-lg text-right font-medium text-slate-900 focus:outline-none transition-all ${
                    getCellError("prod_beyond")
                      ? "bg-rose-50 border border-rose-300"
                      : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                {prodTotal.toLocaleString()}
              </td>
            </tr>

            {/* Capex ($mm) */}
            <tr className="hover:bg-slate-50/50">
              <td className="py-3 px-3 font-semibold text-slate-800">
                Capex ($mm)
              </td>
              <td className="py-2.5 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.capex_till === 0 ? "" : formData.capex_till}
                  onChange={(e) => onChange("capex_till", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("capex_till")}
                  className={`w-32 px-3 py-1.5 rounded-lg text-right font-medium text-slate-900 focus:outline-none transition-all ${
                    getCellError("capex_till")
                      ? "bg-rose-50 border border-rose-300"
                      : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </td>
              <td className="py-2.5 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.capex_fy === 0 ? "" : formData.capex_fy}
                  onChange={(e) => onChange("capex_fy", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("capex_fy")}
                  className={`w-32 px-3 py-1.5 rounded-lg text-right font-medium text-slate-900 focus:outline-none transition-all ${
                    getCellError("capex_fy")
                      ? "bg-rose-50 border border-rose-300"
                      : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </td>
              <td className="py-2.5 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.capex_beyond === 0 ? "" : formData.capex_beyond}
                  onChange={(e) => onChange("capex_beyond", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("capex_beyond")}
                  className={`w-32 px-3 py-1.5 rounded-lg text-right font-medium text-slate-900 focus:outline-none transition-all ${
                    getCellError("capex_beyond")
                      ? "bg-rose-50 border border-rose-300"
                      : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                {capexTotal.toLocaleString()}
              </td>
            </tr>

            {/* Opex ($mm) */}
            <tr className="hover:bg-slate-50/50">
              <td className="py-3 px-3 font-semibold text-slate-800">
                Opex ($mm)
              </td>
              <td className="py-2.5 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.opex_till === 0 ? "" : formData.opex_till}
                  onChange={(e) => onChange("opex_till", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("opex_till")}
                  className={`w-32 px-3 py-1.5 rounded-lg text-right font-medium text-slate-900 focus:outline-none transition-all ${
                    getCellError("opex_till")
                      ? "bg-rose-50 border border-rose-300"
                      : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </td>
              <td className="py-2.5 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.opex_fy === 0 ? "" : formData.opex_fy}
                  onChange={(e) => onChange("opex_fy", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("opex_fy")}
                  className={`w-32 px-3 py-1.5 rounded-lg text-right font-medium text-slate-900 focus:outline-none transition-all ${
                    getCellError("opex_fy")
                      ? "bg-rose-50 border border-rose-300"
                      : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </td>
              <td className="py-2.5 px-3 text-right">
                <input
                  type="number"
                  disabled={isReadOnly}
                  min="0"
                  step="any"
                  value={formData.opex_beyond === 0 ? "" : formData.opex_beyond}
                  onChange={(e) => onChange("opex_beyond", e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={() => onBlur && onBlur("opex_beyond")}
                  className={`w-32 px-3 py-1.5 rounded-lg text-right font-medium text-slate-900 focus:outline-none transition-all ${
                    getCellError("opex_beyond")
                      ? "bg-rose-50 border border-rose-300"
                      : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                {opexTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
              <td className="py-3 px-3">Total Phased Outflow</td>
              <td className="py-3 px-3 text-right">{tillTotal.toLocaleString()}</td>
              <td className="py-3 px-3 text-right">{fyTotal.toLocaleString()}</td>
              <td className="py-3 px-3 text-right">{beyondTotal.toLocaleString()}</td>
              <td className="py-3 px-3 text-right text-blue-700 font-extrabold text-sm">
                {grandTotal.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
