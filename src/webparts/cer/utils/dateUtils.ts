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
