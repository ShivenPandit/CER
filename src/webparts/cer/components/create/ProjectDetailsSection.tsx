import React from "react";
import { FolderGit2, Calendar, HelpCircle, RefreshCw } from "lucide-react";
import { ICERProposal, CERCategory, SBUOption, SBU_OPTIONS } from "../../models/CERModel";

interface IProjectDetailsSectionProps {
  formData: ICERProposal;
  onChange: (field: keyof ICERProposal, value: any) => void;
  isReadOnly?: boolean;
  isChangeMode?: boolean;
  onGenerateNewNumber?: () => void;
  onOpenCategoryHelp: () => void;
}

export const ProjectDetailsSection: React.FC<IProjectDetailsSectionProps> = ({
  formData,
  onChange,
  isReadOnly = false,
  isChangeMode = false,
  onGenerateNewNumber,
  onOpenCategoryHelp,
}) => {
  // Handle date change and auto-calculate duration in months
  const handleDateChange = (isStart: boolean, dateVal: string) => {
    if (isStart) {
      onChange("st_date", dateVal);
      if (formData.com_date && dateVal) {
        const start = new Date(dateVal);
        const end = new Date(formData.com_date);
        const diffMonths = Math.max(
          1,
          Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        );
        onChange("duration_months", diffMonths);
        onChange("period", `${diffMonths} Months`);
      }
    } else {
      onChange("com_date", dateVal);
      if (formData.st_date && dateVal) {
        const start = new Date(formData.st_date);
        const end = new Date(dateVal);
        const diffMonths = Math.max(
          1,
          Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        );
        onChange("duration_months", diffMonths);
        onChange("period", `${diffMonths} Months`);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section A: Project Identification & Scope
            </h3>
            <p className="text-xs text-slate-500">
              Basic project metadata, SBU alignment, and scheduling
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
          FR-01
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
        {/* Project Name */}
        <div className="md:col-span-2">
          <label className="block font-semibold text-slate-700 mb-1.5">
            Project Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            disabled={isReadOnly}
            value={formData.pr_name}
            onChange={(e) => onChange("pr_name", e.target.value)}
            placeholder="e.g. Mangala Polymer EOR Expansion Phase 4"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
            required
          />
        </div>

        {/* CER Proposal Number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-semibold text-slate-700">
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
            type="text"
            disabled={isReadOnly || isChangeMode}
            value={formData.cerprno}
            onChange={(e) => onChange("cerprno", e.target.value.toUpperCase())}
            placeholder="CER-2026-XXXX"
            className={`w-full px-3.5 py-2.5 rounded-xl font-mono font-semibold transition-all ${
              isChangeMode
                ? "bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed"
                : "bg-slate-50 border-slate-200 text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            }`}
            required
          />
          {isChangeMode && (
            <p className="text-[10px] text-slate-400 mt-1">
              Proposal number is locked during modification (Doc §8 #7)
            </p>
          )}
        </div>

        {/* CER Owner */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            CER Owner / Initiator <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            disabled={isReadOnly}
            value={formData.owname}
            onChange={(e) => onChange("owname", e.target.value)}
            placeholder="Full Name"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
            required
          />
        </div>

        {/* Owner Email */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Owner Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            disabled={isReadOnly}
            value={formData.owner_email}
            onChange={(e) => onChange("owner_email", e.target.value)}
            placeholder="name@vedanta.co.in"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
            required
          />
        </div>

        {/* Strategic Business Unit (SBU) */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Strategic Business Unit (SBU) <span className="text-rose-500">*</span>
          </label>
          <select
            disabled={isReadOnly}
            value={formData.sbu}
            onChange={(e) => onChange("sbu", e.target.value as SBUOption)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
          >
            {SBU_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">
            Updated: RJ North & RJ South (RJ01 removed)
          </p>
        </div>

        {/* Category */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-semibold text-slate-700">
              Proposal Category <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={onOpenCategoryHelp}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" /> Guide
            </button>
          </div>
          <select
            disabled={isReadOnly}
            value={formData.cat}
            onChange={(e) => onChange("cat", e.target.value as CERCategory)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
          >
            <option value="Vital">Vital — Cannot be postponed</option>
            <option value="Essential">Essential — Smooth operations & short payback</option>
            <option value="Desirable">Desirable — Deferrable optimization</option>
          </select>
        </div>

        {/* Business Object */}
        <div className="md:col-span-2">
          <label className="block font-semibold text-slate-700 mb-1.5">
            Business Object / Purpose
          </label>
          <input
            type="text"
            disabled={isReadOnly}
            value={formData.object}
            onChange={(e) => onChange("object", e.target.value)}
            placeholder="e.g. Polymer Flooding Injection Infrastructure Expansion"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
          />
        </div>

        {/* Project Start Date */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Start Date <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              disabled={isReadOnly}
              value={formData.st_date}
              onChange={(e) => handleDateChange(true, e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
              required
            />
          </div>
        </div>

        {/* Project Completion Date */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Completion Date <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              disabled={isReadOnly}
              value={formData.com_date}
              min={formData.st_date}
              onChange={(e) => handleDateChange(false, e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
              required
            />
          </div>
        </div>

        {/* Total Duration */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Total Duration
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              disabled={isReadOnly}
              value={formData.duration_months}
              onChange={(e) => {
                const val = Number(e.target.value);
                onChange("duration_months", val);
                onChange("period", `${val} Months`);
              }}
              className="w-24 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
            />
            <span className="text-slate-500 font-medium">Months</span>
          </div>
        </div>
      </div>
    </div>
  );
};
