import React from "react";
import { Mail, CheckCircle2, Clock, X, Paperclip, Users } from "lucide-react";
import { INotificationLog } from "../../models/WorkflowModel";

interface INotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: INotificationLog[];
}

export const NotificationCenter: React.FC<INotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 w-full sm:w-auto">
        <div className="w-full sm:w-screen sm:max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-100/60 text-blue-700">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Workflow Email Audit Log</h3>
                <p className="text-xs text-slate-500">Automated multi-party notifications log</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner explaining the rule */}
          <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100 text-xs text-blue-800 flex items-start gap-2">
            <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Visibility Rule (Doc §8 #4):</strong> All workflow communications are marked to the <em>Creator</em>, <em>All Previous Approvers</em>, and the <em>Next Approver</em>.
            </span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No workflow notifications generated yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-subtle transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 truncate">
                      {notif.cerprno}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-800 line-clamp-1">
                    {notif.subject}
                  </p>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg leading-relaxed border border-slate-100">
                    {notif.body}
                  </p>

                  <div className="pt-1 border-t border-slate-100 text-[11px] space-y-1 text-slate-500">
                    <div className="flex items-start gap-1">
                      <span className="font-medium text-slate-700">Recipients:</span>
                      <span className="truncate" title={notif.recipients.join(", ")}>
                        {notif.recipients.join(", ")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.timestamp).toLocaleString("en-GB")}
                      </span>
                      {notif.attachments_count > 0 && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Paperclip className="w-3 h-3" />
                          {notif.attachments_count} attached
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
