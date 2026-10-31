export type CERCategory = "Vital" | "Essential" | "Desirable" | string;

export type CERStatus = 
  | "Draft"
  | "In Approval"
  | "Approved"
  | "Rejected"
  | "Revised"
  | string;

export type CERPayable = "Payback" | "Non Payback" | "Non-Payback" | string;

export type SBUOption = "RJ North" | "RJ South" | "CBOS" | "RAVA" | string;

export interface ICERProposal {
  id: string; // Internal unique ID / GUID
  cer_proposal_id?: string; // System-generated permanent CER Proposal ID: e.g. CER-2026-0001 (Read-only, immutable)
  cerPrId?: string; // SharePoint column name for permanent CER Proposal ID: e.g. CER-2026-0001
  proposal_no?: string; // User-entered alphanumeric CER Proposal No: e.g. PR-2026-001 (Mandatory, editable per lifecycle)
  cerprno: string; // System identifier (mirrors cer_proposal_id for backward compatibility with child lists and APIs)
  pr_name: string; // Name of Project
  owname: string; // CER Owner Name
  owner_email: string;
  sbu: SBUOption; // Block/SBU/Field
  status: CERStatus;
  object: string; // Objectives of CER
  amount: number; // Amount of CER
  currency: string; // USD or INR
  cat: CERCategory; // Vital | Essential | Desirable
  payable: CERPayable; // Payback/Non Payback
  period: string; // Duration string or description
  payback_quarters?: number; // Payback Period (in no. of Quarters)
  ben_npv: number; // Financial Benefits – NPV ($mm)
  ben_irr: number; // Financial Benefit – IRR (%)
  cost_assumptions: string; // Key Assumptions to Financial Benefit/Costs
  st_date: string; // Start Date of Project (YYYY-MM-DD)
  com_date: string; // Completion Date of Project (YYYY-MM-DD)
  duration_months: number; // Total Duration

  // Corporate Budget
  cbudget: "Yes" | "No" | string; // Corporate Budget (Yes/No)
  cb_amnt: number; // Corporate Budget Amount ($mm)
  cb_currency: string;
  reason: string; // Reason if not/partially budgeted

  // Joint Venture Details
  jv: "Yes" | "No" | "Under Discussion"; // Aligned with JV (Yes/No/Under Discussion)
  jv_recoverable?: "Yes" | "No"; // JV Cost Recoverable (Yes/No)
  jv_cost: number;
  jv_budget: "Yes" | "No"; // JV Budget (Yes/No)
  jv_amnt: number; // JV Budget Amount ($mm)
  jv_reason: string; // Reason if not/partially budgeted

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
  request_date?: string; // Latest submission date for approval (SharePoint RequestDate)
  created_date: string;
  created_by: string;
  modified_date: string;
  modified_by: string;
  revision_count: number;
  etag?: string; // SharePoint item ETag for optimistic concurrency (HTTP 412)
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
  "CBOS",
  "RAVA",
  "RJ North",
  "RJ South"
];

export interface IFieldChoices {
  sbu: string[];
  cat: string[];
  currency: string[];
  payable: string[];
  cbudget: string[];
  cb_currency: string[];
  jv: string[];
  jv_recoverable: string[];
  jv_budget: string[];
  status: string[];
}

export const DEFAULT_FIELD_CHOICES: IFieldChoices = {
  sbu: ["CBOS", "RAVA", "RJ North", "RJ South"],
  cat: ["Essential", "Vital", "Desirable"],
  currency: ["USD", "INR"],
  payable: ["Payback", "Non Payback"],
  cbudget: ["Yes", "No"],
  cb_currency: ["USD", "INR"],
  jv: ["Yes", "No", "Under Discussion"],
  jv_recoverable: ["Yes", "No"],
  jv_budget: ["Yes", "No"],
  status: ["Draft", "In Approval", "Approved", "Rejected", "Revised"],
};
