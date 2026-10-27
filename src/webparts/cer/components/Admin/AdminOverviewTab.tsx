import React from "react";
import {
  Users,
  UserCheck,
  Layers,
  ShieldCheck,
  Activity,
  AlertTriangle,
  ArrowRight,
  Shield,
  Key,
} from "lucide-react";
import { IUserRoleAssignment, IAdminAuditRecord } from "../../models/UserModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";

interface IAdminOverviewTabProps {
  roles: IUserRoleAssignment[];
  workflowLevels: IWorkflowLevel[];
  auditLogs: IAdminAuditRecord[];
  onNavigateTab: (tabId: "users" | "workflow" | "Audit") => void;
}

export const AdminOverviewTab: React.FC<IAdminOverviewTabProps> = ({
  roles,
  workflowLevels,
  auditLogs,
  onNavigateTab,
}) => {
  const activeUsers = roles.filter((r) => r.is_active);
  const activeAdmins = roles.filter((r) => r.role === "Admin" && r.is_active);
  const activeApprovers = roles.filter((r) => r.role === "Approver" && r.is_active);
  const activeLevels = workflowLevels.filter((l) => l.is_active);

  const securityHealthy = activeAdmins.length >= 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-elevated relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Enterprise Security & Governance Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            CER Management System Administration Console
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Centralized role-based access control, directory identity synchronization, sequential workflow approval hierarchy, and immutable governance audit trail.
          </p>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Users */}
        <div
          onClick={() => onNavigateTab("users")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-hover hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Roles
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {roles.length}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">{activeUsers.length} Active Accounts</span>
            <span className="text-blue-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Manage <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Active Approvers */}
        <div
          onClick={() => onNavigateTab("users")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-hover hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Approvers
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeApprovers.length}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">{activeAdmins.length} Active Admin(s)</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              View <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Workflow Levels */}
        <div
          onClick={() => onNavigateTab("workflow")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-hover hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approval Stages
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {workflowLevels.length}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">{activeLevels.length} Active Levels</span>
            <span className="text-purple-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Configure <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Governance Audit Events */}
        <div
          onClick={() => onNavigateTab("Audit")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-hover hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Admin Events
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {auditLogs.length}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Security Events Logged</span>
            <span className="text-amber-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Review <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Security Health & Posture Overview */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Enterprise Access Control & Security Posture
            </h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              securityHealthy
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                securityHealthy ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>{securityHealthy ? "System Secure & Healthy" : "Admin Review Required"}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
          {/* Check 1 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <Key className="w-4 h-4 text-blue-600" />
              <span>Dedicated Role Registry</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Persisted in SharePoint list <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">CER_UserRoles</code>. No fake personas.
            </p>
          </div>

          {/* Check 2 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Segregation of Duties</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Enforced across services and UI: Proposal owners are strictly prohibited from approving their own CERs.
            </p>
          </div>

          {/* Check 3 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <Activity className="w-4 h-4 text-purple-600" />
              <span>Administrative Audit Trail</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every role grant, revocation, and status change is logged in <code className="text-purple-700 bg-purple-50 px-1 py-0.5 rounded">CER_AdminAuditLog</code>.
            </p>
          </div>
        </div>

        {!securityHealthy && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Warning: No active Administrators found. Please assign at least one active Admin user to ensure uninterrupted platform management.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
