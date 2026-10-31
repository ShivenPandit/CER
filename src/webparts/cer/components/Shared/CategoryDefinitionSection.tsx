import React from "react";

export const CategoryDefinitionSection: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3.5 sm:p-4 space-y-2.5" id="section-category-definitions">
      <div className="pb-2 border-b border-slate-200/60">
        <h3 className="text-sm sm:text-[15px] font-bold text-slate-800 tracking-tight">
          Category Definition
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Standard operational criteria for classifying capital expenditure proposals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Vital */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <h4 className="font-bold text-slate-800 text-sm">Vital</h4>
          </div>
          <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed">
            Vital CERs are those which cannot be postponed under any circumstances with or without payback.
          </p>
        </div>

        {/* Essential */}
        <div className="space-y-1 pt-2.5 md:pt-0 border-t border-slate-200/50 md:border-t-0 md:border-l md:border-slate-200/60 md:pl-3.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <h4 className="font-bold text-slate-800 text-sm">Essential</h4>
          </div>
          <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed">
            Essential are those which are important for smooth running of the operations and are justified through a short payback period.
          </p>
        </div>

        {/* Desirable */}
        <div className="space-y-1 pt-2.5 md:pt-0 border-t border-slate-200/50 md:border-t-0 md:border-l md:border-slate-200/60 md:pl-3.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#012964] shrink-0" />
            <h4 className="font-bold text-slate-800 text-sm">Desirable</h4>
          </div>
          <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed">
            Desirable are those which can be deferred without impacting operations and generally have a long payback period or no payback period.
          </p>
        </div>
      </div>
    </div>
  );
};
