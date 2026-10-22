export type UserRole = "Initiator" | "Approver" | "Finance_Audit" | "Admin";

export interface IAppUser {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  approval_level?: number; // If an Approver, which level they can act upon (1, 2, 3...)
}

export const DEMO_USERS: IAppUser[] = [
  {
    id: 12,
    name: "Priya Kalekar (STL Digital)",
    email: "Priya.Kalekar@cairnindia.com",
    role: "Initiator",
    department: "CER Management Portal"
  },
  {
    id: 15,
    name: "Ankit Sharma (STL Digital)",
    email: "Ankit.Sharma2@cairnindia.com",
    role: "Approver",
    department: "CER Management Portal",
    approval_level: 1
  },
  {
    id: 14,
    name: "Deependra Singh (STL Digital)",
    email: "Deependra.Singh@cairnindia.com",
    role: "Approver",
    department: "CER Management Portal",
    approval_level: 2
  },
  {
    id: 16,
    name: "Nitin Doshi (STL Digital)",
    email: "Nitin.Doshi@cairnindia.com",
    role: "Approver",
    department: "CER Management Portal",
    approval_level: 3
  }
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

