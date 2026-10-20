import React from "react";
import { FolderGit2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { ICERProposal, CERCategory, SBUOption, SBU_OPTIONS } from "../../models/CERModel";
import { FormErrors } from "../../utils/cerValidation";

interface IProjectDetailsSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  onBlur?: (field: keyof ICERProposal) => void;
  errors?: FormErrors;
  touched?: Record<string, boolean>;
  isReadOnly?: boolean;
  isChangeMode?: boolean;
  onGenerateNewNumber?: () => void;
}

export const ProjectDetailsSection: React.FC<IProjectDetailsSectionProps> = ({
  formData,
  onChange,
  onBlur,
  errors = {},
  touched = {},
  isReadOnly = false,
  isChangeMode = false,
  onGenerateNewNumber,
}) => {
  // Handle date change and auto-calculate duration in days and months
  const handleDateChange = (isStart: boolean, dateVal: string) => {
    if (isStart) {
      onChange("st_date", dateVal);
      if (formData.com_date && dateVal) {
        const start = new Date(dateVal);
        const end = new Date(formData.com_date);
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        const diffMonths = Math.max(
          1,
          Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44))
        );
        onChange("duration_months", diffMonths);
        onChange("period", `${diffDays} Days (${diffMonths} Months)`);
      }
    } else {
      onChange("com_date", dateVal);
      if (formData.st_date && dateVal) {
        const start = new Date(formData.st_date);
        const end = new Date(dateVal);
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        const diffMonths = Math.max(
          1,
          Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44))
        );
        onChange("duration_months", diffMonths);
        onChange("period", `${diffDays} Days (${diffMonths} Months)`);
      }
    }
  };

  const getFieldError = (field: keyof ICERProposal): string | undefined => {
    return touched[field] || errors[field] ? errors[field] : undefined;
  };

  const isFieldValid = (field: keyof ICERProposal): boolean => {
    return !!touched[field] && !errors[field] && !!formData[field];
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section A — Project identification and scope
            </h3>
            <p className="text-xs text-slate-500">
              Basic project metadata, Block/SBU/Field alignment, schedule, and category
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
        {/* Name of Project */}
        <div className="md:col-span-2" id="field-pr_name">
          <label htmlFor="pr_name" className="block font-semibold text-slate-700 mb-1.5">
            Name of Project <span className="text-rose-500">*</span>
          </label>
          <input
            id="pr_name"
            type="text"
            disabled={isReadOnly}
            value={formData.pr_name}
            onChange={(e) => onChange("pr_name", e.target.value)}
            onBlur={() => onBlur && onBlur("pr_name")}
            className={`w-full px-3.5 py-2.5 rounded-xl font-medium transition-all text-slate-900 focus:outline-none ${
              getFieldError("pr_name")
                ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            }`}
            required
            aria-invalid={!!getFieldError("pr_name")}
            aria-describedby={getFieldError("pr_name") ? "pr_name-error" : undefined}
          />
          {getFieldError("pr_name") ? (
            <p id="pr_name-error" className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("pr_name")}</span>
            </p>
          ) : isFieldValid("pr_name") ? (
            <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Valid project name</span>
            </p>
          ) : null}
        </div>

        {/* CER Proposal No. */}
        <div id="field-cerprno">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="cerprno" className="font-semibold text-slate-700">
              CER Proposal No. <span className="text-rose-500">*</span>
            </label>
            {!isReadOnly && !isChangeMode && onGenerateNewNumber && (
              <button
                type="button"
                onClick={onGenerateNewNumber}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                title="Generate fresh unique proposal number"
              >
                <RefreshCw className="w-3 h-3" /> Auto
              </button>
            )}
          </div>
          <input
            id="cerprno"
            type="text"
            readOnly={isReadOnly || isChangeMode}
            disabled={isReadOnly || isChangeMode}
            value={formData.cerprno}
            onChange={(e) => onChange("cerprno", e.target.value)}
            onBlur={() => onBlur && onBlur("cerprno")}
            className={`w-full px-3.5 py-2.5 rounded-xl font-mono font-semibold transition-all ${
              isReadOnly || isChangeMode
                ? "bg-slate-100 border border-slate-200 text-slate-700 cursor-not-allowed"
                : "bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            }`}
            required
          />
          <p className="text-[10px] text-slate-400 mt-1">
            {isChangeMode
              ? "Fixed proposal number (read-only in change mode)"
              : "Auto-generated default, editable for Carry-Forward (C/F)"}
          </p>
        </div>

        {/* CER Owner Name */}
        <div id="field-owname">
          <label htmlFor="owname" className="block font-semibold text-slate-700 mb-1.5">
            CER Owner Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="owname"
            type="text"
            disabled={isReadOnly}
            value={formData.owname}
            onChange={(e) => onChange("owname", e.target.value)}
            onBlur={() => onBlur && onBlur("owname")}
            className={`w-full px-3.5 py-2.5 rounded-xl font-medium transition-all text-slate-900 focus:outline-none ${
              getFieldError("owname")
                ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            }`}
            required
          />
          {getFieldError("owname") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("owname")}</span>
            </p>
          )}
        </div>

        {/* Block/SBU/Field */}
        <div id="field-sbu">
          <label htmlFor="sbu" className="block font-semibold text-slate-700 mb-1.5">
            Block/SBU/Field <span className="text-rose-500">*</span>
          </label>
          <select
            id="sbu"
            disabled={isReadOnly}
            value={formData.sbu}
            onChange={(e) => onChange("sbu", e.target.value as SBUOption)}
            onBlur={() => onBlur && onBlur("sbu")}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
          >
            {SBU_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {getFieldError("sbu") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("sbu")}</span>
            </p>
          )}
        </div>

        {/* Category */}
        <div id="field-cat">
          <label htmlFor="cat" className="block font-semibold text-slate-700 mb-1.5">
            Category <span className="text-rose-500">*</span>
          </label>
          <select
            id="cat"
            disabled={isReadOnly}
            value={formData.cat}
            onChange={(e) => onChange("cat", e.target.value as CERCategory)}
            onBlur={() => onBlur && onBlur("cat")}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
          >
            <option value="Vital">Vital</option>
            <option value="Essential">Essential</option>
            <option value="Desirable">Desirable</option>
          </select>
          {getFieldError("cat") && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("cat")}</span>
            </p>
          )}
        </div>

        {/* Start Date of Project */}
        <div id="field-st_date">
          <label htmlFor="st_date" className="block font-semibold text-slate-700 mb-1.5">
            Start Date of Project <span className="text-rose-500">*</span>
          </label>
          <input
            id="st_date"
            type="date"
            disabled={isReadOnly}
            value={formData.st_date}
            onChange={(e) => handleDateChange(true, e.target.value)}
            onBlur={() => onBlur && onBlur("st_date")}
            className={`w-full px-3.5 py-2.5 rounded-xl transition-all text-slate-900 focus:outline-none ${
              getFieldError("st_date")
                ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            }`}
            required
          />
          {getFieldError("st_date") ? (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("st_date")}</span>
            </p>
          ) : isFieldValid("st_date") ? (
            <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Valid date</span>
            </p>
          ) : null}
        </div>

        {/* Completion Date of Project */}
        <div id="field-com_date">
          <label htmlFor="com_date" className="block font-semibold text-slate-700 mb-1.5">
            Completion Date of Project <span className="text-rose-500">*</span>
          </label>
          <input
            id="com_date"
            type="date"
            disabled={isReadOnly}
            value={formData.com_date}
            min={formData.st_date}
            onChange={(e) => handleDateChange(false, e.target.value)}
            onBlur={() => onBlur && onBlur("com_date")}
            className={`w-full px-3.5 py-2.5 rounded-xl transition-all text-slate-900 focus:outline-none ${
              getFieldError("com_date")
                ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            }`}
            required
          />
          {getFieldError("com_date") ? (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("com_date")}</span>
            </p>
          ) : isFieldValid("com_date") ? (
            <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Valid completion date</span>
            </p>
          ) : null}
        </div>

        {/* Total Duration */}
        <div id="field-duration_months">
          <label htmlFor="duration_months" className="block font-semibold text-slate-700 mb-1.5">
            Total Duration
          </label>
          <div className="flex items-center gap-2">
            <input
              id="duration_months"
              type="text"
              readOnly
              disabled
              value={formData.duration_months ? `${Math.round(formData.duration_months * 30.44)} Days (${formData.duration_months} Months)` : "0"}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-700 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Objectives of CER */}
        <div className="md:col-span-2 lg:col-span-3" id="field-object">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="object" className="font-semibold text-slate-700">
              Objectives of CER <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {formData.object ? formData.object.trim().length : 0} / 2,000 characters
            </span>
          </div>
          <textarea
            id="object"
            rows={3}
            disabled={isReadOnly}
            value={formData.object}
            onChange={(e) => onChange("object", e.target.value)}
            onBlur={() => onBlur && onBlur("object")}
            className={`w-full px-3.5 py-2.5 rounded-xl transition-all text-slate-900 focus:outline-none resize-y ${
              getFieldError("object")
                ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                : "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            }`}
            required
          />
          {getFieldError("object") ? (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("object")}</span>
            </p>
          ) : isFieldValid("object") ? (
            <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Valid objectives entered</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
