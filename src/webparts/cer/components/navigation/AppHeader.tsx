import React, { useState } from "react";
import {
  Home,
  Calendar as CalendarIcon,
  Bell,
  ChevronDown,
  ArrowLeft,
  UserCheck,
} from "lucide-react";
import { IAppUser, DEMO_USERS, UserRole } from "../../models/UserModel";
import { NavView } from "./Sidebar";
import vedantaLogo from "../../assets/Vedanta.png";

interface IAppHeaderProps {
  currentUser: IAppUser;
  currentView: NavView;
  onNavigate: (view: NavView, proposalId?: string) => void;
  onGoBack: () => void;
  canGoBack: boolean;
  onSelectUser: (user: IAppUser) => void;
  onOpenNotifications: () => void;
  notificationCount: number;
}

export const AppHeader: React.FC<IAppHeaderProps> = ({
  currentUser,
  currentView,
  onGoBack,
  canGoBack,
  onNavigate,
  onSelectUser,
  onOpenNotifications,
  notificationCount,
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
    <header className="h-12 sm:h-13 lg:h-14 bg-white border-b border-slate-200/90 px-3 xs:px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-2xs z-30 sticky top-0 w-full select-none">
      {/* Left side: Back Button + Platform Logo & Titles */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Compact Back Button (shown on inner views or when navigation history exists) */}
        {canGoBack && (
          <>
            <button
              onClick={onGoBack}
              className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-all shadow-xs border border-slate-200 shrink-0"
              title="Go back to previous page"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-4 sm:h-5 w-px bg-slate-200 shrink-0 hidden sm:block" />
          </>
        )}

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
                className="h-6 sm:h-7 md:h-8 w-auto max-w-[140px] sm:max-w-[175px] md:max-w-[210px] object-contain transform group-hover:scale-105 transition-transform"
              />
            </div>

            {/* Titles */}
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-xs xs:text-sm sm:text-[15px] lg:text-base font-bold text-[#0A1E38] tracking-tight leading-tight truncate group-hover:text-blue-700 transition-colors max-w-[155px] xs:max-w-[220px] sm:max-w-none">
                Capital Expenditure Request (CER)
              </h1>
              <p className="hidden xs:block text-[9px] sm:text-[10px] md:text-[11px] font-medium text-slate-500 tracking-tight leading-none mt-0.5 truncate">
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
                ? "text-blue-700 font-bold"
                : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
            }`}
            title="Home Page"
          >
            <Home className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isHomeActive ? "text-blue-600" : "text-slate-500"}`} />
            <span className="hidden md:inline">Home</span>
            {isHomeActive && (
              <span className="absolute bottom-[-10px] sm:bottom-[-11px] lg:bottom-[-13px] inset-x-1 h-0.5 bg-blue-600 rounded-full" />
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

          {/* Notification Bell with Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            title="Workflow Notification History"
            aria-label="Workflow Notifications"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
            {notificationCount > 0 ? (
              <span className="absolute top-0 right-0 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-xs">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            ) : (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {/* Separator */}
          <div className="h-3.5 sm:h-4 w-px bg-slate-200 mx-0.5" />

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
              {/* Dark Navy Avatar Monogram Circle */}
              <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-[#0A1E38] text-white flex items-center justify-center font-bold text-[10px] sm:text-[11px] tracking-tight shrink-0 shadow-xs">
                {initials}
              </div>

              {/* User Display Name (Hidden on narrow mobile screens) */}
              <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                <span className="text-xs sm:text-[13px] font-bold text-[#0A1E38] leading-none max-w-[90px] md:max-w-[130px] lg:max-w-[180px] truncate">
                  {cleanName}
                </span>
              </div>

              <ChevronDown
                className={`w-3 h-3 text-slate-500 transition-transform duration-200 shrink-0 ${
                  showUserDropdown ? "rotate-180 text-slate-800" : ""
                }`}
              />
            </button>

            {/* Persona Switcher Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-elevated border border-slate-200 p-2.5 z-50 animate-fade-in max-w-[92vw]">
                {/* Active Profile Info */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-full bg-[#0A1E38] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {cleanName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                  {currentUser.department && (
                    <p className="text-[11px] text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200/60 truncate font-medium">
                      🏢 {currentUser.department}
                    </p>
                  )}
                </div>

                {/* Persona Testing Selector */}
                <div className="px-2.5 py-1 mb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Persona (Role Testing)
                  </p>
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
                  {DEMO_USERS.map((u) => {
                    const isSelected = u.id === currentUser.id;
                    const uInitials = u.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSelectUser(u);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors text-left ${
                          isSelected
                            ? "bg-blue-50 text-blue-900 font-semibold"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {uInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {u.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {u.department}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ml-2 shrink-0 ${getRoleBadgeStyle(
                            u.role
                          )}`}
                        >
                          {u.role.replace("_", " & ")}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-2 border-t border-slate-100 mt-2 bg-slate-50/80 rounded-xl text-[10px] text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Enterprise Role-Based Access Control</span>
                </div>
              </div>
            )}
          </div>
        </div>
    </header>
  );
};
