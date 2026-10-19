export type CERCategory = "Vital" | "Essential" | "Desirable";

export type CERStatus = 
  | "Draft"
  | "In Approval"
  | "Approved"
  | "Rejected"
  | "Revised";

export type CERPayable = "Payback" | "Non-Payback";

export type SBUOption = "RJ North" | "RJ South" | "Suvali" | "Ravva" | "CB-OS/2" | "Corporate";

export interface ICERProposal {
  id: string; // Internal unique ID / GUID
  cerprno: string; // CER Proposal Number (e.g. CER-2026-0001)
  pr_name: string; // Project Name
  owname: string; // CER Owner Name
  owner_email: string;
  sbu: SBUOption;
  status: CERStatus;
  object: string; // Business Object
  amount: number; // Amount of CER
  currency: string; // USD or INR
  cat: CERCategory; // Vital | Essential | Desirable
  payable: CERPayable;
  period: string; // Duration string or description
  ben_npv: number; // Financial Benefits NPV ($mm)
  ben_irr: number; // Financial Benefits IRR (%)
  cost_assumptions: string; // Key assumptions for financial benefits & costs
  st_date: string; // Project start date (YYYY-MM-DD)
  com_date: string; // Project completion date (YYYY-MM-DD)
  duration_months: number;

  // Corporate Budget
  cbudget: "Yes" | "No" | "Partially";
  cb_amnt: number;
  cb_currency: string;
  reason: string; // Reason if not partially budgeted

  // Joint Venture
  jv: "Yes" | "No";
  jv_cost: number;
  jv_budget: "Yes" | "No";
  jv_amnt: number;
  jv_reason: string; // JV Justification

  // Phasing Labels
  ph_till_label: string; // e.g. "Till FY25"
  ph_fy_label: string;   // e.g. "FY 25-26"
  ph_beyond_label: string; // e.g. "Beyond FY26"

  // Phasing - Production Expenditure
  prod_till: number;
  prod_fy: number;
  prod_beyond: number;

  // Phasing - CAPEX Expenditure
  capex_till: number;
  capex_fy: number;
  capex_beyond: number;

  // Phasing - OPEX Expenditure
  opex_till: number;
  opex_fy: number;
  opex_beyond: number;

  // Cost Breakdown
  engineer: number; // Engineering
  s_fac: number;    // Site Facilities
  comis: number;    // Commissioning
  preop: number;    // Pre-operating costs
  others: number;   // Others
  total: number;    // Total sum

  // Remarks
  remarks: string;     // Business justification (350-400 words)
  remarks_jv: string;  // Remarks related to JV risk

  // Workflow tracking
  current_level: number; // 1, 2, 3...
  pending_with_role: string;
  pending_with_email: string;

  // Audit / Technical
  created_date: string;
  created_by: string;
  modified_date: string;
  modified_by: string;
  revision_count: number;
}

export const CATEGORY_DEFINITIONS: Record<CERCategory, { label: string; description: string; tagClass: string }> = {
  Vital: {
    label: "Vital",
    description: "Vital CERs are those which cannot be postponed under any circumstances with or without payback.",
    tagClass: "bg-rose-50 text-rose-700 border-rose-200"
  },
  Essential: {
    label: "Essential",
    description: "Essential are those which are important for smooth running of the operations and are justified through a short payback period.",
    tagClass: "bg-amber-50 text-amber-700 border-amber-200"
  },
  Desirable: {
    label: "Desirable",
    description: "Desirable are those which can be deferred without impacting operations and generally have a long payback period or no payback period.",
    tagClass: "bg-blue-50 text-blue-700 border-blue-200"
  }
};

export const SBU_OPTIONS: SBUOption[] = [
  "RJ North",
  "RJ South",
  "Suvali",
  "Ravva",
  "CB-OS/2",
  "Corporate"
];
