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

  // 5. User Scenario: Untagged L1 Approval + Tagged V2 Rejection in Serial No. 2 (Image 3 fix)
  console.log("\n--- Testing Level 1 Approval Retention on Rejected Proposals (Image 3) ---");
  const rejectedScenarioVersions: IProposalVersionEntry[] = [
    {
      id: "CURRENT",
      serialNo: 2,
      versionLabel: "v2 Active",
      isCurrent: true,
      proposalNo: "PR-2026/02-R1",
      status: "Rejected",
      amount: 4000,
      currency: "USD",
      dateStr: "03 Nov 2026",
      rawProposal: { current_level: 2, status: "Rejected", cer_proposal_id: "CER-2026-0002", proposal_no: "PR-2026/02-R1", modified_date: "2026-11-03T15:58:00Z" } as any,
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
      rawProposal: { current_level: 6, status: "Approved", cer_proposal_id: "CER-2026-0002", proposal_no: "PR-2026/02", modified_date: "2026-11-03T11:00:00Z" } as any,
    },
  ];

  const mixedDecisions: IApprovalDecision[] = [
    { id: "h1", cerprno: "CER-2026-0002", level_id: 1, level_name: "Finance", decision: "APPROVED", approver_name: "Priya Kalekar", approver_email: "priya@stl.com", comments: "", timestamp: "2026-11-03T10:00:00Z", version: "" },
    { id: "h2", cerprno: "CER-2026-0002", level_id: 2, level_name: "Project Owner", decision: "APPROVED", approver_name: "Shiven Pandit", approver_email: "shiven@cairn.com", comments: "", timestamp: "2026-11-03T10:05:00Z", version: "" },
    { id: "v2-l1", cerprno: "CER-2026-0002", level_id: 1, level_name: "Finance", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", approver_email: "priya@stl.com", comments: "Finance Approved", timestamp: "2026-11-03T15:24:00Z", version: "" },
    { id: "v2-l2", cerprno: "CER-2026-0002", level_id: 2, level_name: "Project Owner", decision: "REJECTED", approver_name: "Shiven Pandit (Microlink)", approver_email: "shiven@cairn.com", comments: "Testing Rejection", timestamp: "2026-11-03T15:57:00Z", version: "V2" },
  ];

  const mixedPartitioned = partitionDecisionsByVersion(mixedDecisions, rejectedScenarioVersions);
  assert(mixedPartitioned["CURRENT"].length === 2, `5a. CURRENT received exactly 2 decisions (got: ${mixedPartitioned["CURRENT"].length})`);
  const currentL1Dec = mixedPartitioned["CURRENT"].find((d) => d.level_id === 1);
  assert(currentL1Dec !== undefined, "5b. CURRENT has Level 1 decision");
  assert(currentL1Dec?.approver_name === "Priya Kalekar (STL Digital)", `5c. L1 approver is Priya Kalekar (STL Digital) (got: ${currentL1Dec?.approver_name})`);
  assert(currentL1Dec?.decision === "APPROVED", "5d. L1 decision is APPROVED");

  const currentL2Dec = mixedPartitioned["CURRENT"].find((d) => d.level_id === 2);
  assert(currentL2Dec?.decision === "REJECTED", "5e. L2 decision is REJECTED");

  // Build table rows for rejected active iteration
  const rejIteration = splitDecisionsIntoIterations(mixedPartitioned["CURRENT"], true, rejectedScenarioVersions[0].rawProposal)[0];
  const rejRows = buildTableRowsForIteration(rejIteration, rejectedScenarioVersions[0]);
  assert(rejRows[0].statusText === "Approved", `5f. Stage 1 (L1 Finance) statusText is Approved on rejected proposal (got: ${rejRows[0].statusText})`);
  assert(rejRows[0].updatedBy === "Priya Kalekar (STL Digital)", "5g. Stage 1 updatedBy shows approver name");
  assert(rejRows[1].statusText === "Rejected", `5h. Stage 2 (L2 Project Owner) statusText is Rejected (got: ${rejRows[1].statusText})`);
  assert(rejRows[1].updatedBy === "Shiven Pandit (Microlink)", "5i. Stage 2 updatedBy shows rejector name");
  assert(rejRows[1].remarks === "Testing Rejection", "5j. Stage 2 remarks captured");
  assert(rejRows[2].statusText === "Not Started", "5k. Stage 3 (L3 BU CFO) statusText is Not Started");
  assert(rejIteration.isRejected === true, "5l. Active rejected iteration is marked isRejected");
  assert(rejIteration.rejectedLevel === 2, "5m. Active rejected iteration level is 2");
  assert(rejIteration.rejectedStageName === "Project Owner", "5n. Active rejected iteration stage name is Project Owner");
  assert(rejIteration.rejectedBy === "Shiven Pandit (Microlink)", "5o. Active rejected iteration rejectedBy captured");

  // 6. Multi-Version Snapshot Isolation without Overwriting (Images 1, 2, 3 fix)
  console.log("\n--- Testing Multi-Version CERProposalsHistory Isolation ---");
  const multiHistService = new LocalMockCERDataService();
  const initialApproved = await multiHistService.createProposal({
    id: "prop-test-7",
    pr_name: "Original Test Project 7",
    proposal_no: "PR-2026/07",
    cerprno: "CER-2026-0007",
    cer_proposal_id: "CER-2026-0007",
    owname: "Shiven Pandit (Microlink)",
    owner_email: "shiven@cairn.com",
    st_date: "2026-11-01",
    sbu: "RJ North",
    object: "Original Scope",
    amount: 1500,
    cat: "Vital",
    payable: "Payback",
    cbudget: "Yes",
    status: "Approved",
    current_level: 6,
    currency: "USD",
  } as any);

  const testCerId = initialApproved.proposal.cer_proposal_id || initialApproved.proposal.cerprno;

  // Submit first post-approval revision (Serial 2) -> archives Serial 1 (V1)
  const res1 = await multiHistService.updateProposal({
    ...initialApproved.proposal,
    pr_name: "Test Project 7 testing post approval",
    status: "In Approval",
    current_level: 1,
  }, { name: "Shiven Pandit (Microlink)", email: "shiven@cairn.com" });

  const histAfterFirstPostApproval = await multiHistService.getProposalHistory(testCerId);
  assert(histAfterFirstPostApproval.length === 1, `6a. Exactly 1 history snapshot archived after first post-approval (got: ${histAfterFirstPostApproval.length})`);
  assert(histAfterFirstPostApproval[0].version === "V1", `6b. First snapshot tagged V1 (got: ${histAfterFirstPostApproval[0].version})`);
  assert(histAfterFirstPostApproval[0].pr_name === "Original Test Project 7", `6c. First snapshot retains original project title (got: ${histAfterFirstPostApproval[0].pr_name})`);

  // First post-approval gets fully approved across all 6 levels
  const activePostApproval1 = await multiHistService.getProposalByNumber(testCerId);
  activePostApproval1!.status = "Approved";
  activePostApproval1!.current_level = 6;

  // Submit second post-approval revision (Serial 3) -> archives Serial 2 (V2)
  await multiHistService.updateProposal({
    ...activePostApproval1!,
    pr_name: "Test Project 7 testing post approval 2 time",
    status: "In Approval",
    current_level: 1,
  }, { name: "Shiven Pandit (Microlink)", email: "shiven@cairn.com" }, activePostApproval1!);

  const histAfterSecondPostApproval = await multiHistService.getProposalHistory(testCerId);
  assert(histAfterSecondPostApproval.length === 2, `6d. Exactly 2 distinct snapshots in history without overwriting (got: ${histAfterSecondPostApproval.length})`);
  const v1Snap = histAfterSecondPostApproval.find((h) => h.version === "V1");
  const v2Snap = histAfterSecondPostApproval.find((h) => h.version === "V2");
  assert(v1Snap !== undefined, "6e. Snapshot V1 exists");
  assert(v1Snap?.pr_name === "Original Test Project 7", "6f. Snapshot V1 still preserves original title");
  assert(v2Snap !== undefined, "6g. Snapshot V2 exists");
  assert(v2Snap?.pr_name === "Test Project 7 testing post approval", "6h. Snapshot V2 preserves post-approval title");

  // 7. Verify Reviewer Comments & 6th Column Data
  console.log("\n--- Testing Reviewer Comments Column & Modal Payload ---");
  assert(rejRows[1].remarks === "Testing Rejection", "7a. Remarks captured on rejected L2 row");
  assert(rejRows[0].remarks === "Finance Approved", "7b. Remarks captured on approved L1 row");
  assert(rejRows[2].remarks === "", "7c. Remarks empty for unstarted L3 row");

  // 8. CER-2026-0002 Specific Regression: No L3 Approval in L2 Send Back & Serial 1 Complete Snapshot
  console.log("\n--- Testing CER-2026-0002 Isolation & L2 Send-Back Sequential Bounds ---");
  const cer0002Decisions: IApprovalDecision[] = [
    // Cycle 1: PR-2026/02 approved at 11:54
    { id: "c1_1", cerprno: "CER-2026-0002", level_id: 1, level_name: "Finance", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", timestamp: "2026-11-03T11:54:10Z" } as any,
    { id: "c1_2", cerprno: "CER-2026-0002", level_id: 2, level_name: "Project Owner", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", timestamp: "2026-11-03T11:54:20Z" } as any,
    { id: "c1_3", cerprno: "CER-2026-0002", level_id: 3, level_name: "BU CFO", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", timestamp: "2026-11-03T11:54:30Z" } as any,
    { id: "c1_4", cerprno: "CER-2026-0002", level_id: 4, level_name: "BU Director", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", timestamp: "2026-11-03T11:54:40Z" } as any,
    { id: "c1_5", cerprno: "CER-2026-0002", level_id: 5, level_name: "VOGL CFO", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", timestamp: "2026-11-03T11:54:50Z" } as any,
    { id: "c1_6", cerprno: "CER-2026-0002", level_id: 6, level_name: "VOGL CEO", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", timestamp: "2026-11-03T11:55:00Z" } as any,
    // Cycle 2: PR-2026/02-R1 Iteration 1 at 11:59
    { id: "c2_1", cerprno: "CER-2026-0002", level_id: 1, level_name: "Finance", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", timestamp: "2026-11-03T11:59:10Z" } as any,
    { id: "c2_2", cerprno: "CER-2026-0002", level_id: 2, level_name: "Project Owner", decision: "SENT_BACK", approver_name: "Shiven Pandit (Microlink)", comments: "Post Approval Send Back", timestamp: "2026-11-03T11:59:40Z" } as any,
    // Cycle 2: PR-2026/02-R1 Retrigger Iteration 2 at 13:44 & 15:57
    { id: "c2_3", cerprno: "CER-2026-0002", level_id: 1, level_name: "Finance", decision: "APPROVED", approver_name: "Priya Kalekar (STL Digital)", timestamp: "2026-11-03T13:44:00Z" } as any,
    { id: "c2_4", cerprno: "CER-2026-0002", level_id: 2, level_name: "Project Owner", decision: "REJECTED", approver_name: "Shiven Pandit (Microlink)", comments: "Rejected at L2", timestamp: "2026-11-03T15:57:00Z" } as any,
  ];

  const cer0002Partitioned = partitionDecisionsByVersion(cer0002Decisions, versionEntries);
  assert(cer0002Partitioned["HIST_1"].length === 6, `8a. Serial 1 received exactly the 6 Cycle 1 decisions (got: ${cer0002Partitioned["HIST_1"].length})`);
  assert(cer0002Partitioned["CURRENT"].length === 4, `8b. Serial 2 received all 4 Cycle 2 decisions (got: ${cer0002Partitioned["CURRENT"].length})`);

  // Serial 1: Exactly 1 iteration with all 6 Approved
  const cer0002HistIters = splitDecisionsIntoIterations(cer0002Partitioned["HIST_1"], false, version1Proposal);
  assert(cer0002HistIters.length === 1, `8c. Serial 1 has exactly 1 iteration (no send-backs) (got: ${cer0002HistIters.length})`);
  const cer0002HistRows = buildTableRowsForIteration(cer0002HistIters[0], versionEntries[1]);
  assert(cer0002HistRows.every((r) => r.statusText === "Approved"), "8d. Serial 1 is 100% Approved Snapshot");

  // Serial 2: 2 iterations (Iteration 1: Sent Back at L2; Iteration 2: Rejected at L2)
  const cer0002CurrentIters = splitDecisionsIntoIterations(cer0002Partitioned["CURRENT"], true, { ...version2Proposal, status: "Rejected" });
  assert(cer0002CurrentIters.length === 2, `8e. Serial 2 splits into 2 iterations (got: ${cer0002CurrentIters.length})`);

  // Verify Iteration 1 (Prior Sent Back):
  const cer0002SbIter = cer0002CurrentIters[0];
  assert(cer0002SbIter.isSentBack === true && cer0002SbIter.sentBackLevel === 2, "8f. Iteration 1 is Sent Back at Level 2");
  const cer0002SbRows = buildTableRowsForIteration(cer0002SbIter, versionEntries[0]);
  assert(cer0002SbRows[0].statusText === "Approved", "8g. L1 is Approved in sent-back iteration");
  assert(cer0002SbRows[1].statusText === "Send Back", "8h. L2 is Send Back in sent-back iteration");
  assert(cer0002SbRows[2].statusText === "Not Started", `8i. L3 BU CFO MUST BE 'Not Started', NOT Approved (got: ${cer0002SbRows[2].statusText})`);
  assert(cer0002SbRows[3].statusText === "Not Started", "8j. L4 is Not Started in sent-back iteration");
  assert(cer0002SbRows[4].statusText === "Not Started", "8k. L5 is Not Started in sent-back iteration");
  assert(cer0002SbRows[5].statusText === "Not Started", "8l. L6 is Not Started in sent-back iteration");

  // Verify Iteration 2 (Upper Table, Active Cycle):
  const cer0002ActIter = cer0002CurrentIters[1];
  assert(cer0002ActIter.isLatestActive === true, "8m. Iteration 2 is active");
  assert(cer0002ActIter.isRejected === true && cer0002ActIter.rejectedLevel === 2, "8n. Iteration 2 is Rejected at Level 2");
  const cer0002ActRows = buildTableRowsForIteration(cer0002ActIter, versionEntries[0]);
  assert(cer0002ActRows[0].statusText === "Approved", "8o. Upper table L1 is Approved");
  assert(cer0002ActRows[1].statusText === "Rejected", "8p. Upper table L2 is Rejected");
  assert(cer0002ActRows[2].statusText === "Not Started", "8q. Upper table L3 is Not Started");

  console.log("\n==================================================");
  console.log("  ALL REDESIGN VERIFICATIONS PASSED               ");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});


