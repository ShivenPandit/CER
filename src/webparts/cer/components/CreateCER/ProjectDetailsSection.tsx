import React from "react";
import { FolderGit2, RefreshCw, AlertCircle, Lock } from "lucide-react";
import { ICERProposal, CERCategory, SBUOption, SBU_OPTIONS, IFieldChoices } from "../../models/CERModel";
import { ICERDataService } from "../../services/ICERDataService";
import { LocalMockCERDataService } from "../../services/LocalMockCERDataService";
import { DirectoryPeoplePicker } from "./DirectoryPeoplePicker";
import { FormErrors } from "../../utils/cerValidation";
import { calculateExactDays, calculateMonthsFromDays, formatDuration } from "../../utils/dateUtils";

interface IProjectDetailsSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  onBlur?: (field: keyof ICERProposal) => void;
  errors?: FormErrors;
  touched?: Record<string, boolean>;
  isReadOnly?: boolean;
  isChangeMode?: boolean;
  isCreateMode?: boolean;
  onGenerateNewNumber?: () => void;
  dataService?: ICERDataService;
  fieldChoices?: IFieldChoices;
  isCheckingCerNo?: boolean;
}

export const ProjectDetailsSection: React.FC<IProjectDetailsSectionProps> = ({
  formData,
  onChange,
  onBlur,
  errors = {},
  touched = {},
  isReadOnly = false,
  isChangeMode = false,
  isCreateMode = false,
  onGenerateNewNumber,
  dataService,
  fieldChoices,
  isCheckingCerNo = false,
}) => {
  const effectiveDataService = React.useMemo(() => dataService || new LocalMockCERDataService(), [dataService]);

  // Duration display unit state: default to "days" per requirements
  const [durationUnit, setDurationUnit] = React.useState<"days" | "months">("days");

  // Handle date change and auto-calculate exact duration in days and months
  const handleDateChange = (isStart: boolean, dateVal: string) => {
    const newStDate = isStart ? dateVal : formData.st_date;
    const newComDate = isStart ? formData.com_date : dateVal;

    onChange(isStart ? "st_date" : "com_date", dateVal);

    if (newStDate && newComDate) {
      const days = calculateExactDays(newStDate, newComDate);
      const months = calculateMonthsFromDays(days);
      onChange("duration_months", months);
      onChange("period", `${days} ${days === 1 ? "Day" : "Days"}`);
    }
  };

  const exactDays = calculateExactDays(formData.st_date, formData.com_date);

  const getFieldError = (field: keyof ICERProposal): string | undefined => {
    return touched[field] || errors[field] ? errors[field] : undefined;
  };



  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
        <FolderGit2 className="w-4 h-4 text-[#012964]" />
        <h3 className="font-bold text-slate-800 text-xs tracking-wide uppercase">
          Section A — Project Details
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 text-xs">
        {/* Name of Project */}
        <div id="field-pr_name">
          <label htmlFor="pr_name" className="block font-semibold text-slate-700 mb-1">
            Name of Project <span className="text-rose-500">*</span>
          </label>
          <input
            id="pr_name"
            type="text"
            disabled={isReadOnly}
            value={formData.pr_name}
            onChange={(e) => onChange("pr_name", e.target.value)}
            onBlur={() => onBlur && onBlur("pr_name")}
            placeholder="Enter project name"
            className={`w-full h-9 px-3 py-1.5 rounded-lg font-medium transition-colors text-slate-900 placeholder:text-slate-400 focus:outline-none ${
              getFieldError("pr_name")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
            }`}
            required
            aria-invalid={!!getFieldError("pr_name")}
            aria-describedby={getFieldError("pr_name") ? "pr_name-error" : undefined}
          />
          {getFieldError("pr_name") && (
            <p id="pr_name-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("pr_name")}</span>
            </p>
          )}
        </div>

        {/* CER Proposal No. (Mandatory User-Entered Business Reference) */}
        <div id="field-proposal_no">
          <label htmlFor="proposal_no" className="block font-semibold text-slate-700 mb-1">
            CER Proposal No. <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="proposal_no"
              type="text"
              readOnly={isReadOnly}
              disabled={isReadOnly}
              value={formData.proposal_no !== undefined ? formData.proposal_no : formData.cerprno || ""}
              onChange={(e) => {
                const val = e.target.value;
                onChange("proposal_no", val);
                if (!formData.cer_proposal_id) {
                  onChange("cerprno", val);
                }
              }}
              onBlur={() => {
                if (onBlur) {
                  onBlur("proposal_no");
                  onBlur("cerprno");
                }
              }}
              className={`w-full h-9 px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors focus:outline-none ${
                isReadOnly
                  ? "bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed shadow-none"
                  : (getFieldError("proposal_no") || getFieldError("cerprno"))
                  ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-rose-950"
                  : "bg-white border border-slate-200 hover:border-slate-300 text-slate-900 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
              }`}
              placeholder="e.g. PR-2026/01"
              required
              aria-invalid={!!(getFieldError("proposal_no") || getFieldError("cerprno"))}
              aria-describedby={
                getFieldError("proposal_no") || getFieldError("cerprno") ? "proposal_no-error" : undefined
              }
            />
            {isCheckingCerNo && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-slate-400">
                <RefreshCw className="w-3 h-3 animate-spin text-[#012964]" />
                <span>Checking</span>
              </div>
            )}
          </div>
          {(getFieldError("proposal_no") || getFieldError("cerprno")) && (
            <p id="proposal_no-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("proposal_no") || getFieldError("cerprno")}</span>
            </p>
          )}
        </div>

        {/* CER Proposal ID (Permanent System-Generated Identifier) */}
        <div id="field-cer_proposal_id">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="cer_proposal_id" className="font-semibold text-slate-700 flex items-center gap-1">
              <span>CER Proposal ID</span>
            </label>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              <Lock className="w-2.5 h-2.5 text-slate-400" />
              System-Generated
            </span>
          </div>
          <div className="relative">
            <input
              id="cer_proposal_id"
              type="text"
              readOnly
              disabled
              tabIndex={-1}
              value={
                formData.cer_proposal_id ||
                (formData.id && formData.cerprno && formData.cerprno.startsWith("CER-")
                  ? formData.cerprno
                  : "Assigned upon creation")
              }
              className="w-full h-9 px-3 py-1.5 pr-8 rounded-lg font-mono text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 cursor-not-allowed select-all focus:outline-none"
              title="System-generated permanent identifier in CER-YYYY-NNNN format. Immutable and read-only."
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Block/SBU/Field */}
        <div id="field-sbu">
          <label htmlFor="sbu" className="block font-semibold text-slate-700 mb-1">
            Block/SBU/Field <span className="text-rose-500">*</span>
          </label>
          <select
            id="sbu"
            disabled={isReadOnly}
            value={formData.sbu}
            onChange={(e) => onChange("sbu", e.target.value as SBUOption)}
            onBlur={() => onBlur && onBlur("sbu")}
            className="w-full h-9 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20 focus:outline-none transition-colors font-medium text-slate-900 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {(fieldChoices?.sbu && fieldChoices.sbu.length > 0 ? fieldChoices.sbu : SBU_OPTIONS).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {getFieldError("sbu") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("sbu")}</span>
            </p>
          )}
        </div>

        {/* Category */}
        <div id="field-cat">
          <label htmlFor="cat" className="block font-semibold text-slate-700 mb-1">
            Category <span className="text-rose-500">*</span>
          </label>
          <select
            id="cat"
            disabled={isReadOnly}
            value={formData.cat}
            onChange={(e) => onChange("cat", e.target.value as CERCategory)}
            onBlur={() => onBlur && onBlur("cat")}
            className="w-full h-9 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20 focus:outline-none transition-colors font-medium text-slate-900 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {(fieldChoices?.cat && fieldChoices.cat.length > 0 ? fieldChoices.cat : ["Essential", "Vital", "Desirable"]).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {getFieldError("cat") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("cat")}</span>
            </p>
          )}
        </div>

        {/* CER Owner Name — Directory Search */}
        <div id="field-owname">
          <label htmlFor="owname-people-picker" className="block font-semibold text-slate-700 mb-1">
            CER Owner <span className="text-rose-500">*</span>
          </label>
          <DirectoryPeoplePicker
            id="owname-people-picker"
            dataService={effectiveDataService}
            selectedName={formData.owname || ""}
            selectedEmail={formData.owner_email || ""}
            disabled={isReadOnly}
            required={true}
            hasError={!!getFieldError("owname") || !!getFieldError("owner_email")}
            errorMessage={getFieldError("owname") || getFieldError("owner_email")}
            onBlur={() => onBlur && onBlur("owname")}
            onSelect={(user, resolvedEmail) => {
              onChange("owname", user.displayName);
              onChange("owner_email", resolvedEmail);
            }}
            onClear={() => {
              onChange("owname", "");
              onChange("owner_email", "");
            }}
          />
        </div>

        {/* Start Date of Project */}
        <div id="field-st_date">
          <label htmlFor="st_date" className="block font-semibold text-slate-700 mb-1">
            Start Date of the Project <span className="text-rose-500">*</span>
          </label>
          <input
            id="st_date"
            type="date"
            disabled={isReadOnly}
            value={formData.st_date}
            onChange={(e) => handleDateChange(true, e.target.value)}
            onBlur={() => onBlur && onBlur("st_date")}
            className={`w-full h-9 px-3 py-1.5 rounded-lg transition-colors text-slate-900 focus:outline-none ${
              getFieldError("st_date")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
            }`}
            required
          />
          {getFieldError("st_date") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("st_date")}</span>
            </p>
          )}
        </div>

        {/* Completion Date of Project (Optional) */}
        <div id="field-com_date">
          <label htmlFor="com_date" className="block font-semibold text-slate-700 mb-1">
            Completion Date of Project <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
          </label>
          <input
            id="com_date"
            type="date"
            disabled={isReadOnly}
            value={formData.com_date}
            min={formData.st_date}
            onChange={(e) => handleDateChange(false, e.target.value)}
            onBlur={() => onBlur && onBlur("com_date")}
            className={`w-full h-9 px-3 py-1.5 rounded-lg transition-colors text-slate-900 focus:outline-none ${
              getFieldError("com_date")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
            }`}
          />
          {getFieldError("com_date") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("com_date")}</span>
            </p>
          )}
        </div>

        {/* Total Duration */}
        <div id="field-duration_months">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="duration_months" className="block font-semibold text-slate-700">
              Total Duration
            </label>
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setDurationUnit("days")}
                title="Display duration in exact days (Default)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  durationUnit === "days"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Days
              </button>
              <button
                type="button"
                onClick={() => setDurationUnit("months")}
                title="Display duration in months"
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  durationUnit === "months"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Months
              </button>
            </div>
          </div>
          <input
            id="duration_months"
            type="text"
            readOnly
            disabled
            value={exactDays > 0 ? formatDuration(exactDays, durationUnit) : "—"}
            className="w-full h-9 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-not-allowed"
          />
        </div>

        {/* Objectives of CER */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3" id="field-object">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="object" className="font-semibold text-slate-700">
              Objectives of CER <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium">
              {formData.object ? formData.object.trim().length : 0} / 2,000
            </span>
          </div>
          <textarea
            id="object"
            rows={3}
            disabled={isReadOnly}
            value={formData.object}
            onChange={(e) => onChange("object", e.target.value)}
            onBlur={() => onBlur && onBlur("object")}
            placeholder="Describe the primary objectives, operational necessity, and scope of this capital expenditure..."
            className={`w-full px-3 py-2 rounded-lg transition-colors text-slate-900 placeholder:text-slate-400 focus:outline-none resize-y ${
              getFieldError("object")
                ? "bg-rose-50/20 border border-rose-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                : "bg-white border border-slate-200 hover:border-slate-300 focus:border-[#012964] focus:ring-1 focus:ring-[#012964]/20"
            }`}
            required
          />
          {getFieldError("object") && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{getFieldError("object")}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
