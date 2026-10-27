import React from "react";
import { MessageSquare, X, Calendar, User } from "lucide-react";

interface IRemarksDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  cerprno: string;
  fieldDesc: string;
  oldValue: string;
  newValue: string;
  userName?: string;
  auditDate?: string;
  auditTime?: string;
}

export const RemarksDiffModal: React.FC<IRemarksDiffModalProps> = ({
  isOpen,
  onClose,
  cerprno,
  fieldDesc,
  oldValue,
  newValue,
  userName,
  auditDate,
  auditTime,
}) => {
  if (!isOpen) return null;

  const oldWordCount = oldValue ? oldValue.trim().split(/\s+/).filter(Boolean).length : 0;
  const newWordCount = newValue ? newValue.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Screen 0400 equivalent */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Screen 0400: Historical Narrative Comparison
              </span>
              <h3 className="text-base font-bold text-slate-900">
                {cerprno} — {fieldDesc}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Metadata Info */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            {userName && (
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Modified by: <strong>{userName}</strong>
              </span>
            )}
            {auditDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {auditDate} at {auditTime}
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            FR-07 / FR-08 Audit Detail
          </span>
        </div>

        {/* Side-by-side comparison body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto text-xs">
          {/* Old Value Box */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-rose-200/60 mb-2">
                <span className="font-bold text-rose-900 uppercase text-[10px] tracking-wider">
                  Previous Version (Old Value)
                </span>
                <span className="text-rose-700 text-[11px] font-semibold">
                  {oldWordCount} words
                </span>
              </div>
              <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-sans max-h-80 overflow-y-auto">
                {oldValue || <span className="text-slate-400 italic">No prior remarks recorded.</span>}
              </div>
            </div>
          </div>

          {/* New Value Box */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 mb-2">
                <span className="font-bold text-emerald-900 uppercase text-[10px] tracking-wider">
                  Updated Version (New Value)
                </span>
                <span className="text-emerald-700 text-[11px] font-semibold">
                  {newWordCount} words
                </span>
              </div>
              <div className="text-slate-900 leading-relaxed whitespace-pre-wrap font-sans max-h-80 overflow-y-auto">
                {newValue || <span className="text-slate-400 italic">Remarks were cleared.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
