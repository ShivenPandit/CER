import { IAppUser, UserRole } from "../models/UserModel";
import { ICERProposal } from "../models/CERModel";
import { IWorkflowLevel, isProjectOwnerStage } from "../models/WorkflowModel";
import { NavView } from "../components/Navigation/Sidebar";
import { isDesignatedAdmin, normalizeUserIdentifier } from "./AuthService";

export interface IActionAuthResult {
  allowed: boolean;
  reason?: string;
}

/**
 * @deprecated Approval Hierarchy permission is now dynamically loaded from the CERHierarchyAdmins SharePoint list.
 * This legacy export is preserved only for backwards compatibility with legacy test harnesses.
 */
export const AUTHORIZED_APPROVAL_HIERARCHY_EMAIL = "";

export class PermissionService {
  public static readonly AUTHORIZED_APPROVAL_HIERARCHY_EMAIL = AUTHORIZED_APPROVAL_HIERARCHY_EMAIL;
  /**
   * Centralized access-control rule:
   * Dynamically permits Approval Hierarchy management based on permissions
   * loaded from the CERHierarchyAdmins SharePoint list (or Site Administrator).
   * - Eliminates hardcoded individual email addresses.
   * - Evaluates `user.canManageApprovalHierarchy` populated dynamically from CERHierarchyAdmins.
   * - Denies by default if identity is unavailable, unresolved, or inactive.
   */
  public static canAccessApprovalHierarchy(
    user?: IAppUser | null,
    authorizedHierarchyEmails?: string[]
  ): boolean {
    if (!user || !user.is_active) {
      return false;
    }

    if (user.canManageApprovalHierarchy) {
      return true;
    }

    // Direct check against dynamic list of authorized emails if passed
    if (Array.isArray(authorizedHierarchyEmails) && authorizedHierarchyEmails.length > 0) {
      const email = normalizeUserIdentifier(user.email);
      const login = normalizeUserIdentifier(user.loginName);

      return authorizedHierarchyEmails.some((h) => {
        const normH = normalizeUserIdentifier(h);
        if (!normH) return false;
        if (normH === email || normH === login) return true;
        const hPrefix = normH.split("@")[0];
        const emailPrefix = email ? email.split("@")[0] : "";
        const loginPrefix = login ? login.split("@")[0] : "";
        if (hPrefix && (hPrefix === emailPrefix || hPrefix === loginPrefix)) return true;
        return false;
      });
    }

    return false;
  }

  /**
   * Checks if user has a specific role (checks active roles array or primary role)
   */
  public static hasRole(user: IAppUser, role: UserRole): boolean {
    if (!user || !user.is_active) return false;
    if (Array.isArray(user.roles) && user.roles.indexOf(role) !== -1) {
      return true;
    }
    return user.role === role;
  }

  /**
   * Comprehensive check if a user is the owner or initiator of a proposal.
   * Handles:
   * 1. Exact email and UPN matches (case-insensitive).
   * 2. Cairn India / Vedanta dual-identifier alias matching (e.g. 70007144@cairnindia.com vs shiven.pandit@cairnindia.com).
   * 3. Normalized display names (strips vendor/partner parentheses e.g. "(Microlink)", "(External)").
   * 4. Created By matches against user name, email, or login.
   */
  public static isProposalOwner(proposal: ICERProposal, user?: IAppUser | null): boolean {
    if (!proposal || !user || !user.is_active) {
      return false;
    }

    const norm = (val?: string) =>
      (val || "")
        .trim()
        .toLowerCase()
        .replace(/^i:0#\.f\|membership\|/i, "")
        .replace(/^membership\|/i, "");

    const normUserEmail = norm(user.email);
    const normUserLogin = norm(user.loginName);
    const userName = (user.name || "").trim().toLowerCase();

    // Proposal properties
    const normOwnerEmail = norm(proposal.owner_email);
    const ownerName = (proposal.owname || "").trim().toLowerCase();
    const createdBy = (proposal.created_by || "").trim().toLowerCase();
    const normCreatedBy = norm(proposal.created_by);

    const cleanName = (val: string): string =>
      val
        .replace(/\s*\([^)]*\)/g, "") // remove vendor / partner / domain parentheses e.g. (Microlink)
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const cleanUserName = cleanName(userName);
    const cleanOwnerName = cleanName(ownerName);
    const cleanCreatedBy = cleanName(createdBy);

    // 1. Project Owner Match via Email or Login
    if (normUserEmail && normOwnerEmail && normUserEmail === normOwnerEmail) {
      return true;
    }
    if (normUserLogin && normOwnerEmail && normUserLogin === normOwnerEmail) {
      return true;
    }

    // 2. Generic Corporate Account Username Matching (handles @cairnindia.com vs @vedanta.co.in)
    const userPrefix = normUserEmail ? normUserEmail.split("@")[0] : (normUserLogin ? normUserLogin.split("@")[0] : "");
    const ownerPrefix = normOwnerEmail ? normOwnerEmail.split("@")[0] : "";
    const createdByPrefix = normCreatedBy ? normCreatedBy.split("@")[0] : "";
    if (userPrefix && ((ownerPrefix && userPrefix === ownerPrefix) || (createdByPrefix && userPrefix === createdByPrefix))) {
      return true;
    }

    // 3. Project Owner Display Name Match (normalized display name)
    if (cleanUserName && cleanOwnerName && cleanUserName === cleanOwnerName) {
      return true;
    }

    // 4. Initiator Match (Created By)
    if (cleanUserName && cleanCreatedBy && cleanUserName === cleanCreatedBy) {
      return true;
    }
    if (normUserEmail && normCreatedBy && normUserEmail === normCreatedBy) {
      return true;
    }
    if (normUserLogin && normCreatedBy && normUserLogin === normCreatedBy) {
      return true;
    }

    return false;
  }

  /**
   * Specifically checks whether the user is the designated Project Owner (proposal.owner_email or proposal.owname).
   * Does NOT consider proposal creator/initiator as the project owner unless they are explicitly designated as the owner.
   */
  public static isProjectOwner(proposal: ICERProposal, user: IAppUser): boolean {
    if (!proposal || !user || !user.is_active) return false;

    const norm = (val?: string) =>
      (val || "")
        .trim()
        .toLowerCase()
        .replace(/^i:0#\.f\|membership\|/i, "")
        .replace(/^membership\|/i, "");

    const normUserEmail = norm(user.email);
    const normUserLogin = norm(user.loginName);
    const userName = (user.name || "").trim().toLowerCase();

    const normOwnerEmail = norm(proposal.owner_email);
    const ownerName = (proposal.owname || "").trim().toLowerCase();

    const cleanName = (val: string): string =>
      val
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const cleanUserName = cleanName(userName);
    const cleanOwnerName = cleanName(ownerName);

    // 1. Email / login match with owner_email
    if (normUserEmail && normOwnerEmail && normUserEmail === normOwnerEmail) {
      return true;
    }
    if (normUserLogin && normOwnerEmail && normUserLogin === normOwnerEmail) {
      return true;
    }

    // 2. Generic Corporate Account Username Matching (handles @cairnindia.com vs @vedanta.co.in)
    const userPrefix = normUserEmail ? normUserEmail.split("@")[0] : (normUserLogin ? normUserLogin.split("@")[0] : "");
    const ownerPrefix = normOwnerEmail ? normOwnerEmail.split("@")[0] : "";
    if (userPrefix && ownerPrefix && userPrefix === ownerPrefix) {
      return true;
    }

    // 3. Display name match with owner name
    if (cleanUserName && cleanOwnerName && cleanUserName === cleanOwnerName) {
      return true;
    }

    return false;
  }

  /**
   * Checks if user has permission to view their submitted requests ("my-proposals").
   * - Initiators and Admins always have access to My CER Requests.
   * - Approvers and Finance_Audit have access if they have permission to view their own requests
   *   (e.g., they own one or more CER proposals as verified by hasOwnedProposals or hold Initiator/Admin role).
   */
  public static canViewMyRequests(user?: IAppUser | null, hasOwnedProposals?: boolean): boolean {
    if (!user || !user.is_active) return false;
    if (this.hasRole(user, "Initiator") || this.hasRole(user, "Admin")) {
      return true;
    }
    if (hasOwnedProposals) {
      return true;
    }
    return false;
  }

  /**
   * Checks if user has approval authorization / responsibilities to view "My CER Approvals".
   * - Approvers and Admins always have approval responsibilities.
   * - Initiators or Finance_Audit have access only if they also have approval authorization
   *   (e.g., designated as Project Owner on a pending proposal or hasApprovalAuth is true).
   */
  public static canViewApprovals(user?: IAppUser | null, hasApprovalAuth?: boolean): boolean {
    if (!user || !user.is_active) return false;
    if (this.hasRole(user, "Approver") || this.hasRole(user, "Admin")) {
      return true;
    }
    if (hasApprovalAuth) {
      return true;
    }
    return false;
  }

  /**
   * Checks if user has permission to view Report and Dashboard.
   * Restricted to Finance_Audit and Admin roles per role-based access matrix.
   */
  public static canViewReports(user?: IAppUser | null): boolean {
    if (!user || !user.is_active) return false;
    return this.hasRole(user, "Finance_Audit") || this.hasRole(user, "Admin");
  }

  /**
   * Verifies if user has permission to navigate to a specific view
   */
  public static canAccessView(
    view: NavView,
    user: IAppUser,
    hasOwnedProposals?: boolean,
    hasApprovalAuth?: boolean
  ): boolean {
    if (!user || !user.is_active) {
      return false;
    }

    switch (view) {
      case "dashboard":
      case "all-proposals":
      case "display":
      case "approval-history":
        return true;

      case "my-proposals":
        return this.canViewMyRequests(user, hasOwnedProposals);

      case "create":
        return this.canCreateCER(user);

      case "change":
        // Proposal-specific ownership check is enforced in canEditCER
        return true;

      case "pending-approvals":
        return this.canViewApprovals(user, hasApprovalAuth);

      case "reports":
        return this.canViewReports(user);

      case "audit-trail":
        return true;

      case "workflow-config":
        return this.canAccessAdmin(user);

      default:
        return false;
    }
  }

  /**
   * Rule: Initiator / CER Owner can edit only proposals they own, in Draft, Revised, or Approved status.
   * Modifying URL alone cannot grant edit rights to another user's proposal.
   */
  public static canEditCER(proposal: ICERProposal, user: IAppUser): IActionAuthResult {
    if (!user || !user.is_active) {
      return { allowed: false, reason: "Your account is inactive or not authenticated." };
    }

    if (!proposal) {
      return { allowed: false, reason: "Proposal not found." };
    }

    // Editable status constraint (FR-02 allows change on Draft, Revised, or Approved to create a revision)
    const isEditableStatus =
      proposal.status === "Draft" ||
      proposal.status === "Revised" ||
      proposal.status === "Approved";
    if (!isEditableStatus) {
      const reason =
        proposal.status === "In Approval"
          ? "Proposal is currently 'In Approval' and locked for modification."
          : proposal.status === "Rejected"
          ? "Proposal is 'Rejected' and cannot be modified."
          : `Proposal is in status '${proposal.status}' and cannot be modified.`;
      return {
        allowed: false,
        reason,
      };
    }

    // Ownership check (case-insensitive email or display name match, or Admin)
    const isOwner = this.isProposalOwner(proposal, user);
    const isAdmin = this.hasRole(user, "Admin");

    if (!isOwner && !isAdmin) {
      return {
        allowed: false,
        reason: `Access Denied: You do not have ownership of this proposal. Only the designated CER Owner (${proposal.owname}) or Administrator can modify this request.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Rule: Only the specifically assigned approver for that level, or the designated Project Owner
   * (for Project Owner stages), can approve proposals pending at their level.
   * System Administrators CANNOT approve proposals unless they are explicitly assigned to that stage
   * or are the designated Project Owner.
   * Segregation of Duties: A user CANNOT approve a proposal they created/initiated on non-owner stages.
   * Finance/Audit cannot approve proposals.
   */
  public static canApproveCER(
    proposal: ICERProposal,
    user: IAppUser,
    currentStageConfig?: IWorkflowLevel | null
  ): IActionAuthResult {
    if (!user || !user.is_active) {
      return { allowed: false, reason: "Your account is inactive or not authenticated." };
    }

    if (!proposal) {
      return { allowed: false, reason: "Proposal not found." };
    }

    if (proposal.status !== "In Approval") {
      return {
        allowed: false,
        reason: `Proposal is currently '${proposal.status}'. Approvals can only be performed when status is 'In Approval'.`,
      };
    }

    const normUserEmail = (user.email || "").trim().toLowerCase();
    const normUserLogin = (user.loginName || "").trim().toLowerCase();
    const cleanUserName = (user.name || "").replace(/\s+/g, " ").trim().toLowerCase();
    const normCreatedBy = (proposal.created_by || "").trim().toLowerCase();
    const cleanCreatedBy = (proposal.created_by || "").replace(/\s+/g, " ").trim().toLowerCase();

    const isOwner = this.isProposalOwner(proposal, user);

    // Check if the current stage is a dynamic Project Owner approval stage
    const isPOStage =
      (currentStageConfig && isProjectOwnerStage(currentStageConfig)) ||
      (proposal.pending_with_role && isProjectOwnerStage({ role_title: proposal.pending_with_role }));

    const isProjectOwner = this.isProjectOwner(proposal, user);

    // 1. Dynamic Project Owner stage: ONLY the designated Project Owner can approve
    // Administrators cannot approve this stage unless they are the designated Project Owner
    if (isPOStage) {
      if (isProjectOwner) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `Access Denied: This approval stage requires review and endorsement by the designated Project Owner (${proposal.owname || proposal.owner_email}). Only the assigned Project Owner can approve this level.`,
      };
    }

    // 2. Non-Project Owner stage: User MUST have an Approver role (Admin role alone does not grant approval rights)
    const isApprover = this.hasRole(user, "Approver");
    if (!isApprover) {
      return {
        allowed: false,
        reason: "Access Denied: You do not hold an active Approver role for this workflow stage.",
      };
    }

    // 3. Segregation of Duties: Proposal initiator/creator strictly cannot approve their own CER on non-owner stages
    const isCreator = Boolean(
      (normCreatedBy && (normCreatedBy === normUserEmail || normCreatedBy === normUserLogin)) ||
      (cleanCreatedBy && cleanUserName && cleanCreatedBy === cleanUserName)
    );

    if (isCreator) {
      return {
        allowed: false,
        reason: "Segregation of Duties Enforcement: You are the initiator/creator of this CER proposal and cannot approve your own request.",
      };
    }

    // 4. Designated Stage Approver Email Check:
    // If the stage specifies an approver email, the user MUST match it
    const stageApproverEmail = (currentStageConfig?.approver_email || "").trim().toLowerCase();
    const targetApproverEmail = stageApproverEmail;

    if (targetApproverEmail) {
      const isStageApproverMatch =
        normUserEmail === targetApproverEmail ||
        normUserLogin === targetApproverEmail;

      if (!isStageApproverMatch) {
        return {
          allowed: false,
          reason: isProjectOwner
            ? "Segregation of Duties Enforcement: You are the initiator/owner of this CER proposal and cannot approve your own request."
            : `Access Denied: This approval stage is assigned to designated approver (${targetApproverEmail}). Only the assigned approver can approve this level.`,
        };
      }
    }

    // 5. Level number match: if user has a configured approval_level, it must match current level
    const userLevel = user.approval_level;
    if (userLevel !== undefined && userLevel !== null && proposal.current_level !== userLevel) {
      return {
        allowed: false,
        reason: `Approval Level Mismatch: This proposal is currently pending at Level ${proposal.current_level}. You are assigned to Level ${userLevel}.`,
      };
    }

    // 6. Non-Project Owner stage: Segregation of Duties for Project Owners
    if (isProjectOwner) {
      // Dual-role allowance: If an employee is designated as the Project Owner on a proposal
      // created by someone else, but they are also the officially assigned Approver for this level
      // (e.g. Level 1 Finance), allow them to perform their duty at this stage.
      const isFinanceRole = Boolean(
        currentStageConfig?.role_title &&
        currentStageConfig.role_title.toLowerCase().includes("finance")
      );
      const isLevelMatch = (user.approval_level || 1) === proposal.current_level;
      const isExplicitAssignedApprover = targetApproverEmail
        ? (normUserEmail === targetApproverEmail || normUserLogin === targetApproverEmail)
        : (isFinanceRole && isLevelMatch && !isCreator);

      if (!isExplicitAssignedApprover) {
        return {
          allowed: false,
          reason: "Segregation of Duties Enforcement: You are designated as the Project Owner on this CER and cannot approve subsequent workflow stages.",
        };
      }
    }

    // 7. SBU match check if user has an SBU assigned
    if (user.sbu && user.sbu !== "All" && proposal.sbu) {
      const userSbu = user.sbu.trim().toLowerCase();
      const propSbu = proposal.sbu.trim().toLowerCase();
      if (userSbu !== propSbu) {
        return {
          allowed: false,
          reason: `SBU Mismatch: This proposal belongs to SBU '${proposal.sbu}', whereas you are assigned to '${user.sbu}'.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Admin Console access check
   */
  public static canAccessAdmin(user: IAppUser): boolean {
    if (!user || !user.is_active) return false;
    return this.hasRole(user, "Admin");
  }

  /**
   * Proposal Creation check
   */
  public static canCreateCER(user: IAppUser): boolean {
    if (!user || !user.is_active) return false;
    return this.hasRole(user, "Initiator") || this.hasRole(user, "Admin");
  }

  /**
   * Role Management authorization check (Admin only)
   */
  public static canManageRoles(user: IAppUser): boolean {
    if (!user || !user.is_active) return false;
    return this.hasRole(user, "Admin");
  }
}
