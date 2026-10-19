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
    id: 101,
    name: "Shiven Pandit",
    email: "shiven.pandit@vedanta.co.in",
    role: "Initiator",
    department: "Subsurface & Drilling Projects"
  },
  {
    id: 201,
    name: "Rajesh Sharma",
    email: "rajesh.sharma@vedanta.co.in",
    role: "Approver",
    department: "Operations & Facilities",
    approval_level: 1
  },
  {
    id: 202,
    name: "Sunil Verma",
    email: "sunil.verma@vedanta.co.in",
    role: "Approver",
    department: "Corporate Finance",
    approval_level: 2
  },
  {
    id: 203,
    name: "Ananya Deshmukh",
    email: "ananya.deshmukh@vedanta.co.in",
    role: "Approver",
    department: "Executive Committee / VP",
    approval_level: 3
  },
  {
    id: 301,
    name: "Deepak Mehra",
    email: "deepak.mehra@vedanta.co.in",
    role: "Finance_Audit",
    department: "Internal Audit & Capex Controls"
  },
  {
    id: 401,
    name: "Pooja Hegde",
    email: "pooja.hegde@vedanta.co.in",
    role: "Admin",
    department: "Enterprise Systems Management"
  }
];
