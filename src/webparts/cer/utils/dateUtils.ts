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
 * Returns the current Indian Fiscal Year string (e.g. "FY 2026-27").
 */
export function getCurrentFiscalYearString(referenceDate: Date = new Date()): string {
  const month = referenceDate.getMonth(); // 0 = Jan, 3 = Apr
  const fullYear = referenceDate.getFullYear();
  const fyStartYear = month >= 3 ? fullYear : fullYear - 1;
  const endYear2Digit = ("0" + ((fyStartYear + 1) % 100)).slice(-2);
  return `FY ${fyStartYear}-${endYear2Digit}`;
}

/**
 * Computes the Indian Fiscal Year (e.g. "FY 2026-27") for a CER proposal based on its
 * created date, start date, ph_fy_label, or proposal number.
 */
export function getProposalFiscalYear(proposal: {
  created_date?: string;
  st_date?: string;
  ph_fy_label?: string;
  proposal_no?: string;
  cerprno?: string;
}): string {
  // Priority 1: ph_fy_label (e.g. "FY 26-27" -> "FY 2026-27")
  if (proposal.ph_fy_label) {
    const m = proposal.ph_fy_label.match(/FY\s*(\d{2,4})[-/](\d{2,4})/i);
    if (m) {
      let start = parseInt(m[1], 10);
      let end = parseInt(m[2], 10);
      if (start < 100) start += 2000;
      if (end < 100) end += 2000;
      const end2Digit = ("0" + (end % 100)).slice(-2);
      return `FY ${start}-${end2Digit}`;
    }
  }

  // Priority 2: created_date or st_date
  const rawDate = proposal.created_date || proposal.st_date;
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return getCurrentFiscalYearString(d);
    }
  }

  // Priority 3: 4-digit year from proposal_no or cerprno (e.g. CER-2026-0001)
  const noStr = proposal.proposal_no || proposal.cerprno || "";
  const yearMatch = noStr.match(/20\d{2}/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0], 10);
    const end2Digit = ("0" + ((year + 1) % 100)).slice(-2);
    return `FY ${year}-${end2Digit}`;
  }

  // Fallback to Current Fiscal Year
  return getCurrentFiscalYearString();
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

/**
 * Formats a date string or Date object for Excel display as DD-MMM-YYYY (e.g. 03-Nov-2026).
 */
export function formatExcelDate(dateVal?: string | Date): string {
  if (!dateVal) return "";
  let d: Date;
  if (dateVal instanceof Date) {
    d = dateVal;
  } else {
    const str = String(dateVal).trim();
    if (!str) return "";
    // If format is DD-MM-YYYY (e.g. 02-11-2026)
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const [day, m, y] = str.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mIdx = parseInt(m, 10) - 1;
      return `${day}-${months[mIdx] || m}-${y}`;
    }
    // If format is YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, day] = str.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mIdx = parseInt(m, 10) - 1;
      return `${day}-${months[mIdx] || m}-${y}`;
    }
    let parseStr = str;
    if (parseStr.includes("T") && !parseStr.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(parseStr)) {
      parseStr = parseStr + "Z";
    }
    d = new Date(parseStr);
  }
  if (isNaN(d.getTime())) return String(dateVal);
  const pad2 = (n: number | string): string => ("0" + n).slice(-2);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = pad2(d.getDate());
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Formats a date/timestamp string or Date object for Excel display in local user timezone as DD-MMM-YYYY HH:mm:ss.
 * (e.g. 03-Nov-2026 09:53:43). Converts UTC timestamps (like SharePoint's Created/Modified) accurately
 * to the user's local browser timezone.
 */
export function formatExcelDateTime(timestampOrDate?: string | Date): string {
  if (!timestampOrDate) return "";
  let d: Date;
  if (timestampOrDate instanceof Date) {
    d = timestampOrDate;
  } else {
    let str = String(timestampOrDate).trim();
    if (!str) return "";
    // If date-only string without time
    if (!str.includes("T") && !str.includes(":") && !str.includes(" ")) {
      return formatExcelDate(str);
    }
    if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
      str = str + "Z";
    }
    d = new Date(str);
  }
  if (isNaN(d.getTime())) return String(timestampOrDate);
  const pad2 = (n: number | string): string => ("0" + n).slice(-2);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = pad2(d.getDate());
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = pad2(d.getHours());
  const minutes = pad2(d.getMinutes());
  const seconds = pad2(d.getSeconds());
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

