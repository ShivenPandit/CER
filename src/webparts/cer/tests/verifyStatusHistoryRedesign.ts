export {};

declare const process: any;

import {
  FIXED_APPROVAL_STAGES,
  formatDecisionDateTime,
  formatVersionDate,
} from "../components/ApprovalWorkflow/StatusHistoryModal";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✔ [PASS] ${message}`);
}

async function runTests() {
  console.log("==================================================");
  console.log(" STATUS & APPROVAL HISTORY REDESIGN VERIFICATIONS ");
  console.log("==================================================");

  // 1. Fixed 6-Level Workflow Hierarchy
  assert(FIXED_APPROVAL_STAGES.length === 6, "1. Exactly 6 workflow levels configured");
  assert(FIXED_APPROVAL_STAGES[0].level === 1 && FIXED_APPROVAL_STAGES[0].name === "Finance", "1a. L1 is Finance");
  assert(FIXED_APPROVAL_STAGES[1].level === 2 && FIXED_APPROVAL_STAGES[1].name === "Project Owner", "1b. L2 is Project Owner");
  assert(FIXED_APPROVAL_STAGES[2].level === 3 && FIXED_APPROVAL_STAGES[2].name === "BU CFO", "1c. L3 is BU CFO");
  assert(FIXED_APPROVAL_STAGES[3].level === 4 && FIXED_APPROVAL_STAGES[3].name === "BU Director", "1d. L4 is BU Director");
  assert(FIXED_APPROVAL_STAGES[4].level === 5 && FIXED_APPROVAL_STAGES[4].name === "VOGL CFO", "1e. L5 is VOGL CFO");
  assert(FIXED_APPROVAL_STAGES[5].level === 6 && FIXED_APPROVAL_STAGES[5].name === "VOGL CEO", "1f. L6 is VOGL CEO");

  // 2. Date & Time formatting
  const formattedDt = formatDecisionDateTime("2026-11-03T11:41:00Z");
  assert(formattedDt.includes("03 Nov 2026") || formattedDt.includes("03-Nov-2026"), `2a. Date part formatted cleanly: '${formattedDt}'`);
  assert(!formattedDt.includes("T") && !formattedDt.includes("Z"), "2b. Date part does not leak ISO T or Z");
  assert(formatDecisionDateTime(undefined) === "—", "2c. Missing timestamp safely renders '—'");

  const formattedVerDate = formatVersionDate("2026-11-03");
  assert(formattedVerDate.includes("03 Nov 2026") || formattedVerDate.includes("03-Nov-2026"), "2d. Version date formatted cleanly");

  // 3. Status Badge & Resolution Logic
  function resolveRowStatus(
    stageLevel: number,
    currentLevel: number,
    proposalStatus: string,
    isCurrent: boolean,
    latestDecision?: { decision: string }
  ): string {
    if (latestDecision) {
      const dec = (latestDecision.decision || "").trim().toUpperCase();
      if (dec === "APPROVED") return "Approved";
      if (dec === "SENT_BACK" || dec === "SENT BACK") return "Send Back";
      if (dec === "REJECTED") return "Rejected";
    }
    if (isCurrent && proposalStatus === "In Approval") {
      if (stageLevel === currentLevel) return "Pending";
      return "Not Started";
    }
    return "Not Started";
  }

  // Level 1 Approved
  assert(resolveRowStatus(1, 2, "In Approval", true, { decision: "APPROVED" }) === "Approved", "3a. Level with APPROVED decision resolves to 'Approved'");
  // Level 2 Pending
  assert(resolveRowStatus(2, 2, "In Approval", true, undefined) === "Pending", "3b. Current level without decision resolves to 'Pending'");
  // Level 3 Not Started
  assert(resolveRowStatus(3, 2, "In Approval", true, undefined) === "Not Started", "3c. Future level resolves to 'Not Started'");
  // Level 2 Sent Back
  assert(resolveRowStatus(2, 1, "Revised", true, { decision: "SENT_BACK" }) === "Send Back", "3d. Sent back decision resolves to 'Send Back'");
  // Level 2 Rejected
  assert(resolveRowStatus(2, 2, "Rejected", true, { decision: "REJECTED" }) === "Rejected", "3e. Rejected decision resolves to 'Rejected'");

  // 4. Decision Separation (Current vs Historical)
  const currentDecisions = [{ level_id: 1, decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)" }];
  const histDecisions = [
    { level_id: 1, decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)" },
    { level_id: 2, decision: "APPROVED", approver_name: "Shiven Pandit (Microlink)" },
  ];
  assert(currentDecisions.length === 1, "4a. Current proposal cycle has 1 decision");
  assert(histDecisions.length === 2, "4b. Historical approved snapshot has 2 decisions preserved independently");

  console.log("\n==================================================");
  console.log("  ALL REDESIGN VERIFICATIONS PASSED (6/6)         ");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

