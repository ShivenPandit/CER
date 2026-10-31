import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal } from "../models/CERModel";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? " -> " + detail : ""}`);
    failed++;
  }
}

async function runProposalsHistoryVerification(): Promise<void> {
  console.log("================================================================================");
  console.log(" VERIFYING CER PROPOSALS HISTORY ARCHIVAL & SUBMISSION FLOW");
  console.log("================================================================================");

  const service = new LocalMockCERDataService();

  // Setup workflow levels for RJ North
  await service.saveWorkflowLevels([
    {
      level_id: 1,
      level_name: "Technical Review",
      role_title: "Technical Reviewer",
      approver_name: "Technical Approver",
      approver_email: "approver1@vedanta.co.in",
      sbu: "RJ North",
      is_active: true,
      min_amount: 0,
    },
  ]);

  const initiator = {
    name: "Project Initiator",
    email: "initiator@vedanta.co.in",
  };

  const today = new Date().toISOString().split("T")[0];

  // ---------------------------------------------------------------------------
  // TEST 1: Initial Creation & Approval of Proposal
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 1: Initial Creation & Approval ---");
  const initialPayload: any = {
    proposal_no: "PR-ORIGINAL-01",
    pr_name: "Gas Compression Station Phase 1",
    owname: initiator.name,
    owner_email: initiator.email,
    sbu: "RJ North",
    status: "Draft",
    amount: 1000000,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    period: "12 Months",
    object: "Upgrade gas compression infrastructure",
  };

  const createResult = await service.createProposal(initialPayload);
  assert(createResult.success, "Initial proposal created");

  const createdProp = await service.getProposalByNumber(createResult.proposal.cerprno);
  assert(createdProp !== null, "Created proposal found in active proposals");
  const allocatedCerId = createdProp!.cerprno;
  assert(createdProp?.proposal_no === "PR-ORIGINAL-01", "Proposal No is PR-ORIGINAL-01");

  // Submit and approve it
  await service.updateProposal(
    {
      ...createdProp!,
      status: "In Approval",
    },
    initiator
  );

  await service.recordDecision({
    cerprno: allocatedCerId,
    decision: "APPROVED",
    comments: "Technically sound and viable.",
    approver_name: "Technical Approver",
    approver_email: "approver1@vedanta.co.in",
    level_id: 1,
  });

  const approvedProp = await service.getProposalByNumber(allocatedCerId);
  assert(approvedProp?.status === "Approved", "Proposal successfully transitioned to 'Approved'");

  // Check history list is initially empty for this CER
  const initialHistory = await service.getProposalHistory(allocatedCerId);
  assert(initialHistory.length === 0, "No historical archives prior to post-approval changes");

  // ---------------------------------------------------------------------------
  // TEST 2: Post-Approval Amendment Archives Approved Record to CERProposalsHistory
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: Post-Approval Amendment & Archival ---");

  // Attempt resubmission with duplicate proposal number across other projects
  let duplicateRejected = false;
  try {
    // SEED_PROPOSALS has "prop-001" with CER-2026-0001
    await service.updateProposal(
      {
        ...approvedProp!,
        proposal_no: "CER-2026-0001",
        status: "In Approval",
      },
      initiator
    );
  } catch {
    duplicateRejected = true;
  }
  assert(duplicateRejected, "Duplicate proposal_no is strictly rejected by service");

  // Post-approval change with a new, valid Proposal No
  const amendmentPayload = {
    ...approvedProp!,
    proposal_no: "PR-AMENDMENT-02",
    amount: 1500000,
    remarks: "Scope expanded due to increased reservoir pressure requirement.",
    status: "In Approval" as const,
  };

  const updateResult = await service.updateProposal(amendmentPayload, initiator);
  assert(updateResult.success, "Post-approval amendment submitted successfully");

  // Verify active proposal in CERProposals was updated in-place
  const activeAfterAmendment = await service.getProposalByNumber(allocatedCerId);
  assert(activeAfterAmendment !== null, "Active proposal found");
  assert(activeAfterAmendment?.proposal_no === "PR-AMENDMENT-02", "Active proposal has new Proposal No PR-AMENDMENT-02");
  assert(activeAfterAmendment?.amount === 1500000, "Active proposal amount updated to 1,500,000");
  assert(activeAfterAmendment?.status === "In Approval", "Active proposal status reset to 'In Approval'");
  assert(activeAfterAmendment?.current_level === 1, "Active proposal restarted at Level 1");
  assert(activeAfterAmendment?.request_date === today, "Active proposal request_date updated to today on post-approval submit");

  // Verify historical snapshot was preserved in CERProposalsHistory
  const historyAfterAmendment = await service.getProposalHistory(allocatedCerId);
  assert(historyAfterAmendment.length === 1, "CERProposalsHistory contains 1 archived record");
  assert(historyAfterAmendment[0].proposal_no === "PR-ORIGINAL-01", "Archived record retains original Proposal No PR-ORIGINAL-01");
  assert(historyAfterAmendment[0].amount === 1000000, "Archived record retains original approved amount 1,000,000");
  assert(historyAfterAmendment[0].status === "Approved", "Archived record maintains status 'Approved'");

  // ---------------------------------------------------------------------------
  // TEST 3: getAllSubmissionsForCER Combined Retrieval
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: getAllSubmissionsForCER Combined Retrieval ---");
  const submissions = await service.getAllSubmissionsForCER(allocatedCerId);
  assert(submissions.active !== null, "Active submission returned");
  assert(submissions.active?.proposal_no === "PR-AMENDMENT-02", "Active submission is PR-AMENDMENT-02");
  assert(submissions.history.length === 1, "History returned 1 item");
  assert(submissions.history[0].proposal_no === "PR-ORIGINAL-01", "Historical submission is PR-ORIGINAL-01");

  // Querying by historical Proposal No directly loads the historical snapshot
  const fetchedByHistNo = await service.getProposalByNumber("PR-ORIGINAL-01");
  assert(fetchedByHistNo !== null, "Historical snapshot retrieved by historical Proposal No PR-ORIGINAL-01");
  assert(fetchedByHistNo?.amount === 1000000, "Snapshot loaded with original amount");

  // ---------------------------------------------------------------------------
  // TEST 4: Multiple Post-Approval Iterations
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: Multiple Post-Approval Iterations ---");
  // Approve the amendment
  await service.recordDecision({
    cerprno: activeAfterAmendment!.cerprno,
    decision: "APPROVED",
    comments: "Amendment approved.",
    approver_name: "Technical Approver",
    approver_email: "approver1@vedanta.co.in",
    level_id: 1,
  });

  const approvedAmendment = await service.getProposalByNumber(allocatedCerId);
  assert(approvedAmendment?.status === "Approved", "Amendment 02 transitioned to 'Approved'");

  // Perform a 3rd submission
  const secondAmendmentPayload = {
    ...approvedAmendment!,
    proposal_no: "PR-AMENDMENT-03",
    amount: 1800000,
    status: "In Approval" as const,
  };

  await service.updateProposal(secondAmendmentPayload, initiator);

  const submissionsAfterSecond = await service.getAllSubmissionsForCER(allocatedCerId);
  assert(submissionsAfterSecond.active?.proposal_no === "PR-AMENDMENT-03", "Active is now PR-AMENDMENT-03");
  assert(submissionsAfterSecond.history.length === 2, "History now holds 2 approved snapshots (PR-AMENDMENT-02 and PR-ORIGINAL-01)");

  console.log("\n================================================================================");
  console.log(` PROPOSALS HISTORY TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    (process as any).exit?.(1);
  }
}

runProposalsHistoryVerification().catch((err) => {
  console.error("Test execution failed:", err);
  (process as any).exit?.(1);
});
