/**
 * Centralized Application Constants for CER Management System
 * 
 * Provides unified references for:
 * - SharePoint List & Library Names
 * - Navigation Views and Route Identifiers
 * - Approval Hierarchy Stages & Constants
 * - Financial Year and Currency Defaults
 * - Pagination & UI Defaults
 */

// SharePoint List & Library Internal Names
export const SP_LISTS = {
  CER_MASTER: "CER_Master",
  CER_COST_BREAKDOWN: "CER_CostBreakdown",
  CER_PHASING: "CER_Phasing",
  CER_WORKFLOW_HISTORY: "CER_Workflow_History",
  CER_WORKFLOW_CONFIG: "CER_Workflow_Config",
  CER_USER_ROLES: "CER_UserRoles",
  CER_AUDIT_LOG: "CER_Audit_Log",
  CER_NOTIFICATION_LOG: "CER_Notification_Log",
  CER_FIELD_CHOICES: "CER_Field_Choices",
  CER_PROPOSAL_COUNTER: "CER_Proposal_Counter",
  CER_REMARKS_HISTORY: "CER_Remarks_History",
  CER_DOCUMENTS: "CER_Documents",
} as const;

// Application Navigation Routes & Views
export const NAV_VIEWS = {
  DASHBOARD: "Dashboard",
  CREATE: "create",
  CHANGE: "change",
  MY_PROPOSALS: "my-proposals",
  ALL_PROPOSALS: "all-proposals",
  PENDING_APPROVALS: "pending-approvals",
  APPROVAL_HISTORY: "approval-history",
  DISPLAY: "display",
  REPORTS: "Reports",
  AUDIT_TRAIL: "audit-trail",
  WORKFLOW_CONFIG: "workflow-config",
} as const;

// 7-Level Approval Workflow Hierarchy
export const APPROVAL_LEVELS = [
  { level: 1, name: "HOD Approval", defaultRole: "Approver" },
  { level: 2, name: "Finance & Accounts (F&A)", defaultRole: "Finance" },
  { level: 3, name: "SBU Head Approval", defaultRole: "Approver" },
  { level: 4, name: "Executive Committee (ExCo)", defaultRole: "Approver" },
  { level: 5, name: "Chief Financial Officer (CFO)", defaultRole: "Finance" },
  { level: 6, name: "Chief Executive Officer (CEO)", defaultRole: "Approver" },
  { level: 7, name: "Board of Directors", defaultRole: "Approver" },
] as const;

// Approver Assignment Types
export const ASSIGNMENT_TYPES = {
  SPECIFIC_USER: "Specific User",
  AUTO_PROJECT_OWNER: "Auto — Project Owner",
} as const;

// Default Pagination Configurations
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50],
} as const;

// Attachment Specifications
export const ATTACHMENT_SPECS = {
  MAX_FILE_SIZE_MB: 25,
  MAX_TOTAL_SIZE_MB: 100,
  ALLOWED_EXTENSIONS: [".pdf", ".xlsx", ".xls", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".zip"],
} as const;

// System Roles
export const USER_ROLES = {
  ADMIN: "Admin",
  INITIATOR: "Initiator",
  APPROVER: "Approver",
  FINANCE: "Finance",
  AUDIT: "Audit",
  VIEWER: "Viewer",
} as const;
