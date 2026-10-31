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
  action_type?: "CREATE" | "UPDATE" | "APPROVE" | "REJECT" | "REVISE" | string;
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
  // Modern CamelCase column names (SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md)
  prName: "Proposal Name",
  cerPrId: "CER Proposal ID",
  cerPrNo: "CER Proposal ID",
  proposalNo: "CER Proposal No",
  cerOwner: "CER Owner",
  category: "Category",
  paybackQuarters: "Payback Quarters",
  benefitNpv: "Benefit NPV",
  benefitIrr: "Benefit IRR",
  costAssumptions: "Cost Assumptions",
  startDate: "Start Date",
  completionDate: "Completion Date",
  durationMonths: "Duration Months",
  currentBudgeted: "Current Budgeted?",
  currentBudgetAmount: "Current Budget Amount",
  currentBudgetCurrency: "Current Budget Currency",
  unbudgetedReason: "Unbudgeted Reason",
  jointVenture: "Joint Venture?",
  jvRecoverable: "JV Recoverable?",
  jvCost: "JV Partner Cost",
  jvBudgeted: "JV Budgeted?",
  jvAmount: "JV Partner Amount",
  jvReason: "JV Reason",
  phTillLabel: "Phasing Prior Label",
  phFyLabel: "Phasing Current Label",
  phBeyondLabel: "Phasing Beyond Label",
  prodTill: "Production Prior",
  prodFy: "Production Current",
  prodBeyond: "Production Beyond",
  capexTill: "Capex Prior",
  capexFy: "Capex Current",
  capexBeyond: "Capex Beyond",
  opexTill: "Opex Prior",
  opexFy: "Opex Current",
  opexBeyond: "Opex Beyond",
  engineeringCost: "Engineering Cost",
  surfaceFacilitiesCost: "Surface Facilities Cost",
  commissioningCost: "Commissioning Cost",
  preoperativeCost: "Preoperative Cost",
  otherCosts: "Other Costs",
  remarksJv: "JV Remarks",
  currentLevel: "Current Approval Level",
  pendingWithRole: "Pending With Role",
  pendingWithEmail: "Pending With Email",
  revisionCount: "Revision Count",

  // Legacy field name mappings for backward compatibility
  remarks: "General Remarks",
  remarks_jv: "JV Remarks",
  pr_name: "Proposal Name",
  cerprno: "CER Proposal ID",
  cer_proposal_id: "CER Proposal ID",
  proposal_no: "CER Proposal No",
  owname: "CER Owner",
  sbu: "SBU",
  status: "Status",
  object: "Proposal Object",
  amount: "Total Amount",
  currency: "Currency",
  cat: "Category",
  payable: "Payable By",
  payback_quarters: "Payback Quarters",
  period: "Benefit Period",
  ben_npv: "Benefit NPV",
  ben_irr: "Benefit IRR",
  cost_assumptions: "Cost Assumptions",
  st_date: "Start Date",
  com_date: "Completion Date",
  duration_months: "Duration Months",
  cbudget: "Current Budgeted?",
  cb_amnt: "Current Budget Amount",
  cb_currency: "Current Budget Currency",
  reason: "Unbudgeted Reason",
  jv: "Joint Venture?",
  jv_recoverable: "JV Recoverable?",
  jv_cost: "JV Partner Cost",
  jv_budget: "JV Budgeted?",
  jv_amnt: "JV Partner Amount",
  jv_reason: "JV Reason",
  prod_till: "Production Prior",
  prod_fy: "Production Current",
  prod_beyond: "Production Beyond",
  capex_till: "Capex Prior",
  capex_fy: "Capex Current",
  capex_beyond: "Capex Beyond",
  opex_till: "Opex Prior",
  opex_fy: "Opex Current",
  opex_beyond: "Opex Beyond",
  engineer: "Engineering Cost",
  s_fac: "Surface Facilities Cost",
  comis: "Commissioning Cost",
  preop: "Preoperative Cost",
  others: "Other Costs",
  total: "Total Item Cost",
};

/**
 * Technical metadata fields excluded from business change log
 */
export const EXCLUDED_AUDIT_FIELDS = new Set([
  "id",
  "request_date",
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
