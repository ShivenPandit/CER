import { ICERProposal, IFieldChoices } from "../models/CERModel";
import { ICERAuditRecord, ICERRemarksVersion } from "../models/AuditModel";
import { IWorkflowLevel, IApprovalDecision, INotificationLog } from "../models/WorkflowModel";
import { ICERAttachment } from "../models/AttachmentModel";
import { IDirectoryUser, IUserRoleAssignment, IAdminAuditRecord } from "../models/UserModel";

export interface ICERDataService {
  // Directory & Users
  searchDirectoryUsers(query: string): Promise<IDirectoryUser[]>;

  // Role-Based Access Control (RBAC) & User Roles
  getUserRoles(forceRefresh?: boolean): Promise<IUserRoleAssignment[]>;
  assignUserRole(assignment: Omit<IUserRoleAssignment, "id">, actor: { name: string; email: string }): Promise<IUserRoleAssignment>;
  updateUserRole(assignment: IUserRoleAssignment, actor: { name: string; email: string }): Promise<void>;
  revokeUserRole(assignmentId: string, actor: { name: string; email: string }): Promise<void>;

  // Administrative Audit Log
  getAdminAuditLog(): Promise<IAdminAuditRecord[]>;
  logAdminAudit(record: Omit<IAdminAuditRecord, "id">): Promise<void>;
  clearCache?(): void;

  // Dropdown Field Choices (Fetched directly from SharePoint list schema)
  getFieldChoices(): Promise<IFieldChoices>;

  // Proposals
  getAllProposals(): Promise<ICERProposal[]>;
  getProposalByNumber(cerprno: string): Promise<ICERProposal | null>;
  createProposal(proposal: ICERProposal): Promise<{ success: boolean; message: string; proposal: ICERProposal }>;
  updateProposal(proposal: ICERProposal, user: { name: string; email: string }): Promise<{ success: boolean; message: string; proposal: ICERProposal; auditRowsCount: number }>;
  generateProposalNumber(): Promise<string>;

  // Audit Trail & Remarks
  getAuditTrail(cerprno?: string): Promise<ICERAuditRecord[]>;
  getRemarksHistory(cerprno: string): Promise<ICERRemarksVersion[]>;

  // Workflow & Approvals
  getWorkflowLevels(sbu?: string, forceRefresh?: boolean): Promise<IWorkflowLevel[]>;
  saveWorkflowLevels(levels: IWorkflowLevel[]): Promise<void>;
  getApprovalDecisions(cerprno: string): Promise<IApprovalDecision[]>;
  recordDecision(decision: {
    cerprno: string;
    level_id: number;
    approver_name: string;
    approver_email: string;
    decision: "APPROVED" | "REJECTED" | "SENT_BACK";
    comments: string;
  }): Promise<{ success: boolean; newStatus: string; nextLevel: number }>;

  // Attachments
  getAttachments(cerprno: string): Promise<ICERAttachment[]>;
  addAttachment(attachment: ICERAttachment): Promise<void>;
  deleteAttachment(id: string): Promise<void>;

  // Notifications
  getNotificationLogs(cerprno?: string): Promise<INotificationLog[]>;
}


