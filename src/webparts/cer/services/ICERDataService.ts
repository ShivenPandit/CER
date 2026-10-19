import { ICERProposal } from "../models/CERModel";
import { ICERAuditRecord, ICERRemarksVersion } from "../models/AuditModel";
import { IWorkflowLevel, IApprovalDecision, INotificationLog } from "../models/WorkflowModel";
import { ICERAttachment } from "../models/AttachmentModel";

export interface ICERDataService {
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
  getWorkflowLevels(): Promise<IWorkflowLevel[]>;
  saveWorkflowLevels(levels: IWorkflowLevel[]): Promise<void>;
  getApprovalDecisions(cerprno: string): Promise<IApprovalDecision[]>;
  recordDecision(decision: {
    cerprno: string;
    level_id: number;
    approver_name: string;
    approver_email: string;
    decision: "APPROVED" | "REJECTED";
    comments: string;
  }): Promise<{ success: boolean; newStatus: string; nextLevel: number }>;

  // Attachments
  getAttachments(cerprno: string): Promise<ICERAttachment[]>;
  addAttachment(attachment: ICERAttachment): Promise<void>;
  deleteAttachment(id: string): Promise<void>;

  // Notifications
  getNotificationLogs(cerprno?: string): Promise<INotificationLog[]>;
}
