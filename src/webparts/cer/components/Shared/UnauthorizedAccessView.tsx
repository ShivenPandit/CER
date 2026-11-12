import React, { useState } from "react";
import {
  ShieldAlert,
  Lock,
  RotateCw,
  User,
  Mail,
} from "lucide-react";
import { IAppUser } from "../../models/UserModel";

interface IUnauthorizedAccessViewProps {
  currentUser: IAppUser;
  onRecheck: () => Promise<void>;
  siteUrl?: string;
}

export const UnauthorizedAccessView: React.FC<IUnauthorizedAccessViewProps> = ({
  currentUser,
  onRecheck,
}) => {
  const [isRechecking, setIsRechecking] = useState(false);

  const handleRecheck = async () => {
    setIsRechecking(true);
    try {
      await onRecheck();
    } finally {
      setIsRechecking(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col font-sans text-slate-800 antialiased selection:bg-[#012964] selection:text-white">
      {/* Top Corporate Masthead Header */}
      <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 shrink-0 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-black tracking-wider text-base sm:text-lg text-[#012964]">
                vedanta
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[#66CC33]">
                oil & gas
              </span>
            </div>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold text-slate-800 tracking-tight">
                Capital Expenditure Request (CER)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Enterprise Management System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Access Restricted</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area - Center Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg sm:max-w-xl bg-white rounded-3xl border border-slate-200 shadow-elevated overflow-hidden animate-fade-in transition-all">
          {/* Top Subtle Corporate Accent Line */}
          <div className="h-1.5 bg-gradient-to-r from-[#012964] via-[#66CC33] to-[#012964]" />

          <div className="p-6 sm:p-8 space-y-6">
            {/* Header with Shield Icon */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
                <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Access Authorization Required
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  {currentUser.is_active === false
                    ? "Your account has been deactivated in the CER system. Please contact the administrator."
                    : "Your account is not authorized for CER access."}
                </p>
              </div>
            </div>

            {/* Employee Security Context Box */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>User Profile</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  {currentUser.is_active === false ? "🔴 Deactivated" : "🔴 Restricted"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Employee Name:</span>
                  <span className="font-semibold text-slate-900 break-words text-xs sm:text-[13px]">
                    {currentUser.name || "SharePoint User"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Corporate Email:</span>
                  <span className="font-mono text-slate-800 break-all text-xs">
                    {currentUser.email || "No email detected"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">SharePoint Account / UPN:</span>
                  <span className="font-mono text-slate-700 break-all text-xs">
                    {currentUser.loginName || currentUser.email || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">SBU Assignment:</span>
                  <span className="text-slate-600 font-medium italic text-xs">
                    None (Not Configured)
                  </span>
                </div>
              </div>
            </div>

            {/* Contact System Administrator Banner */}
            <div className="flex items-center justify-center gap-2.5 px-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-700 text-xs sm:text-sm font-medium text-center">
              <Mail className="w-4 h-4 text-[#012964] shrink-0" />
              <span>Contact System Administrator</span>
            </div>

            {/* Prominent Check Access Again Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleRecheck}
                disabled={isRechecking}
                className="w-full h-12 flex items-center justify-center gap-2.5 px-6 rounded-2xl bg-[#012964] hover:bg-[#001e4d] active:scale-[0.99] text-white text-sm sm:text-base font-semibold shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isRechecking ? "animate-spin" : ""}`} />
                <span>{isRechecking ? "Verifying..." : "Check Access Again"}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Corporate Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-3 px-4 text-center text-[11px] sm:text-xs text-slate-500 font-medium shrink-0">
        <span>Capital Expenditure Request (CER)</span>
      </footer>
    </div>
  );
};
