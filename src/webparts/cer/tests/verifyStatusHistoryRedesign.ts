export {};

declare const process: any;

import {
  FIXED_APPROVAL_STAGES,
  formatDecisionDateTime,
  formatVersionDate,
  splitDecisionsIntoIterations,
  partitionDecisionsByVersion,
  buildTableRowsForIteration,
  IProposalVersionEntry,
} from "../components/ApprovalWorkflow/StatusHistoryModal";
import { IApprovalDecision } from "../models/WorkflowModel";
import { ICERProposal } from "../models/CERModel";
import { LocalMockCERDataService } from "../services/LocalMockCERDataService";

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

  // 3. User Scenario Verification: CER-2026-0002 Multi-Cycle & Retrigger
  const version1Proposal: ICERProposal = {
    id: 1,
    cer_proposal_id: "CER-2026-0002",
    proposal_no: "PR-2026/02",
    pr_name: "Test Project 2",
    status: "Approved",
    amount: 2000,
    currency: "USD",
    created_date: "2026-11-03T11:50:00Z",
    modified_date: "2026-11-03T11:55:00Z",
  } as any;

  const version2Proposal: ICERProposal = {
    id: 2,
    cer_proposal_id: "CER-2026-0002",
    proposal_no: "PR-2026/02-R1",
    pr_name: "Test Project 2 (Post Approval 1)",
    status: "In Approval",
    current_level: 2,
    amount: 4000,
    currency: "USD",
    created_date: "2026-11-03T11:58:00Z",
    modified_date: "2026-11-03T13:44:00Z",
  } as any;

  const versionEntries: IProposalVersionEntry[] = [
    {
      id: "CURRENT",
      serialNo: 2,
      versionLabel: "v2 Active",
      isCurrent: true,
      proposalNo: "PR-2026/02-R1",
      status: "In Approval",
      amount: 4000,
      currency: "USD",
      dateStr: "03 Nov 2026",
      rawProposal: version2Proposal,
    },
    {
      id: "HIST_1",
      serialNo: 1,
      versionLabel: "v1 Snapshot",
      isCurrent: false,
      proposalNo: "PR-2026/02",
      status: "Approved",
      amount: 2000,
      currency: "USD",
      dateStr: "03 Nov 2026",
      rawProposal: version1Proposal,
    },
  ];

  // Raw decisions in SharePoint for CER-2026-0002
  const mockAllDecisions: IApprovalDecision[] = [
    // Cycle 1 (PR-2026/02) approved sequentially:
    { id: "d1", cerprno: "CER-2026-0002", level_id: 1, level_name: "Finance", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", approver_email: "priya@cairnindia.com", comments: "", timestamp: "2026-11-03T11:54:10Z" },
    { id: "d2", cerprno: "CER-2026-0002", level_id: 2, level_name: "Project Owner", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", approver_email: "priya@cairnindia.com", comments: "", timestamp: "2026-11-03T11:54:20Z" },
    { id: "d3", cerprno: "CER-2026-0002", level_id: 3, level_name: "BU CFO", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", approver_email: "priya@cairnindia.com", comments: "", timestamp: "2026-11-03T11:54:30Z" },
    { id: "d4", cerprno: "CER-2026-0002", level_id: 4, level_name: "BU Director", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", approver_email: "priya@cairnindia.com", comments: "", timestamp: "2026-11-03T11:54:40Z" },
    { id: "d5", cerprno: "CER-2026-0002", level_id: 5, level_name: "VOGL CFO", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", approver_email: "priya@cairnindia.com", comments: "", timestamp: "2026-11-03T11:54:50Z" },
    { id: "d6", cerprno: "CER-2026-0002", level_id: 6, level_name: "VOGL CEO", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", approver_email: "priya@cairnindia.com", comments: "", timestamp: "2026-11-03T11:55:00Z" },
    // Cycle 2 (PR-2026/02-R1) Iteration 1:
    { id: "d7", cerprno: "CER-2026-0002", level_id: 2, level_name: "Project Owner", decision: "SENT_BACK", approver_name: "Shiven Pandit (Microlink)", approver_email: "shiven@cairnindia.com", comments: "Post Approval Send Back", timestamp: "2026-11-03T11:59:00Z" },
    // Cycle 2 (PR-2026/02-R1) Retrigger Iteration 2:
    { id: "d8", cerprno: "CER-2026-0002", level_id: 1, level_name: "Finance", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", approver_email: "priya@cairnindia.com", comments: "", timestamp: "2026-11-03T13:44:00Z" },
  ];

  // 3a. Partitioning by Version
  const partitioned = partitionDecisionsByVersion(mockAllDecisions, versionEntries);
  assert(partitioned["HIST_1"] !== undefined, "3a. HIST_1 exists in partitioned map");
  assert(partitioned["CURRENT"] !== undefined, "3b. CURRENT exists in partitioned map");
  assert(partitioned["HIST_1"].length === 6, `3c. HIST_1 received all 6 approved decisions from Cycle 1 (received: ${partitioned["HIST_1"].length})`);
  assert(partitioned["CURRENT"].length === 2, `3d. CURRENT received 2 decisions (Send Back at 11:59, and L1 Approved at 13:44) (received: ${partitioned["CURRENT"].length})`);

  // 3b. Verify HIST_1 Rows (Serial No. 1)
  const histIterations = splitDecisionsIntoIterations(partitioned["HIST_1"], false, version1Proposal);
  assert(histIterations.length === 1, "3e. Serial No. 1 has exactly 1 iteration");
  const histRows = buildTableRowsForIteration(histIterations[0], versionEntries[1]);
  assert(histRows.every((r) => r.statusText === "Approved"), "3f. Serial No. 1 has all 6 stages Approved");
  assert(histRows[5].stage.level === 6 && histRows[5].statusText === "Approved", "3g. Level 6 is Approved for Serial No. 1");

  // 3c. Verify CURRENT Rows & Retrigger Separation (Serial No. 2)
  const currentIterations = splitDecisionsIntoIterations(partitioned["CURRENT"], true, version2Proposal);
  assert(currentIterations.length === 2, `3h. Serial No. 2 splits into 2 iterations due to Send Back and Retrigger (got: ${currentIterations.length})`);

  // Active Iteration (Upper Table)
  const activeIter = currentIterations[1];
  assert(activeIter.isLatestActive === true, "3i. Iteration 2 is marked as latest active");
  const activeRows = buildTableRowsForIteration(activeIter, versionEntries[0]);

  assert(activeRows[0].stage.level === 1 && activeRows[0].statusText === "Approved" && activeRows[0].updatedBy.includes("Priya Kalekar"), "3j. Upper table L1 is Approved by Priya Kalekar");
  assert(activeRows[1].stage.level === 2 && activeRows[1].statusText === "Pending", "3k. Upper table L2 is Pending (current_level = 2)");
  assert(activeRows[2].stage.level === 3 && activeRows[2].statusText === "Not Started", "3l. Upper table L3 is Not Started");
  assert(activeRows[5].stage.level === 6 && activeRows[5].statusText === "Not Started", "3m. Upper table L6 is Not Started");

  // Prior Sent-Back Iteration (Lower Table)
  const priorIter = currentIterations[0];
  assert(priorIter.isSentBack === true, "3n. Iteration 1 is marked as Sent Back");
  assert(priorIter.sentBackLevel === 2, "3o. Prior iteration sentBackLevel is 2");
  assert(Boolean(priorIter.sentBackBy?.includes("Shiven Pandit")), "3p. Prior iteration sentBackBy is Shiven Pandit");
  assert(priorIter.sentBackRemarks === "Post Approval Send Back", "3q. Prior iteration remarks preserved");

  const priorRows = buildTableRowsForIteration(priorIter, versionEntries[0]);
  assert(priorRows[1].stage.level === 2 && priorRows[1].statusText === "Send Back", "3r. Lower table L2 is Send Back");
  assert(priorRows[2].stage.level === 3 && priorRows[2].statusText === "Not Started", "3s. Lower table L3 is Not Started");

  // 4. Test Suite 4: Explicit 'version' Column Matching with IDENTICAL Proposal Numbers
  console.log("\n--- Testing Explicit 'version' Column Partitioning ---");
  const identicalVersionEntries: IProposalVersionEntry[] = [
    {
      id: "CURRENT",
      serialNo: 2,
      versionLabel: "v2 Active",
      isCurrent: true,
      proposalNo: "PR-2026/02", // IDENTICAL to Serial 1
      status: "In Approval",
      amount: 4000,
      currency: "USD",
      dateStr: "03 Nov 2026",
      rawProposal: { ...version2Proposal, proposal_no: "PR-2026/02" },
    },
    {
      id: "HIST_1",
      serialNo: 1,
      versionLabel: "v1 Snapshot",
      isCurrent: false,
      proposalNo: "PR-2026/02", // IDENTICAL to Serial 2
      status: "Approved",
      amount: 2000,
      currency: "USD",
      dateStr: "03 Nov 2026",
      rawProposal: version1Proposal,
    },
  ];

  const taggedDecisions: IApprovalDecision[] = [
    { id: "t1", cerprno: "CER-2026-0002", level_id: 1, level_name: "Finance", decision: "APPROVED", approver_name: "Approver V1", approver_email: "v1@test.com", comments: "", timestamp: "2026-11-03T10:00:00Z", version: "V1" },
    { id: "t2", cerprno: "CER-2026-0002", level_id: 2, level_name: "Project Owner", decision: "APPROVED", approver_name: "Approver V1", approver_email: "v1@test.com", comments: "", timestamp: "2026-11-03T10:05:00Z", version: "V1" },
    { id: "t3", cerprno: "CER-2026-0002", level_id: 1, level_name: "Finance", decision: "APPROVED", approver_name: "Approver V2", approver_email: "v2@test.com", comments: "", timestamp: "2026-11-03T14:00:00Z", version: "V2" },
  ];

  const taggedPartitioned = partitionDecisionsByVersion(taggedDecisions, identicalVersionEntries);
  assert(taggedPartitioned["HIST_1"].length === 2, `4a. HIST_1 (Serial 1) correctly received 2 decisions tagged V1 (got: ${taggedPartitioned["HIST_1"].length})`);
  assert(taggedPartitioned["CURRENT"].length === 1, `4b. CURRENT (Serial 2) correctly received 1 decision tagged V2 (got: ${taggedPartitioned["CURRENT"].length})`);
  assert(taggedPartitioned["HIST_1"][0].approver_name === "Approver V1", "4c. HIST_1 received V1 approver record");
  assert(taggedPartitioned["CURRENT"][0].approver_name === "Approver V2", "4d. CURRENT received V2 approver record");

  // 4e. Test resilient fallback when existing decision was tagged V3 during re-trigger in Serial 2
  const retriggeredDecisionsWithV3: IApprovalDecision[] = [
    { id: "v2-sb", cerprno: "CER-2026-0002", level_id: 3, level_name: "BU CFO", decision: "SENT_BACK", approver_name: "Approver L3", approver_email: "l3@test.com", comments: "testing", timestamp: "2026-11-03T15:15:00Z", version: "V2" },
    { id: "v3-l1", cerprno: "CER-2026-0002", level_id: 1, level_name: "Finance", decision: "APPROVED", approver_name: "Approver L1", approver_email: "l1@test.com", comments: "", timestamp: "2026-11-03T15:24:00Z", version: "V3" },
    { id: "v3-l2", cerprno: "CER-2026-0002", level_id: 2, level_name: "Project Owner", decision: "APPROVED", approver_name: "Approver L2", approver_email: "l2@test.com", comments: "", timestamp: "2026-11-03T15:26:00Z", version: "V3" },
  ];
  const retriggerPartitioned = partitionDecisionsByVersion(retriggeredDecisionsWithV3, identicalVersionEntries);
  assert(retriggerPartitioned["CURRENT"].length === 3, `4e. All 3 decisions (V2 Send Back + retriggered approvals) map to CURRENT (Serial 2) (got: ${retriggerPartitioned["CURRENT"].length})`);

  // 4f. Test dataService updateProposal: revision_count does NOT increment on send-back resubmit
  const mockService = new LocalMockCERDataService();
  const baseProp = await mockService.createProposal({
    pr_name: "Test Version Lifecycle",
    proposal_no: "PR-TEST-VER-01",
    cerprno: "PR-TEST-VER-01",
    owname: "Test Owner",
    owner_email: "owner@test.com",
    st_date: "2026-11-01",
    sbu: "RJ North",
    object: "Test objective",
    amount: 1000,
    cat: "Vital",
    payable: "Non Payback",
    cbudget: "Yes",
    status: "In Approval",
    current_level: 1,
    pending_with_role: "Finance",
    pending_with_email: "finance@test.com",
    request_date: "2026-11-01",
    currency: "USD",
  } as any);
  assert(baseProp.proposal.revision_count === 0, "4f. Initial proposal revision_count is 0");

  // Send back proposal
  await mockService.recordDecision({
    cerprno: baseProp.proposal.cerprno,
    level_id: 1,
    approver_name: "Finance Reviewer",
    approver_email: "finance.approver@example.com",
    decision: "SENT_BACK",
    comments: "Need rework",
  });
  const sentBackProp = await mockService.getProposalByNumber(baseProp.proposal.cerprno);
  assert(sentBackProp?.status === "Revised", "4g. Status is Revised after send back");

  // Initiator resubmits revised proposal
  const retriggeredProp = await mockService.updateProposal({
    ...sentBackProp!,
    status: "In Approval",
    current_level: 1,
  }, { name: "Test Owner", email: "owner@test.com" });
  assert(retriggeredProp.proposal.revision_count === 0, `4h. revision_count MUST remain 0 after send-back resubmit (got: ${retriggeredProp.proposal.revision_count})`);

  // Approver approves re-triggered proposal
  const decisionRes = await mockService.recordDecision({
    cerprno: baseProp.proposal.cerprno,
    level_id: 1,
    approver_name: "Finance Reviewer",
    approver_email: "finance.approver@example.com",
    decision: "APPROVED",
    comments: "Approved rework",
  });
  const allDecs = await mockService.getApprovalDecisions(baseProp.proposal.cerprno);
  const latestDec = allDecs[allDecs.length - 1];
  assert(latestDec.version === "V1", `4i. Decision on re-triggered workflow must stay V1, not advance to V2 (got: ${latestDec.version})`);

  console.log("\n==================================================");
  console.log("  ALL REDESIGN VERIFICATIONS PASSED (29/29)       ");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});


