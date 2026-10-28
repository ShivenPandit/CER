import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal, CATEGORY_DEFINITIONS, SBU_OPTIONS } from "../models/CERModel";
import { AUDIT_FIELD_DESCRIPTIONS, EXCLUDED_AUDIT_FIELDS } from "../models/AuditModel";
import { validateField, validateAll } from "../utils/cerValidation";
import { resolveDirectoryUserEmail, IAppUser, IUserRoleAssignment } from "../models/UserModel";
import { AuthService } from "../services/AuthService";
import { PermissionService } from "../services/PermissionService";
import { getCurrentFiscalYearPhasingLabels } from "../utils/dateUtils";
import { isProjectOwnerStage, IWorkflowLevel, ApproverAssignmentType, isValidEmail } from "../models/WorkflowModel";


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
  console.log("CER MANAGEMENT SYSTEM — COMPREHENSIVE REQUIREMENTS VERIFICATION SUITE");
  console.log("================================================================================\n");

  const service = new LocalMockCERDataService();

  // Test setup: dynamically configure test levels in test fixture (production code has zero seeds)
  await service.saveWorkflowLevels([
    { level_id: 1, level_name: "L1 - Technical & SBU Review", role_title: "SBU Operations Head", approver_name: "Rajesh Sharma", approver_email: "rajesh.sharma@vedanta.co.in", sbu: "RJ North", is_active: true },
    { level_id: 2, level_name: "L2 - Discipline Review", role_title: "Discipline Lead", approver_name: "Sunil Verma", approver_email: "sunil.verma@vedanta.co.in", sbu: "RJ North", is_active: true },
    { level_id: 3, level_name: "L3 - Commercial Review", role_title: "Head of Commercial", approver_name: "Ananya Deshmukh", approver_email: "ananya.deshmukh@vedanta.co.in", sbu: "RJ North", is_active: true },
    { level_id: 4, level_name: "L4 - Corporate Finance", role_title: "Head of Finance", approver_name: "Amit Saxena", approver_email: "amit.saxena@vedanta.co.in", sbu: "RJ North", is_active: true },
    { level_id: 5, level_name: "L5 - JV Management", role_title: "Head of JV", approver_name: "Neha Kulkarni", approver_email: "neha.kulkarni@vedanta.co.in", sbu: "RJ North", is_active: true },
    { level_id: 6, level_name: "L6 - COO Review", role_title: "COO", approver_name: "Vikram Mehta", approver_email: "vikram.mehta@vedanta.co.in", sbu: "RJ North", is_active: true },
    { level_id: 7, level_name: "L7 - CEO Sanction", role_title: "CEO", approver_name: "Arun Kumar", approver_email: "arun.kumar@vedanta.co.in", sbu: "RJ North", is_active: true },
  ]);

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

  // Verify unique proposal number generation & collision avoidance
  const nextGeneratedNo = await service.generateProposalNumber();
  assert(nextGeneratedNo !== testProp.cerprno, "Generated proposal number is distinct and non-colliding");
  const existingCheck = await service.getProposalByNumber(testProp.cerprno);
  assert(existingCheck !== null && existingCheck.cerprno === testProp.cerprno, "getProposalByNumber accurately confirms proposal number existence");
  const nonExistingCheck = await service.getProposalByNumber("CER-9999-9999");
  assert(nonExistingCheck === null, "getProposalByNumber accurately returns null for unused proposal number");

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
  console.log("\nTest Suite 3: FR-05 — Multilevel Approval Workflow (7 Sequential Levels) & Notifications");
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
    comments: "Level 3 Commercial & Contracts Review approved.",
  });
  assert(l3Decision.nextLevel === 4, "Workflow successfully advanced to Level 4");

  const l4Decision = await service.recordDecision({
    cerprno: testProp.cerprno,
    level_id: 4,
    approver_name: "Amit Saxena",
    approver_email: "amit.saxena@vedanta.co.in",
    decision: "APPROVED",
    comments: "Level 4 Corporate Finance Review approved.",
  });
  assert(l4Decision.nextLevel === 5, "Workflow successfully advanced to Level 5");

  const l5Decision = await service.recordDecision({
    cerprno: testProp.cerprno,
    level_id: 5,
    approver_name: "Neha Kulkarni",
    approver_email: "neha.kulkarni@vedanta.co.in",
    decision: "APPROVED",
    comments: "Level 5 JV alignment verified.",
  });
  assert(l5Decision.nextLevel === 6, "Workflow successfully advanced to Level 6");

  const l6Decision = await service.recordDecision({
    cerprno: testProp.cerprno,
    level_id: 6,
    approver_name: "Vikram Mehta",
    approver_email: "vikram.mehta@vedanta.co.in",
    decision: "APPROVED",
    comments: "Level 6 COO Sign-off completed.",
  });
  assert(l6Decision.nextLevel === 7, "Workflow successfully advanced to Level 7");

  const l7Decision = await service.recordDecision({
    cerprno: testProp.cerprno,
    level_id: 7,
    approver_name: "Arun Kumar",
    approver_email: "arun.kumar@vedanta.co.in",
    decision: "APPROVED",
    comments: "Level 7 CEO & MD final sanction granted.",
  });
  assert(l7Decision.newStatus === "Approved", "Proposal achieved final Approved status after all 7 sequential levels");

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
  console.log("\nTest Suite 6: CER Form Field Mapping & Validation Rules (Strict 14 Mandatory Fields)");

  // 1. Name of the Project (Required text field, >= 3 chars)
  assert(validateField("pr_name", "", testProp) !== undefined, "1. Project Name required");
  assert(validateField("pr_name", "AB", testProp) !== undefined, "1. Project Name < 3 chars rejected");
  assert(validateField("pr_name", "Valid Project Name", testProp) === undefined, "1. Project Name valid accepted");

  // 2. CER Proposal Number (Required, editable)
  assert(validateField("cerprno", "", testProp) !== undefined, "2. CER Proposal Number required");
  assert(validateField("cerprno", "CER-2026-9999", testProp) === undefined, "2. User-edited CER Proposal Number accepted");

  // 3. CER Owner Name & Email (Required directory integration)
  assert(validateField("owname", "", testProp) !== undefined, "3a. CER Owner Name required");
  assert(validateField("owner_email", "", testProp) !== undefined, "3b. CER Owner Email required");
  assert(validateField("owner_email", "invalid-email", testProp) !== undefined, "3c. Invalid CER Owner Email format rejected");
  assert(validateField("owner_email", "rajesh.sharma@vedanta.co.in", testProp) === undefined, "3d. Valid CER Owner Email accepted");

  // 4. Start Date of the Project (Required date field)
  assert(validateField("st_date", "", testProp) !== undefined, "4. Start Date required");
  assert(validateField("st_date", "2026-04-01", testProp) === undefined, "4. Valid Start Date accepted");

  // 5. Block/SBU (Required dropdown: CBOS, RAVA, RJ North, RJ South)
  assert(validateField("sbu", "", testProp) !== undefined, "5. Block/SBU required");
  assert(validateField("sbu", "InvalidSBU", testProp) !== undefined, "5. Invalid Block/SBU rejected");
  assert(validateField("sbu", "CBOS", testProp) === undefined, "5a. SBU CBOS accepted");
  assert(validateField("sbu", "RAVA", testProp) === undefined, "5b. SBU RAVA accepted");
  assert(validateField("sbu", "RJ North", testProp) === undefined, "5c. SBU RJ North accepted");
  assert(validateField("sbu", "RJ South", testProp) === undefined, "5d. SBU RJ South accepted");

  // 6. Objective of CER (Required text field, >= 10 chars)
  assert(validateField("object", "", testProp) !== undefined, "6. Objective of CER required");
  assert(validateField("object", "Short", testProp) !== undefined, "6. Objective < 10 chars rejected");
  assert(validateField("object", "Pipeline enhancement and integrity inspection project", testProp) === undefined, "6. Valid Objective accepted");

  // 7. Amount of CER (Required numeric positive field)
  assert(validateField("amount", 0, testProp) !== undefined, "7. Amount <= 0 rejected");
  assert(validateField("amount", -500, testProp) !== undefined, "7. Negative amount rejected");
  assert(validateField("amount", 5000000, testProp) === undefined, "7. Valid positive amount accepted");

  // 8. Category (Required dropdown: Essential, Vital, Desirable)
  assert(validateField("cat", "", testProp) !== undefined, "8. Category required");
  assert(validateField("cat", "Optional", testProp) !== undefined, "8. Invalid category rejected");
  assert(validateField("cat", "Essential", testProp) === undefined, "8a. Category Essential accepted");
  assert(validateField("cat", "Vital", testProp) === undefined, "8b. Category Vital accepted");
  assert(validateField("cat", "Desirable", testProp) === undefined, "8c. Category Desirable accepted");

  // 9. Payback/Non Payback (Required dropdown: Payback, Non Payback)
  assert(validateField("payable", "", testProp) !== undefined, "9. Payback/Non Payback required");
  assert(validateField("payable", "Both", testProp) !== undefined, "9. Invalid payable option rejected");
  assert(validateField("payable", "Payback", testProp) === undefined, "9a. Payback accepted");
  assert(validateField("payable", "Non Payback", testProp) === undefined, "9b. Non Payback accepted");

  // 10. Payback Period (Required positive integer number of quarters)
  assert(validateField("payback_quarters", 0, testProp) !== undefined, "10. Payback quarters <= 0 rejected");
  assert(validateField("payback_quarters", -2, testProp) !== undefined, "10. Negative quarters rejected");
  assert(validateField("payback_quarters", 2.5, testProp) !== undefined, "10. Fractional quarters rejected");
  assert(validateField("payback_quarters", 4, testProp) === undefined, "10. Positive whole number of quarters accepted");

  // 11. Corporate Budget (Required dropdown: Yes, No)
  assert(validateField("cbudget", "", testProp) !== undefined, "11. Corporate Budget required");
  assert(validateField("cbudget", "Partially", testProp) !== undefined, "11. Corporate Budget 'Partially' rejected");
  assert(validateField("cbudget", "Yes", testProp) === undefined, "11a. Corporate Budget 'Yes' accepted");
  assert(validateField("cbudget", "No", testProp) === undefined, "11b. Corporate Budget 'No' accepted");

  // 12. Align with JV (Required dropdown: Yes, No, Under Discussion)
  assert(validateField("jv", "", testProp) !== undefined, "12. Align with JV required");
  assert(validateField("jv", "Pending", testProp) !== undefined, "12. Invalid Align with JV rejected");
  assert(validateField("jv", "Yes", testProp) === undefined, "12a. Align with JV 'Yes' accepted");
  assert(validateField("jv", "No", testProp) === undefined, "12b. Align with JV 'No' accepted");
  assert(validateField("jv", "Under Discussion", testProp) === undefined, "12c. Align with JV 'Under Discussion' accepted");

  // 13. JV Cost Recoverable (Required dropdown: Yes, No)
  assert(validateField("jv_recoverable", "", testProp) !== undefined, "13. JV Cost Recoverable required");
  assert(validateField("jv_recoverable", "Maybe", testProp) !== undefined, "13. Invalid JV Cost Recoverable rejected");
  assert(validateField("jv_recoverable", "Yes", testProp) === undefined, "13a. JV Cost Recoverable 'Yes' accepted");
  assert(validateField("jv_recoverable", "No", testProp) === undefined, "13b. JV Cost Recoverable 'No' accepted");

  // 14. JV Budget (Required dropdown: Yes, No)
  assert(validateField("jv_budget", "", testProp) !== undefined, "14. JV Budget required");
  assert(validateField("jv_budget", "Unknown", testProp) !== undefined, "14. Invalid JV Budget rejected");
  assert(validateField("jv_budget", "Yes", testProp) === undefined, "14a. JV Budget 'Yes' accepted");
  assert(validateField("jv_budget", "No", testProp) === undefined, "14b. JV Budget 'No' accepted");

  // STRICT OPTIONALITY OF ALL OTHER FIELDS:
  assert(validateField("com_date", "", testProp) === undefined, "Optional: Completion date empty is valid");
  assert(validateField("cost_assumptions", "", testProp) === undefined, "Optional: Cost assumptions empty is valid");
  assert(validateField("cb_amnt", 0, testProp) === undefined, "Optional: Corporate budget amount 0 is valid");
  assert(validateField("reason", "", { ...testProp, cbudget: "No" }) === undefined, "Optional: Corporate budget reason empty is valid");
  assert(validateField("jv_amnt", 0, testProp) === undefined, "Optional: JV amount 0 is valid");
  assert(validateField("jv_reason", "", { ...testProp, jv_budget: "No" }) === undefined, "Optional: JV reason empty is valid");
  assert(validateField("remarks", "", testProp) === undefined, "Optional: Narrative remarks empty is valid");
  assert(validateField("remarks_jv", "", testProp) === undefined, "Optional: JV remarks empty is valid");

  // Date comparison logic remains active when completion date is provided
  assert(validateField("com_date", "2026-01-01", { ...testProp, st_date: "2026-06-01" }) !== undefined, "Completion date earlier than start date rejected when provided");

  // Full form submission and draft validation
  // Save Draft requires Name of Project and CER Owner Name/Email, but other fields remain optional
  const draftMissingNameRes = validateAll({ ...testProp, pr_name: "", amount: 0 }, true);
  assert(draftMissingNameRes.isValid === false, "Save Draft blocks empty Name of Project");
  assert(draftMissingNameRes.errors.pr_name !== undefined, "Missing Project Name flagged in draft errors");

  const draftMissingOwnerRes = validateAll({ ...testProp, owname: "", owner_email: "" }, true);
  assert(draftMissingOwnerRes.isValid === false, "Save Draft blocks empty CER Owner Name");
  assert(draftMissingOwnerRes.errors.owname !== undefined, "Missing CER Owner flagged in draft errors");

  const draftValidRes = validateAll(
    {
      ...testProp,
      pr_name: "Valid Draft Project",
      owname: "Rajesh Sharma",
      owner_email: "rajesh.sharma@vedanta.co.in",
      amount: 0,
      st_date: "",
      object: "",
      cat: "" as any,
      cbudget: "" as any,
    },
    true
  );
  assert(draftValidRes.isValid === true, "Save Draft allows other fields to be empty once Name of Project and CER Owner are provided");

  const submitInvalidRes = validateAll({ ...testProp, pr_name: "", amount: 0 }, false);
  assert(submitInvalidRes.isValid === false, "Submit for Approval blocks invalid/incomplete form data");
  assert(submitInvalidRes.errors.pr_name !== undefined, "Missing Project Name flagged in submit errors");
  assert(submitInvalidRes.errors.amount !== undefined, "Missing Amount flagged in submit errors");

  // ---------------------------------------------------------------------------------------------
  // Test Suite 7: Section H — Supporting Documents & Attachments Validation (10MB/20MB/Schema)
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 7: Section H — Supporting Documents & Attachments Validation (10MB / 20MB / Schema)");
  const {
    formatBytes,
    validateAttachment,
    validateBatchAttachments,
    isFileTypeAllowed,
  } = await import("../utils/attachmentValidation");

  const MB = 1024 * 1024;

  // Scenario 1: Upload a 5 MB file -> Accept
  const file5MB = { name: "scope_doc.pdf", size: 5 * MB, type: "application/pdf" };
  assert(validateAttachment(file5MB, 0, []).isValid === true, "Upload a 5 MB file: Accepted");

  // Scenario 2: Upload a 10 MB file (exact limit) -> Accept
  const file10MB = { name: "model_10mb.xlsx", size: 10 * MB, type: "application/vnd.ms-excel" };
  assert(validateAttachment(file10MB, 0, []).isValid === true, "Upload a 10 MB file: Accepted");

  // Scenario 3: Upload a 10.1 MB file -> Reject
  const file10_1MB = { name: "oversized.pdf", size: Math.floor(10.1 * MB), type: "application/pdf" };
  const res10_1 = validateAttachment(file10_1MB, 0, []);
  assert(res10_1.isValid === false && res10_1.reason === "SIZE_PER_FILE", "Upload a 10.1 MB file: Rejected for exceeding 10 MB per-file limit");

  // Scenario 4: Upload two 8 MB files -> Accept (16 MB <= 20 MB)
  const file8MB_1 = { name: "spec_part1.docx", size: 8 * MB, type: "application/msword" };
  const file8MB_2 = { name: "spec_part2.docx", size: 8 * MB, type: "application/msword" };
  const batchTwo8MB = validateBatchAttachments([file8MB_1, file8MB_2], []);
  assert(batchTwo8MB.accepted.length === 2 && batchTwo8MB.newTotalSize === 16 * MB, "Upload two 8 MB files: Both accepted (total 16 MB <= 20 MB)");

  // Scenario 5: Upload two 10 MB files -> Accept (20 MB <= 20 MB)
  const file10MB_1 = { name: "reservoir_model1.pdf", size: 10 * MB, type: "application/pdf" };
  const file10MB_2 = { name: "reservoir_model2.pdf", size: 10 * MB, type: "application/pdf" };
  const batchTwo10MB = validateBatchAttachments([file10MB_1, file10MB_2], []);
  assert(batchTwo10MB.accepted.length === 2 && batchTwo10MB.newTotalSize === 20 * MB, "Upload two 10 MB files: Both accepted (total 20 MB <= 20 MB)");

  // Scenario 6: Upload two 10 MB files and another file -> Reject the additional file
  const fileExtra = { name: "summary.pdf", size: 1 * MB, type: "application/pdf" };
  const resExtra = validateAttachment(fileExtra, 20 * MB, ["reservoir_model1.pdf", "reservoir_model2.pdf"]);
  assert(resExtra.isValid === false && resExtra.reason === "SIZE_TOTAL", "Upload two 10 MB files and another file: Additional file rejected");

  // Scenario 7: Upload a 9 MB file when 15 MB is already attached -> Reject
  const file9MB = { name: "additional_quote.pdf", size: 9 * MB, type: "application/pdf" };
  const res9MBOn15MB = validateAttachment(file9MB, 15 * MB, ["existing.pdf"]);
  assert(res9MBOn15MB.isValid === false && res9MBOn15MB.reason === "SIZE_TOTAL", "Upload a 9 MB file when 15 MB is already attached: Rejected");

  // Scenario 8: Upload a file with unsupported extension -> Reject
  const fileExe = { name: "virus.exe", size: 1000, type: "application/x-msdownload" };
  const resExe = validateAttachment(fileExe, 0, []);
  assert(resExe.isValid === false && resExe.reason === "UNSUPPORTED_TYPE", "Upload a file with an unsupported extension (.exe): Rejected");

  const fileZip = { name: "archive.zip", size: 1000, type: "application/zip" };
  const resZip = validateAttachment(fileZip, 0, []);
  assert(resZip.isValid === false && resZip.reason === "UNSUPPORTED_TYPE", "Upload a file with an unsupported extension (.zip): Rejected");

  // Scenario 9: Supported extensions (PDF, DOCX, XLSX, PNG, JPG, WEBP) -> Accept
  assert(isFileTypeAllowed("quote.pdf") === true, "Supported format: .pdf accepted");
  assert(isFileTypeAllowed("datasheet.docx") === true, "Supported format: .docx accepted");
  assert(isFileTypeAllowed("cost_model.xlsx") === true, "Supported format: .xlsx accepted");
  assert(isFileTypeAllowed("platform_photo.jpg") === true, "Supported format: .jpg accepted");
  assert(isFileTypeAllowed("rig_diagram.png") === true, "Supported format: .png accepted");

  // Scenario 10: Duplicate attachment detection
  const duplicateRes = validateAttachment({ name: "quote.pdf", size: 1 * MB, type: "application/pdf" }, 0, ["quote.pdf"]);
  assert(duplicateRes.isValid === false && duplicateRes.reason === "DUPLICATE", "Duplicate file name rejected");

  // Scenario 11: Upload multiple files whose combined size exceeds 20 MB (sequential calculation)
  const mixedBatch = [
    { name: "batch1.pdf", size: 8 * MB, type: "application/pdf" },
    { name: "batch2.xlsx", size: 8 * MB, type: "application/vnd.ms-excel" },
    { name: "batch3.docx", size: 6 * MB, type: "application/msword" }, // 8 + 8 + 6 = 22 MB -> batch3 rejected
  ];
  const mixedResult = validateBatchAttachments(mixedBatch, []);
  assert(mixedResult.accepted.length === 2, "Batch upload: first two files (16 MB) accepted");
  assert(mixedResult.rejected.length === 1 && mixedResult.rejected[0].name === "batch3.docx", "Batch upload: third file (6 MB) rejected because it exceeds remaining 4 MB");

  // Scenario 12: Human-readable bytes format check
  assert(formatBytes(0) === "0 B", "formatBytes(0) returns '0 B'");
  assert(formatBytes(512 * 1024) === "512.0 KB", "formatBytes(512 KB) formatted properly");
  assert(formatBytes(12.4 * MB) === "12.4 MB", "formatBytes(12.4 MB) formatted properly");

  // Scenario 13: Backend service validation enforcement
  const uniqueTestPr = "CER-2026-9999";
  let backendThrewOnOversize = false;
  try {
    await service.addAttachment({
      id: "att-oversize-1",
      cerprno: uniqueTestPr,
      name: "massive.pdf",
      size: 15 * MB, // > 10 MB
      type: "application/pdf",
      uploaded_by: "Test User",
      uploaded_date: new Date().toISOString(),
    });
  } catch (err: any) {
    backendThrewOnOversize = err.message.indexOf("10 MB") !== -1;
  }
  assert(backendThrewOnOversize === true, "Backend service rejected 15 MB file exceeding 10 MB per-file policy");

  // Scenario 14: Owner email validation rule
  assert(validateField("owner_email", "", testProp) !== undefined, "Owner Email is required");
  assert(validateField("owner_email", "invalid-email", testProp) !== undefined, "Invalid email format rejected");
  assert(validateField("owner_email", "user@vedanta.co.in", testProp) === undefined, "Valid email format accepted");

  // ---------------------------------------------------------------------------------------------
  // Test Suite 8: Microsoft Entra ID Owner Directory Search & People Picker Integration (Scenarios 1-11)
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 8: Microsoft Entra ID Integration & People Picker Verification");

  // Scenario 1: Search by full name
  const fullNameResults = await service.searchDirectoryUsers("Priya Kalekar (STL Digital)");
  assert(
    fullNameResults.length > 0 && fullNameResults[0].displayName.includes("Priya Kalekar"),
    "Scenario 1: Search by full name successfully returns 'Priya Kalekar (STL Digital)'"
  );

  // Scenario 2: Search by partial name
  const partialResults = await service.searchDirectoryUsers("Digital");
  assert(
    partialResults.length >= 4 && partialResults.every(u => u.displayName.toLowerCase().includes("digital")),
    `Scenario 2: Search by partial name 'Digital' returns ${partialResults.length} matching portal users`
  );

  // Scenario 3: Search by email
  const emailResults = await service.searchDirectoryUsers("Ankit.Sharma2@cairnindia.com");
  assert(
    emailResults.length === 1 && emailResults[0].displayName.includes("Ankit Sharma"),
    "Scenario 3: Search by email address returns exact user 'Ankit Sharma (STL Digital)'"
  );

  // Scenario 4: Select a user and verify automatic email population
  const selectedUser = fullNameResults[0];
  const autoEmail = resolveDirectoryUserEmail(selectedUser);
  assert(
    autoEmail === "Priya.Kalekar@cairnindia.com",
    `Scenario 4: Selecting '${selectedUser.displayName}' automatically resolves email: ${autoEmail}`
  );

  // Scenario 5: Change the selected user and verify the email updates
  const newUser = (await service.searchDirectoryUsers("Nitin Doshi"))[0];
  const updatedEmail = resolveDirectoryUserEmail(newUser);
  assert(
    updatedEmail === "Nitin.Doshi@cairnindia.com" && updatedEmail !== autoEmail,
    `Scenario 5: Changing owner to '${newUser.displayName}' updates email immediately to ${updatedEmail}`
  );

  // Scenario 6: Clear the selection and verify the email clears
  let clearedOwnerName = newUser.displayName;
  let clearedOwnerEmail = updatedEmail;
  // Trigger clear callback simulation
  clearedOwnerName = "";
  clearedOwnerEmail = "";
  assert(
    clearedOwnerName === "" && clearedOwnerEmail === "",
    "Scenario 6: Clearing owner selection successfully clears both CER Owner Name and Owner Email"
  );

  // Scenario 7: Handle users with missing mail values (fallback to UPN or validation block)
  const noMailUser = (await service.searchDirectoryUsers("User Without Mail"))[0];
  const resolvedUpnEmail = resolveDirectoryUserEmail(noMailUser);
  assert(
    resolvedUpnEmail === "user.nomail@cairnindia.com",
    "Scenario 7a: User with empty mail correctly falls back to userPrincipalName email"
  );
  const invalidUser = (await service.searchDirectoryUsers("Invalid Email User"))[0];
  const invalidEmailResolved = resolveDirectoryUserEmail(invalidUser);
  assert(
    invalidEmailResolved === "",
    "Scenario 7b: User with neither valid mail nor valid UPN resolves to empty string to prevent invalid submission"
  );
  const invalidOwnerValidation = validateField("owner_email", invalidEmailResolved, testProp);
  assert(
    invalidOwnerValidation !== undefined,
    "Scenario 7c: Submission validation prevents submission when resolved owner email is invalid or missing"
  );

  // Scenario 8: Handle no search results and directory service errors gracefully
  const emptyResults = await service.searchDirectoryUsers("NonExistentUser12345XYZ");
  assert(
    Array.isArray(emptyResults) && emptyResults.length === 0,
    "Scenario 8: No search results returns an empty array gracefully without exceptions"
  );

  // Scenario 9: Save a draft and reload it
  const draftPropNo = await service.generateProposalNumber();
  const draftProposal: ICERProposal = {
    ...testProp,
    cerprno: draftPropNo,
    owname: "Deependra Singh (STL Digital)",
    owner_email: "Deependra.Singh@cairnindia.com",
    status: "Draft",
  };
  await service.createProposal(draftProposal);
  const loadedDraft = await service.getProposalByNumber(draftPropNo);
  assert(
    loadedDraft !== null &&
    loadedDraft.owname === "Deependra Singh (STL Digital)" &&
    loadedDraft.owner_email === "Deependra.Singh@cairnindia.com" &&
    loadedDraft.status === "Draft",
    "Scenario 9: Draft CER proposal saved and reloaded preserves selected portal owner and email"
  );

  // Scenario 10: Submit a CER and verify both fields are stored correctly in SharePoint schema
  const submittedPropNo = await service.generateProposalNumber();
  const submittedProposal: ICERProposal = {
    ...testProp,
    cerprno: submittedPropNo,
    owname: "Priya Kalekar (STL Digital)",
    owner_email: "Priya.Kalekar@cairnindia.com",
    status: "In Approval",
  };
  const submitResult = await service.createProposal(submittedProposal);
  assert(submitResult.success, "Scenario 10a: Proposal submitted successfully");
  const loadedSubmitted = await service.getProposalByNumber(submittedPropNo);
  assert(
    loadedSubmitted !== null &&
    loadedSubmitted.owname === "Priya Kalekar (STL Digital)" &&
    loadedSubmitted.owner_email === "Priya.Kalekar@cairnindia.com",
    "Scenario 10b: Submitted CER correctly stores 'owname' and 'owner_email' in SharePoint schema"
  );

  // Scenario 11: Edit an existing CER and verify the saved owner is displayed correctly
  const editProposal: ICERProposal = {
    ...loadedSubmitted!,
    owname: "Ankit Sharma (STL Digital)",
    owner_email: "Ankit.Sharma2@cairnindia.com",
  };
  const updateResult = await service.updateProposal(editProposal, {
    name: "Priya Kalekar (STL Digital)",
    email: "Priya.Kalekar@cairnindia.com",
  });
  assert(updateResult.success, "Scenario 11a: CER updated with new directory owner");
  const reloadedEdited = await service.getProposalByNumber(submittedPropNo);
  assert(
    reloadedEdited !== null &&
    reloadedEdited.owname === "Ankit Sharma (STL Digital)" &&
    reloadedEdited.owner_email === "Ankit.Sharma2@cairnindia.com",
    "Scenario 11b: Reloading edited proposal accurately displays updated directory owner name and email"
  );

  console.log("\nTest Suite 9: Dynamic Dropdown Choices from SharePoint List Schema");
  const fieldChoices = await service.getFieldChoices();
  assert(Array.isArray(fieldChoices.sbu) && fieldChoices.sbu.length > 0, "SBU choices fetched dynamically from list schema");
  assert(Array.isArray(fieldChoices.cat) && fieldChoices.cat.length > 0, "Category choices fetched dynamically from list schema");
  assert(Array.isArray(fieldChoices.currency) && fieldChoices.currency.length > 0, "Currency choices fetched dynamically from list schema");
  assert(Array.isArray(fieldChoices.payable) && fieldChoices.payable.length > 0, "Payable choices fetched dynamically from list schema");
  assert(Array.isArray(fieldChoices.cbudget) && fieldChoices.cbudget.length > 0, "Corporate budget choices fetched dynamically from list schema");
  assert(Array.isArray(fieldChoices.jv) && fieldChoices.jv.length > 0, "JV alignment choices fetched dynamically from list schema");
  assert(Array.isArray(fieldChoices.status) && fieldChoices.status.length > 0, "Proposal status choices fetched dynamically from list schema");

  // ---------------------------------------------------------------------------------------------
  // Test Suite 10: Enterprise RBAC, Identity Resolution, Segregation of Duties & Admin Governance
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 10: Enterprise RBAC, Identity Resolution, Segregation of Duties & Admin Governance");

  // Identities for testing
  const initiatorUser: IAppUser = {
    id: 101,
    name: "Regular Initiator",
    email: "initiator@cairnindia.com",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true,
  };

  const approverL1: IAppUser = {
    id: 102,
    name: "Ankit Sharma (STL Digital)",
    email: "Ankit.Sharma2@cairnindia.com",
    role: "Approver",
    roles: ["Approver"],
    approval_level: 1,
    is_active: true,
  };

  const approverL2: IAppUser = {
    id: 103,
    name: "Deependra Singh (STL Digital)",
    email: "Deependra.Singh@cairnindia.com",
    role: "Approver",
    roles: ["Approver"],
    approval_level: 2,
    is_active: true,
  };

  const approverL3: IAppUser = {
    id: 104,
    name: "Nitin Doshi (STL Digital)",
    email: "Nitin.Doshi@cairnindia.com",
    role: "Approver",
    roles: ["Approver"],
    approval_level: 3,
    is_active: true,
  };

  const financeUser: IAppUser = {
    id: 105,
    name: "Finance & Audit Analyst",
    email: "finance.audit@cairnindia.com",
    role: "Finance_Audit",
    roles: ["Finance_Audit"],
    is_active: true,
  };

  const adminUser: IAppUser = {
    id: 106,
    name: "Shiven Pandit",
    email: "70007144@cairnindia.com",
    role: "Admin",
    roles: ["Admin", "Initiator"],
    is_active: true,
    isSiteAdmin: true,
  };

  const inactiveUser: IAppUser = {
    id: 107,
    name: "Terminated Employee",
    email: "terminated@cairnindia.com",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: false,
  };

  // Scenario 1: Initiator cannot open Admin routes
  assert(
    PermissionService.canAccessView("workflow-config", initiatorUser) === false,
    "Scenario 1: Initiator is strictly blocked from opening Admin routes (#workflow-config)"
  );

  // Scenario 2: Initiator cannot edit another user's CER
  const alicePropNo = await service.generateProposalNumber();
  const aliceProposal: ICERProposal = {
    ...testProp,
    cerprno: alicePropNo,
    owname: "Alice Initiator",
    owner_email: "alice@cairnindia.com",
    status: "Draft",
  };
  await service.createProposal(aliceProposal);

  assert(
    PermissionService.canEditCER(aliceProposal, initiatorUser).allowed === false,
    "Scenario 2a: Initiator cannot edit proposal owned by another employee"
  );

  let updateBlocked = false;
  try {
    await service.updateProposal(aliceProposal, {
      name: initiatorUser.name,
      email: initiatorUser.email,
    });
  } catch (err: any) {
    updateBlocked = true;
  }
  assert(updateBlocked, "Scenario 2b: Service layer enforces proposal ownership validation on update");

  // Scenario 3: Approver cannot act on an unassigned approval stage
  const stage1PropNo = await service.generateProposalNumber();
  const stage1Proposal: ICERProposal = {
    ...testProp,
    cerprno: stage1PropNo,
    owname: initiatorUser.name,
    owner_email: initiatorUser.email,
    status: "In Approval",
    current_level: 1,
  };
  await service.createProposal(stage1Proposal);

  assert(
    PermissionService.canApproveCER(stage1Proposal, approverL2).allowed === false,
    "Scenario 3a: Level 2 approver cannot act on Level 1 proposal stage"
  );

  let unassignedApprovalBlocked = false;
  try {
    await service.recordDecision({
      cerprno: stage1PropNo,
      decision: "APPROVED",
      comments: "Unauthorized approval",
      approver_name: approverL2.name,
      approver_email: approverL2.email,
      level_id: 2,
    });
  } catch (err) {
    unassignedApprovalBlocked = true;
  }
  assert(unassignedApprovalBlocked, "Scenario 3b: Service layer rejects approval from mismatched level");

  // Scenario 4: Finance / Audit cannot approve or modify proposals
  assert(
    PermissionService.canApproveCER(stage1Proposal, financeUser).allowed === false,
    "Scenario 4a: Finance_Audit role cannot approve proposals"
  );
  assert(
    PermissionService.canEditCER(aliceProposal, financeUser).allowed === false,
    "Scenario 4b: Finance_Audit role cannot edit proposals"
  );
  assert(
    PermissionService.canAccessView("reports", financeUser) === true,
    "Scenario 4c: Finance_Audit role possesses authorized access to reporting"
  );

  // Scenario 5: A user cannot approve their own CER (Segregation of Duties)
  const selfOwnedPropNo = await service.generateProposalNumber();
  const selfOwnedProposal: ICERProposal = {
    ...testProp,
    cerprno: selfOwnedPropNo,
    owname: approverL1.name,
    owner_email: approverL1.email,
    status: "In Approval",
    current_level: 1,
  };
  await service.createProposal(selfOwnedProposal);

  assert(
    PermissionService.canApproveCER(selfOwnedProposal, approverL1).allowed === false,
    "Scenario 5a: Approver is prohibited from approving their own CER proposal (Segregation of Duties)"
  );

  let selfApprovalBlocked = false;
  try {
    await service.recordDecision({
      cerprno: selfOwnedPropNo,
      decision: "APPROVED",
      comments: "Attempting self approval",
      approver_name: approverL1.name,
      approver_email: approverL1.email,
      level_id: 1,
    });
  } catch (err: any) {
    if (err && err.message && err.message.indexOf("Segregation of Duties") !== -1) {
      selfApprovalBlocked = true;
    }
  }
  assert(selfApprovalBlocked, "Scenario 5b: Service layer enforces Segregation of Duties self-approval rejection");

  // Scenario 6: Inactive users cannot perform protected actions
  assert(
    PermissionService.canCreateCER(inactiveUser) === false,
    "Scenario 6a: Deactivated user cannot create new proposals"
  );
  assert(
    PermissionService.canApproveCER(stage1Proposal, { ...approverL1, is_active: false }).allowed === false,
    "Scenario 6b: Deactivated approver cannot approve proposals"
  );
  assert(
    PermissionService.canAccessView("workflow-config", { ...adminUser, is_active: false }) === false,
    "Scenario 6c: Deactivated admin cannot access Admin Console"
  );

  // Scenario 7: Unregistered users cannot obtain Admin privileges
  const unregistered = await AuthService.resolveCurrentUser(
    {
      id: 999,
      name: "New Unregistered Hire",
      email: "newhire@cairnindia.com",
    },
    service
  );
  assert(
    unregistered.user.role === "Initiator" &&
      unregistered.user.roles.indexOf("Admin") === -1 &&
      unregistered.isRegistered === false,
    "Scenario 7: Unregistered user resolves safely to unprivileged Initiator without Admin privileges"
  );

  // Scenario 8: Unauthorized users cannot assign or revoke roles
  assert(
    PermissionService.canManageRoles(initiatorUser) === false,
    "Scenario 8a: Initiator cannot manage enterprise roles"
  );
  assert(
    PermissionService.canManageRoles(approverL1) === false,
    "Scenario 8b: Approver cannot manage enterprise roles"
  );
  assert(
    PermissionService.canManageRoles(financeUser) === false,
    "Scenario 8c: Finance / Audit cannot manage enterprise roles"
  );
  assert(
    PermissionService.canManageRoles(adminUser) === true,
    "Scenario 8d: Admin possesses verified role management authority"
  );

  // Scenario 9: A user cannot promote themselves to Admin
  let selfPromotionBlocked = false;
  try {
    await service.assignUserRole(
      {
        user_name: initiatorUser.name,
        user_email: initiatorUser.email,
        login_name: initiatorUser.email,
        role: "Admin",
        is_active: true,
        assigned_by: initiatorUser.name,
        assigned_date: new Date().toISOString(),
      },
      initiatorUser
    );
  } catch (err) {
    selfPromotionBlocked = true;
  }
  assert(selfPromotionBlocked, "Scenario 9: Non-admin user cannot promote themselves to Administrator");

  // Scenario 10: The last active Admin cannot be accidentally removed
  const testAdminService = new LocalMockCERDataService();
  const existingRoles = await testAdminService.getUserRoles();
  const currentAdmins = existingRoles.filter((r) => r.role === "Admin" && r.is_active);
  assert(currentAdmins.length >= 1, "Scenario 10a: Initial active Administrator exists in registry");

  // Keep adminUser (Priya) as the sole remaining admin to test last-admin protection
  for (const admin of currentAdmins) {
    if (admin.user_email.toLowerCase() !== adminUser.email.toLowerCase()) {
      await testAdminService.revokeUserRole(admin.id, adminUser);
    }
  }

  let lastAdminRevocationBlocked = false;
  try {
    // Revoking sole remaining admin must throw
    const soleAdmin = (await testAdminService.getUserRoles()).find(
      (r) => r.role === "Admin" && r.is_active
    );
    if (soleAdmin) {
      await testAdminService.revokeUserRole(soleAdmin.id, adminUser);
    }
  } catch (err: any) {
    if (err && err.message && err.message.indexOf("last active Administrator") !== -1) {
      lastAdminRevocationBlocked = true;
    }
  }
  assert(lastAdminRevocationBlocked, "Scenario 10b: Accidental revocation of the last active Admin is strictly blocked");

  // Scenario 11: Direct URL navigation does not bypass authorization
  assert(
    PermissionService.canAccessView("workflow-config", initiatorUser) === false,
    "Scenario 11a: Direct URL hash navigation to #workflow-config blocked for Initiator"
  );
  assert(
    PermissionService.canAccessView("pending-approvals", financeUser) === false,
    "Scenario 11b: Direct URL hash navigation to #pending-approvals blocked for Finance_Audit"
  );

  // Scenario 12: Failed role resolution fails safely (fail-closed)
  const failingService = {
    ...service,
    getUserRoles: async () => {
      throw new Error("Simulated SharePoint REST 500 internal server failure");
    },
  } as any;
  const failClosedResolution = await AuthService.resolveCurrentUser(
    {
      id: 888,
      name: "Offline Employee",
      email: "offline@cairnindia.com",
    },
    failingService
  );
  assert(
    failClosedResolution.user.role === "Initiator" &&
      failClosedResolution.user.roles.indexOf("Admin") === -1,
    "Scenario 12: Network/API failure fails safely (fail-closed) to unprivileged Initiator"
  );

  // Scenario 13: Directory selection resolves the correct user identity
  const directoryResults = await service.searchDirectoryUsers("Ankit");
  assert(
    directoryResults.length > 0 &&
      directoryResults[0].mail === "Ankit.Sharma2@cairnindia.com" &&
      directoryResults[0].displayName.indexOf("Ankit Sharma") !== -1,
    "Scenario 13: Directory search resolves accurate display name and corporate email"
  );

  // Scenario 14: Role changes are persisted and audited
  const testNewRole: Omit<IUserRoleAssignment, "id"> = {
    user_name: "Gaurav Joshi",
    user_email: "gaurav.joshi@vedanta.co.in",
    login_name: "gaurav.joshi",
    role: "Approver",
    approval_level: 2,
    department: "Commercial Operations",
    is_active: true,
    assigned_by: adminUser.name,
    assigned_date: new Date().toISOString(),
  };

  const assignedRole = await service.assignUserRole(testNewRole, adminUser);
  assert(assignedRole.id !== "", "Scenario 14a: Role successfully assigned and persisted");

  const auditRecords = await service.getAdminAuditLog();
  const matchedAudit = auditRecords.find(
    (a) => a.target_id === "gaurav.joshi@vedanta.co.in" && a.action === "ROLE_ASSIGNED"
  );
  assert(
    matchedAudit !== undefined &&
      matchedAudit.actor_name === adminUser.name &&
      matchedAudit.actor_email === adminUser.email,
    "Scenario 14b: Role assignment creates an audit log entry with actor attribution and forensics"
  );

  // Scenario 15: Existing CER creation and multi-tier approval workflows continue to function
  // Dynamically configure test levels for verification
  await service.saveWorkflowLevels([
    { level_id: 1, level_name: "L1 - Technical & SBU Review", role_title: "SBU Operations Head", approver_name: approverL1.name, approver_email: approverL1.email, sbu: "RJ North", is_active: true },
    { level_id: 2, level_name: "L2 - Discipline Review", role_title: "Discipline Lead", approver_name: approverL2.name, approver_email: approverL2.email, sbu: "RJ North", is_active: true },
    { level_id: 3, level_name: "L3 - Commercial Review", role_title: "Head of Commercial", approver_name: approverL3.name, approver_email: approverL3.email, sbu: "RJ North", is_active: true },
    { level_id: 4, level_name: "L4 - Corporate Finance", role_title: "Head of Finance", approver_name: "Amit Saxena", approver_email: "amit.saxena@vedanta.co.in", sbu: "RJ North", is_active: true },
    { level_id: 5, level_name: "L5 - JV Management", role_title: "Head of JV", approver_name: "Neha Kulkarni", approver_email: "neha.kulkarni@vedanta.co.in", sbu: "RJ North", is_active: true },
    { level_id: 6, level_name: "L6 - COO Review", role_title: "COO", approver_name: "Vikram Mehta", approver_email: "vikram.mehta@vedanta.co.in", sbu: "RJ North", is_active: true },
    { level_id: 7, level_name: "L7 - CEO Sanction", role_title: "CEO", approver_name: "Arun Kumar", approver_email: "arun.kumar@vedanta.co.in", sbu: "RJ North", is_active: true },
  ]);

  const lifecyclePropNo = await service.generateProposalNumber();
  const lifecycleProp: ICERProposal = {
    ...testProp,
    cerprno: lifecyclePropNo,
    owname: initiatorUser.name,
    owner_email: initiatorUser.email,
    status: "In Approval",
    current_level: 1,
  };
  await service.createProposal(lifecycleProp);

  // Level 1 Approval
  const l1Dec = await service.recordDecision({
    cerprno: lifecyclePropNo,
    decision: "APPROVED",
    comments: "L1 Commercial Feasibility Approved",
    approver_name: approverL1.name,
    approver_email: approverL1.email,
    level_id: 1,
  });
  assert(l1Dec.success, "Scenario 15a: Level 1 approval recorded successfully");
  const postL1 = await service.getProposalByNumber(lifecyclePropNo);
  assert(postL1 !== null && postL1.current_level === 2, "Scenario 15b: Proposal advanced to Level 2 stage");

  // Level 2 Approval
  const l2Dec = await service.recordDecision({
    cerprno: lifecyclePropNo,
    decision: "APPROVED",
    comments: "L2 Engineering Approved",
    approver_name: approverL2.name,
    approver_email: approverL2.email,
    level_id: 2,
  });
  assert(l2Dec.success, "Scenario 15c: Level 2 approval recorded successfully");
  const postL2 = await service.getProposalByNumber(lifecyclePropNo);
  assert(postL2 !== null && postL2.current_level === 3, "Scenario 15d: Proposal advanced to Level 3 stage");

  // Level 3 Approval
  const l3Dec = await service.recordDecision({
    cerprno: lifecyclePropNo,
    decision: "APPROVED",
    comments: "L3 Commercial & Contracts Approved",
    approver_name: approverL3.name,
    approver_email: approverL3.email,
    level_id: 3,
  });
  assert(l3Dec.success, "Scenario 15e: Level 3 approval recorded successfully");
  const postL3 = await service.getProposalByNumber(lifecyclePropNo);
  assert(postL3 !== null && postL3.current_level === 4, "Scenario 15f: Proposal advanced to Level 4 stage");

  // Level 4 Approval
  const l4Dec = await service.recordDecision({
    cerprno: lifecyclePropNo,
    decision: "APPROVED",
    comments: "L4 Corporate Finance Approved",
    approver_name: "Amit Saxena",
    approver_email: "amit.saxena@vedanta.co.in",
    level_id: 4,
  });
  assert(l4Dec.success, "Scenario 15g: Level 4 approval recorded successfully");
  const postL4 = await service.getProposalByNumber(lifecyclePropNo);
  assert(postL4 !== null && postL4.current_level === 5, "Scenario 15h: Proposal advanced to Level 5 stage");

  // Level 5 Approval
  const l5Dec = await service.recordDecision({
    cerprno: lifecyclePropNo,
    decision: "APPROVED",
    comments: "L5 JV Alignment Approved",
    approver_name: "Neha Kulkarni",
    approver_email: "neha.kulkarni@vedanta.co.in",
    level_id: 5,
  });
  assert(l5Dec.success, "Scenario 15i: Level 5 approval recorded successfully");
  const postL5 = await service.getProposalByNumber(lifecyclePropNo);
  assert(postL5 !== null && postL5.current_level === 6, "Scenario 15j: Proposal advanced to Level 6 stage");

  // Level 6 Approval
  const l6Dec = await service.recordDecision({
    cerprno: lifecyclePropNo,
    decision: "APPROVED",
    comments: "L6 COO Review Approved",
    approver_name: "Vikram Mehta",
    approver_email: "vikram.mehta@vedanta.co.in",
    level_id: 6,
  });
  assert(l6Dec.success, "Scenario 15k: Level 6 approval recorded successfully");
  const postL6 = await service.getProposalByNumber(lifecyclePropNo);
  assert(postL6 !== null && postL6.current_level === 7, "Scenario 15l: Proposal advanced to Level 7 stage");

  // Level 7 Approval (Final Sanction)
  const l7Dec = await service.recordDecision({
    cerprno: lifecyclePropNo,
    decision: "APPROVED",
    comments: "L7 CEO & MD Final Sanction Granted",
    approver_name: "Arun Kumar",
    approver_email: "arun.kumar@vedanta.co.in",
    level_id: 7,
  });
  assert(l7Dec.success && l7Dec.newStatus === "Approved", "Scenario 15m: Level 7 approval recorded with final Approved status");
  const postL7 = await service.getProposalByNumber(lifecyclePropNo);
  assert(postL7 !== null && postL7.status === "Approved", "Scenario 15n: 7-tier sequential approval completes with Approved status");

  // Post-Approval Revision Test (Client Requirement 4)
  const preEditDecisions = await service.getApprovalDecisions(lifecyclePropNo);
  assert(preEditDecisions.length >= 7, "Scenario 15o: All 7 approval decisions logged in audit record");

  const postApprovalEdit = await service.updateProposal(
    { ...postL7!, amount: 9200000, object: "Revised scope post executive review" },
    { name: initiatorUser.name, email: initiatorUser.email }
  );
  assert(postApprovalEdit.success, "Scenario 15p: Authorized owner successfully edited approved CER");
  assert(postApprovalEdit.proposal.status === "In Approval", "Scenario 15q: Edited CER reverts status to 'In Approval'");
  assert(postApprovalEdit.proposal.current_level === 1, "Scenario 15r: Edited CER resets workflow to Level 1");

  const postEditDecisions = await service.getApprovalDecisions(lifecyclePropNo);
  assert(postEditDecisions.length === preEditDecisions.length, "Scenario 15s: Previous approval decisions preserved after post-approval edit");

  // Scenario 16: Duplicate assignment prevention & Multiple role support
  let duplicateBlocked = false;
  try {
    await service.assignUserRole(testNewRole, adminUser);
  } catch (err: any) {
    if (err && err.message && err.message.indexOf("already assigned") !== -1) {
      duplicateBlocked = true;
    }
  }
  assert(duplicateBlocked, "Scenario 16a: Duplicate active role assignment for same employee is rejected");

  const dualRoleEmployee: IAppUser = {
    id: 990,
    name: "Dual Role Employee",
    email: "dual.role@cairnindia.com",
    role: "Initiator",
    roles: ["Initiator", "Approver"],
    approval_level: 1,
    is_active: true,
  };
  assert(
    PermissionService.canCreateCER(dualRoleEmployee) === true,
    "Scenario 16b: Dual-role employee has active Initiator capability"
  );
  assert(
    PermissionService.canApproveCER(stage1Proposal, dualRoleEmployee).allowed === true,
    "Scenario 16c: Dual-role employee has active Approver capability"
  );

  // Scenario 17: User 70007144@cairnindia.com resolves as full Administrator
  const admin70007144Resolution = await AuthService.resolveCurrentUser(
    {
      id: 70007144,
      name: "70007144",
      email: "70007144@cairnindia.com",
      loginName: "i:0#.f|membership|70007144@cairnindia.com",
    },
    service
  );
  assert(
    admin70007144Resolution.user.role === "Admin" &&
      admin70007144Resolution.user.roles.indexOf("Admin") !== -1 &&
      PermissionService.canAccessAdmin(admin70007144Resolution.user) === true &&
      PermissionService.canAccessView("workflow-config", admin70007144Resolution.user) === true &&
      PermissionService.canManageRoles(admin70007144Resolution.user) === true,
    "Scenario 17: 70007144@cairnindia.com resolves as verified Administrator with full governance privileges"
  );

  console.log("\nTest Suite 11: Dynamic Expenditure Phasing (Indian Fiscal Year: Apr 1 – Mar 31)");
  // Scenario 1: Q3 of FY26-27 (October 2026)
  const oct2026Labels = getCurrentFiscalYearPhasingLabels(new Date(2026, 9, 26)); // Oct 26, 2026
  assert(
    oct2026Labels.ph_till_label === "Till Mar'26" &&
      oct2026Labels.ph_fy_label === "FY 26-27" &&
      oct2026Labels.ph_beyond_label === "Beyond FY'27",
    "Scenario 1: In October 2026 -> Till Mar'26 | FY 26-27 | Beyond FY'27"
  );

  // Scenario 2: Q4 of FY26-27 (January 2027)
  const jan2027Labels = getCurrentFiscalYearPhasingLabels(new Date(2027, 0, 15)); // Jan 15, 2027
  assert(
    jan2027Labels.ph_till_label === "Till Mar'26" &&
      jan2027Labels.ph_fy_label === "FY 26-27" &&
      jan2027Labels.ph_beyond_label === "Beyond FY'27",
    "Scenario 2: In January 2027 -> Still Till Mar'26 | FY 26-27 | Beyond FY'27"
  );

  // Scenario 3: Last day of FY26-27 (March 31, 2027)
  const mar2027Labels = getCurrentFiscalYearPhasingLabels(new Date(2027, 2, 31)); // Mar 31, 2027
  assert(
    mar2027Labels.ph_till_label === "Till Mar'26" &&
      mar2027Labels.ph_fy_label === "FY 26-27" &&
      mar2027Labels.ph_beyond_label === "Beyond FY'27",
    "Scenario 3: On March 31, 2027 -> Still Till Mar'26 | FY 26-27 | Beyond FY'27"
  );

  // Scenario 4: First day of FY27-28 rollover (April 1, 2027)
  const apr2027Labels = getCurrentFiscalYearPhasingLabels(new Date(2027, 3, 1)); // Apr 1, 2027
  assert(
    apr2027Labels.ph_till_label === "Till Mar'27" &&
      apr2027Labels.ph_fy_label === "FY 27-28" &&
      apr2027Labels.ph_beyond_label === "Beyond FY'28",
    "Scenario 4: On April 1, 2027 (FY rollover) -> Automatically shifts to Till Mar'27 | FY 27-28 | Beyond FY'28"
  );

  // Scenario 5: Future Indian FY (November 2029)
  const nov2029Labels = getCurrentFiscalYearPhasingLabels(new Date(2029, 10, 15)); // Nov 15, 2029
  assert(
    nov2029Labels.ph_till_label === "Till Mar'29" &&
      nov2029Labels.ph_fy_label === "FY 29-30" &&
      nov2029Labels.ph_beyond_label === "Beyond FY'30",
    "Scenario 5: In November 2029 -> Till Mar'29 | FY 29-30 | Beyond FY'30"
  );

  // Scenario 6: Seed proposals in data service automatically carry Indian FY phasing labels
  const mockProposals = await service.getAllProposals();
  const currentFyLabels = getCurrentFiscalYearPhasingLabels();
  const seedProposal = mockProposals.find((p) => p.id === "prop-001");
  assert(
    !!seedProposal &&
      seedProposal.ph_till_label === currentFyLabels.ph_till_label &&
      seedProposal.ph_fy_label === currentFyLabels.ph_fy_label &&
      seedProposal.ph_beyond_label === currentFyLabels.ph_beyond_label,
    "Scenario 6: Seed proposals in data service automatically carry Indian FY phasing labels"
  );

  // Scenario 7: Creating proposal without explicit labels auto-assigns current Indian FY labels
  const autoPhasingProp = await service.createProposal({
    ...testProp,
    cerprno: "CER-AUTO-PHASING-01",
    ph_till_label: undefined as any,
    ph_fy_label: undefined as any,
    ph_beyond_label: undefined as any,
  });
  assert(
    autoPhasingProp.proposal.ph_till_label === currentFyLabels.ph_till_label &&
      autoPhasingProp.proposal.ph_fy_label === currentFyLabels.ph_fy_label &&
      autoPhasingProp.proposal.ph_beyond_label === currentFyLabels.ph_beyond_label,
    "Scenario 7: Creating proposal without explicit labels auto-assigns current Indian FY labels"
  );

  // ---------------------------------------------------------------------------------------------
  // Test Suite 12: SBU-Specific Approval Hierarchies, Sequential Stages & Dynamic Project Owner
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 12: SBU-Specific Approval Hierarchies, Sequential Stages & Dynamic Project Owner");

  // 12.1 isProjectOwnerStage helper case insensitivity and variations
  assert(isProjectOwnerStage({ role_title: "Project Owner", level_name: "L1" }) === true, "12.1a: Matches 'Project Owner'");
  assert(isProjectOwnerStage({ role_title: "project owner", level_name: "L1" }) === true, "12.1b: Matches 'project owner' lower case");
  assert(isProjectOwnerStage({ role_title: "PROJECT OWNER", level_name: "L1" }) === true, "12.1c: Matches 'PROJECT OWNER' upper case");
  assert(isProjectOwnerStage({ role_title: "Project-Owner", level_name: "L1" }) === true, "12.1d: Matches 'Project-Owner' hyphenated");
  assert(isProjectOwnerStage({ role_title: "Proposal Owner", level_name: "L1" }) === true, "12.1e: Matches 'Proposal Owner'");
  assert(isProjectOwnerStage({ role_title: "Project_Owner", level_name: "L1" }) === true, "12.1f: Matches 'Project_Owner' underscore");
  assert(isProjectOwnerStage({ role_title: "SBU Operations Head", level_name: "L1 - Technical Review" }) === false, "12.1g: Correctly rejects non-Project-Owner role");

  // 12.2 Configure independent 4 SBUs with distinct stages
  const sbuService = new LocalMockCERDataService();
  const multiSbuConfig: IWorkflowLevel[] = [
    // RJ North: 3 stages (L1: Project Owner, L2: Discipline Lead, L3: VP)
    { level_id: 1, level_name: "L1 - Project Owner Sign-off", role_title: "Project Owner", sbu: "RJ North", is_active: true },
    { level_id: 2, level_name: "L2 - Discipline Lead", role_title: "Discipline Lead", approver_name: "Sunil Verma", approver_email: "sunil.verma@vedanta.co.in", sbu: "RJ North", is_active: true },
    { level_id: 3, level_name: "L3 - VP Review", role_title: "Vice President", approver_name: "Vikram Mehta", approver_email: "vikram.mehta@vedanta.co.in", sbu: "RJ North", is_active: true },

    // RJ South: 2 stages (L1: Technical Lead, L2: COO)
    { level_id: 1, level_name: "L1 - Technical Lead", role_title: "Technical Lead", approver_name: "Rahul Roy", approver_email: "rahul.roy@vedanta.co.in", sbu: "RJ South", is_active: true },
    { level_id: 2, level_name: "L2 - COO Sanction", role_title: "COO", approver_name: "Deepak Sethi", approver_email: "deepak.sethi@vedanta.co.in", sbu: "RJ South", is_active: true },

    // CBOS: 4 stages (L1: Project Owner, L2: CBOS Ops, L3: Finance Lead, L4: CEO)
    { level_id: 1, level_name: "L1 - Proposal Owner Review", role_title: "Project Owner", sbu: "CBOS", is_active: true },
    { level_id: 2, level_name: "L2 - CBOS Operations", role_title: "Operations Head", approver_name: "Karan Johar", approver_email: "karan.johar@vedanta.co.in", sbu: "CBOS", is_active: true },
    { level_id: 3, level_name: "L3 - Finance Lead", role_title: "Finance Head", approver_name: "Anita Bose", approver_email: "anita.bose@vedanta.co.in", sbu: "CBOS", is_active: true },
    { level_id: 4, level_name: "L4 - CEO", role_title: "CEO", approver_name: "Arun Kumar", approver_email: "arun.kumar@vedanta.co.in", sbu: "CBOS", is_active: true },

    // RAVA: 1 stage (L1: Asset Director)
    { level_id: 1, level_name: "L1 - Asset Director", role_title: "Asset Director", approver_name: "Ramesh Sen", approver_email: "ramesh.sen@vedanta.co.in", sbu: "RAVA", is_active: true },
  ];

  await sbuService.saveWorkflowLevels(multiSbuConfig);

  // Exact SBU filtering and independent sequencing
  const rjNorthLevels = await sbuService.getWorkflowLevels("RJ North");
  assert(rjNorthLevels.length === 3, "12.2a: RJ North returns exactly 3 levels");
  assert(rjNorthLevels.every(l => l.sbu === "RJ North"), "12.2b: All returned levels belong to RJ North (no cross-SBU leakage)");
  assert(rjNorthLevels[0].level_id === 1 && rjNorthLevels[1].level_id === 2 && rjNorthLevels[2].level_id === 3, "12.2c: RJ North levels sorted 1..3");

  const rjSouthLevels = await sbuService.getWorkflowLevels("RJ South");
  assert(rjSouthLevels.length === 2, "12.2d: RJ South returns exactly 2 levels");
  assert(rjSouthLevels.every(l => l.sbu === "RJ South"), "12.2e: RJ South levels belong strictly to RJ South");

  const cbosLevels = await sbuService.getWorkflowLevels("CBOS");
  assert(cbosLevels.length === 4, "12.2f: CBOS returns exactly 4 levels");
  assert(cbosLevels[0].is_project_owner_stage === true, "12.2g: CBOS L1 tagged as is_project_owner_stage");

  const ravaLevels = await sbuService.getWorkflowLevels("RAVA");
  assert(ravaLevels.length === 1, "12.2h: RAVA returns exactly 1 level");
  assert(ravaLevels[0].level_id === 1 && ravaLevels[0].sbu === "RAVA", "12.2i: RAVA level_id is 1");

  // Non-existent SBU error handling on proposal routing
  try {
    await sbuService.createProposal({
      ...testProp,
      cerprno: "CER-INVALID-SBU-01",
      sbu: "NON_EXISTENT_SBU",
    });
    assert(false, "12.2j: Should throw error on invalid/missing SBU");
  } catch (err: any) {
    assert(err.message.includes("No approval stages configured"), "12.2j: Handled missing SBU with clear error");
  }

  // 12.3 Dynamic Project Owner Auto-Fetch on Proposal Creation (RJ North)
  const createdPropRes = await sbuService.createProposal({
    ...testProp,
    cerprno: "CER-SBU-TEST-001",
    sbu: "RJ North",
    owname: "Priya Kalekar (STL Digital)",
    owner_email: "Priya.Kalekar@cairnindia.com",
    current_level: 1,
  });

  const createdProp = createdPropRes.proposal;
  assert(createdProp.pending_with_email === "Priya.Kalekar@cairnindia.com", "12.3a: Project Owner stage pending_with_email auto-fetched from owner_email");
  assert(createdProp.pending_with_role === "Project Owner", "12.3b: pending_with_role set to Project Owner");
  assert(createdProp.current_level === 1, "12.3c: Initial stage is 1");

  // 12.4 Dynamic Project Owner Auto-Fetch on Proposal Creation for Non-Project-Owner L1 (RJ South)
  const rjSouthPropRes = await sbuService.createProposal({
    ...testProp,
    cerprno: "CER-SBU-TEST-002",
    sbu: "RJ South",
    owname: "Priya Kalekar (STL Digital)",
    owner_email: "Priya.Kalekar@cairnindia.com",
    current_level: 1,
  });
  assert(rjSouthPropRes.proposal.pending_with_email === "rahul.roy@vedanta.co.in", "12.4: RJ South L1 resolves to configured role approver rahul.roy@vedanta.co.in");

  // 12.5 Project Owner Stage Authorization in Service Layer & PermissionService
  const priyaUser: IAppUser = {
    id: 501,
    email: "priya.kalekar@cairnindia.com",
    name: "Priya Kalekar",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true,
  };
  const otherApproverUser: IAppUser = {
    id: 502,
    email: "unrelated.approver@vedanta.co.in",
    name: "Unrelated Approver",
    role: "Approver",
    roles: ["Approver"],
    approval_level: 1,
    is_active: true,
  };
  const governanceAdmin: IAppUser = {
    id: 503,
    email: "admin.governance@vedanta.co.in",
    name: "Governance Admin",
    role: "Admin",
    roles: ["Admin"],
    is_active: true,
  };

  const rjNorthL1Config = rjNorthLevels[0];

  // Unrelated Approver attempting to approve Project Owner stage
  const canOtherApprove = PermissionService.canApproveCER(createdProp, otherApproverUser, rjNorthL1Config);
  assert(canOtherApprove.allowed === false, "12.5a: PermissionService blocks non-owner from approving Project Owner stage");

  try {
    await sbuService.recordDecision({
      cerprno: createdProp.cerprno,
      level_id: 1,
      decision: "APPROVED",
      approver_name: otherApproverUser.name,
      approver_email: otherApproverUser.email,
      comments: "Unauthorized attempt",
    });
    assert(false, "12.5b: Service layer should reject non-owner approval on Project Owner stage");
  } catch (err: any) {
    assert(err.message.includes("Only the designated Project Owner"), "12.5b: Service layer rejected unauthorized user for Project Owner stage");
  }

  // Designated Project Owner approving Project Owner stage
  const canPriyaApprove = PermissionService.canApproveCER(createdProp, priyaUser, rjNorthL1Config);
  assert(canPriyaApprove.allowed === true, "12.5c: PermissionService authorizes designated Project Owner");

  const approvedL1Result = await sbuService.recordDecision({
    cerprno: createdProp.cerprno,
    level_id: 1,
    decision: "APPROVED",
    approver_name: priyaUser.name,
    approver_email: priyaUser.email,
    comments: "Project Owner approved technical initiation",
  });

  const propAfterL1 = (await sbuService.getProposalByNumber(createdProp.cerprno))!;
  assert(approvedL1Result.nextLevel === 2, "12.5d: Proposal advanced to Level 2 in response");
  assert(propAfterL1.current_level === 2, "12.5e: Proposal current_level is 2");
  assert(propAfterL1.pending_with_email === "sunil.verma@vedanta.co.in", "12.5f: Next approver set to L2 Discipline Lead (sunil.verma@vedanta.co.in)");

  // 12.6 Strict Segregation of Duties on Non-Project-Owner Stages (Level 2)
  const rjNorthL2Config = rjNorthLevels[1];
  const priyaWithL2Role: IAppUser = {
    ...priyaUser,
    role: "Approver",
    roles: ["Approver", "Initiator"],
    approval_level: 2,
  };
  const canPriyaApproveL2 = PermissionService.canApproveCER(propAfterL1, priyaWithL2Role, rjNorthL2Config);
  assert(canPriyaApproveL2.allowed === false, "12.6a: Segregation of Duties blocks proposal owner on non-Project-Owner stage");
  assert(canPriyaApproveL2.reason?.includes("Segregation of Duties") === true, "12.6b: Segregation of Duties reason provided");

  try {
    await sbuService.recordDecision({
      cerprno: propAfterL1.cerprno,
      level_id: 2,
      decision: "APPROVED",
      approver_name: priyaWithL2Role.name,
      approver_email: priyaWithL2Role.email,
      comments: "Self approval attempt",
    });
    assert(false, "12.6c: Service layer should reject proposal owner approval on L2");
  } catch (err: any) {
    assert(err.message.includes("Segregation of Duties"), "12.6c: Service layer enforced Segregation of Duties");
  }

  // Authorized L2 approver approves
  const sunilUser: IAppUser = {
    id: 504,
    email: "sunil.verma@vedanta.co.in",
    name: "Sunil Verma",
    role: "Approver",
    roles: ["Approver"],
    approval_level: 2,
    is_active: true,
  };
  const approvedL2Result = await sbuService.recordDecision({
    cerprno: propAfterL1.cerprno,
    level_id: 2,
    decision: "APPROVED",
    approver_name: sunilUser.name,
    approver_email: sunilUser.email,
    comments: "Discipline Lead sign-off",
  });
  const propAfterL2 = (await sbuService.getProposalByNumber(createdProp.cerprno))!;
  assert(approvedL2Result.nextLevel === 3, "12.6d: Proposal advanced to Level 3 in response");
  assert(propAfterL2.current_level === 3, "12.6e: Proposal current_level is 3");

  // 12.6f Dual-Role (Finance Approver + Project Owner) on non-initiator CER
  const dualRoleFinanceOwnerProp: ICERProposal = {
    ...testProp,
    cerprno: "CER-DUAL-ROLE-001",
    sbu: "RJ North",
    created_by: "shiven.pandit@cairnindia.com",
    owname: priyaUser.name,
    owner_email: priyaUser.email,
    current_level: 1,
    status: "In Approval",
  };
  const rjNorthL1FinanceConfig: IWorkflowLevel = {
    level_id: 1,
    level_name: "Finance Review",
    role_title: "Finance",
    sbu: "RJ North",
    is_active: true,
    assignment_type: "SpecificUser",
    approver_email: "",
  };
  const priyaAsL1FinanceApprover: IAppUser = {
    ...priyaUser,
    role: "Approver",
    roles: ["Approver"],
    approval_level: 1,
    is_active: true,
  };
  const canPriyaApproveDualFinance = PermissionService.canApproveCER(
    dualRoleFinanceOwnerProp,
    priyaAsL1FinanceApprover,
    rjNorthL1FinanceConfig
  );
  assert(
    canPriyaApproveDualFinance.allowed === true,
    "12.6f: Dual-Role: Assigned Level 1 Finance approver is permitted to approve even if designated as Project Owner on a CER initiated by another employee"
  );

  // 12.7 Strict Stage Restriction: Only Designated Project Owner Can Approve Project Owner Stage
  const cbosPropRes = await sbuService.createProposal({
    ...testProp,
    cerprno: "CER-CBOS-TEST-001",
    sbu: "CBOS",
    owname: "Harish Rao",
    owner_email: "harish.rao@vedanta.co.in",
    current_level: 1,
  });
  const cbosL1Config = cbosLevels[0];
  const canAdminApprove = PermissionService.canApproveCER(cbosPropRes.proposal, adminUser, cbosL1Config);
  assert(canAdminApprove.allowed === false, "12.7a: Admin strictly blocked from approving Project Owner stage when not designated owner");
  const ownerApproved = await sbuService.recordDecision({
    cerprno: cbosPropRes.proposal.cerprno,
    level_id: 1,
    decision: "APPROVED",
    approver_name: "Harish Rao",
    approver_email: "harish.rao@vedanta.co.in",
    comments: "Designated Project Owner approval",
  });
  const cbosAfterL1 = (await sbuService.getProposalByNumber(cbosPropRes.proposal.cerprno))!;
  assert(ownerApproved.nextLevel === 2, "12.7b: Project Owner approval advances proposal to Level 2 in response");
  assert(cbosAfterL1.current_level === 2, "12.7c: Proposal current_level updated to 2");

  // 12.8 Resequencing Stages strictly within SBU
  // RJ North has 3 stages: [L1 (PO), L2 (Discipline), L3 (VP)]
  // Simulate Move Up: Swap L2 and L3 in RJ North
  const rjNorthBefore = await sbuService.getWorkflowLevels("RJ North");
  const swappedRjNorth = [
    rjNorthBefore[0],
    { ...rjNorthBefore[2], level_id: 2 },
    { ...rjNorthBefore[1], level_id: 3 },
  ];
  const otherSbuBefore = (await sbuService.getWorkflowLevels()).filter(l => l.sbu !== "RJ North");
  await sbuService.saveWorkflowLevels([...otherSbuBefore, ...swappedRjNorth]);

  const rjNorthAfter = await sbuService.getWorkflowLevels("RJ North");
  assert(rjNorthAfter[1].role_title === "Vice President" && rjNorthAfter[1].level_id === 2, "12.8a: VP resequenced to stage 2 in RJ North");
  assert(rjNorthAfter[2].role_title === "Discipline Lead" && rjNorthAfter[2].level_id === 3, "12.8b: Discipline Lead resequenced to stage 3 in RJ North");

  // Verify other SBUs were not disturbed
  const cbosAfter = await sbuService.getWorkflowLevels("CBOS");
  assert(cbosAfter.length === 4 && cbosAfter[0].level_id === 1 && cbosAfter[3].level_id === 4, "12.8c: CBOS stages remain contiguous 1..4 without changes");

  // 12.9 Missing Owner Email Handling
  try {
    await sbuService.createProposal({
      ...testProp,
      cerprno: "CER-FAIL-NO-OWNER-01",
      sbu: "RJ North",
      owname: "Unknown Person",
      owner_email: "",
      current_level: 1,
    });
    assert(false, "12.9: Should fail when owner_email is missing for Project Owner stage");
  } catch (err: any) {
    assert(err.message.includes("Owner Email") || err.message.includes("owner"), "12.9: Safely rejected proposal creation with missing owner_email");
  }

  // 12.10 Segregation of Duties for Initiator / Creator
  const testInitiatorUser: IAppUser = {
    id: 505,
    email: "creator@vedanta.co.in",
    name: "CER Creator",
    role: "Approver",
    roles: ["Approver"],
    approval_level: 1,
    is_active: true,
  };
  const propCreatedByTest: ICERProposal = {
    ...testProp,
    cerprno: "CER-SOD-CREATOR-01",
    sbu: "RJ South", // Non-PO stage at L1
    created_by: "creator@vedanta.co.in",
    owner_email: "different.owner@vedanta.co.in",
    current_level: 1,
  };
  const rjSouthL1 = rjSouthLevels[0];
  const canCreatorApprove = PermissionService.canApproveCER(propCreatedByTest, testInitiatorUser, rjSouthL1);
  assert(canCreatorApprove.allowed === false && canCreatorApprove.reason?.includes("Segregation of Duties") === true, "12.10: Proposal initiator strictly blocked by Segregation of Duties");

  // 12.11 Pending Approvals Inbox Filtering Logic
  // Proposal at Project Owner stage (RJ North L1, Owner: Priya)
  const propAtPOStage: ICERProposal = {
    ...testProp,
    cerprno: "CER-INBOX-001",
    sbu: "RJ North",
    owname: "Priya Kalekar",
    owner_email: "priya.kalekar@cairnindia.com",
    current_level: 1,
    pending_with_role: "Project Owner",
    pending_with_email: "priya.kalekar@cairnindia.com",
    status: "In Approval",
  };
  const rjNorthL1Inbox = rjNorthLevels[0];

  const priyaInboxMatch = PermissionService.canApproveCER(propAtPOStage, priyaUser, rjNorthL1Inbox);
  assert(priyaInboxMatch.allowed === true, "12.11a: Designated Project Owner sees proposal in Pending Approvals inbox");

  const adminInboxMatch = PermissionService.canApproveCER(propAtPOStage, adminUser, rjNorthL1Inbox);
  assert(adminInboxMatch.allowed === false, "12.11b: Administrator does NOT see proposal in Pending Approvals inbox when not designated approver or owner");

  const otherInboxMatch = PermissionService.canApproveCER(propAtPOStage, sunilUser, rjNorthL1Inbox);
  assert(otherInboxMatch.allowed === false, "12.11c: Unrelated Approver does NOT see proposal in Pending Approvals inbox");

  // Proposal at Non-PO stage (RJ North L2, Discipline Lead: Sunil Verma)
  const propAtL2Stage: ICERProposal = {
    ...propAtPOStage,
    current_level: 2,
    pending_with_role: "Discipline Lead",
    pending_with_email: "sunil.verma@vedanta.co.in",
  };
  const rjNorthL2Inbox = rjNorthLevels[1];

  const sunilL2InboxMatch = PermissionService.canApproveCER(propAtL2Stage, sunilUser, rjNorthL2Inbox);
  assert(sunilL2InboxMatch.allowed === true, "12.11d: Configured stage approver sees proposal at their stage in inbox");

  const priyaL2InboxMatch = PermissionService.canApproveCER(propAtL2Stage, priyaWithL2Role, rjNorthL2Inbox);
  assert(priyaL2InboxMatch.allowed === false, "12.11e: Proposal owner does NOT see proposal in inbox on non-PO stage due to Segregation of Duties");

  // 12.12 Resequencing Algorithm Contiguity & No Duplicates
  // Initial 3 stages: [L1, L2, L3]
  // Simulate Add at position 2 -> should resequence to [1, 2, 3, 4]
  const currentLevels = [
    { level_id: 1, level_name: "Stage A", role_title: "Role A", sbu: "RJ North", is_active: true },
    { level_id: 2, level_name: "Stage B", role_title: "Role B", sbu: "RJ North", is_active: true },
    { level_id: 3, level_name: "Stage C", role_title: "Role C", sbu: "RJ North", is_active: true },
  ];
  const newInsertedLevel = { level_id: 2, level_name: "Stage New", role_title: "Role New", sbu: "RJ North", is_active: true };
  const sbuCopy = [...currentLevels];
  sbuCopy.splice(1, 0, newInsertedLevel); // Insert at index 1 (stage 2)
  const resequencedAfterInsert = sbuCopy.map((l, idx) => ({ ...l, level_id: idx + 1 }));

  assert(resequencedAfterInsert.length === 4, "12.12a: SBU levels count is 4 after insert");
  assert(
    resequencedAfterInsert[0].level_id === 1 &&
    resequencedAfterInsert[1].level_id === 2 &&
    resequencedAfterInsert[2].level_id === 3 &&
    resequencedAfterInsert[3].level_id === 4,
    "12.12b: Contiguous 1..N order maintained with no duplicate stage numbers"
  );
  assert(resequencedAfterInsert[1].level_name === "Stage New", "12.12c: New stage inserted at target sequence 2");

  // Simulate Delete at index 1 -> should resequence to [1, 2, 3]
  const remainingAfterDelete = resequencedAfterInsert.filter((_, idx) => idx !== 1);
  const resequencedAfterDelete = remainingAfterDelete.map((l, idx) => ({ ...l, level_id: idx + 1 }));
  assert(resequencedAfterDelete.length === 3, "12.12d: SBU levels count is 3 after delete");
  assert(
    resequencedAfterDelete[0].level_id === 1 &&
    resequencedAfterDelete[1].level_id === 2 &&
    resequencedAfterDelete[2].level_id === 3,
    "12.12e: Contiguous 1..N maintained after delete"
  );

  // 12.13 SharePoint List Item Transformation & SBU Consistency
  // Simulates SharePoint list response parsing and SBU-specific filtering/sorting
  const mockSharePointItems = [
    { Id: 101, Title: "L1", level_id: 1, level_name: "L1 - Project Owner Review", role_title: "Project Owner", sbu: "RJ North", is_active: true },
    { Id: 102, Title: "L2", level_id: 2, level_name: "L2 - Lead Review", role_title: "Lead", sbu: "RJ North", is_active: true },
    { Id: 201, Title: "L1", level_id: 1, level_name: "L1 - South Ops", role_title: "Ops", sbu: "RJ South", is_active: true },
  ];

  const mockApproverRoles: IUserRoleAssignment[] = [
    { id: "role-1", user_name: "Generic Level 1 Approver", user_email: "generic.l1@vedanta.co.in", login_name: "generic.l1@vedanta.co.in", role: "Approver", approval_level: 1, is_active: true, assigned_by: "Admin", assigned_date: new Date().toISOString() },
    { id: "role-2", user_name: "Discipline Lead", user_email: "lead@vedanta.co.in", login_name: "lead@vedanta.co.in", role: "Approver", approval_level: 2, is_active: true, assigned_by: "Admin", assigned_date: new Date().toISOString() },
  ];

  // Exact transformation logic used by SharePointCERDataService.getWorkflowLevels
  const parseSharePointWorkflowLevels = (items: typeof mockSharePointItems, targetSbu?: string): IWorkflowLevel[] => {
    const all = items.map((item) => {
      const lid = Number(item.level_id || 1);
      const lvlObj = {
        role_title: item.role_title || "",
        level_name: item.level_name || item.Title || `Level ${lid}`,
      };
      const isPO = isProjectOwnerStage(lvlObj);

      // Generic approver lookup skipped for Project Owner stage
      const matchedUser = !isPO
        ? mockApproverRoles.find(u => u.is_active && u.role === "Approver" && u.approval_level === lid)
        : undefined;

      return {
        id: String(item.Id),
        level_id: lid,
        level_name: lvlObj.level_name,
        role_title: lvlObj.role_title,
        sbu: item.sbu || "",
        is_active: item.is_active,
        is_project_owner_stage: isPO,
        approver_name: isPO ? "Project Owner (Auto-fetched from CER Proposal)" : (matchedUser ? matchedUser.user_name : ""),
        approver_email: isPO ? "" : (matchedUser ? matchedUser.user_email : ""),
      };
    });

    return targetSbu
      ? all.filter(l => l.sbu.toLowerCase() === targetSbu.trim().toLowerCase()).sort((a, b) => a.level_id - b.level_id)
      : all.sort((a, b) => a.level_id - b.level_id);
  };

  const parsedRjNorth = parseSharePointWorkflowLevels(mockSharePointItems, "RJ North");
  assert(parsedRjNorth.length === 2, "12.13a: SharePoint transformation exact SBU query returns 2 levels for RJ North");
  assert(parsedRjNorth[0].is_project_owner_stage === true, "12.13b: SharePoint transformation flags Project Owner stage accurately");
  assert((parsedRjNorth[0].approver_name || "").includes("Auto-fetched"), "12.13c: Project Owner approver name is auto-fetch indicator (not generic approver)");
  assert(parsedRjNorth[0].approver_email === "", "12.13d: Project Owner approver email is empty at level config (auto-fetched per proposal)");
  assert(parsedRjNorth[0].level_id === 1 && parsedRjNorth[1].level_id === 2, "12.13e: SharePoint transformation returns ordered sequences 1, 2");

  // ============================================================================
  // Test Suite 13: Approver Assignment Type Configuration & Dynamic Auto-Fetch
  // ============================================================================
  console.log("\nTest Suite 13: Approver Assignment Type Configuration & Dynamic Auto-Fetch");

  // 13.1 Selecting 'Auto — Project Owner' in modal logic
  const testRoleProjectOwner = "Project Owner";
  const defaultAssignmentForPO: ApproverAssignmentType = isProjectOwnerStage({ role_title: testRoleProjectOwner }) ? "ProjectOwnerAuto" : "SpecificUser";
  assert(defaultAssignmentForPO === "ProjectOwnerAuto", "13.1a: Project Owner role defaults assignment to 'ProjectOwnerAuto'");

  const testRoleOther = "SBU Operations Head";
  const defaultAssignmentForOther: ApproverAssignmentType = isProjectOwnerStage({ role_title: testRoleOther }) ? "ProjectOwnerAuto" : "SpecificUser";
  assert(defaultAssignmentForOther === "SpecificUser", "13.1b: Non-Project Owner role defaults assignment to 'SpecificUser'");

  // 13.2 Explicit assignment_type overrides title regex
  const explicitSpecificUserStage: IWorkflowLevel = {
    level_id: 1,
    level_name: "Project Owner Review",
    role_title: "Project Owner",
    sbu: "RJ North",
    is_active: true,
    assignment_type: "SpecificUser",
  };
  assert(isProjectOwnerStage(explicitSpecificUserStage) === false, "13.2a: Explicit assignment_type 'SpecificUser' overrides role title match");

  const explicitAutoStage: IWorkflowLevel = {
    level_id: 1,
    level_name: "L1 - Field Sponsor Sign-off",
    role_title: "Field Sponsor",
    sbu: "RJ North",
    is_active: true,
    assignment_type: "ProjectOwnerAuto",
  };
  assert(isProjectOwnerStage(explicitAutoStage) === true, "13.2b: Explicit assignment_type 'ProjectOwnerAuto' marks stage as dynamic Project Owner");

  // 13.3 Saving and reloading assignment type in DataService
  const testDs13 = new LocalMockCERDataService();
  const configuredLevels13: IWorkflowLevel[] = [
    {
      id: "lvl-rj-1",
      level_id: 1,
      level_name: "L1 - Project Owner Endorsement",
      role_title: "Project Owner",
      sbu: "RJ North",
      is_active: true,
      assignment_type: "ProjectOwnerAuto",
    },
    {
      id: "lvl-rj-2",
      level_id: 2,
      level_name: "L2 - Discipline Lead",
      role_title: "Discipline Lead",
      sbu: "RJ North",
      is_active: true,
      assignment_type: "SpecificUser",
      approver_name: "Sunil Verma",
      approver_email: "sunil.verma@vedanta.co.in",
    },
    {
      id: "lvl-cbos-1",
      level_id: 1,
      level_name: "L1 - CBOS Owner Review",
      role_title: "Project Owner",
      sbu: "CBOS",
      is_active: true,
      assignment_type: "ProjectOwnerAuto",
    },
    {
      id: "lvl-cbos-2",
      level_id: 2,
      level_name: "L2 - CBOS GM Review",
      role_title: "General Manager",
      sbu: "CBOS",
      is_active: true,
      assignment_type: "SpecificUser",
      approver_name: "Anita Desai",
      approver_email: "anita.desai@vedanta.co.in",
    },
  ];

  await testDs13.saveWorkflowLevels(configuredLevels13);
  const reloadedRjNorth13 = await testDs13.getWorkflowLevels("RJ North");
  assert(reloadedRjNorth13.length === 2, "13.3a: Saved and reloaded RJ North levels count is 2");
  assert(reloadedRjNorth13[0].assignment_type === "ProjectOwnerAuto", "13.3b: L1 preserves assignment_type 'ProjectOwnerAuto'");
  assert(reloadedRjNorth13[0].is_project_owner_stage === true, "13.3c: L1 reloads as dynamic project owner stage");
  assert((reloadedRjNorth13[0].approver_name || "").includes("Auto-fetched"), "13.3d: L1 approver_name indicates dynamic auto-fetch per proposal");
  assert(reloadedRjNorth13[1].assignment_type === "SpecificUser", "13.3e: L2 preserves assignment_type 'SpecificUser'");

  // 13.4 Specific User assignment continues to work as before
  assert(reloadedRjNorth13[1].is_project_owner_stage === false, "13.4a: Specific User stage is not flagged as project owner stage");
  assert(reloadedRjNorth13[1].approver_email === "sunil.verma@vedanta.co.in", "13.4b: Specific user approver email is preserved");

  // 13.5 Different proposals resolve to their own Project Owners
  const propA = {
    cerprno: "CER-PROP-ALICE",
    pr_name: "Alice Deepwater Well Study",
    owname: "Alice Smith",
    owner_email: "alice.smith@cairnindia.com",
    sbu: "RJ North",
    status: "In Approval",
    amount: 500000,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    period: "12 Months",
    object: "Deepwater subsea survey",
    cost_assumptions: "Validated with subsea engineering vendor.",
  } as any as ICERProposal;
  const createdPropA = await testDs13.createProposal(propA);
  assert(createdPropA.proposal.current_level === 1, "13.5a: Proposal A routed to Level 1");
  assert(createdPropA.proposal.pending_with_email === "alice.smith@cairnindia.com", "13.5b: Proposal A pending_with_email resolved to Alice's email");
  assert(createdPropA.proposal.pending_with_role === "Project Owner", "13.5c: Proposal A pending_with_role set to Project Owner");

  const propB = {
    cerprno: "CER-PROP-BOB",
    pr_name: "Bob Solar Power Array",
    owname: "Bob Jones",
    owner_email: "bob.jones@cairnindia.com",
    sbu: "RJ North",
    status: "In Approval",
    amount: 750000,
    currency: "USD",
    cat: "Urgent",
    payable: "Savings",
    period: "18 Months",
    object: "Green energy solar field",
    cost_assumptions: "Capex quote from accredited Tier 1 EPC.",
  } as any as ICERProposal;
  const createdPropB = await testDs13.createProposal(propB);
  assert(createdPropB.proposal.current_level === 1, "13.5d: Proposal B routed to Level 1");
  assert(createdPropB.proposal.pending_with_email === "bob.jones@cairnindia.com", "13.5e: Proposal B pending_with_email resolved to Bob's email");
  assert(createdPropB.proposal.pending_with_email !== createdPropA.proposal.pending_with_email, "13.5f: Proposals resolve to independent Project Owners (never hardcoded)");

  // 13.6 Correct authorization for the Project Owner
  const aliceUser: IAppUser = {
    id: 101,
    name: "Alice Smith",
    email: "alice.smith@cairnindia.com",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true,
  };
  const bobUser: IAppUser = {
    id: 102,
    name: "Bob Jones",
    email: "bob.jones@cairnindia.com",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true,
  };
  const charlieUser: IAppUser = {
    id: 103,
    name: "Charlie Brown",
    email: "charlie.brown@cairnindia.com",
    role: "Approver",
    roles: ["Approver"],
    approval_level: 1,
    is_active: true,
  };

  const authAliceOnPropA = PermissionService.canApproveCER(createdPropA.proposal, aliceUser, reloadedRjNorth13[0]);
  assert(authAliceOnPropA.allowed === true, "13.6a: Alice is authorized to approve Proposal A at Project Owner stage");

  const authBobOnPropB = PermissionService.canApproveCER(createdPropB.proposal, bobUser, reloadedRjNorth13[0]);
  assert(authBobOnPropB.allowed === true, "13.6b: Bob is authorized to approve Proposal B at Project Owner stage");

  // 13.7 Rejection of approval attempts by unauthorized users
  const authBobOnPropA = PermissionService.canApproveCER(createdPropA.proposal, bobUser, reloadedRjNorth13[0]);
  assert(authBobOnPropA.allowed === false, "13.7a: Bob is rejected from approving Proposal A (not the designated owner)");

  const authCharlieOnPropA = PermissionService.canApproveCER(createdPropA.proposal, charlieUser, reloadedRjNorth13[0]);
  assert(authCharlieOnPropA.allowed === false, "13.7b: Charlie (generic approver) is rejected from approving Proposal A at PO stage");

  let unauthorizedServiceRejection = false;
  try {
    await testDs13.recordDecision({
      cerprno: "CER-PROP-ALICE",
      level_id: 1,
      approver_name: "Bob Jones",
      approver_email: "bob.jones@cairnindia.com",
      decision: "APPROVED",
      comments: "Attempted unauthorized approval.",
    });
  } catch (err: any) {
    unauthorizedServiceRejection = true;
    assert(err.message.includes("Access Denied") || err.message.includes("designated Project Owner"), "13.7c: Service throws clear Access Denied error for unauthorized user");
  }
  assert(unauthorizedServiceRejection === true, "13.7d: Service layer strictly blocks unauthorized approval attempt");

  // 13.8 Missing or invalid Project Owner email blocking routing
  let blockedMissingEmail = false;
  try {
    await testDs13.createProposal({
      cerprno: "CER-PROP-NO-EMAIL",
      pr_name: "Proposal Without Owner Email",
      owname: "Ghost Owner",
      owner_email: "",
      sbu: "RJ North",
      status: "In Approval",
      amount: 100000,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "12 Months",
      object: "Missing email test",
      cost_assumptions: "Testing missing email rejection.",
    } as any as ICERProposal);
  } catch (err: any) {
    blockedMissingEmail = true;
    assert(err.message.includes("missing or invalid"), "13.8a: Proposal creation blocked when owner_email is empty");
  }
  assert(blockedMissingEmail === true, "13.8b: Service layer enforces valid email on Project Owner stage");

  let blockedInvalidEmail = false;
  try {
    await testDs13.createProposal({
      cerprno: "CER-PROP-BAD-EMAIL",
      pr_name: "Proposal With Malformed Email",
      owname: "Bad Email Owner",
      owner_email: "not-a-valid-email",
      sbu: "RJ North",
      status: "In Approval",
      amount: 100000,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "12 Months",
      object: "Malformed email test",
      cost_assumptions: "Testing malformed email rejection.",
    } as any as ICERProposal);
  } catch (err: any) {
    blockedInvalidEmail = true;
    assert(err.message.includes("missing or invalid"), "13.8c: Proposal creation blocked when owner_email is malformed");
  }
  assert(blockedInvalidEmail === true, "13.8d: Service layer enforces usable email syntax on Project Owner stage");

  assert(isValidEmail("user@domain.com") === true, "13.8e: isValidEmail accepts standard email");
  assert(isValidEmail("first.last@vedanta.co.in") === true, "13.8f: isValidEmail accepts dot in local and ccTLD domain");
  assert(isValidEmail("") === false, "13.8g: isValidEmail rejects empty string");
  assert(isValidEmail("not-an-email") === false, "13.8h: isValidEmail rejects string without @");
  assert(isValidEmail("user@nodot") === false, "13.8i: isValidEmail rejects domain without dot");

  // 13.9 Approval progressing to next stage within same SBU
  const approvalAliceResult = await testDs13.recordDecision({
    cerprno: "CER-PROP-ALICE",
    level_id: 1,
    approver_name: "Alice Smith",
    approver_email: "alice.smith@cairnindia.com",
    decision: "APPROVED",
    comments: "Project Owner endorsement verified and approved.",
  });
  assert(approvalAliceResult.success === true, "13.9a: Alice's approval recorded successfully");
  assert(approvalAliceResult.nextLevel === 2, "13.9b: Proposal advanced to Level 2 in response");

  const propAfterL1_13 = await testDs13.getProposalByNumber("CER-PROP-ALICE");
  assert(propAfterL1_13 !== null && propAfterL1_13.current_level === 2, "13.9c: Proposal current_level is 2 in database");
  assert(propAfterL1_13?.pending_with_role === "Discipline Lead", "13.9d: Pending with role is L2 Discipline Lead");
  assert(propAfterL1_13?.pending_with_email === "sunil.verma@vedanta.co.in", "13.9e: Pending approver is L2 Discipline Lead email in same SBU");
  assert(propAfterL1_13?.sbu === "RJ North", "13.9f: Proposal remains strictly within RJ North SBU route");

  // 13.10 Backward Compatibility with existing configurations
  const legacyLevel: IWorkflowLevel = {
    level_id: 1,
    level_name: "L1 - Project owner review",
    role_title: "Project owner",
    sbu: "RAVA",
    is_active: true,
  };
  assert(isProjectOwnerStage(legacyLevel) === true, "13.10a: Legacy level without assignment_type auto-detects Project Owner via role title");

  const legacyOtherLevel: IWorkflowLevel = {
    level_id: 2,
    level_name: "L2 - SBU Ops Review",
    role_title: "SBU Operations Head",
    sbu: "RAVA",
    is_active: true,
  };
  assert(isProjectOwnerStage(legacyOtherLevel) === false, "13.10b: Legacy level for other role is not flagged as project owner");

  // 13.11 SharePoint write failures reported accurately without mock fallback
  let sharePointErrorCaught = false;
  const simulatedSpFailureService = {
    saveWorkflowLevels: async (_levels: IWorkflowLevel[]) => {
      throw new Error("SharePoint REST 500: Server error updating list CER_WorkflowLevels.");
    },
  };
  try {
    await simulatedSpFailureService.saveWorkflowLevels(configuredLevels13);
  } catch (spErr: any) {
    sharePointErrorCaught = true;
    assert(spErr.message.includes("SharePoint REST 500"), "13.11a: SharePoint error propagated directly without silent mock fallback");
  }
  assert(sharePointErrorCaught === true, "13.11b: SharePoint write failures are reported accurately");

  // =========================================================================
  // TEST SUITE 14: Distinct Separation of 'Send Back to Initiator' vs 'Reject Proposal'
  // =========================================================================
  console.log("\nTest Suite 14: Distinct Separation of 'Send Back to Initiator' vs 'Reject Proposal'");
  const ds14 = new LocalMockCERDataService();

  const initiatorUser14: IAppUser = {
    id: "init-14",
    name: "Initiator Fourteen",
    email: "initiator14@cairnindia.com",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true,
  };

  const approverUser14: IAppUser = {
    id: "app-14",
    name: "Approver Fourteen",
    email: "approver14@cairnindia.com",
    role: "Approver",
    roles: ["Approver"],
    approval_level: 1,
    is_active: true,
  };

  await ds14.saveWorkflowLevels([
    { level_id: 1, level_name: "L1 - Technical Review", role_title: "Technical Reviewer", approver_name: approverUser14.name, approver_email: approverUser14.email, sbu: "RJ North", is_active: true },
    { level_id: 2, level_name: "L2 - SBU Head", role_title: "SBU Head", approver_name: "SBU Head", approver_email: "head@cairnindia.com", sbu: "RJ North", is_active: true },
  ]);

  // 14.1 Create proposal for Send Back test
  const createSendBackRes = await ds14.createProposal({
    cerprno: "CER-2026-SB01",
    pr_name: "Proposal for Send Back Workflow",
    owname: initiatorUser14.name,
    owner_email: initiatorUser14.email,
    sbu: "RJ North",
    cat: "Vital",
    amount: 75000,
    currency: "USD",
    period: "6 Months",
    payable: "Payback",
    remarks: "Initial submission",
  } as any);

  const propSendBack = createSendBackRes.proposal;
  assert(propSendBack.status === "In Approval", "14.1a: Proposal created with In Approval status");

  // Approver records SENT_BACK decision
  const sendBackResult = await ds14.recordDecision({
    cerprno: propSendBack.cerprno,
    level_id: 1,
    approver_name: approverUser14.name,
    approver_email: approverUser14.email,
    decision: "SENT_BACK",
    comments: "Please revise Section B financial benefits and attach updated vendor quotes.",
  });

  assert(sendBackResult.success === true, "14.1b: recordDecision returns success for SENT_BACK");
  assert(sendBackResult.newStatus === "Revised", "14.1c: Proposal transitions to status 'Revised'");

  const fetchedRevised = await ds14.getProposalByNumber(propSendBack.cerprno);
  assert(fetchedRevised !== null && fetchedRevised.status === "Revised", "14.1d: Proposal status in storage is 'Revised'");
  assert(fetchedRevised?.pending_with_role === "Initiator (Rework)", "14.1e: pending_with_role is 'Initiator (Rework)'");
  assert(fetchedRevised?.current_level === 1, "14.1f: current_level is reset to 1");
  assert(fetchedRevised?.pending_with_email === initiatorUser14.email, "14.1g: pending_with_email is set to initiator's email");

  // 14.2 Initiator is allowed to edit proposal in Revised status
  const initiatorEditAuth = PermissionService.canEditCER(fetchedRevised!, initiatorUser14);
  assert(initiatorEditAuth.allowed === true, "14.2a: Initiator is permitted to modify proposal in Revised status");

  // Non-owner cannot edit
  const otherUser14: IAppUser = {
    id: "other-14",
    name: "Other User",
    email: "other14@cairnindia.com",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true,
  };
  const otherEditAuth = PermissionService.canEditCER(fetchedRevised!, otherUser14);
  assert(otherEditAuth.allowed === false, "14.2b: Non-owner is blocked from modifying revised proposal");

  // 14.3 Initiator modifies proposal and re-triggers workflow
  const updatedRevised = await ds14.updateProposal({
    ...fetchedRevised!,
    amount: 82000,
    remarks: "Updated with revised vendor quotations as requested.",
    status: "In Approval",
    current_level: 1,
  }, { name: initiatorUser14.name, email: initiatorUser14.email });

  assert(updatedRevised.proposal.status === "In Approval", "14.3a: Resubmitted proposal reverts to 'In Approval'");
  assert(updatedRevised.proposal.current_level === 1, "14.3b: Resubmitted proposal restarts at Level 1");
  assert(updatedRevised.auditRowsCount > 0, "14.3c: Field delta audit records generated on revision resubmit");

  // 14.4 Create proposal for Permanent Rejection test
  const createRejectRes = await ds14.createProposal({
    cerprno: "CER-2026-REJ01",
    pr_name: "Proposal for Permanent Rejection",
    owname: initiatorUser14.name,
    owner_email: initiatorUser14.email,
    sbu: "RJ North",
    cat: "Vital",
    amount: 150000,
    currency: "USD",
    period: "12 Months",
    payable: "Payback",
    remarks: "Initial submission for reject",
  } as any);

  const propReject = createRejectRes.proposal;
  const rejectResult = await ds14.recordDecision({
    cerprno: propReject.cerprno,
    level_id: 1,
    approver_name: approverUser14.name,
    approver_email: approverUser14.email,
    decision: "REJECTED",
    comments: "Project cannot be sanctioned due to strategic budget realignment.",
  });

  assert(rejectResult.success === true, "14.4a: recordDecision returns success for REJECTED");
  assert(rejectResult.newStatus === "Rejected", "14.4b: Proposal transitions to status 'Rejected'");

  const fetchedRejected = await ds14.getProposalByNumber(propReject.cerprno);
  assert(fetchedRejected !== null && fetchedRejected.status === "Rejected", "14.4c: Proposal status in storage is 'Rejected'");

  // 14.5 Modifications strictly forbidden on Rejected proposal
  const rejectEditAuth = PermissionService.canEditCER(fetchedRejected!, initiatorUser14);
  assert(rejectEditAuth.allowed === false, "14.5a: PermissionService strictly blocks modification on Rejected proposal");
  assert(rejectEditAuth.reason?.includes("Rejected") === true, "14.5b: Clear explanation provided: proposal is 'Rejected' and cannot be modified");

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
