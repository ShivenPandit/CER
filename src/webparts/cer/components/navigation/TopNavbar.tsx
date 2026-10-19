import React, { useState } from "react";
import {
  Search,
  Bell,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { IAppUser, DEMO_USERS, UserRole } from "../../models/UserModel";

interface ITopNavbarProps {
  currentUser: IAppUser;
  onSelectUser: (user: IAppUser) => void;
  onOpenNotifications: () => void;
  onQuickSearch: (cerprno: string) => void;
  notificationCount: number;
}

export const TopNavbar: React.FC<ITopNavbarProps> = ({
  currentUser,
  onSelectUser,
  onOpenNotifications,
  onQuickSearch,
  notificationCount,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (searchInput.trim()) {
      onQuickSearch(searchInput.trim());
      setSearchInput("");
    }
  };

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
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative w-72 lg:w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by Proposal No. (e.g. CER-2026-0001)..."
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </form>

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

        {/* Persona / Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-3 p-1.5 pr-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
              {currentUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)}
            </div>

            <div className="hidden md:block">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900 leading-none">
                  {currentUser.name}
                </span>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(
                    currentUser.role
                  )}`}
                >
                  {currentUser.role.replace("_", " & ")}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 leading-none mt-1 block">
                {currentUser.department || currentUser.email}
              </span>
            </div>

            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Persona Menu */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-elevated border border-slate-200 p-2 z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Persona (Role Testing)
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a persona to test role-based permissions
                </p>
              </div>

              <div className="space-y-1">
                {DEMO_USERS.map((u) => {
                  const isSelected = u.id === currentUser.id;
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
                      <div>
                        <p className="font-medium text-slate-900">{u.name}</p>
                        <p className="text-[11px] text-slate-500">{u.department}</p>
                      </div>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getRoleBadgeStyle(
                          u.role
                        )}`}
                      >
                        {u.role.replace("_", " & ")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="p-2 border-t border-slate-100 mt-2 bg-slate-50 rounded-xl text-[11px] text-slate-500 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Simulating enterprise RBAC</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
