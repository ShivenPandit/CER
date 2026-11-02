import * as React from "react";
import {
  Users,
  AlertTriangle,
  RotateCw,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { ICERDataService } from "../../services/ICERDataService";
import {
  IAppUser,
  IUserRoleAssignment,
} from "../../models/UserModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { UserManagementTab } from "./UserManagementTab";

export interface IAdminConsoleViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  onCancel?: () => void;
  initialTab?: string;
}

export const AdminConsoleView: React.FC<IAdminConsoleViewProps> = ({
  dataService,
  currentUser,
  onCancel,
}) => {
  const [userRoles, setUserRoles] = React.useState<IUserRoleAssignment[]>([]);
  const [workflowLevels, setWorkflowLevels] = React.useState<IWorkflowLevel[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const loadData = React.useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (forceRefresh && (dataService as any).clearCache) {
        (dataService as any).clearCache();
      }
      const [roles, levels] = await Promise.all([
        dataService.getUserRoles ? dataService.getUserRoles(forceRefresh) : Promise.resolve([]),
        dataService.getWorkflowLevels(undefined, forceRefresh),
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

      {/* Header Bar with Back Button & Title */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle p-3.5 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#012964]/10 flex items-center justify-center text-[#012964]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                User & Role Management
              </h2>
              <p className="text-xs text-slate-500">
                SBU-wise role matrix, designated stage approvers, and user access directory
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="transition-all duration-150">
        <UserManagementTab
          roles={userRoles}
          workflowLevels={workflowLevels}
          currentUser={currentUser}
          dataService={dataService}
          isLoading={isLoading}
          onRefreshRoles={() => loadData(true)}
        />
      </div>
    </div>
  );
};
