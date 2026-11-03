import * as React from "react";
import {
  AlertTriangle,
  RotateCw,
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
        err?.message || "Failed to load user roles."
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
              <h4 className="font-bold">Unable to load data</h4>
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

      {/* Main Content */}
      <div className="transition-all duration-150">
        <UserManagementTab
          roles={userRoles}
          workflowLevels={workflowLevels}
          currentUser={currentUser}
          dataService={dataService}
          isLoading={isLoading}
          onRefreshRoles={() => loadData(true)}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
};
