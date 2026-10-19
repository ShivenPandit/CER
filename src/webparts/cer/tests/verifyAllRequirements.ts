import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal, CATEGORY_DEFINITIONS, SBU_OPTIONS } from "../models/CERModel";
import { AUDIT_FIELD_DESCRIPTIONS, EXCLUDED_AUDIT_FIELDS } from "../models/AuditModel";
import { validateField, validateAll } from "../utils/cerValidation";

// Lightweight Test Harness for Node 22 execution
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runAllVerificationTests(): Promise<void> {
  console.log("================================================================================");
  console.log("SPX CER MANAGEMENT SYSTEM — COMPREHENSIVE REQUIREMENTS VERIFICATION SUITE");
  console.log("================================================================================\n");

  const service = new LocalMockCERDataService();

  // ---------------------------------------------------------------------------------------------
  // Test Suite 1: FR-01 Create CER
  // ---------------------------------------------------------------------------------------------
  console.log("Test Suite 1: FR-01 — Create CER Proposal & Concurrency Resistance");
  const propNo = await service.generateProposalNumber();
  assert(/^CER-\d{4}-\d{4}$/.test(propNo), `Generated Proposal Number matches format: ${propNo}`);

  const testProp: ICERProposal = {
    id: "prop-auto-001",
    cerprno: propNo,
    pr_name: "Automated Verification Test Project",
    owname: "Shiven Pandit",
    owner_email: "shiven.pandit@vedanta.co.in",
    sbu: "RJ North",
    status: "In Approval",
    object: "Pipeline Testing",
    amount: 7500000,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    period: "18 Months",
    ben_npv: 15.2,
    ben_irr: 28.0,
    cost_assumptions: "Assumed discount rate 10%",
    st_date: "2026-05-01",
    com_date: "2027-10-31",
    duration_months: 18,
    cbudget: "Yes",
    cb_amnt: 8000000,
    cb_currency: "USD",
    reason: "",
    jv: "Yes",
    jv_cost: 2250000,
    jv_budget: "Yes",
    jv_amnt: 2300000,
    jv_reason: "30% JV partner cost share",
    ph_till_label: "Till FY26",
    ph_fy_label: "FY 26-27",
    ph_beyond_label: "Beyond FY27",
    prod_till: 0,
    prod_fy: 600000,
    prod_beyond: 1200000,
    capex_till: 2500000,
    capex_fy: 3500000,
    capex_beyond: 1500000,
    opex_till: 100000,
    opex_fy: 300000,
    opex_beyond: 400000,
    engineer: 1000000,
    s_fac: 3500000,
    comis: 1000000,
    preop: 500000,
    others: 1500000,
    total: 7500000,
    remarks: "This proposal covers pipeline integrity augmentation and automated safety bypasses.",
    remarks_jv: "Partner ONGC confirmed.",
    current_level: 1,
    pending_with_role: "SBU Operations Head",
    pending_with_email: "rajesh.sharma@vedanta.co.in",
    created_date: new Date().toISOString(),
    created_by: "Shiven Pandit",
    modified_date: new Date().toISOString(),
    modified_by: "Shiven Pandit",
    revision_count: 0,
  };

  const createRes = await service.createProposal(testProp);
  assert(createRes.success === true, "Create CER returns success status");
  assert(
    createRes.message === "CER Proposal No. has been created and sent for approval",
    `Exact success message matches: "${createRes.message}"`
  );
  assert(createRes.proposal.current_level === 1, "Initial approval stage set to Level 1");

  // Duplicate proposal number protection
  let duplicateRejected = false;
  try {
    await service.createProposal({ ...testProp });
  } catch {
    duplicateRejected = true;
  }
  assert(duplicateRejected, "Duplicate proposal number submission rejected successfully");

  // ---------------------------------------------------------------------------------------------
  // Test Suite 2: FR-02 Change CER & Delta Audit Trail
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 2: FR-02 & FR-06 — Change CER & Field-Level Audit Trail");
  const modifiedProp: ICERProposal = {
    ...testProp,
    amount: 8200000,
    ben_npv: 18.5,
    remarks: "This proposal covers pipeline integrity augmentation with updated Q3 high-pressure compressors.",
  };

  const updateRes = await service.updateProposal(modifiedProp, {
    name: "Auditor Sharma",
    email: "sharma.auditor@vedanta.co.in",
  });

  assert(updateRes.success === true, "Update CER returns success");
  assert(
    updateRes.message === "CER Proposal No. has been changed and sent for approval",
    `Exact change message matches: "${updateRes.message}"`
  );
  assert(updateRes.auditRowsCount >= 3, `Delta comparator detected ${updateRes.auditRowsCount} modified fields`);

  const auditRows = await service.getAuditTrail(testProp.cerprno);
  const amountRow = auditRows.find((r) => r.field_name === "amount");
  assert(amountRow !== undefined, "Amount change logged in audit trail");
  assert(amountRow?.old_value === "7500000", `Old amount value recorded: ${amountRow?.old_value}`);
  assert(amountRow?.new_value === "8200000", `New amount value recorded: ${amountRow?.new_value}`);
  assert(
    amountRow?.field_desc === AUDIT_FIELD_DESCRIPTIONS.amount,
    `Mapped business description: "${amountRow?.field_desc}"`
  );

  // Technical fields exclusion check
  const technicalFieldPresent = auditRows.some((r) => EXCLUDED_AUDIT_FIELDS.has(r.field_name));
  assert(!technicalFieldPresent, "Technical metadata fields (CREATED_DATE, USRID, etc.) are excluded from audit trail");

  // ---------------------------------------------------------------------------------------------
  // Test Suite 3: FR-05 Multilevel Approval Workflow
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 3: FR-05 — Multilevel Approval Workflow & Notifications");
  const l1Decision = await service.recordDecision({
    cerprno: testProp.cerprno,
    level_id: 1,
    approver_name: "Rajesh Sharma",
    approver_email: "rajesh.sharma@vedanta.co.in",
    decision: "APPROVED",
    comments: "Level 1 Technical scope verified.",
  });
  assert(l1Decision.success === true, "Level 1 approval recorded");
  assert(l1Decision.nextLevel === 2, "Workflow successfully advanced to Level 2");

  const l2Decision = await service.recordDecision({
    cerprno: testProp.cerprno,
    level_id: 2,
    approver_name: "Sunil Verma",
    approver_email: "sunil.verma@vedanta.co.in",
    decision: "APPROVED",
    comments: "Level 2 Commercial clearance approved.",
  });
  assert(l2Decision.nextLevel === 3, "Workflow successfully advanced to Level 3");

  const l3Decision = await service.recordDecision({
    cerprno: testProp.cerprno,
    level_id: 3,
    approver_name: "Ananya Deshmukh",
    approver_email: "ananya.deshmukh@vedanta.co.in",
    decision: "APPROVED",
    comments: "Final executive committee sanction granted.",
  });
  assert(l3Decision.newStatus === "Approved", "Proposal achieved final Approved status");

  // Notifications visibility verification (Doc §8 #4)
  const notifs = await service.getNotificationLogs(testProp.cerprno);
  assert(notifs.length >= 3, `Dispatched ${notifs.length} automated workflow notifications`);
  const finalNotif = notifs[0];
  assert(
    finalNotif.recipients.indexOf("shiven.pandit@vedanta.co.in") !== -1,
    "Workflow notification marked to Creator"
  );
  assert(
    finalNotif.recipients.indexOf("rajesh.sharma@vedanta.co.in") !== -1,
    "Workflow notification marked to Previous Approvers"
  );

  // ---------------------------------------------------------------------------------------------
  // Test Suite 4: FR-08 Remarks Versioning & Word Limits
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 4: FR-08 — Remarks Versioning & Limit Controls");
  const remarksHistory = await service.getRemarksHistory(testProp.cerprno);
  assert(remarksHistory.length >= 2, `Maintained ${remarksHistory.length} historical remarks versions`);
  assert(remarksHistory[0].version > remarksHistory[1].version, "Versions are sorted newest first");
  assert(remarksHistory[0].word_count > 0, `Word count calculated: ${remarksHistory[0].word_count} words`);

  // ---------------------------------------------------------------------------------------------
  // Test Suite 5: BR-04 & BR-07 Strategic Master Data Validation
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 5: Business Rules — Master Data & Categories");
  assert(SBU_OPTIONS.indexOf("RJ North") !== -1, "SBU 'RJ North' is configured");
  assert(SBU_OPTIONS.indexOf("RJ South") !== -1, "SBU 'RJ South' is configured");
  assert(SBU_OPTIONS.indexOf("CBOS") !== -1, "SBU 'CBOS' is configured");
  assert(SBU_OPTIONS.indexOf("RAVA") !== -1, "SBU 'RAVA' is configured");
  assert((SBU_OPTIONS as string[]).indexOf("RJ01") === -1, "Legacy 'RJ01' option is omitted");
  assert((SBU_OPTIONS as string[]).indexOf("RJ Oil & Gas") === -1, "Legacy 'RJ Oil & Gas' option is omitted");
  assert(SBU_OPTIONS.length === 4, "SBU options strictly contain only the 4 approved options from requirement doc");

  assert(CATEGORY_DEFINITIONS.Vital !== undefined, "Vital Category definition present");
  assert(CATEGORY_DEFINITIONS.Essential !== undefined, "Essential Category definition present");
  assert(CATEGORY_DEFINITIONS.Desirable !== undefined, "Desirable Category definition present");

  // ---------------------------------------------------------------------------------------------
  // Test Suite 6: CER Form Field Mapping & Inline Validation Requirements
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 6: CER Form Field Mapping & Validation Rules");

  // Section A: Project Name bounds
  assert(validateField("pr_name", "AB", testProp) !== undefined, "Project Name < 3 chars rejected");
  assert(validateField("pr_name", "Valid Project Name", testProp) === undefined, "Project Name valid");
  assert(validateField("com_date", "2026-01-01", { ...testProp, st_date: "2026-06-01" }) !== undefined, "Completion date earlier than start date rejected");
  assert(validateField("object", "Short", testProp) !== undefined, "Objectives of CER < 10 chars rejected");

  // Section B: Amount & Payback Quarters
  assert(validateField("amount", 0, testProp) !== undefined, "Amount <= 0 rejected");
  assert(validateField("amount", 5000000, testProp) === undefined, "Valid positive amount accepted");
  assert(validateField("payback_quarters", 0, { ...testProp, payable: "Payback" }) !== undefined, "Payback quarters <= 0 rejected when Payback is selected");
  assert(validateField("payback_quarters", 8, { ...testProp, payable: "Payback" }) === undefined, "Valid positive quarters accepted");
  assert(validateField("ben_irr", 150, testProp) !== undefined, "IRR > 100% rejected");

  // Section C: Corporate Budget Reason
  assert(validateField("reason", "", { ...testProp, cbudget: "No" }) !== undefined, "Reason required when corporate budget is No");

  // Section D: JV Budget Reason & Recoverable
  assert(validateField("jv_reason", "", { ...testProp, jv_budget: "No" }) !== undefined, "Reason required when JV budget is No");
  assert(validateField("jv_recoverable", "Yes", testProp) === undefined, "JV Cost Recoverable valid value");

  // Full form submission vs draft
  const draftRes = validateAll({ ...testProp, pr_name: "", amount: 0 }, true);
  assert(draftRes.isValid === true, "Save Draft allows incomplete form data");

  const submitInvalidRes = validateAll({ ...testProp, pr_name: "", amount: 0 }, false);
  assert(submitInvalidRes.isValid === false, "Submit for Approval blocks invalid/incomplete form data");
  assert(submitInvalidRes.errors.pr_name !== undefined, "Missing Project Name flagged in submit errors");
  assert(submitInvalidRes.errors.amount !== undefined, "Missing Amount flagged in submit errors");

  // ---------------------------------------------------------------------------------------------
  // Test Results Summary
  // ---------------------------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log("================================================================================\n");

  if (failed > 0) {
    throw new Error(`Verification test suite failed with ${failed} assertion errors.`);
  }
}

runAllVerificationTests().catch((e: unknown) => {
  console.error("Test execution error:", e);
});
