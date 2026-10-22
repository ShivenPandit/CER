import { IAppUser, IUserRoleAssignment, UserRole } from "../models/UserModel";
import { ICERDataService } from "./ICERDataService";

export interface IAuthContextParams {
  id: number | string;
  name: string;
  email: string;
  loginName?: string;
  isSiteAdmin?: boolean;
  department?: string;
}

export interface IAuthResolutionResult {
  user: IAppUser;
  isRegistered: boolean;
  isFirstAdminBootstrapped?: boolean;
}

export class AuthService {
  /**
   * Resolves the real enterprise security context of the current SharePoint user.
   *
   * Security Rules:
   * 1. Uses authenticated SharePoint identity (email, loginName, id, display name).
   * 2. Queries CER_UserRoles for real assigned roles.
   * 3. Prevents unregistered users from obtaining elevated privileges (default is unprivileged Initiator).
   * 4. Implements controlled first-Admin bootstrapping: If the role registry has no active Admins
   *    and the current user is a verified SharePoint Site Admin, grants initial Admin privileges
   *    and records an audit log entry.
   * 5. Enforces account active/inactive status.
   */
  public static async resolveCurrentUser(
    params: IAuthContextParams,
    dataService: ICERDataService
  ): Promise<IAuthResolutionResult> {
    const email = (params.email || "").trim().toLowerCase();
    const loginName = (params.loginName || "").trim().toLowerCase();
    const displayName = (params.name || "").trim() || "Authenticated Portal User";
    const isSiteAdmin = !!params.isSiteAdmin;

    let allRoles: IUserRoleAssignment[] = [];
    try {
      allRoles = await dataService.getUserRoles();
    } catch (err) {
      console.warn("[AuthService] Failed to load role assignments:", err);
    }

    // Filter active roles assigned to current user by email or loginName
    const userAssignments = allRoles.filter((assignment) => {
      const matchEmail =
        assignment.user_email &&
        assignment.user_email.trim().toLowerCase() === email;
      const matchLogin =
        assignment.login_name &&
        assignment.login_name.trim().toLowerCase() === loginName;
      return matchEmail || matchLogin;
    });

    const activeAdmins = allRoles.filter(
      (a) => a.role === "Admin" && a.is_active
    );

    // Controlled First-Admin Bootstrapping
    // Only triggered when NO active Admins exist in the entire system, and the current user is a Site Collection Admin
    if (activeAdmins.length === 0 && isSiteAdmin && email) {
      console.info("[AuthService] Initial Admin bootstrap triggered for Site Administrator:", email);

      const bootstrapAssignment: Omit<IUserRoleAssignment, "id"> = {
        user_name: displayName,
        user_email: email,
        login_name: loginName || email,
        role: "Admin",
        department: params.department || "Enterprise Administration",
        is_active: true,
        assigned_by: "SYSTEM_INITIAL_BOOTSTRAP",
        assigned_date: new Date().toISOString(),
      };

      try {
        await dataService.assignUserRole(bootstrapAssignment, {
          name: "System Bootstrapper",
          email: "security@system.local",
        });
      } catch (bootstrapErr) {
        console.warn("[AuthService] Could not persist initial bootstrap Admin record:", bootstrapErr);
      }

      const adminUser: IAppUser = {
        id: params.id,
        name: displayName,
        email: email,
        loginName: loginName || email,
        role: "Admin",
        roles: ["Admin", "Initiator"],
        department: params.department || "Enterprise Administration",
        is_active: true,
        isSiteAdmin: true,
      };

      return {
        user: adminUser,
        isRegistered: true,
        isFirstAdminBootstrapped: true,
      };
    }

    // Check if user has explicit role assignments
    if (userAssignments.length > 0) {
      // Check if all assigned records are explicitly deactivated
      const hasAnyActive = userAssignments.some((a) => a.is_active);
      if (!hasAnyActive) {
        // User account is deactivated by an administrator
        const deactivatedUser: IAppUser = {
          id: params.id,
          name: displayName,
          email: email,
          loginName: loginName || email,
          role: "Initiator",
          roles: [],
          department: userAssignments[0]?.department || params.department,
          is_active: false,
          isSiteAdmin,
        };
        return {
          user: deactivatedUser,
          isRegistered: true,
        };
      }

      const activeAssignments = userAssignments.filter((a) => a.is_active);
      const roles: UserRole[] = Array.from(
        new Set(activeAssignments.map((a) => a.role))
      );

      // Resolve primary role in hierarchical priority: Admin > Approver > Finance_Audit > Initiator
      let primaryRole: UserRole = "Initiator";
      if (roles.indexOf("Admin") !== -1) {
        primaryRole = "Admin";
      } else if (roles.indexOf("Approver") !== -1) {
        primaryRole = "Approver";
      } else if (roles.indexOf("Finance_Audit") !== -1) {
        primaryRole = "Finance_Audit";
      } else if (roles.indexOf("Initiator") !== -1) {
        primaryRole = "Initiator";
      }

      // Resolve approval level if approver
      const approverAssignment = activeAssignments.find(
        (a) => a.role === "Approver" && a.approval_level !== undefined
      );

      const resolvedUser: IAppUser = {
        id: params.id,
        name: displayName,
        email: email,
        loginName: loginName || email,
        role: primaryRole,
        roles: roles,
        department: activeAssignments[0]?.department || params.department,
        sbu: activeAssignments[0]?.sbu,
        approval_level: approverAssignment?.approval_level,
        is_active: true,
        isSiteAdmin,
      };

      return {
        user: resolvedUser,
        isRegistered: true,
      };
    }

    // Unregistered User: Default to unprivileged Initiator policy
    // Never assume missing record means Administrator
    const defaultUser: IAppUser = {
      id: params.id,
      name: displayName,
      email: email,
      loginName: loginName || email,
      role: "Initiator",
      roles: ["Initiator"],
      department: params.department || "CER Management Portal",
      is_active: true,
      isSiteAdmin,
    };

    return {
      user: defaultUser,
      isRegistered: false,
    };
  }
}
