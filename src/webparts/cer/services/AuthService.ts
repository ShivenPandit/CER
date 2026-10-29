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
 * Robust multi-attribute evaluator matching a user against CERHierarchyAdmins entries.
 * Checks User ID, exact email/login, username prefixes, B2B #ext# claims, and cleaned display name.
 */
export function checkUserHierarchyAdminAccess(
  userParams: { id?: number | string; email?: string; loginName?: string; name?: string },
  hierarchyAdmins: string[]
): boolean {
  if (!Array.isArray(hierarchyAdmins) || hierarchyAdmins.length === 0) {
    return false;
  }

  const normEmail = normalizeUserIdentifier(userParams.email);
  const normLogin = normalizeUserIdentifier(userParams.loginName);
  const rawName = (userParams.name || "").trim().toLowerCase();
  const cleanName = rawName.replace(/\s*\(.*?\)\s*/g, "").replace(/\s+/g, " ").trim();
  const userIdStr = userParams.id !== undefined && userParams.id !== null && Number(userParams.id) > 0 ? String(userParams.id) : "";

  const emailPrefix = normEmail ? normEmail.split("@")[0] : "";
  const loginPrefix = normLogin ? normLogin.split("@")[0] : "";
  const b2bPrefix = normLogin && normLogin.indexOf("#ext#") !== -1
    ? normLogin.split("#ext#")[0].split("_")[0]
    : "";

  return hierarchyAdmins.some((h) => {
    if (!h) return false;
    const cleanH = h.trim().toLowerCase();
    const normH = normalizeUserIdentifier(cleanH);

    // 1. Direct SharePoint User ID match (e.g. "12" or "id:12")
    if (userIdStr && (cleanH === userIdStr || cleanH === `id:${userIdStr}`)) {
      return true;
    }

    // 2. Exact email or login match
    if (normH && (normH === normEmail || normH === normLogin)) {
      return true;
    }

    // 3. Username prefix match before @
    const hPrefix = normH.split("@")[0];
    if (hPrefix) {
      if (emailPrefix && hPrefix === emailPrefix) return true;
      if (loginPrefix && hPrefix === loginPrefix) return true;
      if (b2bPrefix && hPrefix === b2bPrefix) return true;
    }

    // 4. B2B vendor prefix match if h itself has #ext#
    if (normH.indexOf("#ext#") !== -1) {
      const hExtPrefix = normH.split("#ext#")[0].split("_")[0];
      if (hExtPrefix) {
        if (emailPrefix && hExtPrefix === emailPrefix) return true;
        if (loginPrefix && hExtPrefix === loginPrefix) return true;
      }
    }

    // 5. Clean display name match (e.g. "Shiven Pandit" vs "Shiven Pandit (Microlink)")
    if (cleanName && cleanName.length >= 3) {
      const hCleanName = cleanH.replace(/\s*\(.*?\)\s*/g, "").replace(/\s+/g, " ").trim();
      if (hCleanName === cleanName || cleanH === rawName) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Enterprise Designated System Administrators.
 * @deprecated All administrative privileges are now dynamically loaded from CERUserRoles and CERHierarchyAdmins.
 */
export const DESIGNATED_ADMIN_IDENTIFIERS: string[] = [];

export function isDesignatedAdmin(_identifier?: string): boolean {
  return false;
}

export class AuthService {
  /**
   * Resolves the real enterprise security context of the current SharePoint user.
   *
   * Security Rules:
   * 1. Uses authenticated SharePoint identity (email, loginName, id, display name).
   * 2. Queries CERUserRoles for real assigned roles.
   * 3. Prevents unregistered users from obtaining elevated privileges (default is unprivileged Initiator).
   * 4. Enforces 100% list-driven administrator role assignment via CERUserRoles and CERHierarchyAdmins.
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
    const displayName = (params.name || "").trim() || "Authenticated Portal User";
    const isSiteAdmin = !!params.isSiteAdmin;

    let allRoles: IUserRoleAssignment[] = [];
    try {
      allRoles = await dataService.getUserRoles();
    } catch (err) {
      console.warn("[AuthService] Failed to load role assignments:", err);
    }

    let hierarchyAdmins: string[] = [];
    if (typeof dataService.getHierarchyAdmins === "function") {
      try {
        hierarchyAdmins = await dataService.getHierarchyAdmins();
      } catch (hErr) {
        console.warn("[AuthService] Failed to load hierarchy administrators from CERHierarchyAdmins:", hErr);
      }
    }

    const hasHierarchyAdminAccess = checkUserHierarchyAdminAccess(
      {
        id: params.id,
        email: email,
        loginName: loginName,
        name: displayName,
      },
      hierarchyAdmins
    );

    // Auto-clean any legacy auto-provisioned Admin records
    const invalidAutoAdmins = allRoles.filter((a) => {
      return (
        a.role === "Admin" &&
        a.assigned_by === "SYSTEM_DESIGNATED_ADMIN_PROVISION"
      );
    });

    if (invalidAutoAdmins.length > 0) {
      console.warn("[AuthService] Auto-revoking legacy auto-provisioned Admin records:", invalidAutoAdmins);
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
        canManageApprovalHierarchy: hasHierarchyAdminAccess,
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
          canManageApprovalHierarchy: false,
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
        name: (activeAssignments[0]?.user_name && activeAssignments[0].user_name !== "Authenticated Portal User" ? activeAssignments[0].user_name : displayName),
        email: effectiveEmail || email,
        loginName: effectiveLogin || loginName || email,
        role: primaryRole,
        roles: roles,
        department: activeAssignments[0]?.department || params.department,
        sbu: activeAssignments[0]?.sbu,
        approval_level: approverAssignment?.approval_level,
        is_active: true,
        isSiteAdmin: isSiteAdmin,
        canManageApprovalHierarchy: hasHierarchyAdminAccess,
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
      canManageApprovalHierarchy: hasHierarchyAdminAccess,
    };

    return {
      user: defaultUser,
      isRegistered: false,
    };
  }
}
