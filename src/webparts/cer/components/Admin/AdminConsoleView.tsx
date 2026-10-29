import * as React from "react";
import {
  Users,
  Layers,
  AlertTriangle,
  RotateCw,
  ArrowLeft,
} from "lucide-react";
import { ICERDataService } from "../../services/ICERDataService";
import {
  IAppUser,
  IUserRoleAssignment,
} from "../../models/UserModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { UserManagementTab } from "./UserManagementTab";
import { ApprovalHierarchyTab } from "./ApprovalHierarchyTab";
import { PermissionService } from "../../services/PermissionService";
import { normalizeUserIdentifier } from "../../services/AuthService";

export type AdminConsoleTab = "users" | "hierarchy";

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
  initialTab = "users",
}) => {
  const [canAccessHierarchy, setCanAccessHierarchy] = React.useState<boolean>(
    () => PermissionService.canAccessApprovalHierarchy(currentUser)
  );
  const safeInitialTab: AdminConsoleTab =
    initialTab === "hierarchy" && !canAccessHierarchy ? "users" : initialTab;

  const [activeTab, setActiveTab] = React.useState<AdminConsoleTab>(safeInitialTab);
  const [userRoles, setUserRoles] = React.useState<IUserRoleAssignment[]>([]);
  const [workflowLevels, setWorkflowLevels] = React.useState<IWorkflowLevel[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Fallback protection: if activeTab ever attempts to switch to hierarchy while unauthorized, reset immediately
  React.useEffect(() => {
    if (activeTab === "hierarchy" && !canAccessHierarchy) {
      setActiveTab("users");
    }
  }, [activeTab, canAccessHierarchy]);

  const loadData = React.useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (forceRefresh && (dataService as any).clearCache) {
        (dataService as any).clearCache();
      }
      const [roles, levels, hierarchyAdmins] = await Promise.all([
        dataService.getUserRoles ? dataService.getUserRoles(forceRefresh) : Promise.resolve([]),
        dataService.getWorkflowLevels(undefined, forceRefresh),
        dataService.getHierarchyAdmins ? dataService.getHierarchyAdmins(forceRefresh) : Promise.resolve([]),
      ]);
      const cleanRoles = roles.filter((a) => {
        const isAutoProvisioned =
          a.role === "Admin" &&
          (a.assigned_by === "SYSTEM_DESIGNATED_ADMIN_PROVISION" ||
            a.department === "Enterprise Administration");
        return !isAutoProvisioned;
      });
      setUserRoles(cleanRoles);
      setWorkflowLevels(levels);
      const isPermittedForHierarchy = PermissionService.canAccessApprovalHierarchy(
        currentUser,
        hierarchyAdmins
      );
      setCanAccessHierarchy(isPermittedForHierarchy);
    } catch (err: any) {
      console.error("[AdminConsoleView] Failed to load admin records:", err);
      setErrorMessage(
        err?.message || "Failed to load administrative configuration from SharePoint."
      );
    } finally {
      setIsLoading(false);
    }
  }, [dataService, currentUser]);

  React.useEffect(() => {
    loadData().catch((e) => console.error(e));
  }, [loadData]);

  const tabs: Array<{
    id: AdminConsoleTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "users",
      label: "User & Role Management",
      icon: <Users className="w-4 h-4" />,
    },
    ...(canAccessHierarchy
      ? [
          {
            id: "hierarchy" as AdminConsoleTab,
            label: "Approval Hierarchy",
            icon: <Layers className="w-4 h-4" />,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full max-w-[2560px] mx-auto space-y-5 pb-12">
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
            onClick={() => loadData(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-red-100 hover:bg-red-200 text-red-800 transition cursor-pointer"
          >
            <RotateCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Header Bar with Back Button & Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle p-2 flex items-center gap-2 sm:gap-3 overflow-x-auto">
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="h-6 w-px bg-slate-200 shrink-0" />
        <nav className="flex space-x-1.5 shrink-0" aria-label="Admin Console Tabs">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isSelected
                    ? "bg-[#012964] text-white shadow-sm ring-1 ring-[#012964]/20 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
                }`}
              >
                <span className={isSelected ? "text-white" : "text-slate-500"}>
                  {tab.icon}
                </span>
                <span className={isSelected ? "text-white" : "text-slate-700"}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="transition-all duration-150">
        {activeTab === "users" && (
          <UserManagementTab
            roles={userRoles}
            workflowLevels={workflowLevels}
            currentUser={currentUser}
            dataService={dataService}
            isLoading={isLoading}
            onRefreshRoles={() => loadData(true)}
          />
        )}

        {activeTab === "hierarchy" && canAccessHierarchy && (
          <ApprovalHierarchyTab
            workflowLevels={workflowLevels}
            currentUser={currentUser}
            dataService={dataService}
            isLoading={isLoading}
            onRefreshLevels={() => loadData(true)}
          />
        )}
      </div>
    </div>
  );
};
