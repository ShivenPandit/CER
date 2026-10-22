import { ICERProposal, SBU_OPTIONS } from "../models/CERModel";

export type FormErrors = Partial<Record<keyof ICERProposal | "phasing_mismatch" | "cost_mismatch", string>>;

/**
 * Validates a single field given the current form state.
 * Returns error string if invalid, or undefined if valid.
 */
export function validateField(
  field: keyof ICERProposal,
  value: any,
  formData: ICERProposal,
  isDraft: boolean = false
): string | undefined {
  // In Draft mode, only validate formats if value is provided; don't block empty required fields
  if (isDraft) {
    if (field === "pr_name" && value && String(value).trim().length > 200) {
      return "Name of Project must not exceed 200 characters.";
    }
    if (field === "owner_email" && value && String(value).trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value).trim())) return "Selected directory owner does not have a valid email address.";
    }
    if (field === "ben_irr" && value !== undefined && value !== null && value !== "") {
      const num = Number(value);
      if (num < 0 || num > 100) return "Financial Benefit – IRR (%) must be between 0% and 100%.";
    }
    if (field === "com_date" && value && formData.st_date) {
      if (new Date(value) < new Date(formData.st_date)) {
        return "Completion Date of Project must be on or after Start Date.";
      }
    }
    return undefined;
  }

  switch (field) {
    // -------------------------------------------------------------------------------------------
    // Section A — Project identification and scope
    // -------------------------------------------------------------------------------------------
    case "pr_name": {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "Name of Project is required.";
      if (trimmed.length < 3) return "Name of Project must be at least 3 characters.";
      if (trimmed.length > 200) return "Name of Project must not exceed 200 characters.";
      return undefined;
    }

    case "cerprno": {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "CER Proposal No. is required.";
      return undefined;
    }

    case "owname": {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "CER Owner Name is required. Please select a user from the directory.";
      return undefined;
    }

    case "owner_email": {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "Owner Email is required. Please select a valid user from the directory.";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return "Selected directory owner does not have a valid email address.";
      return undefined;
    }

    case "sbu": {
      if (!value || SBU_OPTIONS.indexOf(value) === -1) {
        return "Please select an approved Block/SBU/Field.";
      }
      return undefined;
    }

    case "st_date": {
      if (!value || !String(value).trim()) return "Start Date of Project is required.";
      const d = new Date(value);
      if (isNaN(d.getTime())) return "Start Date of Project must be a valid date.";
      return undefined;
    }

    case "com_date": {
      if (!value || !String(value).trim()) return "Completion Date of Project is required.";
      const d = new Date(value);
      if (isNaN(d.getTime())) return "Completion Date of Project must be a valid date.";
      if (formData.st_date) {
        const start = new Date(formData.st_date);
        if (d < start) return "Completion Date of Project must be on or after Start Date.";
      }
      return undefined;
    }

    case "object": {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "Objectives of CER is required.";
      if (trimmed.length < 10) return "Objectives of CER must be at least 10 characters.";
      if (trimmed.length > 2000) return "Objectives of CER must not exceed 2,000 characters.";
      return undefined;
    }

    case "cat": {
      if (!value || (value !== "Vital" && value !== "Essential" && value !== "Desirable")) {
        return "Category must be Vital, Essential, or Desirable.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // Section B — Financial benefits and payback
    // -------------------------------------------------------------------------------------------
    case "amount": {
      const num = Number(value);
      if (value === undefined || value === null || value === "" || isNaN(num) || num <= 0) {
        return "Amount of CER must be a positive numeric amount.";
      }
      return undefined;
    }

    case "payable": {
      if (!value || (value !== "Payback" && value !== "Non Payback" && value !== "Non-Payback")) {
        return "Please select Payback or Non Payback.";
      }
      return undefined;
    }

    case "payback_quarters": {
      const isPayback = formData.payable === "Payback";
      if (isPayback) {
        const num = Number(value);
        if (value === undefined || value === null || value === "" || isNaN(num) || num <= 0 || !Number.isInteger(num)) {
          return "Payback Period must be a positive whole number of quarters when Payback is selected.";
        }
      }
      return undefined;
    }

    case "ben_npv": {
      if (value !== undefined && value !== null && value !== "") {
        const num = Number(value);
        if (isNaN(num)) return "Financial Benefits – NPV ($mm) must be a valid number.";
      }
      return undefined;
    }

    case "ben_irr": {
      if (value !== undefined && value !== null && value !== "") {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 100) {
          return "Financial Benefit – IRR (%) must be a percentage between 0% and 100%.";
        }
      }
      return undefined;
    }

    case "cost_assumptions": {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "Key Assumptions to Financial Benefit/Costs is required.";
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // Section C — Corporate budget
    // -------------------------------------------------------------------------------------------
    case "cbudget": {
      if (!value || (value !== "Yes" && value !== "No" && value !== "Partially")) {
        return "Corporate Budget (Yes/No) selection is required.";
      }
      return undefined;
    }

    case "cb_amnt": {
      if (formData.cbudget === "Yes" || formData.cbudget === "Partially") {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return "Corporate Budget Amount ($mm) must be a non-negative amount.";
        }
      }
      return undefined;
    }

    case "reason": {
      const needsReason = formData.cbudget === "No" || formData.cbudget === "Partially";
      if (needsReason && !String(value || "").trim()) {
        return "Reason if not/partially budgeted is required when proposal is not fully budgeted.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // Section D — Joint venture details
    // -------------------------------------------------------------------------------------------
    case "jv": {
      if (!value || (value !== "Yes" && value !== "No" && value !== "Under Discussion")) {
        return "Aligned with JV (Yes/No/Under Discussion) selection is required.";
      }
      return undefined;
    }

    case "jv_recoverable": {
      if (!value || (value !== "Yes" && value !== "No")) {
        return "JV Cost Recoverable (Yes/No) selection is required.";
      }
      return undefined;
    }

    case "jv_budget": {
      if (!value || (value !== "Yes" && value !== "No")) {
        return "JV Budget (Yes/No) selection is required.";
      }
      return undefined;
    }

    case "jv_amnt": {
      if (formData.jv_budget === "Yes") {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return "JV Budget Amount ($mm) must be a non-negative amount.";
        }
      }
      return undefined;
    }

    case "jv_reason": {
      if (formData.jv_budget === "No" && !String(value || "").trim()) {
        return "Reason if not/partially budgeted is required when JV budget is not approved.";
      }
      return undefined;
    }

    case "remarks_jv": {
      const needsJvRisk = formData.jv === "Under Discussion" || formData.jv_budget === "No";
      if (needsJvRisk && !String(value || "").trim()) {
        return "Remarks on JV Risk (including risk carrying period) are required when JV alignment or budget is under discussion.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // Section G — Remarks and justification
    // -------------------------------------------------------------------------------------------
    case "remarks": {
      const trimmed = String(value || "").trim();
      if (!trimmed) {
        return "Remarks (including Justification for Non Payback expenditure, etc.) is required.";
      }
      const words = trimmed.split(/\s+/).filter(Boolean).length;
      if (words > 400) {
        return `Remarks exceed the 400-word limit (${words} words entered). Please condense your remarks.`;
      }
      if ((formData.payable === "Non Payback" || formData.payable === "Non-Payback") && words < 10) {
        return "Meaningful justification for non-payback expenditure is required (minimum 10 words).";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // Section E & F — Numerical sanity checks
    // -------------------------------------------------------------------------------------------
    case "prod_till":
    case "prod_fy":
    case "prod_beyond":
    case "capex_till":
    case "capex_fy":
    case "capex_beyond":
    case "opex_till":
    case "opex_fy":
    case "opex_beyond":
    case "engineer":
    case "s_fac":
    case "comis":
    case "preop":
    case "others": {
      const num = Number(value);
      if (value !== undefined && value !== null && value !== "" && (isNaN(num) || num < 0)) {
        return "Value must be a non-negative number.";
      }
      return undefined;
    }

    default:
      return undefined;
  }
}

/**
 * Validates the full form data object for submission or draft save.
 */
export function validateAll(formData: ICERProposal, isDraft: boolean = false): {
  errors: FormErrors;
  isValid: boolean;
  firstErrorField?: keyof ICERProposal | "phasing_mismatch" | "cost_mismatch";
} {
  const errors: FormErrors = {};

  const fieldsToCheck: (keyof ICERProposal)[] = [
    "pr_name",
    "cerprno",
    "owname",
    "owner_email",
    "sbu",
    "st_date",
    "com_date",
    "object",
    "cat",
    "amount",
    "payable",
    "payback_quarters",
    "ben_npv",
    "ben_irr",
    "cost_assumptions",
    "cbudget",
    "cb_amnt",
    "reason",
    "jv",
    "jv_recoverable",
    "jv_budget",
    "jv_amnt",
    "jv_reason",
    "prod_till",
    "prod_fy",
    "prod_beyond",
    "capex_till",
    "capex_fy",
    "capex_beyond",
    "opex_till",
    "opex_fy",
    "opex_beyond",
    "engineer",
    "s_fac",
    "comis",
    "preop",
    "others",
    "remarks",
    "remarks_jv"
  ];

  for (const field of fieldsToCheck) {
    const err = validateField(field, formData[field], formData, isDraft);
    if (err) {
      errors[field] = err;
    }
  }

  // Cross-field checks (Advisory flags for expenditure consistency)
  if (!isDraft && formData.amount > 0) {
    const totalPhasedCapex = (formData.capex_till || 0) + (formData.capex_fy || 0) + (formData.capex_beyond || 0);
    if (Math.abs(totalPhasedCapex - formData.amount) > 0.01 && totalPhasedCapex > 0) {
      errors.phasing_mismatch = `Phased Capex total ($${totalPhasedCapex.toLocaleString()} mm) differs from CER Amount ($${formData.amount.toLocaleString()} mm).`;
    }

    const totalCostEstimates =
      (formData.engineer || 0) +
      (formData.s_fac || 0) +
      (formData.comis || 0) +
      (formData.preop || 0) +
      (formData.others || 0);
    if (Math.abs(totalCostEstimates - formData.amount) > 0.01 && totalCostEstimates > 0) {
      errors.cost_mismatch = `Total Cost Estimates ($${totalCostEstimates.toLocaleString()} mm) differs from CER Amount ($${formData.amount.toLocaleString()} mm).`;
    }
  }

  const errorKeys = Object.keys(errors) as (keyof ICERProposal | "phasing_mismatch" | "cost_mismatch")[];
  const isValid = errorKeys.length === 0;
  const firstErrorField = errorKeys[0];

  return { errors, isValid, firstErrorField };
}
