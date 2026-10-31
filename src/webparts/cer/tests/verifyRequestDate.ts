import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal } from "../models/CERModel";

async function runRequestDateVerification() {
  console.log("================================================================================");
  console.log(" CER MANAGEMENT SYSTEM — REQUEST DATE VERIFICATION SUITE");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✔ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${testName} ${details ? "- " + details : ""}`);
      failed++;
    }
  }

  const service = new LocalMockCERDataService();
  const today = new Date().toISOString().split("T")[0];

  // Baseline workflow configuration for tests
  await service.saveWorkflowLevels([
    {
      id: "lvl-1",
      level_id: 1,
      level_name: "Technical Review",
      role_title: "Technical Reviewer",
      approver_name: "Technical Approver",
      approver_email: "approver@vedanta.co.in",
      sbu: "RJ North",
      is_active: true,
      assignment_type: "SpecificUser",
      is_project_owner_stage: false,
    },
    {
      id: "lvl-2",
      level_id: 1,
      level_name: "Technical Review RJ South",
      role_title: "Technical Reviewer",
      approver_name: "Technical Approver",
      approver_email: "approver@vedanta.co.in",
      sbu: "RJ South",
      is_active: true,
      assignment_type: "SpecificUser",
      is_project_owner_stage: false,
    },
  ]);

  // ---------------------------------------------------------------------------
  // TEST 1: Direct proposal creation sets request_date to today
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 1: Direct proposal creation sets request_date ---");
  const baseProposal: Omit<ICERProposal, "id" | "cer_proposal_id" | "cerprno" | "created_date" | "modified_date" | "revision_count"> = {
    proposal_no: "PR-REQDATE-001",
    pr_name: "Test Request Date Proposal 1",
    owname: "Test Initiator",
    owner_email: "test.initiator@vedanta.co.in",
    sbu: "RJ North",
    status: "In Approval",
    object: "Validation for request date auto-population on direct create",
    amount: 1500000,
    currency: "USD",
    cat: "Essential",
    payable: "Payback",
    period: "12 Months",
    payback_quarters: 4,
    ben_npv: 250000,
    ben_irr: 18.5,
    cost_assumptions: "Cost assumptions",
    st_date: "2026-11-01",
    com_date: "2027-11-01",
    duration_months: 12,
    cbudget: "Yes",
    cb_amnt: 1500000,
    cb_currency: "USD",
    reason: "",
    jv: "No",
    jv_recoverable: "No",
    jv_cost: 0,
    jv_budget: "No",
    jv_amnt: 0,
    jv_reason: "",
    ph_till_label: "Till FY26",
    ph_fy_label: "FY27",
    ph_beyond_label: "Beyond",
    prod_till: 0,
    prod_fy: 0,
    prod_beyond: 0,
    capex_till: 0,
    capex_fy: 1500000,
    capex_beyond: 0,
    opex_till: 0,
    opex_fy: 0,
    opex_beyond: 0,
    engineer: 300000,
    s_fac: 700000,
    comis: 200000,
    preop: 100000,
    others: 200000,
    total: 1500000,
    remarks: "Justification test remarks",
    remarks_jv: "",
    current_level: 1,
    pending_with_role: "L1 Approver",
    pending_with_email: "",
    created_by: "Test Initiator",
    modified_by: "Test Initiator",
  };

  const createResult = await service.createProposal(baseProposal as any);
  assert(createResult.success, "Proposal created successfully");
  const createdProp = await service.getProposalByNumber(createResult.proposal.cerprno);
  assert(createdProp !== null, "Created proposal found in storage");
  assert(createdProp?.request_date === today, `request_date matches today (${createdProp?.request_date} === ${today})`);

  // ---------------------------------------------------------------------------
  // TEST 2: Draft creation does NOT set request_date
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: Draft proposal creation leaves request_date undefined ---");
  const draftProposal = {
    ...baseProposal,
    proposal_no: "PR-REQDATE-DRAFT",
    pr_name: "Test Draft Proposal",
    status: "Draft" as const,
  };

  const draftResult = await service.createProposal(draftProposal as any);
  const createdDraft = await service.getProposalByNumber(draftResult.proposal.cerprno);
  assert(createdDraft !== null, "Created draft found in storage");
  assert(!createdDraft?.request_date, "Draft request_date is not set prior to submission");

  // ---------------------------------------------------------------------------
  // TEST 3: Resubmitting an 'Approved CER' updates request_date to current date
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Resubmit of 'Approved CER' updates request_date ---");
  // Seed proposal CER-2026-0002 has status "Approved" and request_date "2026-01-15"
  const approvedSeed = await service.getProposalByNumber("CER-2026-0002");
  assert(approvedSeed !== null, "Approved seed proposal CER-2026-0002 exists");
  assert(approvedSeed?.status === "Approved", "CER-2026-0002 status is 'Approved'");
  assert(approvedSeed?.request_date === "2026-01-15", `Original request_date is 2026-01-15 (was: ${approvedSeed?.request_date})`);

  // Resubmit the Approved proposal as In Approval
  const resubmittedApproved = {
    ...approvedSeed!,
    amount: 9000000,
    status: "In Approval" as const,
  };

  await service.updateProposal(resubmittedApproved, {
    name: approvedSeed!.owname,
    email: approvedSeed!.owner_email,
  });

  const updatedApproved = await service.getProposalByNumber("CER-2026-0002");
  assert(updatedApproved?.request_date === today, `Resubmitted Approved CER request_date updated to today (${updatedApproved?.request_date} === ${today})`);

  // ---------------------------------------------------------------------------
  // TEST 4: Editing a 'Sendback CER' (status: 'Revised') preserves request_date
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: Editing 'Sendback CER' preserves original request_date ---");
  // First, submit a proposal and simulate an approver sending it back (SENT_BACK)
  const originalReqDate = "2026-02-01"; // set a fixed past request date to verify preservation
  const sendbackPropPayload = {
    ...baseProposal,
    proposal_no: "PR-REQDATE-SENDBACK",
    pr_name: "Proposal to be Sent Back",
    request_date: originalReqDate,
  };
  const sbCreateResult = await service.createProposal(sendbackPropPayload as any);
  const sbProp = await service.getProposalByNumber(sbCreateResult.proposal.cerprno);

  // Approver sends back the proposal
  await service.recordDecision({
    cerprno: sbProp!.cerprno,
    decision: "SENT_BACK",
    comments: "Please revise engineering estimates",
    approver_name: "Technical Approver",
    approver_email: "approver@vedanta.co.in",
    level_id: 1,
  });

  const sentBackProp = await service.getProposalByNumber(sbProp!.cerprno);
  assert(sentBackProp?.status === "Revised", "Proposal status transitioned to 'Revised' (Sendback)");
  assert(sentBackProp?.request_date === originalReqDate, `Sendback request_date is still ${originalReqDate}`);

  // Now, the initiator edits and resubmits the Sendback proposal
  const resubmittedSendback = {
    ...sentBackProp!,
    remarks: "Updated engineering estimates per reviewer feedback.",
    status: "In Approval" as const,
  };

  await service.updateProposal(resubmittedSendback, {
    name: sentBackProp!.owname,
    email: sentBackProp!.owner_email,
  });

  const afterSendbackResubmit = await service.getProposalByNumber(sbProp!.cerprno);
  assert(
    afterSendbackResubmit?.request_date === originalReqDate,
    `Resubmitted Sendback CER preserved original request_date (${afterSendbackResubmit?.request_date} === ${originalReqDate}) without updating to today`
  );

  console.log("\n================================================================================");
  console.log(` REQUEST DATE TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    (process as any).exit?.(1);
  }
}

runRequestDateVerification().catch((err) => {
  console.error("Test execution failed:", err);
  (process as any).exit?.(1);
});
