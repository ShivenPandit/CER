import * as React from "react";
import { ICERDataService } from "../../services/ICERDataService";
import {
  IAppUser,
  IUserRoleAssignment,
} from "../../models/UserModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { UserManagementTab } from "./UserManagementTab";
import { useToast } from "../Shared/ToastProvider";

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
  const toast = useToast();
  const [userRoles, setUserRoles] = React.useState<IUserRoleAssignment[]>([]);
  const [workflowLevels, setWorkflowLevels] = React.useState<IWorkflowLevel[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const loadData = React.useCallback(async (forceRefresh = false, preloadedRoles?: IUserRoleAssignment[]) => {
    setIsLoading(true);
    try {
      if (forceRefresh && !preloadedRoles) {
        if (typeof dataService.clearRoleMatrixCache === "function") {
          dataService.clearRoleMatrixCache();
        } else if (typeof dataService.clearCache === "function") {
          dataService.clearCache();
        }
      }
      let roles = preloadedRoles
        ? preloadedRoles
        : dataService.getUserRoles
        ? await dataService.getUserRoles(forceRefresh)
        : [];
      if (
        !preloadedRoles &&
        typeof dataService.migrateLegacyRoleMatrixEntries === "function" &&
        roles.some((r) => r.needs_sbu_map_migration)
      ) {
        const migRes = await dataService
          .migrateLegacyRoleMatrixEntries({ name: currentUser.name, email: currentUser.email })
          .catch(() => ({ migratedCount: 0 }));
        if (migRes.migratedCount > 0 && dataService.getUserRoles) {
          roles = await dataService.getUserRoles(true);
        }
      }
      // Reuse the freshly populated role cache when resolving workflow levels (0 extra network calls)
      const levels = await dataService.getWorkflowLevels(undefined, false);
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
      toast.error(err?.message || "Failed to load user roles.", "Unable to Load Data");
    } finally {
      setIsLoading(false);
    }
  }, [dataService, toast, currentUser.name, currentUser.email]);

  React.useEffect(() => {
    loadData().catch((e) => console.error(e));
  }, [loadData]);

  return (
    <div className="w-full max-w-[2560px] mx-auto space-y-5 pb-12">
      {/* Main Content */}
      <div className="transition-all duration-150">
        <UserManagementTab
          roles={userRoles}
          workflowLevels={workflowLevels}
          currentUser={currentUser}
          dataService={dataService}
          isLoading={isLoading}
          onRefreshRoles={(preloadedRoles) => loadData(!preloadedRoles, preloadedRoles)}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
};
