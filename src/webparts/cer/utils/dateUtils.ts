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

/**
 * Formats an ISO timestamp or date/time string to the user's local 24-hour time (HH:mm:ss).
 * If the string is in UTC format (e.g. ISO string ending in Z or from SharePoint), it converts
 * it accurately to the user's browser local timezone.
 */
export function formatLocalTime(timestampOrTime?: string | Date): string {
  if (!timestampOrTime) return "";
  let d: Date;
  if (timestampOrTime instanceof Date) {
    d = timestampOrTime;
  } else {
    let str = String(timestampOrTime).trim();
    if (!str) return "";
    // If it's already an explicit HH:mm:ss without date or timezone info, return it
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
      return str;
    }
    // If it's an ISO date without timezone indicator Z, treat as UTC
    if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
      str = str + "Z";
    }
    d = new Date(str);
  }
  if (isNaN(d.getTime())) return String(timestampOrTime);
  const pad2 = (n: number | string): string => ("0" + n).slice(-2);

  const hours = pad2(d.getHours());
  const minutes = pad2(d.getMinutes());
  const seconds = pad2(d.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Formats an ISO timestamp or date string to local calendar date (YYYY-MM-DD).
 * Converts UTC ISO dates to the user's browser local calendar date.
 */
export function formatLocalDate(timestampOrDate?: string | Date): string {
  if (!timestampOrDate) return "";
  let d: Date;
  if (timestampOrDate instanceof Date) {
    d = timestampOrDate;
  } else {
    let str = String(timestampOrDate).trim();
    if (!str) return "";
    // If it's already just YYYY-MM-DD without time or timezone info, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
      str = str + "Z";
    }
    d = new Date(str);
  }
  if (isNaN(d.getTime())) return String(timestampOrDate);
  const pad2 = (n: number | string): string => ("0" + n).slice(-2);
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Returns current local date (YYYY-MM-DD) and local time (HH:mm:ss) from a Date instance (defaults to now).
 */
export function getLocalComponents(date: Date = new Date()): { localDate: string; localTime: string; isoString: string } {
  const pad2 = (n: number | string): string => ("0" + n).slice(-2);
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return {
    localDate: `${year}-${month}-${day}`,
    localTime: `${hours}:${minutes}:${seconds}`,
    isoString: date.toISOString(),
  };
}

