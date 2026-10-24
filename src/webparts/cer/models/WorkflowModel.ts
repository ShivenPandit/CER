export interface IWorkflowLevel {
  id?: string;
  level_id: number; // 1, 2, 3...
  level_name: string; // e.g. "L1 - Technical & SBU Operations Review"
  role_title: string; // e.g. "SBU Operations Head"
  sbu?: string; // Block/SBU routing: "All", "CBOS", "RAVA", "RJ North", "RJ South"
  is_active: boolean; // Active checkbox
  created_by?: string; // Who created the level
  created_date?: string; // Timestamp when created
  approver_name?: string;
  approver_email?: string;
  min_amount?: number;
  max_amount?: number;
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
