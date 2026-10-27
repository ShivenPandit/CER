export interface ICERAuditRecord {
  id: string;
  cerprno: string;
  field_name: string;
  field_desc: string;
  old_value: string;
  new_value: string;
  user_name: string;
  user_email: string;
  audit_date: string; // YYYY-MM-DD
  audit_time: string; // HH:mm:ss
  timestamp: string;  // ISO string
  is_long_text?: boolean;
}

export interface ICERRemarksVersion {
  id: string;
  cerprno: string;
  version: number;
  remarks_text: string;
  remarks_type: "REMARKS" | "REMARKS_JV";
  word_count: number;
  created_by: string;
  created_date: string;
}

/**
 * Mapping table from technical field names to human-readable business descriptions
 * as required in FR-06 and FR-07
 */
export const AUDIT_FIELD_DESCRIPTIONS: Record<string, string> = {
  remarks: "Remarks (including Justification for Non Payback expenditure, etc.)",
  remarks_jv: "Remarks on JV Risk (including risk carrying period)",
  pr_name: "Name of Project",
  cerprno: "CER Proposal No.",
  owname: "CER Owner Name",
  sbu: "Block/SBU/Field",
  status: "Proposal Status",
  object: "Objectives of CER",
  amount: "Amount of CER",
  currency: "Currency",
  cat: "Category",
  payable: "Payback/Non Payback",
  payback_quarters: "Payback Period (in no. of Quarters)",
  period: "Total Duration",
  ben_npv: "Financial Benefits – NPV ($mm)",
  ben_irr: "Financial Benefit – IRR (%)",
  cost_assumptions: "Key Assumptions to Financial Benefit/Costs",
  st_date: "Start Date of Project",
  com_date: "Completion Date of Project",
  duration_months: "Total Duration (Months)",
  cbudget: "Corporate Budget (Yes/No)",
  cb_amnt: "Corporate Budget Amount ($mm)",
  cb_currency: "Corporate Budget Currency",
  reason: "Reason if not/partially budgeted",
  jv: "Aligned with JV (Yes/No/Under Discussion)",
  jv_recoverable: "JV Cost Recoverable (Yes/No)",
  jv_cost: "JV Cost Share",
  jv_budget: "JV Budget (Yes/No)",
  jv_amnt: "JV Budget Amount ($mm)",
  jv_reason: "Reason if not/partially budgeted (JV)",
  prod_till: "Production (in mmbbls) — Till Mar'26",
  prod_fy: "Production (in mmbbls) — FY 26-27",
  prod_beyond: "Production (in mmbbls) — Beyond FY'27",
  capex_till: "Capex ($mm) — Till Mar'26",
  capex_fy: "Capex ($mm) — FY 26-27",
  capex_beyond: "Capex ($mm) — Beyond FY'27",
  opex_till: "Opex ($mm) — Till Mar'26",
  opex_fy: "Opex ($mm) — FY 26-27",
  opex_beyond: "Opex ($mm) — Beyond FY'27",
  engineer: "Engineering",
  s_fac: "Surface Facilities",
  comis: "Commissioning",
  preop: "Pre Operations",
  others: "Others",
  total: "Total"
};

/**
 * Technical metadata fields excluded from business change log
 */
export const EXCLUDED_AUDIT_FIELDS = new Set([
  "id",
  "created_date",
  "created_by",
  "modified_date",
  "modified_by",
  "usrid",
  "change_ind",
  "approve",
  "comp_appr_level",
  "current_level",
  "pending_with_role",
  "pending_with_email",
  "revision_count",
  "ph_till_label",
  "ph_fy_label",
  "ph_beyond_label"
]);
