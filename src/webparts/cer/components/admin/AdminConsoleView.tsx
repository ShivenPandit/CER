import * as React from "react";
import {
  BarChart3,
  Users,
  Layers,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import { ICERDataService } from "../../services/ICERDataService";
import {
  IAppUser,
  IUserRoleAssignment,
  IAdminAuditRecord,
} from "../../models/UserModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { AdminOverviewTab } from "./AdminOverviewTab";
import { UserManagementTab } from "./UserManagementTab";
import { ApprovalHierarchyTab } from "./ApprovalHierarchyTab";
import { AdminAuditTab } from "./AdminAuditTab";

export type AdminConsoleTab = "overview" | "users" | "hierarchy" | "audit";

export interface IAdminConsoleViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  onCancel?: () => void;
  initialTab?: AdminConsoleTab;
}

export const AdminConsoleView: React.FC<IAdminConsoleViewProps> = ({
  dataService,
  currentUser,
  onCancel,
  initialTab = "overview",
}) => {
  const [activeTab, setActiveTab] = React.useState<AdminConsoleTab>(initialTab);
  const [userRoles, setUserRoles] = React.useState<IUserRoleAssignment[]>([]);
  const [workflowLevels, setWorkflowLevels] = React.useState<IWorkflowLevel[]>([]);
  const [auditLog, setAuditLog] = React.useState<IAdminAuditRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [roles, levels, audits] = await Promise.all([
        dataService.getUserRoles ? dataService.getUserRoles() : Promise.resolve([]),
        dataService.getWorkflowLevels(),
        dataService.getAdminAuditLog
          ? dataService.getAdminAuditLog()
          : Promise.resolve([]),
      ]);
      setUserRoles(roles);
      setWorkflowLevels(levels);
      setAuditLog(audits);
    } catch (err: any) {
      console.error("[AdminConsoleView] Failed to load admin records:", err);
      setErrorMessage(
        err?.message || "Failed to load administrative configuration from SharePoint."
      );
    } finally {
      setIsLoading(false);
    }
  }, [dataService]);

  React.useEffect(() => {
    loadData().catch((e) => console.error(e));
  }, [loadData]);

  const tabs: Array<{
    id: AdminConsoleTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: "overview",
      label: "Overview",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: "users",
      label: "User & Role Management",
      icon: <Users className="w-4 h-4" />,
      badge: userRoles.length,
    },
    {
      id: "hierarchy",
      label: "Approval Hierarchy",
      icon: <Layers className="w-4 h-4" />,
      badge: workflowLevels.length,
    },
    {
      id: "audit",
      label: "Security & Audit",
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: auditLog.length,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-12">
      {/* Error alert if any */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-3 text-red-800 text-xs shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold">Error Loading Administrative Data</h4>
              <p className="mt-0.5 text-red-700">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => loadData()}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-red-100 hover:bg-red-200 text-red-800 transition"
          >
            <RotateCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Modern Navigation Tabs with Fixed Active State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle p-1.5 overflow-x-auto">
        <nav className="flex space-x-1 min-w-max" aria-label="Admin Console Tabs">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
                }`}
              >
                <span className={isSelected ? "text-white" : "text-slate-500"}>
                  {tab.icon}
                </span>
                <span className={isSelected ? "text-white" : "text-slate-700"}>
                  {tab.label}
                </span>
                {typeof tab.badge === "number" && (
                  <span
                    className={`ml-1 px-2 py-0.5 text-[11px] rounded-full font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="transition-all duration-150">
        {activeTab === "overview" && (
          <AdminOverviewTab
            roles={userRoles}
            workflowLevels={workflowLevels}
            auditLogs={auditLog}
            onNavigateTab={(tabId: "users" | "workflow" | "audit") => {
              if (tabId === "workflow") setActiveTab("hierarchy");
              else setActiveTab(tabId);
            }}
          />
        )}

        {activeTab === "users" && (
          <UserManagementTab
            roles={userRoles}
            currentUser={currentUser}
            dataService={dataService}
            onRefreshRoles={loadData}
          />
        )}

        {activeTab === "hierarchy" && (
          <ApprovalHierarchyTab
            workflowLevels={workflowLevels}
            currentUser={currentUser}
            dataService={dataService}
            onRefreshLevels={loadData}
          />
        )}

        {activeTab === "audit" && (
          <AdminAuditTab
            auditLog={auditLog}
            currentUser={currentUser}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};
