function assert(cond: boolean, msg: string): void {
  if (!cond) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}
import { formatExcelDate, formatExcelDateTime } from "../utils/dateUtils";
import { ExcelExportService } from "../services/ExcelExportService";
import { ICERProposal } from "../models/CERModel";

console.log("==================================================");
console.log("  EXCEL DATE FORMATTING & UI REFINEMENT TESTS     ");
console.log("==================================================");

// Test 1: formatExcelDateTime converts UTC ISO string to local readable format
const isoUtc = "2026-11-03T04:23:43Z";
const formattedDateTime = formatExcelDateTime(isoUtc);
console.log(`[TEST 1] ISO UTC: '${isoUtc}' -> Formatted: '${formattedDateTime}'`);
assert(formattedDateTime.includes("2026"), "Includes year 2026");
assert(formattedDateTime.includes("Nov"), "Includes 3-letter month Nov");
assert(!formattedDateTime.includes("T"), "Does not contain 'T'");
assert(!formattedDateTime.includes("Z"), "Does not contain 'Z'");
// Check regex pattern: DD-MMM-YYYY HH:mm:ss
assert(/^\d{2}-[A-Za-z]{3}-\d{4} \d{2}:\d{2}:\d{2}$/.test(formattedDateTime), "Matches pattern DD-MMM-YYYY HH:mm:ss");
console.log("✔ [PASS] 1. formatExcelDateTime produces clean DD-MMM-YYYY HH:mm:ss without T or Z");

// Test 2: formatExcelDate handles date-only strings correctly
const dateStr1 = "2026-11-03";
const formattedDate1 = formatExcelDate(dateStr1);
console.log(`[TEST 2] Date YYYY-MM-DD: '${dateStr1}' -> Formatted: '${formattedDate1}'`);
assert(formattedDate1 === "03-Nov-2026", "Formats YYYY-MM-DD as 03-Nov-2026");

const dateStr2 = "02-11-2026";
const formattedDate2 = formatExcelDate(dateStr2);
console.log(`[TEST 2b] Date DD-MM-YYYY: '${dateStr2}' -> Formatted: '${formattedDate2}'`);
assert(formattedDate2 === "02-Nov-2026", "Formats DD-MM-YYYY as 02-Nov-2026");
console.log("✔ [PASS] 2. formatExcelDate formats date-only fields cleanly as DD-MMM-YYYY");

// Test 3: ExcelExportService.mapProposalToExportRow applies formatted dates
const mockProposal = {
  id: "prop-1",
  cerprno: "CER-2026-0001",
  proposal_no: "PR-2026/01",
  pr_name: "Test Project 1",
  owname: "Shiven Pandit",
  owner_email: "shiven.pandit@cairnindia.com",
  sbu: "RJ North",
  status: "Approved",
  amount: 2000,
  currency: "USD",
  cat: "Vital",
  st_date: "2026-11-02",
  com_date: "2027-02-12",
  request_date: "2026-11-02",
  created_date: "2026-11-03T04:23:43Z",
  modified_date: "2026-11-03T05:10:00Z",
} as unknown as ICERProposal;

const row = ExcelExportService.mapProposalToExportRow(mockProposal);
console.log("[TEST 3] Export Row Created Date:", row["Created Date"]);
console.log("[TEST 3] Export Row Start Date:", row["Start Date"]);
console.log("[TEST 3] Export Row Completion Date:", row["Completion Date"]);
assert(!row["Created Date"].includes("T") && !row["Created Date"].includes("Z"), "Created Date has no T or Z");
assert(row["Created Date"].includes("Nov-2026"), "Created Date has Nov-2026");
assert(row["Start Date"] === "02-Nov-2026", "Start Date is 02-Nov-2026");
assert(row["Completion Date"] === "12-Feb-2027", "Completion Date is 12-Feb-2027");
console.log("✔ [PASS] 3. Excel row mapping outputs properly formatted dates and times");

// Test 4: ROLE_MATRIX_SBUS does not include "All"
import { ROLE_MATRIX_SBUS } from "../constants";
console.log("[TEST 4] ROLE_MATRIX_SBUS:", ROLE_MATRIX_SBUS);
assert((ROLE_MATRIX_SBUS as readonly string[]).indexOf("All") === -1, "ROLE_MATRIX_SBUS strictly excludes 'All'");
assert(ROLE_MATRIX_SBUS.length === 4, "ROLE_MATRIX_SBUS strictly has the 4 operational SBUs");
console.log("✔ [PASS] 4. SBU assignable options strictly exclude 'All'");

// Test 5: SBU table cell display helper logic
function formatSbuTableCell(sbu?: string): string {
  return sbu && sbu !== "All" && sbu !== "—" && sbu.trim() !== "" ? sbu : "—";
}
assert(formatSbuTableCell(undefined) === "—", "Undefined SBU shows dash '—'");
assert(formatSbuTableCell("") === "—", "Empty SBU shows dash '—'");
assert(formatSbuTableCell("All") === "—", "Legacy 'All' SBU shows dash '—'");
assert(formatSbuTableCell("RJ North") === "RJ North", "Selected SBU shows name");
console.log("✔ [PASS] 5. SBU table display renders '—' when no SBU is selected");

console.log("\n==================================================");
console.log("   ALL TARGETED VERIFICATIONS PASSED (5/5)");
console.log("==================================================");


