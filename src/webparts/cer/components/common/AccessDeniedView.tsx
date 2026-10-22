import React from "react";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";
import { IAppUser } from "../../models/UserModel";
import { NavView } from "../navigation/Sidebar";

interface IAccessDeniedViewProps {
  currentUser: IAppUser;
  attemptedView?: NavView;
  customMessage?: string;
  onGoHome: () => void;
}

export const AccessDeniedView: React.FC<IAccessDeniedViewProps> = ({
  currentUser,
  attemptedView,
  customMessage,
  onGoHome,
}) => {
  const getReadableRole = () => {
    if (currentUser.roles && currentUser.roles.length > 0) {
      return currentUser.roles.map((r) => r.replace("_", " & ")).join(", ");
    }
    return currentUser.role ? currentUser.role.replace("_", " & ") : "Unregistered";
  };

  return (
    <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 animate-fade-in">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-rose-100 shadow-elevated overflow-hidden text-center p-6 sm:p-8">
        {/* Shield Icon Badge */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-50 border border-rose-200/80 mx-auto flex items-center justify-center text-rose-600 mb-5 shadow-xs">
          <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
          Access Restricted
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
          {customMessage ||
            "You do not possess the required enterprise role or authorization level to access this section or perform this operation."}
        </p>

        {/* Security Context Summary Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left mb-6 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span>Current Employee:</span>
            <span className="font-semibold text-slate-900 truncate max-w-[200px]">
              {currentUser.name}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Assigned Role(s):</span>
            <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              {getReadableRole()}
            </span>
          </div>
          {attemptedView && (
            <div className="flex justify-between items-center text-slate-500">
              <span>Restricted Route:</span>
              <span className="font-mono text-slate-700 bg-slate-200/60 px-1.5 py-0.5 rounded text-[11px]">
                #{attemptedView}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-500">
            <span>Account Status:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                currentUser.is_active
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {currentUser.is_active ? "Active" : "Inactive / Deactivated"}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onGoHome}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-subtle hover:shadow-hover cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-400 mt-6 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>If you require access, please contact your System Administrator.</span>
        </p>
      </div>
    </div>
  );
};
