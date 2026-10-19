export interface IWorkflowLevel {
  level_id: number; // 1, 2, 3...
  level_name: string; // e.g. "L1 - Technical & SBU Review"
  role_title: string; // e.g. "SBU Head"
  approver_name: string;
  approver_email: string;
  min_amount?: number;
  max_amount?: number;
  is_active: boolean;
}

export type ApprovalDecisionType = "PENDING" | "APPROVED" | "REJECTED" | "REVISED";

export interface IApprovalDecision {
  id: string;
  cerprno: string;
  level_id: number;
  level_name: string;
  approver_name: string;
  approver_email: string;
  decision: ApprovalDecisionType;
  comments: string;
  timestamp: string;
}

export interface INotificationLog {
  id: string;
  cerprno: string;
  recipients: string[]; // creator, previous approvers, next approver
  subject: string;
  body: string;
  attachments_count: number;
  timestamp: string;
  status: "SENT" | "PENDING" | "FAILED";
}
