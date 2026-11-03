import { ICERProposal } from "../models/CERModel";
import { containsMaliciousScript } from "./sanitizationUtils";

export type FormErrors = Partial<Record<keyof ICERProposal | "phasing_mismatch" | "cost_mismatch", string>>;

/**
 * Checks whether the user has entered any values in Section D (CAPEX Breakdown).
 * Fields: engineer, s_fac, comis, preop, others.
 * Returns true if at least one field has been populated with a non-zero value or non-empty string.
 */
export function hasEnteredCostBreakdown(formData: Partial<ICERProposal>): boolean {
  if (!formData) return false;
  const fields: (keyof ICERProposal)[] = ["engineer", "s_fac", "comis", "preop", "others"];
  const hasFieldEntry = fields.some((f) => {
    const val = formData[f];
    return val !== undefined && val !== null && val !== "" && Number(val) !== 0;
  });
  if (hasFieldEntry) return true;
  const engineer = Number(formData.engineer || 0);
  const s_fac = Number(formData.s_fac || 0);
  const comis = Number(formData.comis || 0);
  const preop = Number(formData.preop || 0);
  const others = Number(formData.others || 0);
  return (engineer + s_fac + comis + preop + others) > 0;
}

/**
 * Formats difference between Total CAPEX and Amount of CER with sign (+ or -) and currency.
 */
export function formatCapexDifference(diff: number, currency?: string): string {
  const isINR = currency === "INR";
  const currSymbol = isINR ? "₹" : "$";
  const currUnit = isINR ? "" : " mm";
  const sign = diff > 0 ? "+" : "-";
  return `${sign}${currSymbol}${Math.abs(diff).toLocaleString()}${currUnit}`;
}

// Exactly the 14 mandatory fields mandated by client requirements
export const MANDATORY_CER_FIELDS: (keyof ICERProposal)[] = [
  "pr_name",           // 1. Name of the Project
  "proposal_no",       // 2. CER Proposal No (User-entered business reference)
  "owname",            // 3. CER Owner Name (and owner_email)
  "st_date",           // 4. Start Date of the Project
  "sbu",               // 5. Block/SBU (CBOS, RAVA, RJ North, RJ South)
  "object",            // 6. Objective of CER
  "amount",            // 7. Amount of CER
  "cat",               // 8. Category (Essential, Vital, Desirable)
  "payable",           // 9. Payback/Non Payback
  "payback_quarters",  // 10. Payback Period (number of quarters)
  "cbudget",           // 11. Corporate Budget (Yes, No)
  "jv",                // 12. Align with JV (Yes, No, Under Discussion)
  "jv_recoverable",    // 13. JV Cost Recoverable (Yes, No)
  "jv_budget",         // 14. JV Budget (Yes, No)
];

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
  // In Draft mode: Name of Project and CER Owner Name/Email are required to save draft.
  // All other fields remain optional (format validated only if provided).
  if (isDraft) {
    if (field === "pr_name") {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "Name of the Project is required to save a draft.";
      if (trimmed.length < 3) return "Name of the Project must be at least 3 characters.";
      if (trimmed.length > 100) return "Name of the Project cannot exceed 100 characters.";
      if (
        containsMaliciousScript(trimmed) ||
        /<\s*\/?\s*(script|iframe|object|embed|style|html|body|svg)\b/i.test(trimmed) ||
        /<\s*[a-zA-Z][^>]*>/i.test(trimmed)
      ) {
        return "HTML tags and code snippets are not allowed in Project Name.";
      }
      const validCharsRegex = /^[a-zA-Z0-9\s\-_().,:<>=+%]+$/;
      if (!validCharsRegex.test(trimmed)) {
        return "Only letters, numbers, spaces, hyphens (-), underscores (_), parentheses (), and symbols (<, >, =) are allowed.";
      }
      return undefined;
    }
    if (field === "owname") {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "CER Owner Name is required to save a draft. Please select a user from the directory.";
      return undefined;
    }
    if (field === "owner_email") {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "Owner Email is required to save a draft. Please select a valid user from the directory.";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return "Selected directory owner does not have a valid email address.";
      return undefined;
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
    if (value && typeof value === "string" && containsMaliciousScript(value)) {
      return "Field contains disallowed HTML or script tags.";
    }
    return undefined;
  }

  switch (field) {
    // -------------------------------------------------------------------------------------------
    // 1. Name of the Project (Required text field, 3-100 characters, alphanumeric, spaces, -, _, (), <, >, =, etc.)
    // -------------------------------------------------------------------------------------------
    case "pr_name": {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "Name of the Project is required.";
      if (trimmed.length < 3) return "Name of the Project must be at least 3 characters.";
      if (trimmed.length > 100) return "Name of the Project cannot exceed 100 characters.";
      if (
        containsMaliciousScript(trimmed) ||
        /<\s*\/?\s*(script|iframe|object|embed|style|html|body|svg)\b/i.test(trimmed) ||
        /<\s*[a-zA-Z][^>]*>/i.test(trimmed)
      ) {
        return "HTML tags and code snippets are not allowed in Project Name.";
      }
      const validCharsRegex = /^[a-zA-Z0-9\s\-_().,:<>=+%]+$/;
      if (!validCharsRegex.test(trimmed)) {
        return "Only letters, numbers, spaces, hyphens (-), underscores (_), parentheses (), and symbols (<, >, =) are allowed.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 2. CER Proposal No (Required user-entered business reference)
    // -------------------------------------------------------------------------------------------
    case "proposal_no": {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "CER Proposal No is required.";
      if (trimmed.length > 50) return "CER Proposal No must not exceed 50 characters.";
      const validCharsRegex = /^[a-zA-Z0-9\-_/ ]+$/;
      if (!validCharsRegex.test(trimmed)) {
        return "CER Proposal No must contain only alphanumeric characters, hyphens, slashes, or underscores.";
      }
      return undefined;
    }

    case "cerprno": {
      const trimmed = String(value || "").trim();
      // If proposal_no is provided, cerprno will be assigned as the permanent CER Proposal ID
      if (!trimmed && !formData.proposal_no) return "CER Proposal No is required.";
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 3. CER Owner Name & Directory Email (Required)
    // -------------------------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------------------------
    // 4. Start Date of the Project (Required date field)
    // -------------------------------------------------------------------------------------------
    case "st_date": {
      if (!value || !String(value).trim()) return "Start Date of the Project is required.";
      const d = new Date(value);
      if (isNaN(d.getTime())) return "Start Date of the Project must be a valid date.";
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 5. Block/SBU (Required dropdown with exactly: CBOS, RAVA, RJ North, RJ South)
    // -------------------------------------------------------------------------------------------
    case "sbu": {
      const allowedSbus = ["CBOS", "RAVA", "RJ North", "RJ South"];
      if (!value || allowedSbus.indexOf(value) === -1) {
        return "Block/SBU is required. Please select CBOS, RAVA, RJ North, or RJ South.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 6. Objective of CER (Required field, max 2,000 characters)
    // -------------------------------------------------------------------------------------------
    case "object": {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "Objective of CER is required.";
      if (trimmed.length > 2000) return "Objective of CER must not exceed 2,000 characters.";
      if (containsMaliciousScript(trimmed)) {
        return "Objective of CER contains disallowed HTML or script tags. Please remove any code snippets.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 7. Amount of CER (Required numeric/currency field with appropriate validation)
    // -------------------------------------------------------------------------------------------
    case "amount": {
      const num = Number(value);
      if (value === undefined || value === null || value === "" || isNaN(num) || num <= 0) {
        return "Capex ($mm) is mandatory. Please enter Capex phasing in Section C to set the Amount of CER.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 8. Category (Required dropdown with exactly: Essential, Vital, Desirable)
    // -------------------------------------------------------------------------------------------
    case "cat": {
      const allowedCategories = ["Essential", "Vital", "Desirable"];
      if (!value || allowedCategories.indexOf(value) === -1) {
        return "Category is required. Please select Essential, Vital, or Desirable.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 9. Payback/Non Payback (Required dropdown with exactly: Payback, Non Payback)
    // -------------------------------------------------------------------------------------------
    case "payable": {
      if (!value || (value !== "Payback" && value !== "Non Payback")) {
        return "Payback/Non Payback is required. Please select Payback or Non Payback.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 10. Payback Period (Required numeric field representing the number of quarters)
    // -------------------------------------------------------------------------------------------
    case "payback_quarters": {
      const num = Number(value);
      if (value === undefined || value === null || value === "" || isNaN(num) || num <= 0 || !Number.isInteger(num)) {
        return "Payback Period is required and must be a positive whole number of quarters (e.g., 4).";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 11. Corporate Budget (Required dropdown with exactly: Yes, No)
    // -------------------------------------------------------------------------------------------
    case "cbudget": {
      if (!value || (value !== "Yes" && value !== "No")) {
        return "Corporate Budget is required. Please select Yes or No.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 12. Align with JV (Required dropdown with exactly: Yes, No, Under Discussion)
    // -------------------------------------------------------------------------------------------
    case "jv": {
      const allowedJv = ["Yes", "No", "Under Discussion"];
      if (!value || allowedJv.indexOf(value) === -1) {
        return "Align with JV is required. Please select Yes, No, or Under Discussion.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 13. JV Cost Recoverable (Required dropdown with exactly: Yes, No)
    // -------------------------------------------------------------------------------------------
    case "jv_recoverable": {
      if (!value || (value !== "Yes" && value !== "No")) {
        return "JV Cost Recoverable is required. Please select Yes or No.";
      }
      return undefined;
    }

    // -------------------------------------------------------------------------------------------
    // 14. JV Budget (Required dropdown with exactly: Yes, No)
    // -------------------------------------------------------------------------------------------
    case "jv_budget": {
      if (!value || (value !== "Yes" && value !== "No")) {
        return "JV Budget is required. Please select Yes or No.";
      }
      return undefined;
    }

    // ===========================================================================================
    // ALL OTHER FIELDS ARE OPTIONAL
    // Format validation is applied only if the user chooses to provide a value.
    // ===========================================================================================

    case "com_date": {
      if (value && String(value).trim()) {
        const d = new Date(value);
        if (isNaN(d.getTime())) return "Completion Date of Project must be a valid date.";
        if (formData.st_date) {
          const start = new Date(formData.st_date);
          if (d < start) return "Completion Date of Project must be on or after Start Date.";
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
      if (value && typeof value === "string" && containsMaliciousScript(value)) {
        return "Key Assumptions contain disallowed HTML or script tags. Please remove any code snippets.";
      }
      return undefined;
    }

    case "cb_amnt": {
      if (value !== undefined && value !== null && value !== "") {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return "Corporate Budget Amount ($mm) must be a non-negative amount.";
        }
      }
      return undefined;
    }

    case "reason": {
      if (value && typeof value === "string" && containsMaliciousScript(value)) {
        return "Reason contains disallowed HTML or script tags. Please remove any code snippets.";
      }
      return undefined;
    }

    case "jv_cost":
    case "jv_amnt": {
      if (value !== undefined && value !== null && value !== "") {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return "JV Amount must be a non-negative amount.";
        }
      }
      return undefined;
    }

    case "jv_reason":
    case "remarks_jv": {
      if (value && typeof value === "string" && containsMaliciousScript(value)) {
        return "JV remarks contain disallowed HTML or script tags. Please remove any code snippets.";
      }
      return undefined;
    }

    case "remarks": {
      if (value) {
        const trimmed = String(value).trim();
        if (containsMaliciousScript(trimmed)) {
          return "Remarks contain disallowed HTML or script tags. Please remove any code snippets.";
        }
        const words = trimmed.split(/\s+/).filter(Boolean).length;
        if (words > 400) {
          return `Remarks exceed the 400-word limit (${words} words entered). Please condense your remarks.`;
        }
      }
      return undefined;
    }

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
      if (value !== undefined && value !== null && value !== "") {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return "Value must be a non-negative number.";
        }
      }
      return undefined;
    }

    case "total": {
      if (hasEnteredCostBreakdown(formData)) {
        const cerAmount = Number(formData.amount || 0);
        const engineer = Number(formData.engineer || 0);
        const s_fac = Number(formData.s_fac || 0);
        const comis = Number(formData.comis || 0);
        const preop = Number(formData.preop || 0);
        const others = Number(formData.others || 0);
        const computedTotal = engineer + s_fac + comis + preop + others;
        if (Math.abs(computedTotal - cerAmount) > 0.01) {
          const diff = computedTotal - cerAmount;
          const isINR = formData.currency === "INR";
          const currSymbol = isINR ? "₹" : "$";
          const currUnit = isINR ? "" : " mm";
          const diffFormatted = `${diff > 0 ? "+" : "-"}${currSymbol}${Math.abs(diff).toLocaleString()}${currUnit}`;
          const totalFormatted = `${currSymbol}${computedTotal.toLocaleString()}${currUnit}`;
          const cerAmountFormatted = `${currSymbol}${cerAmount.toLocaleString()}${currUnit}`;
          return `Total CAPEX (${totalFormatted}) must equal Amount of CER (${cerAmountFormatted}). Difference: ${diffFormatted}`;
        }
      }
      return undefined;
    }

    default:
      return undefined;
  }
}

/**
 * Validates the full form data object for submission or draft save.
 * Enforces that ONLY the 14 mandatory fields are required on submission.
 * All other form fields are strictly optional.
 */
export function validateAll(formData: ICERProposal, isDraft: boolean = false): {
  errors: FormErrors;
  isValid: boolean;
  firstErrorField?: keyof ICERProposal | "phasing_mismatch" | "cost_mismatch";
} {
  const errors: FormErrors = {};

  if (isDraft) {
    // In Draft mode, only validate formats of provided values
    const allFields: (keyof ICERProposal)[] = [
      "pr_name", "proposal_no", "cerprno", "owname", "owner_email", "st_date", "com_date",
      "sbu", "object", "cat", "amount", "payable", "payback_quarters",
      "ben_npv", "ben_irr", "cbudget", "cb_amnt", "reason",
      "jv", "jv_recoverable", "jv_budget", "jv_amnt", "jv_reason",
      "remarks", "remarks_jv"
    ];
    for (const field of allFields) {
      const err = validateField(field, formData[field], formData, true);
      if (err) errors[field] = err;
    }
  } else {
    // For submission:
    // 1. Enforce the exactly 14 mandatory fields
    const mandatoryFields: (keyof ICERProposal)[] = [
      "pr_name",           // 1. Name of the Project
      "proposal_no",       // 2. CER Proposal No
      "owname",            // 3. CER Owner Name
      "owner_email",       // 3b. CER Owner Email
      "st_date",           // 4. Start Date of the Project
      "sbu",               // 5. Block/SBU
      "object",            // 6. Objective of CER
      "amount",            // 7. Amount of CER
      "cat",               // 8. Category
      "payable",           // 9. Payback/Non Payback
      "payback_quarters",  // 10. Payback Period
      "cbudget",           // 11. Corporate Budget
      "jv",                // 12. Align with JV
      "jv_recoverable",    // 13. JV Cost Recoverable
      "jv_budget",         // 14. JV Budget
    ];

    for (const field of mandatoryFields) {
      // Compatibility: if field is proposal_no but proposal_no is empty and cerprno is present, accept cerprno
      const val = field === "proposal_no" ? (formData.proposal_no || formData.cerprno) : formData[field];
      const err = validateField(field, val, formData, false);
      if (err) {
        errors[field] = err;
      }
    }

    // 2. Validate optional fields ONLY if the user entered a non-empty value
    const optionalFieldsWithFormatValidation: (keyof ICERProposal)[] = [
      "com_date", "ben_npv", "ben_irr", "cb_amnt", "jv_cost", "jv_amnt",
      "remarks", "prod_till", "prod_fy", "prod_beyond", "capex_till",
      "capex_fy", "capex_beyond", "opex_till", "opex_fy", "opex_beyond",
      "engineer", "s_fac", "comis", "preop", "others"
    ];

    for (const field of optionalFieldsWithFormatValidation) {
      const val = formData[field];
      if (val !== undefined && val !== null && val !== "") {
        const err = validateField(field, val, formData, false);
        if (err) {
          errors[field] = err;
        }
      }
    }

    // 3. Section D — CAPEX Breakdown validation
    // Total Capex = Amount of CER. Only validate when user has entered values in Section D fields.
    if (hasEnteredCostBreakdown(formData)) {
      const cerAmount = Number(formData.amount || 0);
      const engineer = Number(formData.engineer || 0);
      const s_fac = Number(formData.s_fac || 0);
      const comis = Number(formData.comis || 0);
      const preop = Number(formData.preop || 0);
      const others = Number(formData.others || 0);
      const computedTotal = engineer + s_fac + comis + preop + others;

      if (Math.abs(computedTotal - cerAmount) > 0.01) {
        const diff = computedTotal - cerAmount;
        const isINR = formData.currency === "INR";
        const currSymbol = isINR ? "₹" : "$";
        const currUnit = isINR ? "" : " mm";
        const diffFormatted = `${diff > 0 ? "+" : "-"}${currSymbol}${Math.abs(diff).toLocaleString()}${currUnit}`;
        const totalFormatted = `${currSymbol}${computedTotal.toLocaleString()}${currUnit}`;
        const cerAmountFormatted = `${currSymbol}${cerAmount.toLocaleString()}${currUnit}`;

        const diffMsg = `Total CAPEX (${totalFormatted}) must equal Amount of CER (${cerAmountFormatted}). Difference: ${diffFormatted}`;
        errors.total = diffMsg;
        errors.cost_mismatch = diffMsg;
      }
    }
  }

  const errorKeys = Object.keys(errors) as (keyof ICERProposal | "phasing_mismatch" | "cost_mismatch")[];
  const isValid = errorKeys.length === 0;
  const firstErrorField = errorKeys[0];

  return { errors, isValid, firstErrorField };
}
