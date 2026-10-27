import React from "react";
import { Info, X, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { CATEGORY_DEFINITIONS } from "../../models/CERModel";

interface ICategoryDefinitionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryDefinitionModal: React.FC<ICategoryDefinitionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">CER Category Definitions</h3>
              <p className="text-xs text-slate-500">Official classification rules for capital proposals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Vital */}
          <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span className="font-semibold text-sm text-rose-900">Vital Category</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              {CATEGORY_DEFINITIONS.Vital.description}
            </p>
          </div>

          {/* Essential */}
          <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40">
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-sm text-amber-900">Essential Category</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              {CATEGORY_DEFINITIONS.Essential.description}
            </p>
          </div>

          {/* Desirable */}
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-sm text-blue-900">Desirable Category</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              {CATEGORY_DEFINITIONS.Desirable.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
