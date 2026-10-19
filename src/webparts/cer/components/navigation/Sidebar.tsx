import React from "react";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Files,
  Clock,
  History,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { UserRole } from "../../models/UserModel";

export type NavView =
  | "dashboard"
  | "create"
  | "change"
  | "my-proposals"
  | "all-proposals"
  | "pending-approvals"
  | "approval-history"
  | "display"
  | "reports"
  | "audit-trail"
  | "workflow-config";

interface ISidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView, proposalId?: string) => void;
  userRole: UserRole;
  pendingApprovalsCount: number;
}

export const Sidebar: React.FC<ISidebarProps> = ({
  currentView,
  onNavigate,
  userRole,
  pendingApprovalsCount,
}) => {
  // Authorization checks for navigation items
  const canCreate = userRole === "Initiator" || userRole === "Admin";
  const canApprove = userRole === "Approver" || userRole === "Admin";
  const canConfigWorkflow = userRole === "Admin";

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: "create",
      label: "Create CER",
      icon: PlusCircle,
      visible: canCreate,
    },
    {
      id: "my-proposals",
      label: "My CER Proposals",
      icon: FileText,
      visible: true,
    },
    {
      id: "all-proposals",
      label: "All CER Proposals",
      icon: Files,
      visible: userRole !== "Initiator" || true, // Visible to all for transparency, filtered by role
    },
    {
      id: "pending-approvals",
      label: "Pending Approvals",
      icon: Clock,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      visible: canApprove,
    },
    {
      id: "approval-history",
      label: "Approval History",
      icon: History,
      visible: true,
    },
    {
      id: "reports",
      label: "Reports & Analytics",
      icon: BarChart3,
      visible: true,
    },
    {
      id: "audit-trail",
      label: "Field-Level Audit Trail",
      icon: ShieldCheck,
      visible: true,
    },
    {
      id: "workflow-config",
      label: "Workflow Configuration",
      icon: Settings,
      visible: canConfigWorkflow,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight leading-none">
            SPX — CER
          </h1>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Capital Expenditure System
          </p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Core Operations
        </div>

        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as NavView)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        isActive
                          ? "bg-white text-blue-700"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
                </div>
              </button>
            );
          })}
      </nav>

      {/* Environment Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Vedanta SPX Online
          </span>
          <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
            v1.0.0
          </span>
        </div>
        <p className="text-[10px] text-slate-400 truncate">
          Cairn Oil & Gas Enterprise Systems
        </p>
      </div>
    </aside>
  );
};
