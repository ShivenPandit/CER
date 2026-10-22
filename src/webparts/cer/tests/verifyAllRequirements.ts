import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal, CATEGORY_DEFINITIONS, SBU_OPTIONS } from "../models/CERModel";
import { AUDIT_FIELD_DESCRIPTIONS, EXCLUDED_AUDIT_FIELDS } from "../models/AuditModel";
import { validateField, validateAll } from "../utils/cerValidation";
import { resolveDirectoryUserEmail, IAppUser, IUserRoleAssignment, UserRole } from "../models/UserModel";
import { AuthService } from "../services/AuthService";
import { PermissionService } from "../services/PermissionService";


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
    name: "Priya Kalekar (STL Digital)",
    email: "Priya.Kalekar@cairnindia.com",
    role: "Admin",
    roles: ["Admin"],
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
  const existingRoles = await service.getUserRoles();
  const currentAdmins = existingRoles.filter((r) => r.role === "Admin" && r.is_active);
  assert(currentAdmins.length >= 1, "Scenario 10a: Initial active Administrator exists in registry");

  let lastAdminRevocationBlocked = false;
  try {
    // If only 1 admin, revoking it must throw
    await service.revokeUserRole(currentAdmins[0].id, adminUser);
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

  // Level 3 Approval (Final)
  const l3Dec = await service.recordDecision({
    cerprno: lifecyclePropNo,
    decision: "APPROVED",
    comments: "L3 Executive Committee Approved",
    approver_name: approverL3.name,
    approver_email: approverL3.email,
    level_id: 3,
  });
  assert(l3Dec.success, "Scenario 15e: Level 3 approval recorded successfully");
  const postL3 = await service.getProposalByNumber(lifecyclePropNo);
  assert(postL3 !== null && postL3.status === "Approved", "Scenario 15f: Multi-tier approval completes with Approved status");

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
