import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal, CATEGORY_DEFINITIONS, SBU_OPTIONS } from "../models/CERModel";
import { AUDIT_FIELD_DESCRIPTIONS, EXCLUDED_AUDIT_FIELDS } from "../models/AuditModel";

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
      { level_id: 1, level_name: "Technical Review", role_title: "Technical Reviewer", sbu: "RJ North", is_active: true },
      { level_id: 2, level_name: "Finance Review", role_title: "Finance Reviewer", sbu: "RJ North", is_active: true },
      { level_id: 3, level_name: "Commercial & Contracts Review", role_title: "Commercial Reviewer", sbu: "RJ North", is_active: true },
      { level_id: 4, level_name: "Corporate Finance Review", role_title: "Corporate Finance Reviewer", sbu: "RJ North", is_active: true },
      { level_id: 5, level_name: "Executive Committee (ExCo) Review", role_title: "ExCo Reviewer", sbu: "RJ North", is_active: true },
      { level_id: 6, level_name: "CEO Approval", role_title: "CEO", sbu: "RJ North", is_active: true },
      { level_id: 7, level_name: "Board Approval", role_title: "Board of Directors", sbu: "RJ North", is_active: true },
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
      { name: "Shiven Pandit", email: "shiven.pandit@vedanta.co.in" }
    );

    expect(editRes.success).toBe(true);
    expect(editRes.proposal.status).toBe("In Approval");
    expect(editRes.proposal.current_level).toBe(1);

    // Past approval history must remain intact
    const postEditDecisions = await service.getApprovalDecisions(cerprno);
    expect(postEditDecisions.length).toBe(priorDecisionsCount);
  });

  // TC-10 & TC-11: Remarks Versioning (FR-08)
  test("FR-08: Remarks edits increment version history with author and timestamp", async () => {
    const cerprno = "CER-2026-0001";
    const initialVersions = await service.getRemarksHistory(cerprno);
    const initialCount = initialVersions.length;

    const proposal = await service.getProposalByNumber(cerprno);
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const newRemarks = "Updated justification: Reservoir pressure dynamics necessitate immediate expansion in Q3.";
    await service.updateProposal(
      { ...proposal, remarks: newRemarks },
      { name: "Shiven Pandit", email: "shiven.pandit@vedanta.co.in" }
    );

    const updatedVersions = await service.getRemarksHistory(cerprno);
    expect(updatedVersions.length).toBe(initialCount + 1);
    expect(updatedVersions[0].remarks_text).toBe(newRemarks);
    expect(updatedVersions[0].created_by).toBe("Shiven Pandit");
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
});
