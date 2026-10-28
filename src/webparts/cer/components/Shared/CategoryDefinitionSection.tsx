import React from "react";

export const CategoryDefinitionSection: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3">
      <div className="pb-2.5 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">
          Category Definition
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Standard operational criteria for classifying capital expenditure proposals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Vital */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <h4 className="text-xs font-semibold text-slate-900">Vital</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Vital CERs are those which cannot be postponed under any circumstances with or without payback.
          </p>
        </div>

        {/* Essential */}
        <div className="space-y-1 pt-3 md:pt-0 border-t border-slate-100 md:border-t-0 md:border-l md:border-slate-100 md:pl-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h4 className="text-xs font-semibold text-slate-900">Essential</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Essential are those which are important for smooth running of the operations and are justified through a short payback period.
          </p>
        </div>

        {/* Desirable */}
        <div className="space-y-1 pt-3 md:pt-0 border-t border-slate-100 md:border-t-0 md:border-l md:border-slate-100 md:pl-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#012964]" />
            <h4 className="text-xs font-semibold text-slate-900">Desirable</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Desirable are those which can be deferred without impacting operations and generally have a long payback period or no payback period.
          </p>
        </div>
      </div>
    </div>
  );
};
