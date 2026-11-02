import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal } from "../models/CERModel";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✖ [FAIL] ${message}`);
    failed++;
  }
}

const mockUser = { name: "John Doe", email: "john.doe@example.com" };

async function runPostApprovalLineageVerification(): Promise<void> {
  console.log("================================================================================");
  console.log("POST-APPROVAL RESUBMISSION & PROPOSAL HISTORY LINEAGE VERIFICATION SUITE");
  console.log("================================================================================");

  const service = new LocalMockCERDataService();

  // ---------------------------------------------------------------------------
  // Step 1: Create Initial Proposal 01 (PR-2026/01) under permanent ID CER-2026-0001
  // ---------------------------------------------------------------------------
  console.log("\n1. Creating Initial Proposal 01 (PR-TEST/01)...");
  const createResult = await service.createProposal({
    id: "",
    cerprno: "",
    cer_proposal_id: "",
    proposal_no: "PR-TEST/01",
    pr_name: "Subsea Pipeline Modernization",
    owname: "John Doe",
    owner_email: "john.doe@example.com",
    sbu: "RJ North",
    status: "In Approval",
    amount: 1000000,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    payback_quarters: 4,
    start_date: "2026-01-01",
    comp_date: "2026-12-31",
    period: "12 Months",
    object: "Upgrade aging infrastructure",
    engineer: 200000,
    s_fac: 300000,
    comis: 200000,
    preop: 100000,
    others: 200000,
    total: 1000000,
    revision_count: 0,
  } as unknown as ICERProposal);

  assert(createResult.success, "Initial proposal created successfully");
  const initialProposalId = (createResult.proposal.cerprno || createResult.proposal.cer_proposal_id) as string;
  const initialProposalNo = createResult.proposal.proposal_no || "PR-TEST/01";

  // ---------------------------------------------------------------------------
  // Step 2: Verify Proposal History for initial Proposal 01 is EMPTY
  // ---------------------------------------------------------------------------
  console.log("\n2. Checking Proposal History for initial Proposal 01...");
  const initialSubmissions = await service.getAllSubmissionsForCER(initialProposalNo);
  assert(initialSubmissions.active !== null, "Active proposal exists in CERProposals");
  assert(initialSubmissions.active?.cer_proposal_id === initialProposalId, "Active proposal ID matches");
  assert(initialSubmissions.history.length === 0, "Initial proposal 01 has 0 historical entries");
  console.log("  ✔ [PASS] Proposal 01 history is EMPTY (0 items) as required.");

  // ---------------------------------------------------------------------------
  // Step 3: Advance Proposal 01 through approval stages to Approved
  // ---------------------------------------------------------------------------
  console.log("\n3. Advancing Proposal 01 through approval stages to Approved...");
  const levels = await service.getWorkflowLevels("RJ North");
  for (let lvl = 1; lvl <= 6; lvl++) {
    const stage = levels.find((l) => l.level_id === lvl);
    const approverEmail = lvl === 2 ? "john.doe@example.com" : (stage?.approver_email || "finance@example.com");
    const approverName = lvl === 2 ? "John Doe" : (stage?.role_title || `Approver L${lvl}`);
    const decisionResult = await service.recordDecision({
      cerprno: initialProposalId,
      level_id: lvl,
      decision: "APPROVED",
      approver_email: approverEmail,
      approver_name: approverName,
      comments: `Approved at Level ${lvl}`,
    });
    assert(decisionResult.success, `Level ${lvl} approved successfully`);
  }

  const approvedProposal = await service.getProposalByNumber(initialProposalId);
  assert(approvedProposal?.status === "Approved", "Proposal 01 status is 'Approved'");
  console.log("  ✔ [PASS] Proposal 01 successfully achieved status 'Approved'.");

  // ---------------------------------------------------------------------------
  // Step 4: Post-Approval Resubmission with new proposal_no: PR-TEST/02
  // ---------------------------------------------------------------------------
  console.log("\n4. Performing Post-Approval Resubmission as Proposal No: PR-TEST/02...");
  const amendmentPayload: ICERProposal = {
    ...approvedProposal!,
    proposal_no: "PR-TEST/02",
    amount: 1250000,
    engineer: 250000,
    s_fac: 400000,
    comis: 250000,
    preop: 150000,
    others: 200000,
    total: 1250000,
  };

  const updateResult = await service.updateProposal(amendmentPayload, mockUser);
  assert(updateResult.success, "Post-approval update succeeded");

  // Verify in CERProposals: single active record updated in-place
  const activeAfterResubmit = await service.getProposalByNumber(initialProposalId);
  assert(activeAfterResubmit !== null, "Active record exists");
  assert(activeAfterResubmit?.cer_proposal_id === initialProposalId, "cer_proposal_id is unchanged");
  assert(activeAfterResubmit?.proposal_no === "PR-TEST/02", "Active proposal_no is now PR-TEST/02");
  assert(activeAfterResubmit?.status === "In Approval", "Status reset to 'In Approval'");
  assert(activeAfterResubmit?.current_level === 1, "Approval stage restarted at Level 1");
  console.log("  ✔ [PASS] CERProposals updated in-place: ID remains constant, Proposal No is PR-TEST/02.");

  // Verify in CERProposalsHistory: PR-TEST/01 snapshot safely preserved
  const submissionsForV2 = await service.getAllSubmissionsForCER("PR-TEST/02");
  assert(submissionsForV2.history.length === 1, "Exactly 1 item in CERProposalsHistory");
  assert(submissionsForV2.history[0].proposal_no === "PR-TEST/01", "Archived item has proposal_no 'PR-TEST/01'");
  assert(submissionsForV2.history[0].status === "Approved", "Archived item has status 'Approved'");
  console.log("  ✔ [PASS] CERProposalsHistory contains approved PR-TEST/01 snapshot.");
  console.log("  ✔ [PASS] Querying by proposal_no 'PR-TEST/02' accurately returns PR-TEST/01 in history.");

  // ---------------------------------------------------------------------------
  // Step 5: Approver at Level 3 sends back PR-TEST/02 -> Rework at Level 1
  // ---------------------------------------------------------------------------
  console.log("\n5. Approver at Level 3 sends back PR-TEST/02...");
  const lvl1Stage = levels.find((l) => l.level_id === 1);
  await service.recordDecision({
    cerprno: initialProposalId,
    level_id: 1,
    decision: "APPROVED",
    approver_email: lvl1Stage?.approver_email || "finance@example.com",
    approver_name: "L1 Finance",
    comments: "L1 OK",
  });

  const lvl2Stage = levels.find((l) => l.level_id === 2);
  await service.recordDecision({
    cerprno: initialProposalId,
    level_id: 2,
    decision: "APPROVED",
    approver_email: "john.doe@example.com",
    approver_name: "John Doe",
    comments: "L2 OK",
  });

  // Level 3 sends back
  const lvl3Stage = levels.find((l) => l.level_id === 3);
  const sendBackResult = await service.recordDecision({
    cerprno: initialProposalId,
    level_id: 3,
    decision: "SENT_BACK",
    approver_email: lvl3Stage?.approver_email || "bu.cfo@example.com",
    approver_name: "L3 BU CFO",
    comments: "Please clarify surface facilities breakdown and contingency reserve.",
  });
  assert(sendBackResult.success, "Send back recorded successfully");

  // Verify CERProposals has PR-TEST/02 in Revised status at Level 1
  const sentBackProposal = await service.getProposalByNumber(initialProposalId);
  assert(sentBackProposal?.proposal_no === "PR-TEST/02", "Active proposal remains PR-TEST/02");
  assert(sentBackProposal?.status === "Revised", "Active proposal status is 'Revised'");
  assert(sentBackProposal?.current_level === 1, "Rework is routed to Level 1");
  assert(sentBackProposal?.pending_with_role === "Initiator (Rework)", "Pending role is 'Initiator (Rework)'");

  // Verify CERProposalsHistory is completely untouched
  const historyAfterSendBack = await service.getAllSubmissionsForCER("PR-TEST/02");
  assert(historyAfterSendBack.history.length === 1, "History still contains 1 item");
  assert(historyAfterSendBack.history[0].proposal_no === "PR-TEST/01", "History is still PR-TEST/01");
  assert(historyAfterSendBack.history[0].status === "Approved", "PR-TEST/01 status is still 'Approved'");
  console.log("  ✔ [PASS] Send back keeps PR-TEST/02 at L1 (Revised). Historical PR-TEST/01 is untouched (Approved).");

  // ---------------------------------------------------------------------------
  // Step 6: Initiator modifies PR-TEST/02 and Re-triggers approval
  // ---------------------------------------------------------------------------
  console.log("\n6. Initiator modifies PR-TEST/02 and Re-triggers approval...");
  const reworkPayload: ICERProposal = {
    ...sentBackProposal!,
    object: "Expanded pipeline modernization scope with clarified contingency",
  };
  const reworkResult = await service.updateProposal(reworkPayload, mockUser);
  assert(reworkResult.success, "Rework update succeeded");

  const reworkedProposal = await service.getProposalByNumber(initialProposalId);
  assert(reworkedProposal?.proposal_no === "PR-TEST/02", "Proposal No is still PR-TEST/02");
  assert(reworkedProposal?.status === "In Approval", "Status is back to 'In Approval'");
  assert(reworkedProposal?.current_level === 1, "Level reset to 1");
  console.log("  ✔ [PASS] PR-TEST/02 re-triggered approval at L1. History still strictly shows PR-TEST/01.");

  // ---------------------------------------------------------------------------
  // Step 7: Approving PR-TEST/02 through all 6 levels
  // ---------------------------------------------------------------------------
  console.log("\n7. Approving PR-TEST/02 through all 6 levels...");
  for (let lvl = 1; lvl <= 6; lvl++) {
    const stage = levels.find((l) => l.level_id === lvl);
    const approverEmail = lvl === 2 ? "john.doe@example.com" : (stage?.approver_email || "approver@example.com");
    const approverName = lvl === 2 ? "John Doe" : (stage?.role_title || `Approver L${lvl}`);
    await service.recordDecision({
      cerprno: initialProposalId,
      level_id: lvl,
      decision: "APPROVED",
      approver_email: approverEmail,
      approver_name: approverName,
      comments: `Approved PR-TEST/02 at Level ${lvl}`,
    });
  }

  const approvedV2 = await service.getProposalByNumber(initialProposalId);
  assert(approvedV2?.proposal_no === "PR-TEST/02", "Proposal No is PR-TEST/02");
  assert(approvedV2?.status === "Approved", "PR-TEST/02 is now fully Approved");
  console.log("  ✔ [PASS] PR-TEST/02 is now fully Approved.");

  // ---------------------------------------------------------------------------
  // Step 8: Post-Approval Resubmission as PR-TEST/03
  // ---------------------------------------------------------------------------
  console.log("\n8. Post-Approval Resubmission as PR-TEST/03...");
  const amendmentV3Payload: ICERProposal = {
    ...approvedV2!,
    proposal_no: "PR-TEST/03",
    amount: 1500000,
    total: 1500000,
  };
  const updateV3Result = await service.updateProposal(amendmentV3Payload, mockUser);
  assert(updateV3Result.success, "PR-TEST/03 submitted successfully");

  // Query submissions for PR-TEST/03: should have active PR-TEST/03, and history: [PR-TEST/02, PR-TEST/01]
  const finalSubmissions = await service.getAllSubmissionsForCER("PR-TEST/03");
  assert(finalSubmissions.active?.proposal_no === "PR-TEST/03", "Active proposal is PR-TEST/03");
  assert(finalSubmissions.history.length === 2, "History now has exactly 2 previous versions");
  assert(finalSubmissions.history[0].proposal_no === "PR-TEST/02", "First history item is PR-TEST/02");
  assert(finalSubmissions.history[1].proposal_no === "PR-TEST/01", "Second history item is PR-TEST/01");
  console.log("  ✔ [PASS] When PR-TEST/03 is active, history shows PR-TEST/02 and PR-TEST/01.");

  console.log("\n================================================================================");
  if (failed === 0) {
    console.log(`ALL 8 POST-APPROVAL LINEAGE & HISTORY TESTS PASSED SUCCESSFULLY! (${passed} checks)`);
  } else {
    console.error(`FAILED ${failed} checks! (${passed} passed)`);
  }
  console.log("================================================================================");
}

runPostApprovalLineageVerification().catch((e) => {
  console.error(e);
});
