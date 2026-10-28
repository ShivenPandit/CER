import React, { useState } from "react";
import {
  Home,
  Calendar as CalendarIcon,
  ChevronDown,
  ShieldCheck,
  Building2,
  Mail,
  Shield,
} from "lucide-react";
import { IAppUser, UserRole } from "../../models/UserModel";
import { NavView } from "./Sidebar";
import vedantaLogo from "../../assets/Vedanta.png";
import { UserAvatar } from "../Common/UserAvatar";

interface IAppHeaderProps {
  currentUser: IAppUser;
  currentView: NavView;
  onNavigate: (view: NavView, proposalId?: string) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  onSelectUser?: (user: IAppUser) => void;
  onOpenNotifications?: () => void;
  notificationCount?: number;
}

export const AppHeader: React.FC<IAppHeaderProps> = ({
  currentUser,
  currentView,
  onNavigate,
  onSelectUser,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Formatted date matching reference: "Tue, Oct 21, 2025"
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const getRoleBadgeStyle = (role: UserRole): string => {
    switch (role) {
      case "Admin":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Approver":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Finance_Audit":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Initiator":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const cleanName = currentUser.name.replace(/\s*\([^)]*\)/g, "").trim();
  const initials = cleanName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const isHomeActive = currentView === "dashboard";

  return (
    <header className="h-12 sm:h-13 lg:h-14 bg-white border-b border-slate-200/90 shrink-0 shadow-2xs z-30 sticky top-0 w-full select-none">
      <div className="w-full max-w-[2560px] mx-auto h-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16 flex items-center justify-between">
        {/* Left side: Platform Logo & Titles */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Brand Link (Clicking logo / title returns to home) */}
          <div
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group min-w-0"
            role="button"
            tabIndex={0}
            title="Return to Home"
          >
            {/* Official Vedanta Logo */}
            <div className="shrink-0 flex items-center pr-0.5">
              <img
                src={vedantaLogo}
                alt="Vedanta"
                className="h-7 sm:h-7.5 lg:h-8 w-auto max-w-[140px] sm:max-w-[170px] md:max-w-[195px] 2xl:max-w-[220px] object-contain transform group-hover:scale-105 transition-transform"
              />
            </div>

            {/* Titles */}
            <div className="flex flex-col justify-center shrink-0">
              <h1 className="text-sm sm:text-[15px] lg:text-[16px] xl:text-[16.5px] 2xl:text-[17.5px] font-bold text-[#0A1E38] tracking-tight leading-tight whitespace-nowrap group-hover:text-blue-700 transition-colors">
                Capital Expenditure Request (CER)
              </h1>
              <p className="hidden xs:block text-[9.5px] sm:text-[10.5px] 2xl:text-[11.5px] font-medium text-slate-500 tracking-tight leading-none mt-0.5 whitespace-nowrap">
                Management System
              </p>
            </div>
          </div>
        </div>

        {/* Right side: Home, Date, Notification Bell, User Avatar */}
        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0">
          {/* Home Navigation Indicator */}
          <button
            onClick={() => onNavigate("dashboard")}
            className={`flex items-center gap-1 xs:gap-1.5 p-1 xs:px-2 xs:py-1 rounded-lg text-xs sm:text-sm font-semibold transition-all relative ${
              isHomeActive
                ? "text-[#012964] font-bold"
                : "text-slate-600 hover:text-[#012964] hover:bg-slate-50"
            }`}
            title="Home Page"
          >
            <Home className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isHomeActive ? "text-[#012964]" : "text-slate-500"}`} />
            <span className="hidden md:inline">Home</span>
            {isHomeActive && (
              <span className="absolute bottom-[-9px] sm:bottom-[-10px] lg:bottom-[-11px] inset-x-1 h-0.5 bg-[#012964] rounded-full" />
            )}
          </button>

          {/* Separator */}
          <div className="h-3.5 sm:h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Current Date Display (Desktop & large screens) */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-slate-600 px-1">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="whitespace-nowrap">{formattedDate}</span>
          </div>

          {/* Separator */}
          <div className="h-3.5 sm:h-4 w-px bg-slate-200 mx-0.5 hidden lg:block" />

          {/* Authenticated User Profile & Persona Switcher */}
          <div className="relative shrink-0">
            {showUserDropdown && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserDropdown(false)}
              />
            )}

            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className={`relative z-50 flex items-center gap-1.5 py-0.5 pl-0.5 pr-1.5 sm:pr-2 rounded-full border transition-all text-left ${
                showUserDropdown
                  ? "bg-slate-100 border-slate-300 ring-2 ring-slate-200"
                  : "bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
              }`}
              title="User Profile & Persona Switcher"
            >
              {/* User Profile Avatar */}
              <UserAvatar
                name={cleanName}
                email={currentUser.email}
                size="sm"
              />

              {/* User Display Name (Hidden on narrow mobile screens) */}
              <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                <span className="text-xs sm:text-[13px] 2xl:text-[14px] font-bold text-[#0A1E38] leading-none max-w-[90px] md:max-w-[130px] lg:max-w-[180px] 2xl:max-w-[220px] truncate">
                  {cleanName}
                </span>
              </div>

              <ChevronDown
                className={`w-3 h-3 text-slate-500 transition-transform duration-200 shrink-0 ${
                  showUserDropdown ? "rotate-180 text-slate-800" : ""
                }`}
              />
            </button>

            {/* Real Authenticated Profile Details Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-elevated border border-slate-200 p-2.5 z-50 animate-fade-in max-w-[92vw]">
                {/* Active Profile Info */}
                <div className="p-2.5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-slate-200/80 mb-2">
                  <div className="flex items-center gap-2.5 mb-2">
                    <UserAvatar
                      name={cleanName}
                      email={currentUser.email}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {cleanName}
                        </p>
                        {/* Compact Role Badge(s) on Top */}
                        <div className="flex items-center gap-1 shrink-0">
                          {(currentUser.roles && currentUser.roles.length > 0
                            ? currentUser.roles
                            : [currentUser.role]
                          ).map((r) => (
                            <span
                              key={r}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${getRoleBadgeStyle(
                                r
                              )}`}
                            >
                              <Shield className="w-2.5 h-2.5 shrink-0" />
                              <span>
                                {r === "Approver" && currentUser.approval_level
                                  ? `Approver (L${currentUser.approval_level})`
                                  : r.replace("_", " & ")}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{currentUser.email || "No email registered"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {currentUser.department && (
                      <p className="text-[11px] text-slate-600 bg-white/80 px-2 py-1 rounded-lg border border-slate-200/60 truncate flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{currentUser.department}</span>
                      </p>
                    )}
                    {currentUser.sbu && (
                      <p className="text-[11px] text-slate-600 bg-white/80 px-2 py-1 rounded-lg border border-slate-200/60 truncate flex items-center gap-1.5 font-medium">
                        <span>📍</span>
                        <span className="truncate">{currentUser.sbu}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Authenticated Footer */}
                <div className="px-2 py-1.5 bg-slate-50/80 rounded-xl text-[10px] text-slate-500 flex items-center gap-1.5 border border-slate-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Authenticated via Microsoft SharePoint / Entra ID</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
