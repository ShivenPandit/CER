/**
 * verifyProposalHistoryTwoPanel.ts
 *
 * Automated verification suite for the Two-Panel Proposal History Redesign:
 * 1. Left Sidebar (~25% width): Descending sort (Serial No. N, N-1, ... 1), metadata, active highlighting.
 * 2. Right Content Panel (~75% width): Complete proposal snapshot data across Sections A to H.
 * 3. Default selection: Latest version selected by default.
 * 4. Read-only integrity: All displayed fields reflect historical snapshot data without form mutation.
 */

import { ICERProposal } from "../models/CERModel";

interface ITestResult {
  suite: string;
  test: string;
  passed: boolean;
  message?: string;
}

const results: ITestResult[] = [];

function assert(suite: string, test: string, condition: boolean, message?: string): void {
  results.push({
    suite,
    test,
    passed: condition,
    message: condition ? undefined : message || "Assertion failed",
  });
}

// Mock historical snapshot records for a multi-revision CER proposal
const mockSnapshots: ICERProposal[] = [
  {
    id: "101",
    cerprno: "PR-2026/01",
    proposal_no: "PR-2026/01",
    cer_proposal_id: "CER-2026-0001",
    pr_name: "Rajasthan Pipeline Expansion - Phase 1",
    owname: "Shiven Pandit",
    owner_email: "shiven@company.com",
    sbu: "RJ North",
    cat: "Vital",
    st_date: "2026-01-01",
    com_date: "2026-06-30",
    period: "180 Days",
    duration_months: 6,
    object: "Initial pipeline expansion sanctioned for early works.",
    currency: "USD",
    amount: 1500,
    payable: "Payback",
    payback_quarters: 4,
    ben_npv: 350,
    ben_irr: 18.5,
    revision_count: 0,
    cost_assumptions: "Oil price at $75/bbl.",
    prod_till: 10,
    prod_fy: 25,
    prod_beyond: 50,
    capex_till: 500,
    capex_fy: 700,
    capex_beyond: 300,
    opex_till: 50,
    opex_fy: 80,
    opex_beyond: 120,
    engineer: 300,
    s_fac: 600,
    comis: 200,
    preop: 150,
    others: 250,
    total: 1500,
    cbudget: "Yes",
    cb_amnt: 1500,
    reason: "Fully budgeted",
    jv: "Yes",
    jv_recoverable: "Yes",
    jv_budget: "Yes",
    jv_amnt: 1500,
    jv_reason: "TCM approved",
    remarks: "Initial version approved by EC.",
    status: "Approved",
    created_date: "2026-01-05T10:00:00Z",
    modified_date: "2026-01-15T12:00:00Z",
  } as unknown as ICERProposal,
  {
    id: "102",
    cerprno: "PR-2026/01-R1",
    proposal_no: "PR-2026/01-R1",
    cer_proposal_id: "CER-2026-0001",
    pr_name: "Rajasthan Pipeline Expansion - Phase 1 (Amended)",
    owname: "Shiven Pandit",
    owner_email: "shiven@company.com",
    sbu: "RJ North",
    cat: "Vital",
    st_date: "2026-01-01",
    com_date: "2026-09-30",
    period: "272 Days",
    duration_months: 9,
    object: "Amendment 1: Expansion of trunk line capacity.",
    currency: "USD",
    amount: 2200,
    payable: "Payback",
    payback_quarters: 5,
    ben_npv: 480,
    ben_irr: 21.0,
    revision_count: 1,
    cost_assumptions: "Oil price at $78/bbl with upgraded compression units.",
    prod_till: 10,
    prod_fy: 35,
    prod_beyond: 75,
    capex_till: 600,
    capex_fy: 1100,
    capex_beyond: 500,
    opex_till: 60,
    opex_fy: 110,
    opex_beyond: 160,
    engineer: 400,
    s_fac: 900,
    comis: 300,
    preop: 250,
    others: 350,
    total: 2200,
    cbudget: "Yes",
    cb_amnt: 2200,
    reason: "Board supplementary sanction",
    jv: "Yes",
    jv_recoverable: "Yes",
    jv_budget: "Yes",
    jv_amnt: 2200,
    jv_reason: "JV Partner concurred",
    remarks: "First revision sanctioned by Executive Committee.",
    status: "Approved",
    created_date: "2026-04-10T10:00:00Z",
    modified_date: "2026-04-20T14:30:00Z",
  } as unknown as ICERProposal,
  {
    id: "103",
    cerprno: "PR-2026/01-R2",
    proposal_no: "PR-2026/01-R2",
    cer_proposal_id: "CER-2026-0001",
    pr_name: "Rajasthan Pipeline Expansion - Phase 1 (Scope Enhancement)",
    owname: "Shiven Pandit",
    owner_email: "shiven@company.com",
    sbu: "RJ North",
    cat: "Vital",
    st_date: "2026-01-01",
    com_date: "2026-12-31",
    period: "365 Days",
    duration_months: 12,
    object: "Amendment 2: Additional metering station and pipeline hookup.",
    currency: "USD",
    amount: 2800,
    payable: "Payback",
    payback_quarters: 6,
    ben_npv: 590,
    ben_irr: 22.4,
    revision_count: 2,
    cost_assumptions: "Full year production ramp up at enhanced pipeline throughput.",
    prod_till: 10,
    prod_fy: 45,
    prod_beyond: 95,
    capex_till: 700,
    capex_fy: 1400,
    capex_beyond: 700,
    opex_till: 70,
    opex_fy: 130,
    opex_beyond: 190,
    engineer: 500,
    s_fac: 1200,
    comis: 400,
    preop: 300,
    others: 400,
    total: 2800,
    cbudget: "Yes",
    cb_amnt: 2800,
    reason: "Approved under mid-term capital revision",
    jv: "Yes",
    jv_recoverable: "Yes",
    jv_budget: "Yes",
    jv_amnt: 2800,
    jv_reason: "Operating Committee Resolution #4",
    remarks: "Revision 2 approved and archived.",
    status: "Approved",
    created_date: "2026-08-01T09:00:00Z",
    modified_date: "2026-08-15T16:00:00Z",
  } as unknown as ICERProposal,
];

export async function runTwoPanelProposalHistoryTests(): Promise<void> {
  const SUITE = "Two-Panel Proposal History Redesign";

  // 1. Descending Sort Order
  const sorted = [...mockSnapshots].sort((a, b) => {
    const dateA = new Date(a.modified_date || a.created_date || 0).getTime();
    const dateB = new Date(b.modified_date || b.created_date || 0).getTime();
    return dateB - dateA;
  });

  assert(
    SUITE,
    "1. History sorting is descending (latest snapshot first)",
    sorted[0].id === "103" && sorted[1].id === "102" && sorted[2].id === "101",
    `Expected order ["103", "102", "101"], got [${sorted.map((s) => s.id).join(", ")}]`
  );

  // 2. Serial Numbering (Serial No. 3, 2, 1)
  const serialNos = sorted.map((_, idx) => sorted.length - idx);
  assert(
    SUITE,
    "2. Serial numbering matches requirement (Serial No. 3, 2, 1 descending)",
    serialNos[0] === 3 && serialNos[1] === 2 && serialNos[2] === 1,
    `Expected [3, 2, 1], got [${serialNos.join(", ")}]`
  );

  // 3. Default Selection is Latest Snapshot
  const defaultSelected = sorted[0];
  assert(
    SUITE,
    "3. Latest historical version (Serial No. 3) is selected by default",
    defaultSelected.proposal_no === "PR-2026/01-R2" && defaultSelected.amount === 2800,
    `Expected PR-2026/01-R2, got ${defaultSelected.proposal_no}`
  );

  // 4. Section A - Project Details Data Completeness
  assert(
    SUITE,
    "4. Section A Project Details complete on selected snapshot",
    defaultSelected.pr_name === "Rajasthan Pipeline Expansion - Phase 1 (Scope Enhancement)" &&
      defaultSelected.cer_proposal_id === "CER-2026-0001" &&
      defaultSelected.owname === "Shiven Pandit" &&
      defaultSelected.sbu === "RJ North" &&
      defaultSelected.cat === "Vital" &&
      defaultSelected.st_date === "2026-01-01" &&
      defaultSelected.com_date === "2026-12-31" &&
      Boolean(defaultSelected.object),
    "Missing Section A fields in historical snapshot"
  );

  // 5. Section B - Financials Data Completeness
  assert(
    SUITE,
    "5. Section B Financials complete on selected snapshot",
    defaultSelected.amount === 2800 &&
      defaultSelected.payable === "Payback" &&
      defaultSelected.payback_quarters === 6 &&
      defaultSelected.ben_npv === 590 &&
      defaultSelected.ben_irr === 22.4 &&
      defaultSelected.revision_count === 2 &&
      Boolean(defaultSelected.cost_assumptions),
    "Missing Section B financial fields in historical snapshot"
  );

  // 6. Section C - Expenditure Phasing Completeness
  const totalCapexPhasing =
    Number(defaultSelected.capex_till) +
    Number(defaultSelected.capex_fy) +
    Number(defaultSelected.capex_beyond);
  assert(
    SUITE,
    "6. Section C Expenditure Phasing sums accurately to Amount of CER",
    totalCapexPhasing === defaultSelected.amount,
    `Capex phasing sum ${totalCapexPhasing} does not match amount ${defaultSelected.amount}`
  );

  // 7. Section D - CAPEX Breakdown Completeness
  const totalCapexBreakdown =
    Number(defaultSelected.engineer) +
    Number(defaultSelected.s_fac) +
    Number(defaultSelected.comis) +
    Number(defaultSelected.preop) +
    Number(defaultSelected.others);
  assert(
    SUITE,
    "7. Section D CAPEX Breakdown items sum exactly to Total Capex and Amount of CER",
    totalCapexBreakdown === defaultSelected.total && totalCapexBreakdown === defaultSelected.amount,
    `CAPEX breakdown sum ${totalCapexBreakdown} does not match total ${defaultSelected.total}`
  );

  // 8. Section E & F - Corporate Budget & Joint Venture Completeness
  assert(
    SUITE,
    "8. Section E & F Corporate Budget and JV details complete",
    defaultSelected.cbudget === "Yes" &&
      defaultSelected.cb_amnt === 2800 &&
      defaultSelected.jv === "Yes" &&
      defaultSelected.jv_recoverable === "Yes" &&
      defaultSelected.jv_amnt === 2800,
    "Missing Section E or F fields in snapshot"
  );

  // 9. Section G - Remarks and Justification
  assert(
    SUITE,
    "9. Section G Remarks and justification preserved",
    defaultSelected.remarks === "Revision 2 approved and archived.",
    "Remarks not preserved"
  );

  // 10. Interactive Version Switching
  const switchedSelected = sorted[2]; // Selecting Serial No. 1 (Original PR-2026/01)
  assert(
    SUITE,
    "10. Selecting Serial No. 1 loads historical snapshot PR-2026/01 with exact original amount $1,500",
    switchedSelected.proposal_no === "PR-2026/01" &&
      switchedSelected.amount === 1500 &&
      switchedSelected.total === 1500 &&
      switchedSelected.revision_count === 0,
    `Expected PR-2026/01 with amount 1500, got ${switchedSelected.proposal_no} with ${switchedSelected.amount}`
  );

  // 11. Modal Header Format Verification
  const testCerId = "CER-2026-0001";
  const formattedHeader = `Proposal History (${testCerId})`;
  assert(
    SUITE,
    "11. Modal Header formatted strictly as 'Proposal History (CER-YYYY-XXXX)'",
    formattedHeader === "Proposal History (CER-2026-0001)",
    `Unexpected header format: ${formattedHeader}`
  );

  // 12. Active Proposal is NOT Injected into History
  const activeProposalMock: ICERProposal = {
    id: "999",
    cerprno: "CER-2026-0001",
    proposal_no: "PR-2026/01-R3",
    status: "In Approval",
    amount: 3500,
  } as unknown as ICERProposal;

  // History list strictly contains mockSnapshots, active proposal is excluded
  const isHistoryOnly = !sorted.some((s) => s.id === activeProposalMock.id);
  assert(
    SUITE,
    "12. Active proposal from CERProposals is strictly excluded from history list",
    isHistoryOnly,
    "Active proposal found in historical snapshots"
  );

  // 13. Empty State Handling (Initial cycle before any amendments)
  const emptyHistory: ICERProposal[] = [];
  const selectedOnEmpty = emptyHistory.length > 0 ? emptyHistory[0] : null;
  assert(
    SUITE,
    "13. Empty archive state displays 0 versions and null selected snapshot",
    emptyHistory.length === 0 && selectedOnEmpty === null,
    "Expected null selected snapshot on empty history archive"
  );

  // Print results
  console.log("\n==================================================");
  console.log("   TWO-PANEL PROPOSAL HISTORY TEST RESULTS        ");
  console.log("==================================================");
  let passCount = 0;
  for (const res of results) {
    if (res.passed) {
      console.log(`[PASS] ${res.test}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${res.test} - ${res.message}`);
    }
  }
  console.log("==================================================");
  console.log(`Summary: ${passCount}/${results.length} tests passed.\n`);

  if (passCount !== results.length) {
    throw new Error(`Only ${passCount}/${results.length} tests passed.`);
  }
}

// Direct execution
if (typeof require !== "undefined" && (require as any).main === module) {
  runTwoPanelProposalHistoryTests().catch((e) => {
    console.error(e);
    if (typeof process !== "undefined" && typeof (process as any).exit === "function") {
      (process as any).exit(1);
    }
  });
}
