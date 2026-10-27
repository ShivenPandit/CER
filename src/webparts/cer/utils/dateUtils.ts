/**
 * Date utility helpers for CER Proposal duration calculation and formatting.
 */

/**
 * Calculates the exact calendar day difference between start and completion dates.
 * Uses UTC dates to avoid any daylight savings or timezone shift quirks.
 */
export function calculateExactDays(startDateStr?: string, endDateStr?: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const sParts = startDateStr.split("-").map(Number);
  const eParts = endDateStr.split("-").map(Number);
  if (sParts.length !== 3 || eParts.length !== 3) return 0;
  const [sy, sm, sd] = sParts;
  const [ey, em, ed] = eParts;
  if (!sy || !sm || !sd || !ey || !em || !ed) return 0;

  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  const diffMs = endUtc - startUtc;
  if (diffMs < 0) return 0;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates duration in months from exact days.
 */
export function calculateMonthsFromDays(days: number): number {
  if (days <= 0) return 0;
  const rawMonths = days / 30.4375;
  if (rawMonths < 1) {
    return Math.round(rawMonths * 10) / 10;
  }
  return Math.round(rawMonths);
}

/**
 * Formats duration string based on days and selected unit.
 * Default unit is 'days', displaying strictly exact days (e.g. '8 Days' or '1 Day').
 */
export function formatDuration(days: number, unit: "days" | "months" = "days"): string {
  if (days <= 0) return "0 Days";
  if (unit === "months") {
    const months = calculateMonthsFromDays(days);
    return `${months} ${months === 1 ? "Month" : "Months"}`;
  }
  return `${days} ${days === 1 ? "Day" : "Days"}`;
}

/**
 * Phasing period column labels based on Indian Fiscal Year (Apr 1 - Mar 31).
 */
export interface IPhasingPeriodLabels {
  ph_till_label: string;
  ph_fy_label: string;
  ph_beyond_label: string;
}

/**
 * Calculates dynamic expenditure phasing column labels based on the Indian Fiscal Year (Apr 1 - Mar 31).
 *
 * Rules:
 * - If current month is before April (Jan, Feb, Mar): The current fiscal year began on April 1 of (currentYear - 1).
 * - If current month is April or later (Apr - Dec): The current fiscal year began on April 1 of currentYear.
 *
 * Examples:
 * - In October 2026:
 *   - ph_till_label: "Till Mar'26"
 *   - ph_fy_label: "FY 26-27"
 *   - ph_beyond_label: "Beyond FY'27"
 * - In April 2027:
 *   - ph_till_label: "Till Mar'27"
 *   - ph_fy_label: "FY 27-28"
 *   - ph_beyond_label: "Beyond FY'28"
 */
export function getCurrentFiscalYearPhasingLabels(referenceDate: Date = new Date()): IPhasingPeriodLabels {
  const month = referenceDate.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr, 11 = Dec
  const fullYear = referenceDate.getFullYear();

  // If before April, the fiscal year started April 1st of the previous calendar year
  const fyStartYear = month >= 3 ? fullYear : fullYear - 1;
  const fyEndYear = fyStartYear + 1;

  const startYear2Digit = ("0" + (fyStartYear % 100)).slice(-2);
  const endYear2Digit = ("0" + (fyEndYear % 100)).slice(-2);

  return {
    ph_till_label: `Till Mar'${startYear2Digit}`,
    ph_fy_label: `FY ${startYear2Digit}-${endYear2Digit}`,
    ph_beyond_label: `Beyond FY'${endYear2Digit}`,
  };
}
