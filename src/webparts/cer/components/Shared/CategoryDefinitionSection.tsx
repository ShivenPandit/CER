import React from "react";

export const CategoryDefinitionSection: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 sm:p-4.5 space-y-2.5 text-xs" id="section-category-definitions">
      <div className="pb-2 border-b border-slate-200/60">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          Category Definition
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Standard operational criteria for classifying capital expenditure proposals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 md:gap-4">
        {/* Vital */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <h4 className="font-bold text-slate-800 text-xs">Vital</h4>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Vital CERs are those which cannot be postponed under any circumstances with or without payback.
          </p>
        </div>

        {/* Essential */}
        <div className="space-y-1 pt-2.5 md:pt-0 border-t border-slate-200/50 md:border-t-0 md:border-l md:border-slate-200/60 md:pl-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <h4 className="font-bold text-slate-800 text-xs">Essential</h4>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Essential are those which are important for smooth running of the operations and are justified through a short payback period.
          </p>
        </div>

        {/* Desirable */}
        <div className="space-y-1 pt-2.5 md:pt-0 border-t border-slate-200/50 md:border-t-0 md:border-l md:border-slate-200/60 md:pl-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#012964] shrink-0" />
            <h4 className="font-bold text-slate-800 text-xs">Desirable</h4>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Desirable are those which can be deferred without impacting operations and generally have a long payback period or no payback period.
          </p>
        </div>
      </div>
    </div>
  );
};
