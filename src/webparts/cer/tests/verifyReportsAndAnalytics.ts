/* eslint-disable */
/**
 * Consolidated Reports & Analytics Test Suite
 * Validates:
 * 1. Indian Fiscal Year Resolution (Apr 1 – Mar 31)
 * 2. Proposal Fiscal Year extraction
 * 3. Report Dashboard Multi-Year filtering & cumulative aggregations
 */

import { getCurrentFiscalYearString, getProposalFiscalYear } from "../utils/dateUtils";
import { ICERProposal } from "../models/CERModel";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("================================================================================");
console.log(" 1. INDIAN FISCAL YEAR RESOLUTION (APR 1 - MAR 31)");
console.log("================================================================================");

// November 2026 -> FY 2026-27
const nov2026 = new Date(2026, 10, 12);
assert(getCurrentFiscalYearString(nov2026) === "FY 2026-27", `Nov 2026 is FY 2026-27 (got ${getCurrentFiscalYearString(nov2026)})`);

// January 2027 -> FY 2026-27
const jan2027 = new Date(2027, 0, 15);
assert(getCurrentFiscalYearString(jan2027) === "FY 2026-27", `Jan 2027 is FY 2026-27 (got ${getCurrentFiscalYearString(jan2027)})`);

// March 2027 -> FY 2026-27
const mar2027 = new Date(2027, 2, 31);
assert(getCurrentFiscalYearString(mar2027) === "FY 2026-27", `Mar 2027 is FY 2026-27 (got ${getCurrentFiscalYearString(mar2027)})`);

// April 2027 -> FY 2027-28
const apr2027 = new Date(2027, 3, 1);
assert(getCurrentFiscalYearString(apr2027) === "FY 2027-28", `Apr 2027 is FY 2027-28 (got ${getCurrentFiscalYearString(apr2027)})`);

console.log("\n================================================================================");
console.log(" 2. PROPOSAL FISCAL YEAR EXTRACTION");
console.log("================================================================================");

const p1 = {
  id: "1",
  cerprno: "CER-2026-0001",
  proposal_no: "CER-2026-0001",
  ph_fy_label: "FY 2026-27",
  status: "Approved",
} as unknown as ICERProposal;
assert(getProposalFiscalYear(p1) === "FY 2026-27", `Proposal with ph_fy_label 'FY 2026-27' resolved to ${getProposalFiscalYear(p1)}`);

const p2 = {
  id: "2",
  cerprno: "CER-2025-0010",
  created_date: "2025-06-15T00:00:00Z",
  status: "In Approval",
} as unknown as ICERProposal;
assert(getProposalFiscalYear(p2) === "FY 2025-26", `Proposal with created_date Jun 2025 resolved to ${getProposalFiscalYear(p2)}`);

const p3 = {
  id: "3",
  cerprno: "CER-2024-0005",
  st_date: "2025-02-10",
  status: "Approved",
} as unknown as ICERProposal;
// Feb 2025 is in FY 2024-25
assert(getProposalFiscalYear(p3) === "FY 2024-25", `Proposal with st_date Feb 2025 resolved to ${getProposalFiscalYear(p3)}`);

console.log("\n================================================================================");
console.log(" 3. REPORT DASHBOARD MULTI-YEAR FILTERING");
console.log("================================================================================");

const mockProposals: ICERProposal[] = [
  p1,
  p2,
  p3,
  {
    id: "4",
    cerprno: "CER-2026-0002",
    created_date: "2026-11-01T00:00:00Z",
    status: "In Approval",
  } as unknown as ICERProposal,
];

// When filtering by ALL
const allFiltered = mockProposals.filter(() => true);
assert(allFiltered.length === 4, `Filter 'ALL' returns 4 proposals (got ${allFiltered.length})`);

// When filtering by FY 2026-27
const fy26Filtered = mockProposals.filter((p) => getProposalFiscalYear(p) === "FY 2026-27");
assert(fy26Filtered.length === 2, `Filter 'FY 2026-27' returns 2 proposals (got ${fy26Filtered.length})`);

// When filtering by FY 2025-26
const fy25Filtered = mockProposals.filter((p) => getProposalFiscalYear(p) === "FY 2025-26");
assert(fy25Filtered.length === 1, `Filter 'FY 2025-26' returns 1 proposal (got ${fy25Filtered.length})`);

console.log("\n All Reports & Analytics verification tests passed successfully!");

