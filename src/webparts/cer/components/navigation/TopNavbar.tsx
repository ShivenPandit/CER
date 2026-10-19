import React, { useState } from "react";
import {
  Bell,
  UserCheck,
  ChevronDown,
  Layers,
} from "lucide-react";
import { IAppUser, DEMO_USERS, UserRole } from "../../models/UserModel";

interface ITopNavbarProps {
  currentUser: IAppUser;
  onSelectUser: (user: IAppUser) => void;
  onOpenNotifications: () => void;
  onQuickSearch?: (cerprno: string) => void;
  notificationCount: number;
}

export const TopNavbar: React.FC<ITopNavbarProps> = ({
  currentUser,
  onSelectUser,
  onOpenNotifications,
  notificationCount,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-subtle z-20 sticky top-0">
      {/* System Title: Capital Expenditure System (CER) */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              Capital Expenditure System
            </h1>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 leading-none">
              CER
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-none hidden sm:block">
            Proposal & Multilevel Workflow Management
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Workflow Notification History"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* Minimal Persona / Role Switcher */}
        <div className="relative">
          {/* Backdrop to close dropdown on click outside */}
          {showUserDropdown && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserDropdown(false)}
            />
          )}

          {/* Profile Pill Button */}
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className={`relative z-50 flex items-center gap-2.5 py-1 pl-1 pr-3 rounded-full border transition-all text-left ${
              showUserDropdown
                ? "bg-slate-100 border-slate-300 ring-2 ring-slate-200"
                : "bg-white hover:bg-slate-50 border-slate-200/90 shadow-sm"
            }`}
          >
            {/* Circular Monogram Avatar */}
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-[11px] tracking-tight shrink-0 shadow-sm">
              {currentUser.name
                .replace(/\s*\([^)]*\)/g, "")
                .trim()
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </div>

            {/* User Name & Role Pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 leading-none">
                {currentUser.name.replace(/\s*\([^)]*\)/g, "").trim()}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full leading-none border ${getRoleBadgeStyle(
                  currentUser.role
                )}`}
              >
                {currentUser.role.replace("_", " & ")}
              </span>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                showUserDropdown ? "rotate-180 text-slate-700" : ""
              }`}
            />
          </button>

          {/* Persona Menu Dropdown */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-elevated border border-slate-200 p-2.5 z-50 animate-fade-in">
              {/* Active User Card Header */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {currentUser.name
                      .replace(/\s*\([^)]*\)/g, "")
                      .trim()
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.name.replace(/\s*\([^)]*\)/g, "").trim()}
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

              {/* Persona Switcher Section */}
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
                              ? "bg-blue-600 text-white shadow-sm"
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
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Enterprise Role-Based Access Control (RBAC)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
