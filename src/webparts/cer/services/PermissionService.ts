import { IAppUser, UserRole } from "../models/UserModel";
import { ICERProposal } from "../models/CERModel";
import { NavView } from "../components/navigation/Sidebar";

export interface IActionAuthResult {
  allowed: boolean;
  reason?: string;
}

export class PermissionService {
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
   * Verifies if user has permission to navigate to a specific view
   */
  public static canAccessView(view: NavView, user: IAppUser): boolean {
    if (!user || !user.is_active) {
      return false;
    }

    switch (view) {
      case "dashboard":
      case "my-proposals":
      case "all-proposals":
      case "display":
      case "approval-history":
        return true;

      case "create":
        return this.hasRole(user, "Initiator") || this.hasRole(user, "Admin");

      case "change":
        // View can be opened, but specific proposal authorization is checked inside canEditCER
        return this.hasRole(user, "Initiator") || this.hasRole(user, "Admin");

      case "pending-approvals":
        return this.hasRole(user, "Approver") || this.hasRole(user, "Admin");

      case "reports":
        return (
          this.hasRole(user, "Finance_Audit") ||
          this.hasRole(user, "Admin") ||
          this.hasRole(user, "Approver") ||
          this.hasRole(user, "Initiator")
        );

      case "audit-trail":
        return (
          this.hasRole(user, "Finance_Audit") ||
          this.hasRole(user, "Admin") ||
          this.hasRole(user, "Approver") ||
          this.hasRole(user, "Initiator")
        );

      case "workflow-config":
        return this.hasRole(user, "Admin");

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
      return {
        allowed: false,
        reason: `Proposal is in status '${proposal.status}' and cannot be modified. Proposals currently 'In Approval' are locked during workflow review.`,
      };
    }

    // Ownership check (case-insensitive email or display name match)
    const userEmail = (user.email || "").trim().toLowerCase();
    const ownerEmail = (proposal.owner_email || "").trim().toLowerCase();
    const isEmailOwner = userEmail && ownerEmail && userEmail === ownerEmail;

    const userName = (user.name || "").trim().toLowerCase();
    const ownerName = (proposal.owname || "").trim().toLowerCase();
    const isNameOwner = userName && ownerName && userName === ownerName;

    if (!isEmailOwner && !isNameOwner) {
      return {
        allowed: false,
        reason: `Access Denied: You do not have ownership of this proposal. Only the designated CER Owner (${proposal.owname}) can modify this request.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Rule: Approver can view and act only on proposals pending at their assigned stage.
   * Segregation of Duties: A user CANNOT approve their own CER under any circumstances.
   * Finance/Audit cannot approve proposals.
   */
  public static canApproveCER(proposal: ICERProposal, user: IAppUser): IActionAuthResult {
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

    // Segregation of Duties: Owner CANNOT approve their own CER
    const userEmail = (user.email || "").trim().toLowerCase();
    const ownerEmail = (proposal.owner_email || "").trim().toLowerCase();
    const isOwner =
      (userEmail && ownerEmail && userEmail === ownerEmail) ||
      (user.name && proposal.owname && user.name.trim().toLowerCase() === proposal.owname.trim().toLowerCase());

    if (isOwner) {
      return {
        allowed: false,
        reason: "Segregation of Duties Enforcement: You are the initiator/owner of this CER proposal and cannot approve your own request.",
      };
    }

    // Approver or Admin role required
    const isApprover = this.hasRole(user, "Approver");
    const isAdmin = this.hasRole(user, "Admin");

    if (!isApprover && !isAdmin) {
      return {
        allowed: false,
        reason: "Access Denied: You do not hold an active Approver or Administrator role.",
      };
    }

    // Approver stage level match
    if (isApprover && !isAdmin) {
      const userLevel = user.approval_level || 1;
      if (proposal.current_level !== userLevel) {
        return {
          allowed: false,
          reason: `Approval Level Mismatch: This proposal is currently pending at Level ${proposal.current_level}. You are assigned to Level ${userLevel}.`,
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
