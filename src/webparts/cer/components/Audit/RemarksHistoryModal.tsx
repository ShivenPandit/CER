import React, { useState, useEffect } from "react";
import { History, X } from "lucide-react";
import { ICERRemarksVersion } from "../../models/AuditModel";
import { ICERDataService } from "../../services/ICERDataService";

interface IRemarksHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cerprno: string;
  dataService: ICERDataService;
}

export const RemarksHistoryModal: React.FC<IRemarksHistoryModalProps> = ({
  isOpen,
  onClose,
  cerprno,
  dataService,
}) => {
  const [versions, setVersions] = useState<ICERRemarksVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ICERRemarksVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const history = await dataService.getRemarksHistory(cerprno);
      setVersions(history);
      if (history.length > 0) {
        setSelectedVersion(history[0]);
      }
    } catch (e) {
      console.error("Error loading remarks history:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && cerprno) {
      loadHistory().catch((e) => console.error(e));
    }
  }, [isOpen, cerprno]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                FR-08 Remarks Version History
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Remarks Revisions for {cerprno}
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

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          {/* Versions Sidebar */}
          <div className="border-r border-slate-200 p-4 overflow-y-auto space-y-2 bg-slate-50/50">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Revision Snapshots ({versions.length})
            </p>

            {isLoading ? (
              <p className="text-slate-400 text-xs py-4">Loading revision history...</p>
            ) : versions.length === 0 ? (
              <p className="text-slate-400 text-xs py-4">No historical revisions recorded.</p>
            ) : (
              versions.map((ver) => {
                const isSelected = selectedVersion?.id === ver.id;
                return (
                  <button
                    key={ver.id}
                    onClick={() => setSelectedVersion(ver)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? "bg-white border-blue-400 shadow-sm ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                      <span>Version {ver.version}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {ver.word_count} words
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      By {ver.created_by}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(ver.created_date).toLocaleString("en-GB")}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Version Details Content */}
          <div className="md:col-span-2 p-6 overflow-y-auto flex flex-col justify-between space-y-4">
            {selectedVersion ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Remarks Content — Version {selectedVersion.version}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Logged by {selectedVersion.created_by} on{" "}
                      {new Date(selectedVersion.created_date).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedVersion.word_count} words
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-900 leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">
                  {selectedVersion.remarks_text}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Select a version from the left panel to inspect.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
