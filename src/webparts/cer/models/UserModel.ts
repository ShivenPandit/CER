export type UserRole = "Initiator" | "Approver" | "Finance_Audit" | "Admin";

export interface IAppUser {
  id: number | string;
  name: string;
  email: string;
  loginName?: string;
  role: UserRole; // Primary active role (for backward compatibility)
  roles: UserRole[]; // All assigned active roles
  department?: string;
  sbu?: string;
  approval_level?: number; // If an Approver, which level they can act upon (1, 2, 3...)
  is_active: boolean;
  isSiteAdmin?: boolean;
}

export interface IUserRoleAssignment {
  id: string; // SharePoint Item ID or UUID
  user_name: string;
  user_email: string;
  login_name: string;
  role: UserRole;
  approval_level?: number;
  department?: string;
  sbu?: string;
  is_active: boolean;
  assigned_by: string;
  assigned_date: string;
  user_id?: number; // SharePoint User ID (from Person or Group field)
}

export type AdminAuditAction =
  | "ROLE_ASSIGNED"
  | "ROLE_UPDATED"
  | "ROLE_REVOKED"
  | "ROLE_STATUS_TOGGLED"
  | "WORKFLOW_UPDATED"
  | "SETTINGS_UPDATED";

export interface IAdminAuditRecord {
  id: string;
  actor_name: string;
  actor_email: string;
  action: AdminAuditAction;
  target_type: "USER" | "WORKFLOW" | "SETTINGS";
  target_id: string;
  details: string;
  before_value?: string;
  after_value?: string;
  timestamp: string;
}

/**
 * @deprecated For testing/fallback only. Production uses real SharePoint identity and CERUserRoles list.
 */
export const DEMO_USERS: IAppUser[] = [
  {
    id: 1,
    name: "Shiven Pandit",
    email: "70007144@cairnindia.com",
    role: "Admin",
    roles: ["Admin", "Initiator"],
    is_active: true,
    department: "Digital",
    sbu: "RJ North",
  },
];

export interface IDirectoryUser {
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
}

/**
 * Resolves a usable email from a directory user:
 * 1. Selected user's mail when available and valid.
 * 2. Fallback to userPrincipalName if mail is empty or invalid.
 * 3. Returns empty string if neither contains a valid email address.
 */
export function resolveDirectoryUserEmail(user: Partial<IDirectoryUser>): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (user.mail && emailRegex.test(user.mail.trim())) {
    return user.mail.trim();
  }
  if (user.userPrincipalName && emailRegex.test(user.userPrincipalName.trim())) {
    return user.userPrincipalName.trim();
  }
  return "";
}

export const MOCK_DIRECTORY_USERS: IDirectoryUser[] = [
  {
    id: "70007144",
    displayName: "Admin (70007144)",
    mail: "70007144@cairnindia.com",
    userPrincipalName: "70007144@cairnindia.com",
    jobTitle: "System Administrator",
    department: "Enterprise Administration",
  },
  {
    id: "12",
    displayName: "Priya Kalekar (STL Digital)",
    mail: "Priya.Kalekar@cairnindia.com",
    userPrincipalName: "70004733@cairnindia.com",
    jobTitle: "Site Administrator",
    department: "CER Management Portal",
  },
  {
    id: "15",
    displayName: "Ankit Sharma (STL Digital)",
    mail: "Ankit.Sharma2@cairnindia.com",
    userPrincipalName: "70004736@cairnindia.com",
    jobTitle: "Portal Member",
    department: "CER Management Portal",
  },
  {
    id: "14",
    displayName: "Deependra Singh (STL Digital)",
    mail: "Deependra.Singh@cairnindia.com",
    userPrincipalName: "70003750@cairnindia.com",
    jobTitle: "Portal Member",
    department: "CER Management Portal",
  },
  {
    id: "16",
    displayName: "Nitin Doshi (STL Digital)",
    mail: "Nitin.Doshi@cairnindia.com",
    userPrincipalName: "70004727@cairnindia.com",
    jobTitle: "Portal Member",
    department: "CER Management Portal",
  },
  {
    id: "99",
    displayName: "User Without Mail",
    mail: "",
    userPrincipalName: "user.nomail@cairnindia.com",
    jobTitle: "Technician",
    department: "Operations",
  },
  {
    id: "98",
    displayName: "Invalid Email User",
    mail: "not-an-email",
    userPrincipalName: "invalid-upn",
    jobTitle: "Contractor",
    department: "External",
  },
];

