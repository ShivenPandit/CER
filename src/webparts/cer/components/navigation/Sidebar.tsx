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
} from "lucide-react";
import { UserRole } from "../../models/UserModel";
import { VedantaLogo } from "../common/VedantaLogo";

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
      visible: true,
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
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800 select-none z-30">
      {/* Brand Header — Vedanta Logo & Name */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-start">
        <VedantaLogo height={32} theme="dark" />
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400">
          Operations
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors group ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
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
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
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
    </aside>
  );
};
