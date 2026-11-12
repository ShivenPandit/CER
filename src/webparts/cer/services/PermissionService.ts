import { IAppUser, UserRole } from "../models/UserModel";
import { ICERProposal } from "../models/CERModel";
import { IWorkflowLevel, isProjectOwnerStage } from "../models/WorkflowModel";
import { NavView } from "../components/Navigation/Sidebar";
import { isDesignatedAdmin, normalizeUserIdentifier, checkUserHierarchyAdminAccess } from "./AuthService";

export interface IActionAuthResult {
  allowed: boolean;
  reason?: string;
}

/**
 * @deprecated Approval Hierarchy permission is now dynamically loaded from CERRoleMatrix.
 * This legacy export is preserved only for backwards compatibility with legacy test harnesses.
 */
export const AUTHORIZED_APPROVAL_HIERARCHY_EMAIL = "";

export class PermissionService {
  public static readonly AUTHORIZED_APPROVAL_HIERARCHY_EMAIL = AUTHORIZED_APPROVAL_HIERARCHY_EMAIL;

  /**
   * Normalizes identity strings (emails, login names, UPNs) by trimming, lowercasing,
   * and stripping SharePoint claims prefixes (e.g. i:0#.f|membership|).
   */
  public static normIdentity(val?: string): string {
    return (val || "")
      .trim()
      .toLowerCase()
      .replace(/^i:0#\.f\|membership\|/i, "")
      .replace(/^membership\|/i, "");
  }

  /**
   * Normalizes display names by trimming, lowercasing, removing corporate/vendor
   * parentheses (e.g. '(STL Digital)', '(Microlink)', '(External)'), and collapsing whitespace.
   */
  public static cleanDisplayName(val?: string): string {
    return (val || "")
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /**
   * Centralized access-control rule:
   * Dynamically permits Approval Hierarchy management based on permissions
   * loaded from the CERRoleMatrix SharePoint list (or Site Administrator).
   * - Eliminates hardcoded individual email addresses.
   * - Evaluates `user.canManageApprovalHierarchy` populated dynamically from CERRoleMatrix.
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
      return checkUserHierarchyAdminAccess(
        {
          id: user.id,
          email: user.email,
          loginName: user.loginName,
          name: user.name,
        },
        authorizedHierarchyEmails
      );
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
   * 2. Corporate dual-identifier alias matching across @cairnindia.com and @vedanta.co.in.
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
    const createdByEmail = (proposal.created_by_email || (proposal as any).Author?.EMail || "").trim().toLowerCase();
    const normCreatedByEmail = norm(createdByEmail);
    const authorTitle = ((proposal as any).Author?.Title || "").trim().toLowerCase();

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
    const cleanAuthorTitle = cleanName(authorTitle);

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
    const createdByEmailPrefix = normCreatedByEmail ? normCreatedByEmail.split("@")[0] : "";
    if (userPrefix && (
      (ownerPrefix && userPrefix === ownerPrefix) ||
      (createdByPrefix && userPrefix === createdByPrefix) ||
      (createdByEmailPrefix && userPrefix === createdByEmailPrefix)
    )) {
      return true;
    }

    // 3. Project Owner Display Name Match (normalized display name)
    if (cleanUserName && cleanOwnerName && cleanUserName === cleanOwnerName) {
      return true;
    }

    // 4. Initiator Match (Created By display name, email, login, or Author)
    if (cleanUserName && cleanCreatedBy && cleanUserName === cleanCreatedBy) {
      return true;
    }
    if (cleanUserName && cleanAuthorTitle && cleanUserName === cleanAuthorTitle) {
      return true;
    }
    if (normUserEmail && normCreatedByEmail && normUserEmail === normCreatedByEmail) {
      return true;
    }
    if (normUserLogin && normCreatedByEmail && normUserLogin === normCreatedByEmail) {
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
   * All authenticated users can view My CER Proposals (filtered to their owned records).
   */
  public static canViewMyRequests(user?: IAppUser | null, hasOwnedProposals?: boolean): boolean {
    if (!user || !user.is_active) return false;
    return true;
  }

  /**
   * Checks if user has permission to view "Pending Approvals".
   * All authenticated users can access the Pending Approvals page.
   * Data-level filtering ensures they only see proposals they are authorized to approve.
   */
  public static canViewApprovals(user?: IAppUser | null, hasApprovalAuth?: boolean): boolean {
    if (!user || !user.is_active) return false;
    return true;
  }

  /**
   * Checks if user has permission to view Reports & Analytics.
   * All authenticated users have access to reports.
   */
  public static canViewReports(user?: IAppUser | null): boolean {
    if (!user || !user.is_active) return false;
    return true;
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
      proposal.status === "Send Back" ||
      proposal.status === "Revised" ||
      proposal.status === "Sent Back" ||
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

    const norm = (val?: string) => PermissionService.normIdentity(val);
    const cleanName = (val?: string) => PermissionService.cleanDisplayName(val);

    const normUserEmail = norm(user.email);
    const normUserLogin = norm(user.loginName);
    const effectiveUserEmail = normUserEmail || (normUserLogin.indexOf("@") !== -1 ? normUserLogin : "");
    const cleanUserName = cleanName(user.name);
    const normCreatedBy = norm(proposal.created_by);
    const cleanCreatedBy = cleanName(proposal.created_by);

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

    // 2. Non-Project Owner stages (L1, L3, L4, L5, L6):
    // Single Source of Truth: The Approval Role Matrix.
    // User can approve only if they are assigned to this level and SBU in the matrix.
    // Administrators CANNOT approve unless they are explicitly assigned to this level.
    // Proposal creator and Project Owner CAN approve if explicitly assigned in the matrix.

    // SBU Alignment:
    if (
      user.sbu &&
      user.sbu.trim().toLowerCase() !== "all" &&
      proposal.sbu &&
      proposal.sbu.trim().toLowerCase() !== "all"
    ) {
      const userSbu = user.sbu.trim().toLowerCase();
      const propSbu = proposal.sbu.trim().toLowerCase();
      if (userSbu !== propSbu) {
        return {
          allowed: false,
          reason: `SBU Mismatch: This proposal belongs to SBU '${proposal.sbu}', whereas you are assigned to '${user.sbu}'.`,
        };
      }
    }

    if (
      currentStageConfig?.sbu &&
      currentStageConfig.sbu.trim().toLowerCase() !== "all" &&
      proposal.sbu &&
      proposal.sbu.trim().toLowerCase() !== "all"
    ) {
      const stageSbu = currentStageConfig.sbu.trim().toLowerCase();
      const propSbu = proposal.sbu.trim().toLowerCase();
      if (stageSbu !== propSbu) {
        return {
          allowed: false,
          reason: `SBU Mismatch: Stage configuration belongs to SBU '${currentStageConfig.sbu}', whereas proposal belongs to '${proposal.sbu}'.`,
        };
      }
    }

    // Designated Stage Approver Email / Approvers List Check:
    // The Approval Role Matrix is the single source of truth.
    // If the stage has no approver email and no approvers configured in the matrix,
    // the stage is UNASSIGNED in the matrix, and NO ONE can approve it.
    const stageApproverEmail = (currentStageConfig?.approver_email || "").trim();
    const stageApprovers = currentStageConfig?.approvers;
    const stageHasApprovers = Boolean(stageApprovers && stageApprovers.length > 0);

    if (!stageApproverEmail && !stageHasApprovers) {
      return {
        allowed: false,
        reason: `Access Denied: Approval Level ${proposal.current_level} is currently unassigned in the Approval Role Matrix.`,
      };
    }

    const matchesUser = (target: string) => {
      if (!target) return false;
      const normTarget = norm(target);
      return (
        (normUserEmail && normTarget === normUserEmail) ||
        (normUserLogin && normTarget === normUserLogin) ||
        (effectiveUserEmail && normTarget === effectiveUserEmail)
      );
    };

    const stageEmails = stageApproverEmail
      .split(/[;,]/)
      .map((e) => norm(e))
      .filter(Boolean);

    const isStageApproverMatch =
      stageEmails.some(matchesUser) ||
      Boolean(
        stageApprovers &&
        stageApprovers.some((app) => {
          const appEmail = norm(app.user_email);
          const appLogin = norm(app.login_name);
          const appCleanName = cleanName(app.user_name);
          return (
            matchesUser(appEmail) ||
            matchesUser(appLogin) ||
            (cleanUserName && appCleanName && cleanUserName === appCleanName)
          );
        })
      );

    if (!isStageApproverMatch) {
      return {
        allowed: false,
        reason: `Access Denied: This approval stage is assigned to designated approvers in the Approval Role Matrix. You are not an assigned approver for Level ${proposal.current_level} for SBU '${proposal.sbu || "All"}'.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Admin Console access check (Restricted strictly to users with active "Admin" role in CERRoleMatrix)
   */
  public static canAccessAdmin(user?: IAppUser | null): boolean {
    if (!user || !user.is_active) return false;
    return this.hasRole(user, "Admin");
  }

  /**
   * Proposal Creation check (All active authenticated users can create proposals)
   */
  public static canCreateCER(user?: IAppUser | null): boolean {
    if (!user || !user.is_active) return false;
    return true;
  }

  /**
   * Role Management authorization check (Admin only)
   */
  public static canManageRoles(user?: IAppUser | null): boolean {
    if (!user || !user.is_active) return false;
    return this.canAccessAdmin(user);
  }
}
