export type ApproverAssignmentType = "SpecificUser" | "ProjectOwnerAuto";

export interface IWorkflowLevel {
  id?: string;
  level_id: number; // 1, 2, 3...
  level_name: string; // e.g. "L1 - Technical & SBU Operations Review"
  role_title: string; // e.g. "SBU Operations Head"
  sbu?: string; // Block/SBU routing: "All", "CBOS", "RAVA", "RJ North", "RJ South"
  is_active: boolean; // Active checkbox
  assignment_type?: ApproverAssignmentType; // "SpecificUser" | "ProjectOwnerAuto"
  created_by?: string; // Who created the level
  created_date?: string; // Timestamp when created
  approver_name?: string;
  approver_email?: string;
  is_project_owner_stage?: boolean;
  min_amount?: number;
  max_amount?: number;
}

/**
 * Validates that an email is structurally usable and non-empty.
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Detects whether a workflow stage is a dynamic Project Owner approval stage.
 * Honors explicit assignment_type first ("ProjectOwnerAuto" vs "SpecificUser"),
 * then falls back to is_project_owner_stage flag and regex matching on role_title/level_name
 * for full backward compatibility with existing SharePoint records.
 */
export function isProjectOwnerStage(
  level?: {
    role_title?: string;
    level_name?: string;
    is_project_owner_stage?: boolean;
    assignment_type?: ApproverAssignmentType | string;
  } | null
): boolean {
  if (!level) return false;
  if (level.assignment_type === "ProjectOwnerAuto") return true;
  if (level.assignment_type === "SpecificUser") return false;
  if (level.is_project_owner_stage === true) return true;
  const role = (level.role_title || "").trim().toLowerCase();
  const name = (level.level_name || "").trim().toLowerCase();

  if (/^(project|proposal)[\s\-_]*owner$/i.test(role)) {
    return true;
  }
  if (/\b(project|proposal)[\s\-_]+owner\b/i.test(role)) {
    return true;
  }
  if (/\b(project|proposal)[\s\-_]+owner\b/i.test(name)) {
    return true;
  }
  return false;
}

export type ApprovalDecisionType = "PENDING" | "APPROVED" | "REJECTED" | "REVISED" | "SENT_BACK";

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
