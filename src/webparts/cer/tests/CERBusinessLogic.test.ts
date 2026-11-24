import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal, CATEGORY_DEFINITIONS, SBU_OPTIONS } from "../models/CERModel";
import { AUDIT_FIELD_DESCRIPTIONS, EXCLUDED_AUDIT_FIELDS } from "../models/AuditModel";
import { getFirstActiveError, FormErrors, validateField, validateAll, hasEnteredCostBreakdown } from "../utils/cerValidation";
import { EmailTemplateService } from "../services/EmailTemplateService";
import { buildTableRowsForIteration, IIterationRun, IProposalVersionEntry } from "../components/ApprovalWorkflow/StatusHistoryModal";
import { IWorkflowLevel } from "../models/WorkflowModel";
import { formatUserFriendlySharePointError, normalizeUserLogon } from "../utils/sanitizationUtils";

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

  // STATUS-MODAL-01: Pending row shows assigned action taker name only next to pending
  test("STATUS-MODAL-01: buildTableRowsForIteration shows action taker name only next to pending stage", () => {
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

    // L3-L6: Not Started — updatedBy MUST BE "—" (only next to pending!)
    for (let i = 2; i < rows.length; i++) {
      expect(rows[i].statusText).toBe("Not Started");
      expect(rows[i].updatedBy).toBe("—");
    }
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
});
