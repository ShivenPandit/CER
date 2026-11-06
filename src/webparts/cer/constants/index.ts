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
  CER_ROLE_MATRIX: "CERRoleMatrix",
  CER_PROPOSALS: "CERProposals",
  CER_PROPOSALS_HISTORY: "CERProposalsHistory",
  CER_AUDIT_TRAIL: "CERAuditTrail",
  CER_REMARKS_HISTORY: "CERRemarksHistory",
  CER_APPROVAL_DECISIONS: "CERApprovalDecisions",
  CER_ATTACHMENTS: "CERAttachments",
  CER_MAIL_TRIGGER: "CERMailTrigger",
  // Legacy compatibility aliases
  CER_MASTER: "CERProposals",
  CER_WORKFLOW_HISTORY: "CERApprovalDecisions",
  CER_AUDIT_LOG: "CERAuditTrail",
  CER_DOCUMENTS: "CERAttachments",
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

// Fixed Six-Level Approval Workflow Stages
export interface IFixedApprovalStageConfig {
  level: number;
  name: string;
  roleTitle: string;
  assignmentType: "SpecificUser" | "ProjectOwnerAuto";
  isProjectOwnerStage: boolean;
  approverRoleKey: "Finance" | "ProjectOwner" | "BU_CFO" | "BU_Director" | "VOGL_CFO" | "VOGL_CEO";
}

export const FIXED_6_LEVEL_APPROVAL_STAGES: readonly IFixedApprovalStageConfig[] = [
  {
    level: 1,
    name: "L1 - Finance Review",
    roleTitle: "Finance",
    assignmentType: "SpecificUser",
    isProjectOwnerStage: false,
    approverRoleKey: "Finance",
  },
  {
    level: 2,
    name: "L2 - Project Owner Approval",
    roleTitle: "Project Owner",
    assignmentType: "ProjectOwnerAuto",
    isProjectOwnerStage: true,
    approverRoleKey: "ProjectOwner",
  },
  {
    level: 3,
    name: "L3 - BU CFO Approval",
    roleTitle: "BU CFO",
    assignmentType: "SpecificUser",
    isProjectOwnerStage: false,
    approverRoleKey: "BU_CFO",
  },
  {
    level: 4,
    name: "L4 - BU Director Approval",
    roleTitle: "BU Director",
    assignmentType: "SpecificUser",
    isProjectOwnerStage: false,
    approverRoleKey: "BU_Director",
  },
  {
    level: 5,
    name: "L5 - VOGL CFO Approval",
    roleTitle: "VOGL CFO",
    assignmentType: "SpecificUser",
    isProjectOwnerStage: false,
    approverRoleKey: "VOGL_CFO",
  },
  {
    level: 6,
    name: "L6 - VOGL CEO Approval",
    roleTitle: "VOGL CEO",
    assignmentType: "SpecificUser",
    isProjectOwnerStage: false,
    approverRoleKey: "VOGL_CEO",
  },
] as const;

// SBU-Wise Role Matrix Choices (Mandatory SBUs)
export const ROLE_MATRIX_SBUS = ["CBOS", "RAVA", "RJ North", "RJ South"] as const;
export type RoleMatrixSBU = typeof ROLE_MATRIX_SBUS[number];

// Supported Roles in CERRoleMatrix
export const ROLE_MATRIX_ROLES = ["Initiator", "Approver", "Finance_Audit", "Admin"] as const;

// Legacy 7-Level Approval Workflow Hierarchy (retained for backward compatibility)
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
