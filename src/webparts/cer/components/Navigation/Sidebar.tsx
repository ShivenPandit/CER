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
  X,
} from "lucide-react";
import { IAppUser, UserRole } from "../../models/UserModel";
import { PermissionService } from "../../services/PermissionService";
import { VedantaLogo } from '../Shared/VedantaLogo';

export type NavView =
  | "dashboard" | "create"
  | "change"
  | "my-proposals"
  | "all-proposals"
  | "pending-approvals"
  | "approval-history"
  | "display"
  | "cer-submissions"
  | "reports" | "audit-trail"
  | "workflow-config";

interface ISidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView, proposalId?: string) => void;
  userRole: UserRole;
  currentUser?: IAppUser;
  pendingApprovalsCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  hasOwnedProposals?: boolean;
}

export const Sidebar: React.FC<ISidebarProps> = ({
  currentView,
  onNavigate,
  userRole,
  currentUser,
  pendingApprovalsCount,
  isMobileOpen = false,
  onCloseMobile,
  hasOwnedProposals,
}) => {
  // Authorization checks for navigation items
  const canCreate = currentUser
    ? PermissionService.canCreateCER(currentUser)
    : userRole === "Initiator" || userRole === "Admin";
  const canApprove = currentUser
    ? PermissionService.canViewApprovals(currentUser, pendingApprovalsCount > 0)
    : userRole === "Approver" || userRole === "Admin";
  const canConfigWorkflow = currentUser
    ? PermissionService.canAccessAdmin(currentUser)
    : userRole === "Admin";
  const canViewMyProposals = currentUser
    ? PermissionService.canViewMyRequests(currentUser, hasOwnedProposals)
    : userRole !== "Approver";
  const canViewReports = currentUser
    ? PermissionService.canViewReports(currentUser)
    : userRole === "Finance_Audit" || userRole === "Admin";

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
      visible: canViewMyProposals,
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
      id: "Reports",
      label: "Reports & Analytics",
      icon: BarChart3,
      visible: canViewReports,
    },
    {
      id: "audit-trail",
      label: "Field-Level Audit Trail",
      icon: ShieldCheck,
      visible: true,
    },
    {
      id: "workflow-config",
      label: "Admin Console",
      icon: Settings,
      visible: canConfigWorkflow,
    },
  ];

  const handleItemClick = (id: NavView) => {
    onNavigate(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navContent = (
    <>
      {/* Brand Header — Vedanta Logo & Name */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <VedantaLogo height={32} theme="dark" />
        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close navigation menu"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
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
                onClick={() => handleItemClick(item.id as NavView)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors shrink-0 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
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
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800 select-none z-30">
        {navContent}
      </aside>

      {/* Mobile / Tablet Navigation Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col h-full shadow-2xl border-r border-slate-800 z-50 select-none">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
