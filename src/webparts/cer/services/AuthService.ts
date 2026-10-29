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

/**
 * Normalizes email or login identifier by stripping claims prefix (e.g. i:0#.f|membership|),
 * whitespace, and converting to lowercase.
 */
export function normalizeUserIdentifier(val?: string): string {
  if (!val) return "";
  return val
    .trim()
    .toLowerCase()
    .replace(/^i:0#\.f\|membership\|/i, "")
    .replace(/^membership\|/i, "");
}

/**
 * Enterprise Designated System Administrators.
 * These corporate accounts have verified administrative standing across all environments.
 */
export const DESIGNATED_ADMIN_IDENTIFIERS: string[] = [
  "70007144@cairnindia.com",
  "shiven.pandit@cairnindia.com",
];

export function isDesignatedAdmin(identifier?: string): boolean {
  const norm = normalizeUserIdentifier(identifier);
  if (!norm) return false;
  return (
    DESIGNATED_ADMIN_IDENTIFIERS.indexOf(norm) !== -1 ||
    norm === "70007144" ||
    norm.startsWith("70007144@")
  );
}

export class AuthService {
  /**
   * Resolves the real enterprise security context of the current SharePoint user.
   *
   * Security Rules:
   * 1. Uses authenticated SharePoint identity (email, loginName, id, display name).
   * 2. Queries CERUserRoles for real assigned roles.
   * 3. Prevents unregistered users from obtaining elevated privileges (default is unprivileged Initiator).
   * 4. Recognizes verified corporate System Administrators (including 70007144@cairnindia.com).
   * 5. Implements controlled first-Admin bootstrapping: If the role registry has no active Admins
   *    and the current user is a verified SharePoint Site Admin, grants initial Admin privileges
   *    and records an audit log entry.
   * 6. Enforces account active/inactive status.
   */
  public static async resolveCurrentUser(
    params: IAuthContextParams,
    dataService: ICERDataService
  ): Promise<IAuthResolutionResult> {
    const email = normalizeUserIdentifier(params.email);
    const loginName = normalizeUserIdentifier(params.loginName);

    // Fail-Closed: If identity resolution produces an empty/invalid identity, fail closed immediately.
    // Never substitute another user's identity or grant privileged access.
    if (!email && !loginName) {
      return {
        user: {
          id: params.id || 0,
          name: (params.name || "").trim() || "Unauthenticated User",
          email: "",
          loginName: "",
          role: "Initiator",
          roles: [],
          is_active: false,
          department: "Unauthenticated",
          isSiteAdmin: false,
        },
        isRegistered: false,
      };
    }

    const effectiveEmail = email || (loginName.indexOf("@") !== -1 ? loginName : "");
    const effectiveLogin = loginName || email || "";
    const designatedAdmin = isDesignatedAdmin(email) || isDesignatedAdmin(loginName);
    const displayName = (params.name || "").trim() || (designatedAdmin ? "Shiven Pandit" : "Authenticated Portal User");
    const isSiteAdmin = !!params.isSiteAdmin;

    let allRoles: IUserRoleAssignment[] = [];
    try {
      allRoles = await dataService.getUserRoles();
    } catch (err) {
      console.warn("[AuthService] Failed to load role assignments:", err);
    }

    // Auto-clean any stale/invalid designated-admin auto-provisioned records for non-designated accounts (e.g. Priya Kalekar)
    const invalidAutoAdmins = allRoles.filter((a) => {
      const aEmail = normalizeUserIdentifier(a.user_email);
      const aLogin = normalizeUserIdentifier(a.login_name);
      const isAutoProvisioned =
        a.role === "Admin" &&
        (a.assigned_by === "SYSTEM_DESIGNATED_ADMIN_PROVISION" ||
          a.department === "Enterprise Administration");
      const isActuallyDesignated = isDesignatedAdmin(aEmail) || isDesignatedAdmin(aLogin);
      return isAutoProvisioned && !isActuallyDesignated;
    });

    if (invalidAutoAdmins.length > 0) {
      console.warn("[AuthService] Auto-revoking invalid auto-provisioned Admin records:", invalidAutoAdmins);
      for (const invalid of invalidAutoAdmins) {
        try {
          await dataService.revokeUserRole(invalid.id, {
            name: "System Bootstrapper",
            email: "security@system.local",
          });
        } catch (revokeErr) {
          console.warn("[AuthService] Could not auto-revoke invalid admin record:", invalid.id, revokeErr);
        }
      }
      const invalidIds = new Set(invalidAutoAdmins.map((i) => i.id));
      allRoles = allRoles.filter((a) => !invalidIds.has(a.id));
    }

    // Filter active roles assigned to current user by email or loginName
    const userAssignments = allRoles.filter((assignment) => {
      const aEmail = normalizeUserIdentifier(assignment.user_email);
      const aLogin = normalizeUserIdentifier(assignment.login_name);
      const matchEmail = Boolean(email && (aEmail === email || aLogin === email));
      const matchLogin = Boolean(loginName && (aLogin === loginName || aEmail === loginName));
      return matchEmail || matchLogin;
    });

    const activeAdmins = allRoles.filter(
      (a) => a.role === "Admin" && a.is_active
    );

    // Designated Administrator Auto-Provisioning & Priority Resolution
    // Guarantees verified enterprise administrator (e.g. 70007144@cairnindia.com) is immediately recognized as Admin
    const hasActiveAdminAssignment = userAssignments.some(
      (a) => a.role === "Admin" && a.is_active
    );

    if (designatedAdmin && !hasActiveAdminAssignment) {
      console.info("[AuthService] Designated Administrator recognized:", effectiveEmail);

      const bootstrapAssignment: Omit<IUserRoleAssignment, "id"> = {
        user_name: displayName === "Authenticated Portal User" ? "Admin (70007144)" : displayName,
        user_email: effectiveEmail,
        login_name: effectiveLogin,
        role: "Admin",
        department: params.department || "Enterprise Administration",
        is_active: true,
        assigned_by: "SYSTEM_DESIGNATED_ADMIN_PROVISION",
        assigned_date: new Date().toISOString(),
      };

      try {
        await dataService.assignUserRole(bootstrapAssignment, {
          name: "System Bootstrapper",
          email: "security@system.local",
        });
      } catch (bootstrapErr) {
        console.warn("[AuthService] Could not persist designated Admin record:", bootstrapErr);
      }

      const adminUser: IAppUser = {
        id: params.id,
        name: displayName === "Authenticated Portal User" ? "Admin (70007144)" : displayName,
        email: effectiveEmail,
        loginName: effectiveLogin,
        role: "Admin",
        roles: ["Admin", "Initiator"],
        department: params.department || "Enterprise Administration",
        is_active: true,
        isSiteAdmin: isSiteAdmin || true,
      };

      return {
        user: adminUser,
        isRegistered: true,
        isFirstAdminBootstrapped: true,
      };
    }

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

      if (designatedAdmin && roles.indexOf("Admin") === -1) {
        roles.unshift("Admin");
      }

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
        name: (activeAssignments[0]?.user_name && activeAssignments[0].user_name !== "Authenticated Portal User" ? activeAssignments[0].user_name : displayName),
        email: effectiveEmail || email,
        loginName: effectiveLogin || loginName || email,
        role: primaryRole,
        roles: roles,
        department: activeAssignments[0]?.department || params.department,
        sbu: activeAssignments[0]?.sbu,
        approval_level: approverAssignment?.approval_level,
        is_active: true,
        isSiteAdmin: isSiteAdmin || (designatedAdmin ? true : false),
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
