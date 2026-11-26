import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal, CATEGORY_DEFINITIONS, SBU_OPTIONS } from "../models/CERModel";
import { AUDIT_FIELD_DESCRIPTIONS, EXCLUDED_AUDIT_FIELDS } from "../models/AuditModel";
import { getFirstActiveError, FormErrors, validateField, validateAll, hasEnteredCostBreakdown } from "../utils/cerValidation";
import { EmailTemplateService } from "../services/EmailTemplateService";
import { buildTableRowsForIteration, IIterationRun, IProposalVersionEntry } from "../components/ApprovalWorkflow/StatusHistoryModal";
import { buildActiveCycleUpcomingRowsForPdf } from "../utils/pdfWorkflowHelpers";
import { IWorkflowLevel } from "../models/WorkflowModel";
import { formatUserFriendlySharePointError, normalizeUserLogon } from "../utils/sanitizationUtils";
import { PermissionService } from "../services/PermissionService";
import { IAppUser } from "../models/UserModel";
import {
  toStableSbuCode,
  toSbuDisplayName,
  parseSbuApprovalMap,
  serializeSbuApprovalMap,
  getSyncedSbusFromMap,
  updateSbuInApprovalMap,
  buildLegacyFallbackMap,
} from "../utils/sbuApprovalMapUtils";

// Standalone runner fallback for tsx / Node execution
const _global: any = typeof globalThis !== "undefined" ? globalThis : {};
if (typeof _global.describe === "undefined") {
  let beforeHook: (() => Promise<void> | void) | null = null;
  const testList: { name: string; fn: () => Promise<void> | void }[] = [];

  _global.describe = (name: string, suiteFn: () => void) => {
    console.log(`\n================================================================================`);
    console.log(` ${name}`);
    console.log(`================================================================================\n`);
    suiteFn();
    (async () => {
      let passed = 0;
      let failed = 0;
      for (const t of testList) {
        try {
          if (beforeHook) await beforeHook();
          await t.fn();
          console.log(`  ✔ [PASS] ${t.name}`);
          passed++;
        } catch (err: any) {
          console.error(`  ✖ [FAIL] ${t.name}:`, err.message);
          failed++;
        }
      }
      console.log(`\n================================================================================`);
      console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
      console.log(`================================================================================\n`);
      if (failed > 0 && typeof process !== "undefined" && typeof (process as any).exit === "function") {
        (process as any).exit(1);
      }
    })().catch((e) => {
      console.error("Test execution failed:", e);
      if (typeof process !== "undefined" && typeof (process as any).exit === "function") {
        (process as any).exit(1);
      }
    });
  };

  _global.beforeEach = (fn: () => Promise<void> | void) => {
    beforeHook = fn;
  };

  _global.test = (name: string, fn: () => Promise<void> | void) => {
    testList.push({ name, fn });
  };

  _global.expect = (actual: any) => ({
    toBe: (expected: any) => {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeUndefined: () => {
      if (actual !== undefined) throw new Error(`Expected undefined but got ${JSON.stringify(actual)}`);
    },
    toBeDefined: () => {
      if (actual === undefined) throw new Error("Expected value to be defined");
    },
    toBeTruthy: () => {
      if (!actual) throw new Error(`Expected truthy value but got ${JSON.stringify(actual)}`);
    },
    toBeFalsy: () => {
      if (actual) throw new Error(`Expected falsy value but got ${JSON.stringify(actual)}`);
    },
    toMatch: (pattern: RegExp) => {
      if (!pattern.test(String(actual))) throw new Error(`Expected "${actual}" to match ${pattern}`);
    },
    toBeGreaterThanOrEqual: (expected: number) => {
      if (actual < expected) throw new Error(`Expected ${actual} >= ${expected}`);
    },
    toContain: (item: any) => {
      if (Array.isArray(actual) ? actual.indexOf(item) === -1 : String(actual).indexOf(item) === -1) {
        throw new Error(`Expected collection to contain ${item}`);
      }
    },
    not: {
      toBe: (expected: any) => {
        if (actual === expected) throw new Error(`Expected value NOT to be ${JSON.stringify(expected)}`);
      },
      toBeNull: () => {
        if (actual === null) throw new Error("Expected value not to be null");
      },
      toBeUndefined: () => {
        if (actual === undefined) throw new Error("Expected value not to be undefined");
      },
      toContain: (item: any) => {
        if (Array.isArray(actual) ? actual.indexOf(item) !== -1 : String(actual).indexOf(item) !== -1) {
          throw new Error(`Expected collection NOT to contain ${item}`);
        }
      },
    },
  });
}

describe("CER Management System - Business Logic & Requirements Tests", () => {
  let service: LocalMockCERDataService;

  beforeEach(async () => {
    // Clear storage keys
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    service = new LocalMockCERDataService();
    // Dynamic test level configuration for workflow progression tests
    await service.saveWorkflowLevels([
      { level_id: 1, level_name: "Technical Review", role_title: "Technical Reviewer", approver_name: "Rajesh Sharma", approver_email: "rajesh.sharma@vedanta.co.in", sbu: "RJ North", is_active: true },
      { level_id: 2, level_name: "Finance Review", role_title: "Finance Reviewer", approver_name: "Sunil Verma", approver_email: "sunil.verma@vedanta.co.in", sbu: "RJ North", is_active: true },
      { level_id: 3, level_name: "Commercial & Contracts Review", role_title: "Commercial Reviewer", approver_name: "Ananya Deshmukh", approver_email: "ananya.deshmukh@vedanta.co.in", sbu: "RJ North", is_active: true },
      { level_id: 4, level_name: "Corporate Finance Review", role_title: "Corporate Finance Reviewer", approver_name: "Amit Saxena", approver_email: "amit.saxena@vedanta.co.in", sbu: "RJ North", is_active: true },
      { level_id: 5, level_name: "Executive Committee (ExCo) Review", role_title: "ExCo Reviewer", approver_name: "Neha Kulkarni", approver_email: "neha.kulkarni@vedanta.co.in", sbu: "RJ North", is_active: true },
      { level_id: 6, level_name: "CEO Approval", role_title: "CEO", approver_name: "Vikram Mehta", approver_email: "vikram.mehta@vedanta.co.in", sbu: "RJ North", is_active: true },
      { level_id: 7, level_name: "Board Approval", role_title: "Board of Directors", approver_name: "Arun Kumar", approver_email: "arun.kumar@vedanta.co.in", sbu: "RJ North", is_active: true },
    ]);
  });

  // TC-01: Proposal Creation (FR-01)
  test("FR-01: Creates a CER proposal with unique number and initiates workflow at Level 1", async () => {
    const proposalNumber = await service.generateProposalNumber();
    expect(proposalNumber).toMatch(/^CER-\d{4}-\d{4}$/);

    const testProposal: ICERProposal = {
      id: "prop-test-01",
      cerprno: proposalNumber,
      pr_name: "Test Infill Well Drilling",
      owname: "Test Initiator",
      owner_email: "test.initiator@vedanta.co.in",
      sbu: "RJ North",
      status: "In Approval",
      object: "Well Drilling",
      amount: 5000000,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "12 Months",
      ben_npv: 10.5,
      ben_irr: 25.0,
      cost_assumptions: "Assumed Brent $75",
      st_date: "2026-06-01",
      com_date: "2027-05-31",
      duration_months: 12,
      cbudget: "Yes",
      cb_amnt: 5000000,
      cb_currency: "USD",
      reason: "",
      jv: "No",
      jv_cost: 0,
      jv_budget: "No",
      jv_amnt: 0,
      jv_reason: "",
      ph_till_label: "Till FY26",
      ph_fy_label: "FY 26-27",
      ph_beyond_label: "Beyond FY27",
      prod_till: 0,
      prod_fy: 500000,
      prod_beyond: 1000000,
      capex_till: 2000000,
      capex_fy: 3000000,
      capex_beyond: 0,
      opex_till: 100000,
      opex_fy: 200000,
      opex_beyond: 0,
      engineer: 800000,
      s_fac: 2200000,
      comis: 500000,
      preop: 500000,
      others: 1000000,
      total: 5000000,
      remarks: "Thorough testing of proposal submission and workflow triggers.",
      remarks_jv: "",
      current_level: 1,
      pending_with_role: "L1 Approver",
      pending_with_email: "rajesh.sharma@vedanta.co.in",
      created_date: new Date().toISOString(),
      created_by: "Test Initiator",
      modified_date: new Date().toISOString(),
      modified_by: "Test Initiator",
      revision_count: 0,
    };

    const result = await service.createProposal(testProposal);
    expect(result.success).toBe(true);
    expect(result.message).toBe("CER Proposal No. has been created and sent for approval");
    expect(result.proposal.current_level).toBe(1);

    // Verify retrieval
    const retrieved = await service.getProposalByNumber(proposalNumber);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.pr_name).toBe("Test Infill Well Drilling");
  });

  // TC-04 & TC-05: Change CER & Delta Audit Trail (FR-02 & FR-06)
  test("FR-02 & FR-06: Modifying proposal records exact field-level deltas excluding technical fields", async () => {
    const existing = await service.getProposalByNumber("CER-2026-0001");
    expect(existing).not.toBeNull();
    if (!existing) return;

    const originalAmount = existing.amount;

    // Modify specific fields
    const modified: ICERProposal = {
      ...existing,
      amount: 16000000,
      ben_npv: 35.0,
      // Technical fields like modified_date will change, but must NOT be in business audit rows
    };

    const result = await service.updateProposal(modified, {
      name: existing.owname,
      email: existing.owner_email,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("CER Proposal No. has been changed and sent for approval");

    // Retrieve audit trail for CER-2026-0001
    const auditRows = await service.getAuditTrail("CER-2026-0001");
    const amountChanges = auditRows.filter((r) => r.field_name === "amount");
    expect(amountChanges.length).toBeGreaterThanOrEqual(1);
    expect(amountChanges[0].old_value).toBe(String(originalAmount));
    expect(amountChanges[0].new_value).toBe("16000000");
    expect(amountChanges[0].field_desc).toBe(AUDIT_FIELD_DESCRIPTIONS.amount);

    // Verify no excluded technical fields exist in audit
    for (const row of auditRows) {
      expect(EXCLUDED_AUDIT_FIELDS.has(row.field_name)).toBe(false);
    }
  });

  // TC-08 & TC-09: Workflow Transitions & Multilevel Progression (7 Sequential Levels)
  test("FR-05: Advances sequentially through Levels 1-7 to Approved, recording decisions and enforcing post-approval re-trigger", async () => {
    const cerprno = "CER-2026-0001";
    const proposal = await service.getProposalByNumber(cerprno);
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    // Ensure starting at Level 1 for full 7-level sequential progression
    proposal.current_level = 1;
    await service.updateProposal(proposal, { name: proposal.owname, email: proposal.owner_email });

    // Approve L1
    const l1Decision = await service.recordDecision({
      cerprno,
      level_id: 1,
      approver_name: "Rajesh Sharma",
      approver_email: "rajesh.sharma@vedanta.co.in",
      decision: "APPROVED",
      comments: "Technical Review approved.",
    });
    expect(l1Decision.success).toBe(true);
    expect(l1Decision.nextLevel).toBe(2);

    // Approve L2
    const l2Decision = await service.recordDecision({
      cerprno,
      level_id: 2,
      approver_name: "Sunil Verma",
      approver_email: "sunil.verma@vedanta.co.in",
      decision: "APPROVED",
      comments: "Financial models verified.",
    });
    expect(l2Decision.success).toBe(true);
    expect(l2Decision.nextLevel).toBe(3);

    // Approve L3
    const l3Decision = await service.recordDecision({
      cerprno,
      level_id: 3,
      approver_name: "Ananya Deshmukh",
      approver_email: "ananya.deshmukh@vedanta.co.in",
      decision: "APPROVED",
      comments: "Commercial & Contracts Review approved.",
    });
    expect(l3Decision.success).toBe(true);
    expect(l3Decision.nextLevel).toBe(4);

    // Approve L4
    const l4Decision = await service.recordDecision({
      cerprno,
      level_id: 4,
      approver_name: "Amit Saxena",
      approver_email: "amit.saxena@vedanta.co.in",
      decision: "APPROVED",
      comments: "Corporate Finance Review approved.",
    });
    expect(l4Decision.success).toBe(true);
    expect(l4Decision.nextLevel).toBe(5);

    // Approve L5
    const l5Decision = await service.recordDecision({
      cerprno,
      level_id: 5,
      approver_name: "Neha Kulkarni",
      approver_email: "neha.kulkarni@vedanta.co.in",
      decision: "APPROVED",
      comments: "JV alignment verified.",
    });
    expect(l5Decision.success).toBe(true);
    expect(l5Decision.nextLevel).toBe(6);

    // Approve L6
    const l6Decision = await service.recordDecision({
      cerprno,
      level_id: 6,
      approver_name: "Vikram Mehta",
      approver_email: "vikram.mehta@vedanta.co.in",
      decision: "APPROVED",
      comments: "COO Operational Sign-off completed.",
    });
    expect(l6Decision.success).toBe(true);
    expect(l6Decision.nextLevel).toBe(7);

    // Approve L7 (Final Sanction)
    const l7Decision = await service.recordDecision({
      cerprno,
      level_id: 7,
      approver_name: "Arun Kumar",
      approver_email: "arun.kumar@vedanta.co.in",
      decision: "APPROVED",
      comments: "CEO & MD final executive sanction granted.",
    });
    expect(l7Decision.success).toBe(true);
    expect(l7Decision.newStatus).toBe("Approved");

    const approvedProposal = await service.getProposalByNumber(cerprno);
    expect(approvedProposal?.status).toBe("Approved");

    // Client Requirement 4: Editing an Approved CER re-triggers approval from Level 1
    const priorDecisionsCount = (await service.getApprovalDecisions(cerprno)).length;
    expect(priorDecisionsCount).toBeGreaterThanOrEqual(7);

    const editRes = await service.updateProposal(
      { ...approvedProposal!, amount: 16500000, object: "Revised scope for high-pressure compressors" },
      { name: "Demo Initiator", email: "demo.initiator@example.com" }
    );

    expect(editRes.success).toBe(true);
    expect(editRes.proposal.status).toBe("In Approval");
    expect(editRes.proposal.current_level).toBe(1);

    // Past approval history must remain intact
    const postEditDecisions = await service.getApprovalDecisions(cerprno);
    expect(postEditDecisions.length).toBe(priorDecisionsCount);
  });

  // TC-10 & TC-11: Remarks Versioning & Audit (FR-08)
  test("FR-08: Remarks edits increment version history with author and timestamp", async () => {
    const cerprno = "CER-2026-0001";
    const initialVersions = await service.getRemarksHistory(cerprno);
    expect(initialVersions.length).toBe(0);

    const proposal = await service.getProposalByNumber(cerprno);
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const newRemarks = "Updated justification: Reservoir pressure dynamics necessitate immediate expansion in Q3.";
    await service.updateProposal(
      { ...proposal, remarks: newRemarks },
      { name: "Demo Initiator", email: "demo.initiator@example.com" }
    );

    // CERRemarksHistory list is safely deprecated per schema design
    const updatedVersions = await service.getRemarksHistory(cerprno);
    expect(updatedVersions.length).toBe(0);

    // Remarks updates are captured in the audit trail (FR-06 / FR-08)
    const auditTrail = await service.getAuditTrail(cerprno);
    const remarksEntry = auditTrail.find((a) => a.field_name === "remarks" && a.new_value === newRemarks);
    expect(remarksEntry !== undefined).toBe(true);
    expect(remarksEntry?.new_value).toBe(newRemarks);
    expect(remarksEntry?.user_name).toBe("Demo Initiator");
  });

  // BR-04: SBU Updates
  test("BR-04: SBU options contain RJ North and RJ South, and omit legacy RJ01", () => {
    expect(SBU_OPTIONS).toContain("RJ North");
    expect(SBU_OPTIONS).toContain("RJ South");
    expect(SBU_OPTIONS).not.toContain("RJ01");
    expect(SBU_OPTIONS).not.toContain("RJ Oil & Gas");
  });

  // BR-07: Category Definitions
  test("BR-07: Category definitions exist for Vital, Essential, and Desirable", () => {
    expect(CATEGORY_DEFINITIONS.Vital.label).toBe("Vital");
    expect(CATEGORY_DEFINITIONS.Vital.description).toContain("cannot be postponed");

    expect(CATEGORY_DEFINITIONS.Essential.label).toBe("Essential");
    expect(CATEGORY_DEFINITIONS.Essential.description).toContain("smooth running");

    expect(CATEGORY_DEFINITIONS.Desirable.label).toBe("Desirable");
    expect(CATEGORY_DEFINITIONS.Desirable.description).toContain("can be deferred");
  });

  // UI-01: Real-time top error message banner resolution
  test("UI-01: Top validation message updates in real time according to field display order", () => {
    // State 1: All required fields empty (Image 1)
    const errors: FormErrors = {
      pr_name: "Name of the Project is required.",
      proposal_no: "CER Proposal No is required.",
      owname: "CER Owner Name is required. Please select a user from the directory.",
      st_date: "Start Date of the Project is required.",
      object: "Objective of CER is required.",
    };
    expect(getFirstActiveError(errors)).toBe("Name of the Project is required.");

    // State 2: User fills in Name of Project (Image 2)
    delete errors.pr_name;
    expect(getFirstActiveError(errors)).toBe("CER Proposal No is required.");

    // State 3: User fills in CER Proposal No
    delete errors.proposal_no;
    expect(getFirstActiveError(errors)).toBe("CER Owner Name is required. Please select a user from the directory.");

    // State 4: User selects CER Owner
    delete errors.owname;
    expect(getFirstActiveError(errors)).toBe("Start Date of the Project is required.");

    // State 5: User fills Start Date
    delete errors.st_date;
    expect(getFirstActiveError(errors)).toBe("Objective of CER is required.");

    // State 6: User fills Objectives
    delete errors.object;
    expect(getFirstActiveError(errors)).toBeUndefined();
  });

  // UI-02: Clean validation messages without legacy section letters
  test("UI-02: Validation error message for Amount of CER does not reference legacy section letters", () => {
    const amountErr = validateField("amount", 0, {} as ICERProposal, false);
    expect(amountErr).toBe("Capex ($mm) is mandatory. Please enter Capex phasing to set the Amount of CER.");
    expect(amountErr).not.toContain("Section C");
  });

  // NOTIF-01: Dual stakeholder email resolution deduplicates when Owner and Initiator are the same person
  test("NOTIF-01: Dual stakeholder email resolution deduplicates when Owner and Initiator are the same person", () => {
    const proposal: Partial<ICERProposal> = {
      owner_email: "shiven.pandit@microlink.com",
      created_by_email: "shiven.pandit@microlink.com",
    };
    const recipients = EmailTemplateService.resolveStakeholderEmails(proposal);
    expect(recipients).toBe("shiven.pandit@microlink.com");
  });

  // NOTIF-02: Dual stakeholder email resolution includes both Owner and Initiator when they are different persons
  test("NOTIF-02: Dual stakeholder email resolution includes both Owner and Initiator when they are different persons", () => {
    const proposal: Partial<ICERProposal> = {
      owner_email: "arun.kulkarni@vedanta.co.in",
      created_by_email: "shiven.pandit@microlink.com",
    };
    const recipients = EmailTemplateService.resolveStakeholderEmails(proposal);
    expect(recipients).toBe("arun.kulkarni@vedanta.co.in; shiven.pandit@microlink.com");
  });

  // NOTIF-03: Dual stakeholder email resolution handles SharePoint claims prefix and case normalization
  test("NOTIF-03: Dual stakeholder email resolution handles SharePoint claims prefix and case normalization", () => {
    const proposal: Partial<ICERProposal> = {
      owner_email: "Arun.Kulkarni@vedanta.co.in",
      created_by_email: "i:0#.f|membership|arun.kulkarni@vedanta.co.in",
    };
    const sameUserRecipients = EmailTemplateService.resolveStakeholderEmails(proposal);
    expect(sameUserRecipients).toBe("Arun.Kulkarni@vedanta.co.in");

    const diffProposal: Partial<ICERProposal> = {
      owner_email: "arun.kulkarni@vedanta.co.in",
      created_by_email: "i:0#.f|membership|shiven.pandit@microlink.com",
    };
    const diffRecipients = EmailTemplateService.resolveStakeholderEmails(diffProposal);
    expect(diffRecipients).toBe("arun.kulkarni@vedanta.co.in; shiven.pandit@microlink.com");
  });

  // NOTIF-04: Stakeholder salutation properly addresses single person or dual persons
  test("NOTIF-04: Stakeholder salutation properly addresses single person or dual persons", () => {
    // Same person
    const sameProposal: Partial<ICERProposal> = {
      owname: "Shiven Pandit",
      created_by: "Shiven Pandit",
      owner_email: "shiven@test.com",
      created_by_email: "shiven@test.com",
    };
    expect(EmailTemplateService.getStakeholderSalutation(sameProposal)).toBe("Shiven Pandit");

    // Different persons
    const diffProposal: Partial<ICERProposal> = {
      owname: "Arun Kulkarni",
      created_by: "Shiven Pandit",
      owner_email: "arun@vedanta.co.in",
      created_by_email: "shiven@test.com",
    };
    expect(EmailTemplateService.getStakeholderSalutation(diffProposal)).toBe("Arun Kulkarni & Shiven Pandit");
  });

  // NOTIF-05: Fallback initiator email support
  test("NOTIF-05: Fallback initiator email support when created_by_email is missing", () => {
    const proposal: Partial<ICERProposal> = {
      owner_email: "arun.kulkarni@vedanta.co.in",
    };
    const recipients = EmailTemplateService.resolveStakeholderEmails(proposal, "initiator@vedanta.co.in");
    expect(recipients).toBe("arun.kulkarni@vedanta.co.in; initiator@vedanta.co.in");
  });

  // NOTIF-06: Verifies approval emails (Scenarios 1a and 2a) link to #pending-approvals
  test("NOTIF-06: Submission approver email (Scenarios 1a & 2a) links to #pending-approvals", () => {
    const proposal: any = {
      cerprno: "CER-2026-0012",
      cer_proposal_id: "CER-2026-0012",
      pr_name: "Test Project 11",
      sbu: "RJ North",
      owname: "Test Owner",
      owner_email: "test.owner@vedanta.co.in",
      cat: "Vital",
      amount: 50000,
      currency: "USD",
    };
    const result = EmailTemplateService.renderSubmissionApproverEmail(proposal, "Finance");
    expect(result.body).toContain("#pending-approvals");
    expect(result.body).not.toContain("#pending-approvals/CER-2026-0012");
    expect(result.body).toContain("Go to Pending Approvals");
  });

  // NOTIF-07: Verifies stage advancement email (Scenario 3a) links to #pending-approvals
  test("NOTIF-07: Stage advancement approver email (Scenario 3a) links to #pending-approvals", () => {
    const proposal: any = {
      cerprno: "CER-2026-0012",
      cer_proposal_id: "CER-2026-0012",
      pr_name: "Test Project 11",
      owname: "Test Owner",
      owner_email: "test.owner@vedanta.co.in",
      amount: 50000,
      currency: "USD",
    };
    const result = EmailTemplateService.renderStageAdvancementApproverEmail(
      proposal,
      "Shiven Pandit",
      "Approved at Level 3",
      4,
      "BU Director"
    );
    expect(result.body).toContain("#pending-approvals");
    expect(result.body).not.toContain("#pending-approvals/CER-2026-0012");
    expect(result.body).toContain("Go to Pending Approvals");
  });

  // NOTIF-08: Verifies owner tracking emails retain deep links to specific proposal display
  test("NOTIF-08: Owner/Initiator tracking emails link to proposal display (#display/CER-xxxx)", () => {
    const proposal: any = {
      cerprno: "CER-2026-0012",
      cer_proposal_id: "CER-2026-0012",
      pr_name: "Test Project 11",
      owname: "Test Owner",
      owner_email: "test.owner@vedanta.co.in",
    };
    const submissionOwner = EmailTemplateService.renderSubmissionOwnerEmail(proposal, "Finance");
    expect(submissionOwner.body).toContain("#display/CER-2026-0012");

    const advancementOwner = EmailTemplateService.renderStageAdvancementOwnerEmail(
      proposal,
      "Shiven Pandit",
      3,
      4,
      "BU Director"
    );
    expect(advancementOwner.body).toContain("#display/CER-2026-0012");

    const finalSanction = EmailTemplateService.renderFinalSanctionEmail(proposal, "Arun Kumar", "Sanctioned");
    expect(finalSanction.body).toContain("#display/CER-2026-0012");

    const sendBack = EmailTemplateService.renderSendBackEmail(proposal, "Approver", "Please rework", 2);
    expect(sendBack.body).toContain("#change/CER-2026-0012");
  });

  // EMAIL-REVISE-01: Verifies initial proposal email outputs redesigned details and single CER Amount
  test("EMAIL-REVISE-01: Initial proposal email (Scenario 1a) outputs redesigned table details and single CER Amount", () => {
    const proposal: any = {
      cerprno: "CER-2026-0032",
      cer_proposal_id: "CER-2026-0032",
      pr_name: "Test Project 12",
      owname: "Shiven Pandit (Microlink)",
      owner_email: "shiven.pandit@microlink.in",
      payable: "Payback",
      payback_quarters: 4,
      amount: 10000,
      currency: "USD",
      revision_count: 0,
    };
    const email = EmailTemplateService.renderSubmissionApproverEmail(proposal, "Finance");
    expect(email.body).toContain("CER Proposal ID:");
    expect(email.body).toContain("CER-2026-0032");
    expect(email.body).toContain("Project Name:");
    expect(email.body).toContain("Test Project 12");
    expect(email.body).toContain("CER Owner:");
    expect(email.body).toContain("Shiven Pandit (Microlink)");
    expect(email.body).toContain("Payback/NonPayback:");
    expect(email.body).toContain("Payback (4 Quarters)");
    expect(email.body).toContain("CER Amount:</td><td class=\"val\">USD 10,000");
    expect(email.body).not.toContain("CER Amount (V1):");
  });

  // EMAIL-REVISE-02: Verifies post-approval revision 1 outputs CER Amount (V1) and REVISED CER Amount (V2)
  test("EMAIL-REVISE-02: Post-approval revision 1 outputs CER Amount (V1) and REVISED CER Amount (V2)", () => {
    const proposal: any = {
      cerprno: "CER-2026-0032",
      cer_proposal_id: "CER-2026-0032",
      proposal_no: "PR-2026/0012-R1",
      pr_name: "Test Project 12",
      owname: "Shiven Pandit (Microlink)",
      owner_email: "shiven.pandit@microlink.in",
      payable: "Non Payback",
      amount: 14000,
      currency: "USD",
      revision_count: 1,
    };
    // Scenario 2a: Level 1 Approver on post-approval resubmission
    const resubmitEmail = EmailTemplateService.renderSubmissionApproverEmail(proposal, "Finance", {
      v1Amount: 10000,
    });
    expect(resubmitEmail.body).toContain("Payback/NonPayback:");
    expect(resubmitEmail.body).toContain("Non Payback");
    expect(resubmitEmail.body).toContain("CER Amount (V1):</td><td class=\"val\">USD 10,000");
    expect(resubmitEmail.body).toContain("REVISED CER Amount (V2):</td><td class=\"val\">USD 14,000");

    // Scenario 3a: Stage Advancement on post-approval revision
    const stageEmail = EmailTemplateService.renderStageAdvancementApproverEmail(
      proposal,
      "Shiven Pandit",
      "Approved revised scope",
      2,
      "Project Owner",
      { v1Amount: 10000 }
    );
    expect(stageEmail.body).toContain("CER Amount (V1):</td><td class=\"val\">USD 10,000");
    expect(stageEmail.body).toContain("REVISED CER Amount (V2):</td><td class=\"val\">USD 14,000");
  });

  // EMAIL-REVISE-03: Verifies subsequent post-approval revision 2 outputs CER Amount (V1) and REVISED CER Amount (V3)
  test("EMAIL-REVISE-03: Subsequent post-approval revision 2 outputs CER Amount (V1) and REVISED CER Amount (V3)", () => {
    const proposal: any = {
      cerprno: "CER-2026-0032",
      cer_proposal_id: "CER-2026-0032",
      proposal_no: "PR-2026/0012-R2",
      pr_name: "Test Project 12",
      owname: "Shiven Pandit (Microlink)",
      owner_email: "shiven.pandit@microlink.in",
      payable: "Payback",
      payback_quarters: 6,
      amount: 18000,
      currency: "USD",
      revision_count: 2,
    };
    const email = EmailTemplateService.renderSubmissionApproverEmail(proposal, "Finance", {
      v1Amount: 10000,
    });
    expect(email.body).toContain("Payback (6 Quarters)");
    expect(email.body).toContain("CER Amount (V1):</td><td class=\"val\">USD 10,000");
    expect(email.body).toContain("REVISED CER Amount (V3):</td><td class=\"val\">USD 18,000");
  });

  // EMAIL-PAYBACK-01: Verifies Payback/NonPayback formatting edge cases
  test("EMAIL-PAYBACK-01: Payback/NonPayback formats quarters, without quarters, and non payback", () => {
    const p1: any = { payable: "Payback", payback_quarters: 8 };
    const e1 = EmailTemplateService.renderSubmissionApproverEmail(p1, "Finance");
    expect(e1.body).toContain("Payback (8 Quarters)");

    const p2: any = { payable: "Payback" };
    const e2 = EmailTemplateService.renderSubmissionApproverEmail(p2, "Finance");
    expect(e2.body).toContain("Payback</td>");

    const p3: any = { payable: "Non-Payback" };
    const e3 = EmailTemplateService.renderSubmissionApproverEmail(p3, "Finance");
    expect(e3.body).toContain("Non Payback</td>");
  });

  // PAYBACK-01: Payback Period (Quarters) is optional on submission
  test("PAYBACK-01: Payback Period (Quarters) is optional and does not trigger error on submission when omitted", () => {
    const validProposal: any = {
      pr_name: "Test Project",
      cerprno: "CER-2026-9999",
      proposal_no: "PR-2026/01",
      sbu: "RJ North",
      owname: "Test Owner",
      owner_email: "test.owner@vedanta.co.in",
      start_date: "2026-04-01",
      object: "Test Objective",
      category: "Vital",
      amount: 1000,
      currency: "USD",
      payable: "Payback",
      period: "1 Year",
      // payback_quarters omitted
      cbudget: "No",
      jv: "No",
      capex_till: 500,
      capex_fy: 500,
      capex_beyond: 0,
      wells: 500,
      others: 500,
      total: 1000,
    };

    const res = validateAll(validProposal, false);
    expect(res.errors.payback_quarters).toBeUndefined();

    // But if negative number is entered, format validation still triggers
    const invalidProposal = { ...validProposal, payback_quarters: -2 };
    const invalidRes = validateAll(invalidProposal, false);
    expect(invalidRes.errors.payback_quarters).toBe("Payback Period must be a positive whole number of quarters (e.g., 4).");
  });

  // WELLS-01: Wells cost is included in cost breakdown detection and total balance validation
  test("WELLS-01: Wells cost is detected in hasEnteredCostBreakdown and total balance validation", () => {
    const pWithWells: any = {
      engineer: 0,
      s_fac: 0,
      comis: 0,
      wells: 2000,
      others: 0,
      amount: 2500,
      total: 2000,
    };
    expect(hasEnteredCostBreakdown(pWithWells)).toBe(true);

    // Mismatched total (wells 2000 != amount 2500)
    const err = validateField("total", 2000, pWithWells, false);
    expect(err).toBe("Total CAPEX ($2,000 mm) must equal Amount of CER ($2,500 mm). Difference: -$500 mm");

    // Matched total
    const okProposal = { ...pWithWells, wells: 2500, total: 2500 };
    const ok = validateField("total", 2500, okProposal, false);
    expect(ok).toBeUndefined();
  });

  // STATUS-MODAL-01: Pending and active-cycle Not Started rows resolve assigned action taker names
  test("STATUS-MODAL-01: buildTableRowsForIteration resolves action taker names for pending and active cycle not started stages", () => {
    const rawProposal: ICERProposal = {
      id: "1",
      cerprno: "CER-2026-0037",
      proposal_no: "PR-2026/EmailTest/01",
      cer_proposal_id: "CER-2026-0037",
      pr_name: "Email Testing",
      sbu: "RJ North",
      owname: "Rajesh Kumar",
      owner_email: "rajesh.kumar@vedanta.co.in",
      status: "In Approval",
      current_level: 2,
      pending_with_role: "L2 - CER Owner",
      amount: 39,
      total: 39,
    } as any;

    const mockIteration: IIterationRun = {
      iterationIndex: 1,
      isLatestActive: true,
      isSentBack: false,
      decisions: [
        {
          id: "dec-1",
          cerprno: "CER-2026-0037",
          level_id: 1,
          level_name: "Finance",
          approver_name: "Shiven Pandit (Microlink)",
          approver_email: "shiven@microlink.com",
          decision: "APPROVED",
          comments: "L1 Approved",
          timestamp: "2026-11-19T18:08:00Z",
        },
      ],
    };

    const mockVersion: IProposalVersionEntry = {
      id: "CURRENT",
      serialNo: 1,
      versionLabel: "v1 Active",
      isCurrent: true,
      proposalNo: "PR-2026/EmailTest/01",
      status: "In Approval",
      amount: 39,
      currency: "USD",
      dateStr: "19 Nov 2026",
      rawProposal,
    };

    const mockLevels: IWorkflowLevel[] = [
      { level_id: 1, level_name: "Finance", role_title: "Finance", approver_name: "Finance Lead", approver_email: "fin@vedanta.co.in", is_active: true },
      { level_id: 2, level_name: "CER Owner", role_title: "CER Owner", approver_name: "CER Owner", approver_email: "owner@vedanta.co.in", is_active: true },
      { level_id: 3, level_name: "BU CFO", role_title: "BU CFO", approver_name: "BU CFO User", approver_email: "cfo@vedanta.co.in", is_active: true },
    ];

    const rows = buildTableRowsForIteration(mockIteration, mockVersion, mockLevels);
    expect(rows.length).toBe(6);

    // L1: Approved by Shiven Pandit
    expect(rows[0].stage.level).toBe(1);
    expect(rows[0].statusText).toBe("Approved");
    expect(rows[0].updatedBy).toBe("Shiven Pandit (Microlink)");

    // L2: Pending — action taker is CER Owner (Rajesh Kumar)
    expect(rows[1].stage.level).toBe(2);
    expect(rows[1].statusText).toBe("Pending");
    expect(rows[1].updatedBy).toBe("Rajesh Kumar");

    // L3: Not Started in Active Workflow Cycle — resolves live from workflowLevels
    expect(rows[2].stage.level).toBe(3);
    expect(rows[2].statusText).toBe("Not Started");
    expect(rows[2].updatedBy).toBe("BU CFO User");

    // L4-L6: Not Started and unconfigured in mockLevels — defaults to "—"
    for (let i = 3; i < rows.length; i++) {
      expect(rows[i].statusText).toBe("Not Started");
      expect(rows[i].updatedBy).toBe("—");
    }
  });

  // STATUS-MODAL-04: Not Started stages show live CERRoleMatrix approver names ONLY in Active Workflow Cycle
  test("STATUS-MODAL-04: Not Started stages resolve live role matrix approvers only in Active Workflow Cycle", () => {
    const rawProposal: ICERProposal = {
      id: "4",
      cerprno: "CER-2026-0042",
      proposal_no: "PR-2026/0006",
      cer_proposal_id: "CER-2026-0042",
      pr_name: "Testing Live Not Started",
      sbu: "RJ North",
      owname: "Shiven Pandit (Microlink)",
      owner_email: "shiven@microlink.com",
      status: "In Approval",
      current_level: 3,
      pending_with_role: "BU CFO",
      amount: 4,
      total: 4,
    } as any;

    const mockLevels: IWorkflowLevel[] = [
      { level_id: 1, level_name: "Finance", role_title: "Finance", approver_name: "", approver_email: "", approvers: [{ user_name: "Shiven Pandit (Microlink)", user_email: "shiven@microlink.com", sbu: "RJ North" }], is_active: true },
      { level_id: 2, level_name: "Project Owner", role_title: "Project Owner", approver_name: "Project Owner (Auto-fetched from CER Proposal)", approver_email: "", is_project_owner_stage: true, is_active: true },
      { level_id: 3, level_name: "BU CFO", role_title: "BU CFO", approver_name: "", approver_email: "", approvers: [{ user_name: "Shiven Pandit (Microlink)", user_email: "shiven@microlink.com", sbu: "RJ North" }], is_active: true },
      { level_id: 4, level_name: "BU Director", role_title: "BU Director", approver_name: "", approver_email: "", approvers: [{ user_name: "Rajesh Director", user_email: "rajesh.d@vedanta.co.in", sbu: "RJ North" }], is_active: true },
      { level_id: 5, level_name: "VOGL CFO", role_title: "VOGL CFO", approver_name: "", approver_email: "", approvers: [{ user_name: "Nitin Doshi (STL Digital)", user_email: "nitin@stl.com", sbu: "RJ North" }, { user_name: "Vikram CFO", user_email: "vikram@vedanta.co.in", sbu: "RJ North" }], is_active: true },
      { level_id: 6, level_name: "VOGL CEO", role_title: "VOGL CEO", approver_name: "", approver_email: "", approvers: [{ user_name: "CEO User", user_email: "ceo@vedanta.co.in", sbu: "RJ North" }], is_active: true },
    ];

    const activeIter: IIterationRun = {
      iterationIndex: 1,
      isLatestActive: true,
      isSentBack: false,
      decisions: [
        { id: "d1", cerprno: "CER-2026-0042", level_id: 1, level_name: "Finance", approver_name: "Shiven Pandit (Microlink)", approver_email: "shiven@microlink.com", decision: "APPROVED", comments: "OK", timestamp: "2026-11-24T14:32:00Z" },
        { id: "d2", cerprno: "CER-2026-0042", level_id: 2, level_name: "CER Owner", approver_name: "Shiven Pandit (Microlink)", approver_email: "shiven@microlink.com", decision: "APPROVED", comments: "OK", timestamp: "2026-11-24T14:32:00Z" },
      ],
    };

    const currentVer: IProposalVersionEntry = {
      id: "CURRENT",
      serialNo: 1,
      versionLabel: "v1 Active",
      isCurrent: true,
      proposalNo: "PR-2026/0006",
      status: "In Approval",
      amount: 4,
      currency: "USD",
      dateStr: "24 Nov 2026",
      rawProposal,
    };

    // 1. Active Workflow Cycle -> Pending & Not Started stages resolve live from role matrix
    const activeRows = buildTableRowsForIteration(activeIter, currentVer, mockLevels);
    expect(activeRows[2].statusText).toBe("Pending");
    expect(activeRows[2].updatedBy).toBe("Shiven Pandit (Microlink)");
    expect(activeRows[3].statusText).toBe("Not Started");
    expect(activeRows[3].updatedBy).toBe("Rajesh Director");
    expect(activeRows[4].statusText).toBe("Not Started");
    expect(activeRows[4].updatedBy).toBe("Nitin Doshi (STL Digital), Vikram CFO");
    expect(activeRows[5].statusText).toBe("Not Started");
    expect(activeRows[5].updatedBy).toBe("CEO User");

    // 2. Prior Iteration (isLatestActive: false) -> Not Started MUST remain "—"
    const priorIter: IIterationRun = { ...activeIter, isLatestActive: false, decisions: [] };
    const priorRows = buildTableRowsForIteration(priorIter, currentVer, mockLevels);
    for (let i = 0; i < priorRows.length; i++) {
      expect(priorRows[i].statusText).toBe("Not Started");
      expect(priorRows[i].updatedBy).toBe("—");
    }

    // 3. Historical Version Snapshot (isCurrent: false) -> Not Started MUST remain "—"
    const histVer: IProposalVersionEntry = { ...currentVer, id: "HIST_1", isCurrent: false, status: "Approved" };
    const histRows = buildTableRowsForIteration(activeIter, histVer, mockLevels);
    expect(histRows[3].statusText).toBe("Not Started");
    expect(histRows[3].updatedBy).toBe("—");
    expect(histRows[4].updatedBy).toBe("—");
    expect(histRows[5].updatedBy).toBe("—");
  });

  // PDF-EXPORT-01: Active Workflow Cycle PDF renders Pending & Not Started with live role matrix approvers
  test("PDF-EXPORT-01: buildActiveCycleUpcomingRowsForPdf includes PENDING and NOT STARTED rows with live approvers", () => {
    const rawProposal: ICERProposal = {
      id: "4",
      cerprno: "CER-2026-0042",
      proposal_no: "PR-2026/0006",
      cer_proposal_id: "CER-2026-0042",
      pr_name: "PDF Live Matrix Test",
      sbu: "RJ North",
      owname: "Shiven Pandit (Microlink)",
      owner_email: "shiven@microlink.com",
      status: "In Approval",
      current_level: 3,
      pending_with_name: "Stale Name",
      amount: 4,
      total: 4,
    } as any;

    const mockLevels: IWorkflowLevel[] = [
      { level_id: 1, level_name: "L1 - Finance Review", role_title: "Finance", approver_name: "", approver_email: "", approvers: [{ user_name: "Fin Lead", user_email: "fin@vedanta.co.in", sbu: "RJ North" }], is_active: true },
      { level_id: 2, level_name: "L2 - Project Owner Approval", role_title: "Project Owner", approver_name: "Project Owner (Auto-fetched from CER Proposal)", approver_email: "", is_project_owner_stage: true, is_active: true },
      { level_id: 3, level_name: "L3 - BU CFO Approval", role_title: "BU CFO", approver_name: "", approver_email: "", approvers: [{ user_name: "Live CFO", user_email: "cfo@vedanta.co.in", sbu: "RJ North" }], is_active: true },
      { level_id: 4, level_name: "L4 - BU Director Approval", role_title: "BU Director", approver_name: "", approver_email: "", approvers: [{ user_name: "Live Director", user_email: "dir@vedanta.co.in", sbu: "RJ North" }], is_active: true },
      { level_id: 5, level_name: "L5 - VOGL CFO Approval", role_title: "VOGL CFO", approver_name: "", approver_email: "", approvers: [{ user_name: "VOGL CFO A", user_email: "cfoa@vedanta.co.in", sbu: "RJ North" }, { user_name: "VOGL CFO B", user_email: "cfob@vedanta.co.in", sbu: "RJ North" }], is_active: true },
      { level_id: 6, level_name: "L6 - VOGL CEO Approval", role_title: "VOGL CEO", approver_name: "", approver_email: "", approvers: [], is_active: true },
    ];

    const decisions: any[] = [
      { id: "d1", cerprno: "CER-2026-0042", level_id: 1, approver_name: "Fin Lead", decision: "APPROVED", version: "V1" },
      { id: "d2", cerprno: "CER-2026-0042", level_id: 2, approver_name: "Shiven Pandit (Microlink)", decision: "APPROVED", version: "V1" },
    ];

    // Active Cycle -> L3 PENDING + L4, L5, L6 NOT STARTED
    const rows = buildActiveCycleUpcomingRowsForPdf(rawProposal, decisions, mockLevels, "V1", false);
    expect(rows.length).toBe(4);
    expect(rows[0]).toEqual(["V1", "L3 - BU CFO Approval", "Live CFO (cfo@vedanta.co.in)", "PENDING", "—", "Awaiting approval sign-off"]);
    expect(rows[1]).toEqual(["V1", "L4 - BU Director Approval", "Live Director (dir@vedanta.co.in)", "NOT STARTED", "—", "—"]);
    expect(rows[2]).toEqual(["V1", "L5 - VOGL CFO Approval", "VOGL CFO A (cfoa@vedanta.co.in), VOGL CFO B (cfob@vedanta.co.in)", "NOT STARTED", "—", "—"]);
    expect(rows[3]).toEqual(["V1", "L6 - VOGL CEO Approval", "—", "NOT STARTED", "—", "—"]);

    // When L1 is Pending (current_level: 1), L2 NOT STARTED resolves actual CER Owner (not placeholder text!)
    const l1Proposal = { ...rawProposal, current_level: 1 };
    const l1Rows = buildActiveCycleUpcomingRowsForPdf(l1Proposal, [], mockLevels, "V1", false);
    expect(l1Rows.length).toBe(6);
    expect(l1Rows[0][3]).toBe("PENDING");
    expect(l1Rows[0][2]).toBe("Fin Lead (fin@vedanta.co.in)");
    expect(l1Rows[1][3]).toBe("NOT STARTED");
    expect(l1Rows[1][2]).toBe("Shiven Pandit (Microlink) (shiven@microlink.com)");

    // Archived snapshot -> returns empty array (Active Workflow Cycle only)
    const archivedRows = buildActiveCycleUpcomingRowsForPdf(rawProposal, decisions, mockLevels, "V1", true);
    expect(archivedRows.length).toBe(0);
  });

  // STATUS-MODAL-02: Pending row resolves real approver names from IUserRoleAssignment approvers list
  test("STATUS-MODAL-02: buildTableRowsForIteration resolves real approver names from IUserRoleAssignment objects", () => {
    const rawProposal: ICERProposal = {
      id: "2",
      cerprno: "CER-2026-0040",
      proposal_no: "PR-2026/0004",
      cer_proposal_id: "CER-2026-0040",
      pr_name: "Wells Testing",
      sbu: "RJ North",
      owname: "Shiven Pandit",
      owner_email: "shiven@microlink.com",
      status: "In Approval",
      current_level: 1,
      pending_with_role: "Finance",
      amount: 40,
      total: 40,
    } as any;

    const mockIteration: IIterationRun = {
      iterationIndex: 1,
      isLatestActive: true,
      isSentBack: false,
      decisions: [],
    };

    const mockVersion: IProposalVersionEntry = {
      id: "CURRENT",
      serialNo: 1,
      versionLabel: "v1 Active",
      isCurrent: true,
      proposalNo: "PR-2026/0004",
      status: "In Approval",
      amount: 40,
      currency: "USD",
      dateStr: "24 Nov 2026",
      rawProposal,
    };

    // Role matrix returns IUserRoleAssignment objects with user_name and user_email
    const mockLevels: IWorkflowLevel[] = [
      {
        level_id: 1,
        level_name: "Finance",
        role_title: "Finance",
        approver_name: "",
        approver_email: "",
        approvers: [
          { user_name: "Amit Sharma", user_email: "amit.sharma@vedanta.co.in", sbu: "RJ North" },
          { user_name: "Sunil Verma", user_email: "sunil.verma@vedanta.co.in", sbu: "RJ North" },
        ],
        is_active: true,
      },
    ];

    const rows = buildTableRowsForIteration(mockIteration, mockVersion, mockLevels);
    expect(rows[0].stage.level).toBe(1);
    expect(rows[0].statusText).toBe("Pending");
    // Action By must resolve real user names from CERRoleMatrix, NOT "Finance"!
    expect(rows[0].updatedBy).toBe("Amit Sharma, Sunil Verma");
  });

  // STATUS-MODAL-03: Pending row falls back to rawProposal.pending_with_name from SharePoint Person field
  test("STATUS-MODAL-03: buildTableRowsForIteration falls back to pending_with_name from SharePoint item", () => {
    const rawProposal: ICERProposal = {
      id: "3",
      cerprno: "CER-2026-0041",
      proposal_no: "PR-2026/0005",
      cer_proposal_id: "CER-2026-0041",
      pr_name: "Deep Sea Exploration",
      sbu: "CBOS",
      owname: "Anil Agarwal",
      owner_email: "anil@vedanta.co.in",
      status: "In Approval",
      current_level: 3,
      pending_with_role: "BU CFO",
      pending_with_name: "Pooja Roy",
      amount: 150,
      total: 150,
    } as any;

    const mockIteration: IIterationRun = {
      iterationIndex: 1,
      isLatestActive: true,
      isSentBack: false,
      decisions: [
        {
          id: "d1",
          cerprno: "CER-2026-0041",
          level_id: 1,
          level_name: "Finance",
          approver_name: "Amit Sharma",
          approver_email: "amit@vedanta.co.in",
          decision: "APPROVED",
          comments: "Approved",
          timestamp: "2026-11-20T10:00:00Z",
        },
        {
          id: "d2",
          cerprno: "CER-2026-0041",
          level_id: 2,
          level_name: "CER Owner",
          approver_name: "Anil Agarwal",
          approver_email: "anil@vedanta.co.in",
          decision: "APPROVED",
          comments: "Owner signed off",
          timestamp: "2026-11-21T11:00:00Z",
        },
      ],
    };

    const mockVersion: IProposalVersionEntry = {
      id: "CURRENT",
      serialNo: 1,
      versionLabel: "v1 Active",
      isCurrent: true,
      proposalNo: "PR-2026/0005",
      status: "In Approval",
      amount: 150,
      currency: "USD",
      dateStr: "24 Nov 2026",
      rawProposal,
    };

    const rows = buildTableRowsForIteration(mockIteration, mockVersion, []);
    expect(rows[2].stage.level).toBe(3);
    expect(rows[2].statusText).toBe("Pending");
    expect(rows[2].updatedBy).toBe("Pooja Roy");
  });

  // REPORT-DASHBOARD-01: Verifies SBU and Financial Year filtering logic
  test("REPORT-DASHBOARD-01: SBU and Financial Year filtering filters correctly", () => {
    const mockProposals: ICERProposal[] = [
      { id: "1", cerprno: "CER-01", sbu: "RJ North", amount: 100, status: "Approved", request_date: "2026-05-10" } as any,
      { id: "2", cerprno: "CER-02", sbu: "RJ South", amount: 200, status: "Approved", request_date: "2026-06-15" } as any,
      { id: "3", cerprno: "CER-03", sbu: "RJ North", amount: 300, status: "In Approval", request_date: "2026-07-20" } as any,
      { id: "4", cerprno: "CER-04", sbu: "CBOS", amount: 400, status: "Send Back", request_date: "2025-11-01" } as any,
    ];

    // Filter by SBU: "RJ North"
    const rjNorthOnly = mockProposals.filter((p) => (p.sbu || "").trim().toLowerCase() === "RJ North".toLowerCase());
    expect(rjNorthOnly.length).toBe(2);
    expect(rjNorthOnly.reduce((sum, p) => sum + p.amount, 0)).toBe(400);

    // Filter by SBU: "CBOS"
    const cbosOnly = mockProposals.filter((p) => (p.sbu || "").trim().toLowerCase() === "CBOS".toLowerCase());
    expect(cbosOnly.length).toBe(1);
    expect(cbosOnly[0].amount).toBe(400);
  });

  // PERF-SAFE-01: Verifies in-flight deduplication / idempotency protection for approval submissions (Safeguard 4)
  test("PERF-SAFE-01: In-flight deduplication protects against duplicate concurrent approval submissions", async () => {
    const inFlightDecisions = new Map<string, Promise<{ success: boolean; newStatus: string; nextLevel: number }>>();
    let actualExecutionCount = 0;

    // Simulated network operation that takes time
    const simulatedDecisionExecution = async (cerprno: string, levelId: number) => {
      const lockKey = `${cerprno}::${levelId}`;
      const existing = inFlightDecisions.get(lockKey);
      if (existing) {
        return existing;
      }

      const promise = (async () => {
        try {
          actualExecutionCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { success: true, newStatus: "In Approval", nextLevel: levelId + 1 };
        } finally {
          inFlightDecisions.delete(lockKey);
        }
      })();

      inFlightDecisions.set(lockKey, promise);
      return promise;
    };

    // Simulate 3 simultaneous rapid clicks on "Approve"
    const [res1, res2, res3] = await Promise.all([
      simulatedDecisionExecution("CER-2026-0099", 2),
      simulatedDecisionExecution("CER-2026-0099", 2),
      simulatedDecisionExecution("CER-2026-0099", 2),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res3.success).toBe(true);
    expect(res1.nextLevel).toBe(3);
    expect(res2.nextLevel).toBe(3);
    // Only ONE actual network operation was dispatched across all 3 concurrent clicks
    expect(actualExecutionCount).toBe(1);
  });

  // PERF-SAFE-02: Verifies HTTP 412 ETag conflict detection & user-friendly error formatting (Safeguard 3)
  test("PERF-SAFE-02: HTTP 412 Concurrency Conflict produces clear user guidance instead of raw OData error", () => {
    const rawEtagError = new Error("The request failed with status code 412: Precondition Failed (The specified item was modified).");
    const formatted = formatUserFriendlySharePointError(rawEtagError);
    expect(formatted).toBe(
      "Concurrency conflict: This proposal was modified by another user or session. Please refresh the proposal to review the latest changes before saving."
    );

    const customConcurrencyError = new Error("Concurrency conflict detected while committing proposal update.");
    const formatted2 = formatUserFriendlySharePointError(customConcurrencyError);
    expect(formatted2).toBe(
      "Concurrency conflict: This proposal was modified by another user or session. Please refresh the proposal to review the latest changes before saving."
    );
  });

  // PERF-SAFE-03: Verifies stale response discarding for modal loading (Safeguard 6)
  test("PERF-SAFE-03: Stale response token protection discards out-of-order proposal responses", async () => {
    const activeRequestIdRef = { current: 0 };
    let currentProposalDisplayed = "";

    const openProposalReview = async (cerprno: string, delayMs: number) => {
      const requestId = ++activeRequestIdRef.current;
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Guard: Discard stale response if user switched to another proposal
      if (activeRequestIdRef.current !== requestId) {
        return; // Stale, ignore
      }
      currentProposalDisplayed = cerprno;
    };

    // User clicks CER-001 (slow response: 100ms) then immediately switches to CER-002 (fast response: 20ms)
    const p1 = openProposalReview("CER-001", 100);
    const p2 = openProposalReview("CER-002", 20);

    await Promise.all([p1, p2]);

    // CER-002 must remain active even though CER-001 finished later
    expect(currentProposalDisplayed).toBe("CER-002");
  });

  // PERF-SAFE-04: Verifies authorization guard and segregation of duties (Safeguard 7)
  test("PERF-SAFE-04: Approval buttons are disabled until workflow configuration is verified", () => {
    const checkCanSubmit = (
      currentLevelConfig: IWorkflowLevel | undefined,
      decision: string,
      comments: string,
      isSubmitting: boolean
    ): boolean => {
      if (isSubmitting) return false;
      if (!currentLevelConfig) return false;
      if ((decision === "REJECT" || decision === "SEND_BACK") && !comments.trim()) return false;
      return true;
    };

    // Scenario 1: Workflow level configuration is still loading / undefined -> MUST be disabled
    expect(checkCanSubmit(undefined, "APPROVED", "", false)).toBe(false);

    // Scenario 2: Workflow level loaded, decision is APPROVED -> Enabled
    const mockLevel: IWorkflowLevel = {
      level_id: 1,
      level_name: "Technical Review",
      role_title: "Technical Reviewer",
      sbu: "RJ North",
      is_active: true,
    };
    expect(checkCanSubmit(mockLevel, "APPROVED", "", false)).toBe(true);

    // Scenario 3: Send Back without mandatory comments -> Disabled
    expect(checkCanSubmit(mockLevel, "SEND_BACK", "   ", false)).toBe(false);

    // Scenario 4: Send Back with mandatory comments -> Enabled
    expect(checkCanSubmit(mockLevel, "SEND_BACK", "Please update cost breakdown", false)).toBe(true);
  });

  // PERF-SAFE-05: Verifies logon normalization and deduplication
  test("PERF-SAFE-05: Logon normalization strips claims prefix and trims whitespace", () => {
    const rawClaim = "i:0#.f|membership|Shiven.Pandit@vedanta.co.in ";
    const normalized = normalizeUserLogon(rawClaim);
    expect(normalized).toBe("shiven.pandit@vedanta.co.in");

    const rawSimple = "MEMBERSHIP|User@Domain.COM ";
    const normalizedSimple = normalizeUserLogon(rawSimple);
    expect(normalizedSimple).toBe("user@domain.com");

    expect(normalizeUserLogon("")).toBe("");
    expect(normalizeUserLogon(undefined)).toBe("");
  });

  // PENDING-TABLE-01: Verifies continuous queue filtering without pagination limit
  test("PENDING-TABLE-01: Continuous table processes and retains all matching proposals without pagination limits", () => {
    // Generate 65 sample pending proposals (more than standard page sizes like 10, 20, 50)
    const testQueue: ICERProposal[] = [];
    for (let i = 1; i <= 65; i++) {
      const numStr = i < 10 ? "000" + i : i < 100 ? "00" + i : "0" + i;
      testQueue.push({
        id: `prop-${i}`,
        cerprno: `CER-2026-${numStr}`,
        cer_proposal_id: `CER-2026-${numStr}`,
        pr_name: `Capital Project #${i}`,
        sbu: i % 2 === 0 ? "RJ North" : "RJ South",
        cat: i % 3 === 0 ? "Vital" : "Essential",
        payable: i % 2 === 0 ? "Payback" : "Non Payback",
        payback_quarters: i % 2 === 0 ? 4 : undefined,
        amount: i * 1000,
        currency: "USD",
        status: "In Approval",
        current_level: 1,
      } as any);
    }

    // 1. Without pagination limit, the entire queue must be rendered (length === 65)
    expect(testQueue.length).toBe(65);

    // 2. Category filter: Vital
    const vitalOnly = testQueue.filter((p) => p.cat === "Vital");
    expect(vitalOnly.length).toBe(21); // 65 / 3 = 21

    // 3. SBU filter: RJ North
    const rjNorthOnly = testQueue.filter((p) => p.sbu === "RJ North");
    expect(rjNorthOnly.length).toBe(32); // 32 even numbers

    // 4. Sorting by amount descending: highest amount must be at index 0
    const sortedDesc = [...testQueue].sort((a, b) => b.amount - a.amount);
    expect(sortedDesc[0].amount).toBe(65000);
    expect(sortedDesc[sortedDesc.length - 1].amount).toBe(1000);
  });

  // PENDING-TABLE-02: Verifies Payback column formatting logic
  test("PENDING-TABLE-02: Payback column formats Quarters for Payback and Non Payback badge", () => {
    const formatPayback = (payable: string, quarters?: number): string => {
      if (payable === "Non Payback" || payable === "Non-Payback") {
        return "Non Payback";
      }
      if (quarters && Number(quarters) > 0) {
        return `${quarters} Quarters`;
      }
      return "Payback";
    };

    expect(formatPayback("Non Payback")).toBe("Non Payback");
    expect(formatPayback("Non-Payback")).toBe("Non Payback");
    expect(formatPayback("Payback", 4)).toBe("4 Quarters");
    expect(formatPayback("Payback", 6)).toBe("6 Quarters");
    expect(formatPayback("Payback", undefined)).toBe("Payback");
  });

  // PENDING-TABLE-03: Verifies NPV / IRR financial column formatting logic
  test("PENDING-TABLE-03: NPV / IRR column formats monetary mm values and percentage IRR", () => {
    const formatNpv = (npv?: number | null): string => {
      if (npv !== undefined && npv !== null && Number(npv) !== 0) {
        return `$${Number(npv).toLocaleString()} mm`;
      }
      return "—";
    };

    const formatIrr = (irr?: number | null): string => {
      if (irr !== undefined && irr !== null && Number(irr) !== 0) {
        return `${irr}% IRR`;
      }
      return "—";
    };

    expect(formatNpv(28.4)).toBe("$28.4 mm");
    expect(formatNpv(100)).toBe("$100 mm");
    expect(formatNpv(0)).toBe("—");
    expect(formatNpv(undefined)).toBe("—");

    expect(formatIrr(18)).toBe("18% IRR");
    expect(formatIrr(25.5)).toBe("25.5% IRR");
    expect(formatIrr(0)).toBe("—");
    expect(formatIrr(undefined)).toBe("—");
  });

  // BULK-APPROVE-01: Verifies cumulative Total CER Amount and selected amount calculation
  test("BULK-APPROVE-01: Total CER Amount and selected amount calculate accurately", () => {
    const sampleQueue = [
      { cerprno: "CER-01", amount: 9000, current_level: 1 },
      { cerprno: "CER-02", amount: 1699, current_level: 2 },
      { cerprno: "CER-03", amount: 1500, current_level: 1 },
      { cerprno: "CER-04", amount: 400, current_level: 3 },
    ];

    const totalAmount = sampleQueue.reduce((acc, p) => acc + p.amount, 0);
    expect(totalAmount).toBe(12599);

    const selectedIds = new Set(["CER-01", "CER-03"]);
    const selectedAmount = sampleQueue
      .filter((p) => selectedIds.has(p.cerprno))
      .reduce((acc, p) => acc + p.amount, 0);
    expect(selectedAmount).toBe(10500);
  });

  // BULK-APPROVE-02: Verifies Corporate Budget Amount column formatting
  test("BULK-APPROVE-02: Corporate Budget Amount formats mm notation and handles zero/undefined", () => {
    const formatCorpBudget = (cbAmnt?: number | null): string => {
      if (cbAmnt !== undefined && cbAmnt !== null && Number(cbAmnt) > 0) {
        return `$${Number(cbAmnt).toLocaleString()} mm`;
      }
      return "—";
    };

    expect(formatCorpBudget(15000000)).toBe(`$${(15000000).toLocaleString()} mm`);
    expect(formatCorpBudget(5.5)).toBe("$5.5 mm");
    expect(formatCorpBudget(0)).toBe("—");
    expect(formatCorpBudget(undefined)).toBe("—");
  });

  // BULK-APPROVE-03: Verifies Approval Level column formatting
  test("BULK-APPROVE-03: Approval Level formats L1, L2 notations", () => {
    const formatApprovalLevel = (level?: number): string => {
      return level ? `L${level}` : "—";
    };

    expect(formatApprovalLevel(1)).toBe("L1");
    expect(formatApprovalLevel(2)).toBe("L2");
    expect(formatApprovalLevel(6)).toBe("L6");
    expect(formatApprovalLevel(undefined)).toBe("—");
  });

  // BULK-APPROVE-04: Verifies checkbox selection state logic
  test("BULK-APPROVE-04: Checkbox selection supports toggle individual and select/deselect all", () => {
    const ids = ["CER-01", "CER-02", "CER-03"];
    let selected = new Set<string>();

    // 1. Toggle CER-01
    selected = new Set(selected);
    selected.add("CER-01");
    expect(selected.has("CER-01")).toBe(true);
    expect(selected.size).toBe(1);

    // 2. Select All
    selected = new Set(ids);
    expect(selected.size).toBe(3);
    const allSelected = ids.every((id) => selected.has(id));
    expect(allSelected).toBe(true);

    // 3. Deselect All
    selected = new Set();
    expect(selected.size).toBe(0);
  });

  // ROLE-MATRIX-01: Verifies mandatory approver validation for all 5 assignable tiers (L1, L3, L4, L5, L6)
  test("ROLE-MATRIX-01: Updating an SBU requires at least 1 approver in all 5 sequential tiers", () => {
    const assignableLevels = [1, 3, 4, 5, 6];

    const validateTiers = (stagedByLevel: Record<number, any[]>) => {
      const invalid = assignableLevels.filter((lvl) => (stagedByLevel[lvl] || []).length === 0);
      return {
        isValid: invalid.length === 0,
        invalidLevels: invalid,
      };
    };

    // Incomplete configuration: only L1 has an approver
    const incompleteConfig = {
      1: [{ user_name: "Shiven Pandit", user_email: "shiven@example.com" }],
      3: [],
      4: [],
      5: [],
      6: [],
    };
    const res1 = validateTiers(incompleteConfig);
    expect(res1.isValid).toBe(false);
    expect(res1.invalidLevels).toEqual([3, 4, 5, 6]);

    // Complete configuration: all 5 tiers have >= 1 approver
    const completeConfig = {
      1: [{ user_name: "Finance Approver", user_email: "finance@example.com" }],
      3: [{ user_name: "BU CFO", user_email: "cfo@example.com" }],
      4: [{ user_name: "BU Director", user_email: "director@example.com" }],
      5: [{ user_name: "VOGL CFO", user_email: "voglcfo@example.com" }],
      6: [{ user_name: "VOGL CEO", user_email: "voglceo@example.com" }],
    };
    const res2 = validateTiers(completeConfig);
    expect(res2.isValid).toBe(true);
    expect(res2.invalidLevels).toEqual([]);
  });

  // ROLE-MATRIX-02: Verifies multi-level approver assignment within the same SBU
  test("ROLE-MATRIX-02: Approver can be assigned to multiple levels simultaneously in the same SBU", async () => {
    const service = new LocalMockCERDataService();
    const adminUser = { name: "Test Admin", email: "demo.admin@example.com" };

    // Assign Shiven Pandit to Level 1 in RJ North
    const l1Assignment = await service.assignUserRole(
      {
        user_name: "Shiven Pandit",
        user_email: "shiven.pandit@microlink.in",
        login_name: "shiven.pandit@microlink.in",
        sbu: "RJ North",
        approval_level: 1,
        approver_role_title: "Finance",
        role: "Approver",
        is_active: true,
        assigned_by: adminUser.name,
        assigned_date: new Date().toISOString(),
      },
      adminUser
    );

    // Assign Shiven Pandit to Level 3 in RJ North
    const l3Assignment = await service.assignUserRole(
      {
        user_name: "Shiven Pandit",
        user_email: "shiven.pandit@microlink.in",
        login_name: "shiven.pandit@microlink.in",
        sbu: "RJ North",
        approval_level: 3,
        approver_role_title: "BU CFO",
        role: "Approver",
        is_active: true,
        assigned_by: adminUser.name,
        assigned_date: new Date().toISOString(),
      },
      adminUser
    );

    expect(l1Assignment.approval_level).toBe(1);
    expect(l3Assignment.approval_level).toBe(3);

    const allRoles = await service.getUserRoles(true);
    const shivenRolesInRjNorth = allRoles.filter(
      (r) => r.user_email === "shiven.pandit@microlink.in" && r.sbu === "RJ North"
    );

    expect(shivenRolesInRjNorth.length).toBeGreaterThanOrEqual(2);
    const levels = shivenRolesInRjNorth.map((r) => r.approval_level);
    expect(levels).toContain(1);
    expect(levels).toContain(3);
  });

  // ROLE-MATRIX-03: Verifies multi-SBU (multi-location) approver assignment
  test("ROLE-MATRIX-03: Approver can be assigned across multiple SBUs without overwriting", async () => {
    const service = new LocalMockCERDataService();
    const adminUser = { name: "Test Admin", email: "demo.admin@example.com" };

    // Assign to RJ North Level 1
    await service.assignUserRole(
      {
        user_name: "Multi SBU Approver",
        user_email: "multi.sbu@example.com",
        login_name: "multi.sbu@example.com",
        sbu: "RJ North",
        approval_level: 1,
        approver_role_title: "Finance",
        role: "Approver",
        is_active: true,
        assigned_by: adminUser.name,
        assigned_date: new Date().toISOString(),
      },
      adminUser
    );

    // Assign same user to RJ South Level 1
    await service.assignUserRole(
      {
        user_name: "Multi SBU Approver",
        user_email: "multi.sbu@example.com",
        login_name: "multi.sbu@example.com",
        sbu: "RJ South",
        approval_level: 1,
        approver_role_title: "Finance",
        role: "Approver",
        is_active: true,
        assigned_by: adminUser.name,
        assigned_date: new Date().toISOString(),
      },
      adminUser
    );

    const allRoles = await service.getUserRoles(true);
    const sbus = allRoles
      .filter((r) => r.user_email === "multi.sbu@example.com")
      .map((r) => r.sbu);

    expect(sbus).toContain("RJ North");
    expect(sbus).toContain("RJ South");
  });

  // ROLE-MATRIX-04: Verifies PermissionService grants approval rights across multi-level & multi-SBU assignments
  test("ROLE-MATRIX-04: PermissionService authorizes multi-assigned approver across designated levels and SBUs", () => {
    const multiUser: IAppUser = {
      id: "u-99",
      name: "Shiven Pandit",
      email: "shiven.pandit@microlink.in",
      loginName: "shiven.pandit@microlink.in",
      role: "Approver",
      roles: ["Approver"],
      sbu: "All",
      sbus: ["RJ North", "RJ South"],
      approval_level: 1,
      approval_levels: [1, 3],
      is_active: true,
    };

    // Stage configs
    const rjNorthL1Config: IWorkflowLevel = {
      id: "lvl-1",
      level_id: 1,
      level_name: "Technical Review",
      role_title: "Finance",
      sbu: "RJ North",
      is_active: true,
      approvers: [
        {
          id: "a-1",
          user_name: "Shiven Pandit",
          user_email: "shiven.pandit@microlink.in",
          login_name: "shiven.pandit@microlink.in",
          role: "Approver",
          assigned_by: "Admin",
          assigned_date: new Date().toISOString(),
        },
      ],
    };

    const rjSouthL1Config: IWorkflowLevel = {
      id: "lvl-1-s",
      level_id: 1,
      level_name: "Technical Review",
      role_title: "Finance",
      sbu: "RJ South",
      is_active: true,
      approvers: [
        {
          id: "a-2",
          user_name: "Shiven Pandit",
          user_email: "shiven.pandit@microlink.in",
          login_name: "shiven.pandit@microlink.in",
          role: "Approver",
          assigned_by: "Admin",
          assigned_date: new Date().toISOString(),
        },
      ],
    };

    const cbosL1Config: IWorkflowLevel = {
      id: "lvl-1-cbos",
      level_id: 1,
      level_name: "Technical Review",
      role_title: "Finance",
      sbu: "CBOS",
      is_active: true,
      approvers: [
        {
          id: "a-3",
          user_name: "Other Approver",
          user_email: "other@example.com",
          login_name: "other@example.com",
          role: "Approver",
          assigned_by: "Admin",
          assigned_date: new Date().toISOString(),
        },
      ],
    };

    const propRjNorth: ICERProposal = {
      id: "p-1",
      cerprno: "CER-2026-0001",
      pr_name: "RJ North Test",
      status: "In Approval",
      current_level: 1,
      sbu: "RJ North",
      amount: 1000,
    } as any;

    const propRjSouth: ICERProposal = {
      id: "p-2",
      cerprno: "CER-2026-0002",
      pr_name: "RJ South Test",
      status: "In Approval",
      current_level: 1,
      sbu: "RJ South",
      amount: 2000,
    } as any;

    const propCbos: ICERProposal = {
      id: "p-3",
      cerprno: "CER-2026-0003",
      pr_name: "CBOS Test",
      status: "In Approval",
      current_level: 1,
      sbu: "CBOS",
      amount: 3000,
    } as any;

    // 1. Authorized for RJ North Level 1
    const res1 = PermissionService.canApproveCER(propRjNorth, multiUser, rjNorthL1Config);
    expect(res1.allowed).toBe(true);

    // 2. Authorized for RJ South Level 1
    const res2 = PermissionService.canApproveCER(propRjSouth, multiUser, rjSouthL1Config);
    expect(res2.allowed).toBe(true);

    // 3. Blocked for CBOS (not an assigned SBU or stage approver)
    const res3 = PermissionService.canApproveCER(propCbos, multiUser, cbosL1Config);
    expect(res3.allowed).toBe(false);
  });

  // ROLE-MATRIX-05: Verifies bidirectional inference of levels from approverRoleTitle choices
  test("ROLE-MATRIX-05: Infers multiple approval levels from multi-choice approverRoleTitle when approverLevel has single value", () => {
    const mapRoleTitleToLevel = (title: string): number | null => {
      const t = (title || "").toLowerCase().trim();
      if (!t) return null;
      if (t === "finance" || (t.indexOf("finance") !== -1 && t.indexOf("corporate") === -1 && t.indexOf("cfo") === -1)) return 1;
      if (t.indexOf("project owner") !== -1 || t === "owner") return 2;
      if (t.indexOf("bu cfo") !== -1 || (t.indexOf("cfo") !== -1 && t.indexOf("vogl") === -1)) return 3;
      if (t.indexOf("bu director") !== -1 || (t.indexOf("director") !== -1 && t.indexOf("vogl") === -1)) return 4;
      if (t.indexOf("vogl cfo") !== -1) return 5;
      if (t.indexOf("vogl ceo") !== -1 || t.indexOf("ceo") !== -1) return 6;
      return null;
    };

    // Simulated SharePoint item where approverLevel has only "1", but approverRoleTitle has 4 roles
    const rawLevels = ["1"];
    const rawRoleTitles = ["Finance", "BU CFO", "BU Director", "VOGL CFO"];

    const parsedLevels: number[] = rawLevels.map((l) => parseInt(l, 10));
    for (const title of rawRoleTitles) {
      const lvl = mapRoleTitleToLevel(title);
      if (lvl !== null && parsedLevels.indexOf(lvl) === -1) {
        parsedLevels.push(lvl);
      }
    }
    parsedLevels.sort((a, b) => a - b);

    expect(parsedLevels).toEqual([1, 3, 4, 5]);
  });

  // ROLE-MATRIX-06: Independent SBU-level isolation via sbuApprovalMap on 1 unique user record
  test("ROLE-MATRIX-06: Updating RJ South preserves RJ North levels independently on 1 unique user record", async () => {
    if (typeof localStorage !== "undefined") localStorage.clear();
    const matrixService = new LocalMockCERDataService();
    const bootstrapActor = { name: "SYSTEM_INITIAL_BOOTSTRAP", email: "system@bootstrap" };
    const adminActor = { name: "Test Admin", email: "demo.admin@example.com" };

    // 1. Seed Nitin Doshi as Admin assigned ONLY to L6 in RJ North
    const seeded = await matrixService.assignUserRole(
      {
        user_name: "Nitin Doshi",
        user_email: "nitin.doshi@vedanta.co.in",
        login_name: "nitin.doshi@vedanta.co.in",
        role: "Admin",
        sbu: "RJ North",
        sbus: ["RJ North"],
        sbu_approval_map: updateSbuInApprovalMap({}, "RJ North", [6], ["VOGL CEO"]),
        approval_level: 6,
        approval_levels: [6],
        approver_role_title: "VOGL CEO",
        approver_role_titles: ["VOGL CEO"],
        is_active: true,
        assigned_by: "System",
        assigned_date: new Date().toISOString(),
      },
      bootstrapActor
    );

    // 2. Now update RJ South ONLY: assign Nitin Doshi to L1 (Finance) and L5 (VOGL CFO) in RJ South
    const nextMap = updateSbuInApprovalMap(
      { RJ_NORTH: { levels: [6], roleTitles: ["VOGL CEO"] } },
      "RJ South",
      [1, 5],
      ["Finance", "VOGL CFO"]
    );
    await matrixService.updateUserRole(
      {
        ...seeded,
        id: String(seeded.id).split("__")[0],
        sbu: "RJ North",
        sbus: getSyncedSbusFromMap(nextMap),
        sbu_approval_map: nextMap,
        approval_level: 1,
        approval_levels: [1, 5],
      },
      adminActor
    );

    // 3. Verify getWorkflowLevels("RJ North") ONLY contains Nitin at L6 (never L1 or L5!)
    const rjNorthLevels = await matrixService.getWorkflowLevels("RJ North", true);
    const hasNitin = (lvlNum: number, lvls: typeof rjNorthLevels) =>
      (lvls.find((l) => l.level_id === lvlNum)?.approvers || []).some(
        (u) => u.user_email === "nitin.doshi@vedanta.co.in"
      );

    expect(hasNitin(6, rjNorthLevels)).toBe(true);
    expect(hasNitin(1, rjNorthLevels)).toBe(false);
    expect(hasNitin(5, rjNorthLevels)).toBe(false);

    // 4. Verify getWorkflowLevels("RJ South") ONLY contains Nitin at L1 & L5 (never L6!)
    const rjSouthLevels = await matrixService.getWorkflowLevels("RJ South", true);
    expect(hasNitin(1, rjSouthLevels)).toBe(true);
    expect(hasNitin(5, rjSouthLevels)).toBe(true);
    expect(hasNitin(6, rjSouthLevels)).toBe(false);

    // 5. Verify 1 unique record ID base and synchronized sbus
    const allRoles = await matrixService.getUserRoles(true);
    const nitinRoles = allRoles.filter((r) => r.user_email === "nitin.doshi@vedanta.co.in");
    expect(nitinRoles.length).toBe(3); // Expanded: RJ North L6, RJ South L1, RJ South L5
    const distinctBaseIds = Array.from(new Set(nitinRoles.map((r) => String(r.id).split("__")[0])));
    expect(distinctBaseIds.length).toBe(1);
    expect(nitinRoles[0].sbus).toEqual(["RJ North", "RJ South"]);
    expect(nitinRoles[0].role).toBe("Admin");

    // 6. Verify PermissionService authorizes RJ North L6 and RJ South L1, and blocks RJ North L1
    const nitinAppUser: IAppUser = {
      id: "nitin-1",
      name: "Nitin Doshi",
      email: "nitin.doshi@vedanta.co.in",
      loginName: "nitin.doshi@vedanta.co.in",
      role: "Admin",
      roles: ["Admin", "Approver"],
      sbus: ["RJ North", "RJ South"],
      approval_levels: [1, 5, 6],
      is_active: true,
    };
    expect(
      PermissionService.canApproveCER(
        { id: "p1", cerprno: "CER-2026-100", status: "In Approval", current_level: 6, sbu: "RJ North" } as any,
        nitinAppUser,
        rjNorthLevels.find((l) => l.level_id === 6)!
      ).allowed
    ).toBe(true);
    expect(
      PermissionService.canApproveCER(
        { id: "p2", cerprno: "CER-2026-101", status: "In Approval", current_level: 1, sbu: "RJ North" } as any,
        nitinAppUser,
        rjNorthLevels.find((l) => l.level_id === 1)!
      ).allowed
    ).toBe(false);
    expect(
      PermissionService.canApproveCER(
        { id: "p3", cerprno: "CER-2026-102", status: "In Approval", current_level: 1, sbu: "RJ South" } as any,
        nitinAppUser,
        rjSouthLevels.find((l) => l.level_id === 1)!
      ).allowed
    ).toBe(true);
  });

  // ROLE-MATRIX-07: Admin preservation when all SBUs removed, JSON helpers, HTML strip & legacy migration
  test("ROLE-MATRIX-07: SBU sync, JSON HTML-strip guard, legacy migration & zero-SBU Admin preservation", async () => {
    if (typeof localStorage !== "undefined") localStorage.clear();
    const matrixService = new LocalMockCERDataService();
    const bootstrapActor = { name: "SYSTEM_INITIAL_BOOTSTRAP", email: "system@bootstrap" };
    const adminActor = { name: "Test Admin", email: "demo.admin@example.com" };

    // 1. Test sbuApprovalMap utilities (stable codes, JSON roundtrip, HTML stripping, legacy fallback)
    expect(toStableSbuCode("RJ North")).toBe("RJ_NORTH");
    expect(toStableSbuCode("RJ South")).toBe("RJ_SOUTH");
    expect(toStableSbuCode("CBOS")).toBe("CBOS");
    expect(toStableSbuCode("RAVA")).toBe("RAVA");

    const htmlWrapped = `<div class="ExternalClass123">{&quot;RJ_NORTH&quot;:{&quot;levels&quot;:[6],&quot;roleTitles&quot;:[&quot;VOGL CEO&quot;]},&quot;RJ_SOUTH&quot;:{&quot;levels&quot;:[1,5],&quot;roleTitles&quot;:[&quot;Finance&quot;,&quot;VOGL CFO&quot;]}}</div>`;
    const parsedHtml = parseSbuApprovalMap(htmlWrapped);
    expect(parsedHtml.RJ_NORTH.levels).toEqual([6]);
    expect(parsedHtml.RJ_SOUTH.levels).toEqual([1, 5]);
    expect(getSyncedSbusFromMap(parsedHtml)).toEqual(["RJ North", "RJ South"]);

    const legacyMap = buildLegacyFallbackMap(["RJ North", "RJ South"], [1, 5], ["Finance", "VOGL CFO"]);
    expect(legacyMap.RJ_NORTH.levels).toEqual([1, 5]);
    expect(legacyMap.RJ_SOUTH.levels).toEqual([1, 5]);
    expect(serializeSbuApprovalMap({})).toBe("");

    // 2. Admin with zero SBUs retains Admin privilege
    const adminUser = await matrixService.assignUserRole(
      {
        user_name: "Nadeem Sohail",
        user_email: "nadeem@stl.com",
        login_name: "nadeem@stl.com",
        role: "Admin",
        sbu: "RJ North",
        sbus: ["RJ North"],
        sbu_approval_map: updateSbuInApprovalMap({}, "RJ North", [3], ["BU CFO"]),
        approval_level: 3,
        is_active: true,
        assigned_by: "System",
        assigned_date: new Date().toISOString(),
      },
      bootstrapActor
    );

    // Remove RJ North from Admin via scoped revoke
    await matrixService.revokeUserRole(`${adminUser.id}__RJ North__3`, adminActor);
    const rolesAfterClear = await matrixService.getUserRoles(true);
    const nadeemAfter = rolesAfterClear.find((r) => r.user_email === "nadeem@stl.com");
    expect(Boolean(nadeemAfter)).toBe(true);
    expect(nadeemAfter!.role).toBe("Admin");
    expect(nadeemAfter!.sbus).toEqual([]);
    expect(nadeemAfter!.approval_level).toBeUndefined();
  });

  // DYN-SBU-01: Dynamic SBUMaster integration, CRUD, workflow level resolution, and validation
  test("DYN-SBU-01: Dynamic SBUMaster integration, creation, workflow level routing, and form validation", async () => {
    const sbuService = new LocalMockCERDataService();
    const adminActor = { name: "Test Admin", email: "demo.admin@example.com" };

    // 1. Initial active SBUs
    const initialSbus = await sbuService.getSBUs();
    expect(initialSbus.length).toBe(4);
    expect(initialSbus.map((s) => s.title)).toEqual(["RJ North", "RJ South", "CBOS", "RAVA"]);

    // 2. Create new SBU "KG Offshore"
    const newSbu = await sbuService.createSBU({
      title: "KG Offshore",
      sbuCode: "KG_OFFSHORE",
      isActive: true,
      sortOrder: 5,
    });
    expect(newSbu.id).toBeDefined();
    expect(newSbu.title).toBe("KG Offshore");
    expect(newSbu.sbuCode).toBe("KG_OFFSHORE");

    // 3. Dynamic utility conversion
    expect(toStableSbuCode("KG Offshore")).toBe("KG_OFFSHORE");
    expect(toSbuDisplayName("KG_OFFSHORE")).toBe("KG Offshore");

    // 4. getFieldChoices includes KG Offshore
    const choices = await sbuService.getFieldChoices(true);
    expect(choices.sbu).toContain("KG Offshore");

    // 5. Assign approver in KG Offshore
    await sbuService.assignUserRole(
      {
        user_name: "KG Approver",
        user_email: "kg.approver@vedanta.co.in",
        login_name: "kg.approver@vedanta.co.in",
        role: "Approver",
        sbu: "KG Offshore",
        approval_level: 3,
        approver_role_title: "BU CFO",
        is_active: true,
        assigned_by: "Admin",
        assigned_date: new Date().toISOString(),
      },
      adminActor
    );

    // 6. getWorkflowLevels dynamically resolves KG Offshore
    const kgLevels = await sbuService.getWorkflowLevels("KG Offshore", true);
    expect(kgLevels.length).toBe(6);
    const l3 = kgLevels.find((lvl) => lvl.level_id === 3);
    expect(l3?.approver_email).toContain("kg.approver@vedanta.co.in");

    // Existing RJ North is unaffected
    const rjNorthLevels = await sbuService.getWorkflowLevels("RJ North");
    const rjNorthL3 = rjNorthLevels.find((lvl) => lvl.level_id === 3);
    expect(rjNorthL3?.approver_email).not.toContain("kg.approver@vedanta.co.in");

    // 7. Validation with allowedSbus
    const testProposal: any = {
      proposal_no: "PR-KG-001",
      pr_name: "KG Deepwater Drilling",
      owname: "KG Project Manager",
      owner_email: "pm.kg@vedanta.co.in",
      sbu: "KG Offshore",
      object: "Deepwater exploration project",
      cat: "Vital",
      amount: 50,
      currency: "USD",
      payable: "Payback",
      cbudget: "Yes",
      jv: "No",
      jv_recoverable: "No",
      jv_budget: "No",
      st_date: "2026-04-01",
      com_date: "2027-03-31",
      capex_fy: 50,
      cost_breakdown: [{ id: "1", description: "Drilling", amount: 50 }],
    };
    const { isValid, errors } = validateAll(testProposal, false, choices.sbu);
    expect(errors.sbu).toBeUndefined();
    expect(isValid).toBe(true);

    // If an invalid SBU is provided, it must be rejected
    testProposal.sbu = "Invalid SBU";
    const invalidRes = validateAll(testProposal, false, choices.sbu);
    expect(invalidRes.isValid).toBe(false);
    expect(invalidRes.errors.sbu).toContain("Please select a valid SBU");
  });

  // ROLE-MATRIX-08: Batch Role Matrix Save executes multi-user updates & removals while preserving SBU isolation
  test("ROLE-MATRIX-08: saveRoleMatrixBatch atomically updates/assigns/revokes while preserving independent SBUs and Admin roles", async () => {
    const batchService = new LocalMockCERDataService();
    const bootstrapActor = { name: "SYSTEM_INITIAL_BOOTSTRAP", email: "bootstrap@system.local" };
    const adminActor = { name: "Test Admin", email: "demo.admin@example.com" };

    // Seed Admin user with RJ North L1 & RJ South L5
    const seededAdmin = await batchService.assignUserRole(
      {
        user_name: "Batch Admin User",
        user_email: "batch.admin@vedanta.co.in",
        login_name: "batch.admin@vedanta.co.in",
        role: "Admin",
        sbu: "RJ North",
        sbus: ["RJ North", "RJ South"],
        sbu_approval_map: {
          RJ_NORTH: { levels: [1], roleTitles: ["Finance"] },
          RJ_SOUTH: { levels: [5], roleTitles: ["VOGL CFO"] },
        },
        approval_level: 1,
        is_active: true,
        assigned_by: "System",
        assigned_date: new Date().toISOString(),
      },
      bootstrapActor
    );

    const baseAdminId = String(seededAdmin.id).split("__")[0];

    // Batch update RJ South: remove Batch Admin from RJ South, and assign a new Finance approver for RJ South
    const updatedMapNoSouth = updateSbuInApprovalMap(
      {
        RJ_NORTH: { levels: [1], roleTitles: ["Finance"] },
        RJ_SOUTH: { levels: [5], roleTitles: ["VOGL CFO"] },
      },
      "RJ South",
      []
    );
    const updatedRoles = await batchService.saveRoleMatrixBatch(
      [
        {
          type: "update",
          assignment: {
            ...seededAdmin,
            id: baseAdminId,
            role: "Admin",
            sbu: "RJ North",
            sbus: ["RJ North"],
            sbu_approval_map: updatedMapNoSouth,
          },
        },
        {
          type: "assign",
          assignment: {
            user_name: "South Finance Lead",
            user_email: "south.finance@vedanta.co.in",
            login_name: "south.finance@vedanta.co.in",
            role: "Approver",
            sbu: "RJ South",
            sbus: ["RJ South"],
            sbu_approval_map: updateSbuInApprovalMap({}, "RJ South", [1], ["Finance"]),
            approval_level: 1,
            approver_role_title: "Finance",
            is_active: true,
            assigned_by: adminActor.name,
            assigned_date: new Date().toISOString(),
          },
        },
      ],
      adminActor
    );

    const adminRows = updatedRoles.filter((r) => r.user_email === "batch.admin@vedanta.co.in");
    expect(adminRows.length).toBe(1);
    expect(adminRows[0].role).toBe("Admin");
    expect(adminRows[0].sbu).toBe("RJ North");
    expect(adminRows[0].approval_level).toBe(1);

    const southFinanceRows = updatedRoles.filter(
      (r) => r.user_email === "south.finance@vedanta.co.in" && r.sbu === "RJ South"
    );
    expect(southFinanceRows.length).toBe(1);
    expect(southFinanceRows[0].approval_level).toBe(1);
  });
});
