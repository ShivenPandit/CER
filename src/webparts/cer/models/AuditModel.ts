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
  remarks: "Remarks (including Justification for Non Payback expenditure, etc)",
  remarks_jv: "Remarks related to JV Risk",
  pr_name: "Project Name",
  owname: "CER Owner",
  sbu: "Strategic Business Unit (SBU)",
  status: "Proposal Status",
  object: "Business Object",
  amount: "Amount of CER",
  currency: "Currency",
  cat: "Proposal Category",
  payable: "Payback / Non-Payback",
  period: "Project Period",
  ben_npv: "Financial Benefits — Net Present Value (NPV)",
  ben_irr: "Financial Benefits — Internal Rate of Return (IRR %)",
  cost_assumptions: "Key Assumptions for Financial Benefits and Costs",
  st_date: "Project Start Date",
  com_date: "Project Completion Date",
  duration_months: "Total Duration (Months)",
  cbudget: "Corporate Budget Status",
  cb_amnt: "Corporate Budget Amount",
  cb_currency: "Corporate Budget Currency",
  reason: "Reason if not partially budgeted",
  jv: "Joint Venture (JV) Alignment",
  jv_cost: "JV Cost",
  jv_budget: "JV Budget Status",
  jv_amnt: "JV Budget Amount",
  jv_reason: "JV Justification",
  prod_till: "Production Expenditure — Till Specified Period",
  prod_fy: "Production Expenditure — Current Financial Year",
  prod_beyond: "Production Expenditure — Beyond Specified Period",
  capex_till: "CAPEX Expenditure — Till Specified Period",
  capex_fy: "CAPEX Expenditure — Current Financial Year",
  capex_beyond: "CAPEX Expenditure — Beyond Specified Period",
  opex_till: "OPEX Expenditure — Till Specified Period",
  opex_fy: "OPEX Expenditure — Current Financial Year",
  opex_beyond: "OPEX Expenditure — Beyond Specified Period",
  engineer: "Cost Breakdown — Engineering",
  s_fac: "Cost Breakdown — Site Facilities",
  comis: "Cost Breakdown — Commissioning",
  preop: "Cost Breakdown — Pre-Operating Costs",
  others: "Cost Breakdown — Others",
  total: "Total Cost"
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
