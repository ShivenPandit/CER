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
  console.log("CER MANAGEMENT SYSTEM — COMPREHENSIVE REQUIREMENTS VERIFICATION SUITE");
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
  // Test Suite 7: Section H — Supporting Documents & Attachments Validation (10MB/20MB/Schema)
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 7: Section H — Supporting Documents & Attachments Validation (10MB / 20MB / Schema)");
  const {
    MAX_FILE_SIZE_BYTES,
    MAX_TOTAL_SIZE_BYTES,
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
